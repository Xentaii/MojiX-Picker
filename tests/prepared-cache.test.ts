import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  clearPreparedEmojiDataCache,
  loadPreparedEmojiDataFromCache,
  savePreparedEmojiDataToCache,
} from '../src/core/prepared-cache';
import type { UnicodeEmoji } from '../src/core/types';

declare const __MOJIX_VERSION__: string;

interface FakeRecord {
  key: string;
  value: unknown;
}

interface FakeStore {
  records: Map<string, FakeRecord>;
}

interface FakeDb {
  name: string;
  stores: Map<string, FakeStore>;
}

type RequestSettler<T> = (request: FakeRequest<T>) => void;

class FakeRequest<T> {
  result: T | null = null;
  error: unknown = null;
  onsuccess: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;

  constructor(settler: RequestSettler<T>) {
    queueMicrotask(() => settler(this));
  }

  succeed(value: T) {
    this.result = value;
    this.onsuccess?.({ target: this });
  }

  fail(error: unknown) {
    this.error = error;
    this.onerror?.({ target: this });
  }
}

class FakeOpenRequest extends FakeRequest<FakeDb> {
  onupgradeneeded: ((event: unknown) => void) | null = null;
  onblocked: ((event: unknown) => void) | null = null;
}

class FakeObjectStore {
  constructor(private store: FakeStore, private transaction: FakeTransaction) {}

  get(key: string) {
    return new FakeRequest<unknown>((request) => {
      const record = this.store.records.get(key);
      request.succeed(record ? record.value : undefined);
    });
  }

  put(record: { key: string } & Record<string, unknown>) {
    return new FakeRequest<void>((request) => {
      this.store.records.set(record.key, { key: record.key, value: record });
      request.succeed(undefined as unknown as void);
      this.transaction.complete();
    });
  }

  clear() {
    return new FakeRequest<void>((request) => {
      this.store.records.clear();
      request.succeed(undefined as unknown as void);
      this.transaction.complete();
    });
  }
}

class FakeTransaction {
  oncomplete: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  private completed = false;

  constructor(private db: FakeDb, public mode: 'readonly' | 'readwrite', private storeName: string) {
    if (mode === 'readonly') {
      queueMicrotask(() => this.complete());
    }
  }

  objectStore(name: string) {
    if (name !== this.storeName) {
      throw new Error(`Store ${name} not in transaction`);
    }
    const store = this.db.stores.get(name);
    if (!store) {
      throw new Error(`Store ${name} does not exist`);
    }
    return new FakeObjectStore(store, this);
  }

  complete() {
    if (this.completed) {
      return;
    }
    this.completed = true;
    queueMicrotask(() => {
      this.oncomplete?.({ target: this });
    });
  }
}

class FakeDbHandle {
  objectStoreNames = {
    contains: (name: string) => this.db.stores.has(name),
  };

  constructor(private db: FakeDb) {}

  createObjectStore(name: string, _options: { keyPath: string }) {
    if (!this.db.stores.has(name)) {
      this.db.stores.set(name, { records: new Map() });
    }
    return null;
  }

  transaction(storeName: string, mode: 'readonly' | 'readwrite') {
    return new FakeTransaction(this.db, mode, storeName);
  }
}

function createFakeIndexedDb() {
  const databases = new Map<string, FakeDb>();

  function open(name: string, _version: number) {
    let openRequest: FakeOpenRequest | null = null;
    openRequest = new FakeOpenRequest((req) => {
      const request = req as FakeOpenRequest;
      let db = databases.get(name);
      const isNew = !db;
      if (!db) {
        db = { name, stores: new Map() };
        databases.set(name, db);
      }

      const handle = new FakeDbHandle(db);
      request.result = handle as unknown as FakeDb;

      if (isNew && request.onupgradeneeded) {
        request.onupgradeneeded({ target: request });
      }

      request.onsuccess?.({ target: request });
    });

    return openRequest;
  }

  return {
    open,
    databases,
  };
}

const originalIndexedDB = globalThis.indexedDB;

let fakeIndexedDb: ReturnType<typeof createFakeIndexedDb>;

beforeEach(() => {
  fakeIndexedDb = createFakeIndexedDb();
  vi.stubGlobal('indexedDB', fakeIndexedDb);
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalIndexedDB) {
    globalThis.indexedDB = originalIndexedDB;
  }
});

