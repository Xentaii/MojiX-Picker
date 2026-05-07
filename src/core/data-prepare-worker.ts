// Off-main-thread helper for the heaviest part of emoji preparation: building
// the search-token array for every record. The implementation is
// self-contained — the Worker code is shipped as a string literal so the
// library does not require any bundler-specific worker conventions.
//
// When the runtime cannot construct a Worker (SSR, jsdom, restricted CSP,
// older browsers without `Worker`/`Blob`/`URL.createObjectURL`), the helper
// transparently falls back to running the same logic on the main thread.

export interface EmojiSearchTokensInput {
  name: string;
  categoryLabel: string;
  subcategory: string;
  aliases: readonly string[];
  emoticons: readonly string[];
}

interface PendingRequest {
  resolve: (tokens: string[][]) => void;
  reject: (error: unknown) => void;
}

const WORKER_SOURCE = `
const normalizeQuery = (value) => value
  .trim()
  .toLowerCase()
  .replace(/[_-]+/gu, ' ')
  .replace(/[^\\p{L}\\p{N}:+()<> ]+/gu, ' ')
  .replace(/\\s+/gu, ' ');

const createTokens = (input) => {
  const aliases = input.aliases || [];
  const emoticons = input.emoticons || [];
  const aliasShortcodes = aliases.map((alias) => ':' + alias + ':');
  const aliasSpaced = aliases.map((alias) => alias.split('_').join(' '));
  const all = [
    input.name,
    input.categoryLabel,
    input.subcategory,
    ...aliases,
    ...aliasSpaced,
    ...aliasShortcodes,
    ...emoticons,
  ]
    .filter((value) => typeof value === 'string' && value.length > 0)
    .map(normalizeQuery)
    .filter(Boolean);
  return Array.from(new Set(all));
};

self.onmessage = (event) => {
  const data = event.data;
  if (!data || data.type !== 'compute-search-tokens') {
    return;
  }

  const id = data.id;
  try {
    const result = (data.inputs || []).map(createTokens);
    self.postMessage({ id: id, ok: true, result: result });
  } catch (error) {
    self.postMessage({
      id: id,
      ok: false,
      error: error && error.message ? String(error.message) : String(error),
    });
  }
};
`;

let workerSingleton: Worker | null = null;
let workerInitFailed = false;
let nextRequestId = 0;
const pendingRequests = new Map<number, PendingRequest>();

function canConstructWorker() {
  return (
    typeof Worker !== 'undefined' &&
    typeof Blob !== 'undefined' &&
    typeof URL !== 'undefined' &&
    typeof URL.createObjectURL === 'function'
  );
}

function getOrCreateWorker(): Worker | null {
  if (workerSingleton) {
    return workerSingleton;
  }

  if (workerInitFailed || !canConstructWorker()) {
    return null;
  }

  try {
    const blob = new Blob([WORKER_SOURCE], {
      type: 'application/javascript',
    });
    const objectUrl = URL.createObjectURL(blob);
    const worker = new Worker(objectUrl);

    worker.onmessage = (event: MessageEvent<{
      id: number;
      ok: boolean;
      result?: string[][];
      error?: string;
    }>) => {
      const data = event.data;
      const pending = pendingRequests.get(data.id);

      if (!pending) {
        return;
      }

      pendingRequests.delete(data.id);

      if (data.ok && Array.isArray(data.result)) {
        pending.resolve(data.result);
      } else {
        pending.reject(new Error(data.error ?? 'Worker preparation failed'));
      }
    };

    worker.onerror = (event: ErrorEvent) => {
      // Reject every pending request so callers fall back to main thread.
      for (const pending of pendingRequests.values()) {
        pending.reject(event.error ?? new Error(event.message));
      }
      pendingRequests.clear();
    };

    workerSingleton = worker;
    return worker;
  } catch {
    workerInitFailed = true;
    return null;
  }
}

export function isEmojiPreparationWorkerAvailable() {
  return canConstructWorker() && !workerInitFailed;
}

export function disposeEmojiPreparationWorker() {
  if (workerSingleton) {
    try {
      workerSingleton.terminate();
    } catch {
      // ignore termination errors
    }
  }
  workerSingleton = null;
  workerInitFailed = false;
  pendingRequests.clear();
}

function computeSearchTokensOnMainThread(
  inputs: readonly EmojiSearchTokensInput[],
): string[][] {
  const normalize = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[_-]+/gu, ' ')
      .replace(/[^\p{L}\p{N}:+()<> ]+/gu, ' ')
      .replace(/\s+/gu, ' ');

  return inputs.map((input) => {
    const aliases = Array.from(input.aliases);
    const emoticons = Array.from(input.emoticons);
    const all = [
      input.name,
      input.categoryLabel,
      input.subcategory,
      ...aliases,
      ...aliases.map((alias) => alias.split('_').join(' ')),
      ...aliases.map((alias) => `:${alias}:`),
      ...emoticons,
    ]
      .filter(
        (value): value is string =>
          typeof value === 'string' && value.length > 0,
      )
      .map(normalize)
      .filter(Boolean);

    return Array.from(new Set(all));
  });
}

export function computeEmojiSearchTokensOnWorker(
  inputs: readonly EmojiSearchTokensInput[],
): Promise<string[][]> {
  const worker = getOrCreateWorker();

  if (!worker) {
    return Promise.resolve(computeSearchTokensOnMainThread(inputs));
  }

  const id = ++nextRequestId;

  return new Promise<string[][]>((resolve, reject) => {
    pendingRequests.set(id, { resolve, reject });

    try {
      worker.postMessage({
        type: 'compute-search-tokens',
        id,
        inputs,
      });
    } catch (error) {
      pendingRequests.delete(id);
      reject(error);
    }
  }).catch(() => computeSearchTokensOnMainThread(inputs));
}