const SAMPLE_EMOJI: UnicodeEmoji[] = [
  {
    kind: 'unicode',
    id: '1f600',
    unified: '1F600',
    native: '\u{1F600}',
    name: 'Grinning face',
    aliases: ['grinning'],
    emoticons: [':D'],
    categoryId: 'smileys',
    subcategory: 'face-smiling',
    sheetX: 32,
    sheetY: 47,
    availability: { apple: true, google: true, twitter: true, facebook: true },
    skins: [],
    searchTokens: ['grinning face', 'smileys', 'face smiling', 'grinning', ':grinning:', ':d'],
    categoryLabel: 'Smileys',
  },
];

describe('prepared emoji data cache (IndexedDB)', () => {
  it('returns null when no cached entry exists', async () => {
    const result = await loadPreparedEmojiDataFromCache({
      key: 'mojix-test:absent',
      cacheName: 'mojix:prepared-test:miss',
    });

    expect(result).toBeNull();
  });

  it('persists prepared emoji lists across save and load', async () => {
    const cacheName = 'mojix:prepared-test:roundtrip';

    await savePreparedEmojiDataToCache({
      key: 'roundtrip',
      list: SAMPLE_EMOJI,
      cacheName,
    });

    const loaded = await loadPreparedEmojiDataFromCache({
      key: 'roundtrip',
      cacheName,
    });

    expect(loaded).not.toBeNull();
    expect(loaded?.[0]?.id).toBe('1f600');
    expect(loaded?.[0]?.unified).toBe('1F600');
  });

  it('discards cached entries when the MojiX version mismatches', async () => {
    const cacheName = 'mojix:prepared-test:version';
    const dbName = cacheName;

    await savePreparedEmojiDataToCache({
      key: 'versioned',
      list: SAMPLE_EMOJI,
      cacheName,
    });

    // Manually rewrite the stored record to simulate a record produced by an
    // older library version.
    const db = fakeIndexedDb.databases.get(dbName);
    expect(db).toBeDefined();
    const store = db?.stores.get('emoji-data');
    expect(store).toBeDefined();
    const record = store?.records.get('versioned');
    expect(record).toBeDefined();
    if (record && typeof record.value === 'object' && record.value) {
      (record.value as { version: string }).version = 'incompatible-version';
    }

    const loaded = await loadPreparedEmojiDataFromCache({
      key: 'versioned',
      cacheName,
    });

    expect(loaded).toBeNull();
  });

  it('clears all entries via clearPreparedEmojiDataCache', async () => {
    const cacheName = 'mojix:prepared-test:clear';

    await savePreparedEmojiDataToCache({
      key: 'a',
      list: SAMPLE_EMOJI,
      cacheName,
    });
    await savePreparedEmojiDataToCache({
      key: 'b',
      list: SAMPLE_EMOJI,
      cacheName,
    });

    await clearPreparedEmojiDataCache({ cacheName });

    const a = await loadPreparedEmojiDataFromCache({ key: 'a', cacheName });
    const b = await loadPreparedEmojiDataFromCache({ key: 'b', cacheName });

    expect(a).toBeNull();
    expect(b).toBeNull();
  });

  it('returns null gracefully when indexedDB is unavailable', async () => {
    vi.stubGlobal('indexedDB', undefined);

    const loaded = await loadPreparedEmojiDataFromCache({
      key: 'whatever',
      cacheName: 'mojix:prepared-test:no-idb',
    });

    expect(loaded).toBeNull();

    // Save and clear should also be no-ops without throwing.
    await expect(
      savePreparedEmojiDataToCache({
        key: 'whatever',
        list: SAMPLE_EMOJI,
        cacheName: 'mojix:prepared-test:no-idb',
      }),
    ).resolves.toBeUndefined();

    await expect(
      clearPreparedEmojiDataCache({
        cacheName: 'mojix:prepared-test:no-idb',
      }),
    ).resolves.toBeUndefined();
  });

  it('writes records that contain the current MojiX version', async () => {
    const cacheName = 'mojix:prepared-test:version-written';

    await savePreparedEmojiDataToCache({
      key: 'tagged',
      list: SAMPLE_EMOJI,
      cacheName,
    });

    const db = fakeIndexedDb.databases.get(cacheName);
    const record = db?.stores.get('emoji-data')?.records.get('tagged');
    const value = record?.value as { version: string; createdAt: number };

    expect(value?.version).toBe(__MOJIX_VERSION__);
    expect(typeof value?.createdAt).toBe('number');
  });
});
