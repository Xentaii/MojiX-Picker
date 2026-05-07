import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  createBrowserSpriteSheetCacheAdapter,
  peekWarmedEmojiSpriteSheetUrl,
  preloadSpriteSheetUrl,
  warmEmojiSpriteSheet,
} from '../src/core/sprite-cache';
import { createSpriteSheetCacheKey } from '../src/core/sprites';

class InstantImage {
  decoding = '';
  onload: (() => void) | null = null;
  onerror: ((error: Error) => void) | null = null;
  complete = false;

  set src(_value: string) {
    queueMicrotask(() => {
      this.complete = true;
      this.onload?.();
    });
  }

  decode = vi.fn().mockResolvedValue(undefined);
}

beforeEach(() => {
  // jsdom does not actually load images, so any code that awaits decode hangs.
  // Provide an Image stub that resolves on the next microtask so warming and
  // preloading helpers behave deterministically.
  vi.stubGlobal('Image', InstantImage);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('peekWarmedEmojiSpriteSheetUrl + warmEmojiSpriteSheet (non-remote)', () => {
  it('returns null before any warming has occurred', () => {
    const config = {
      source: 'custom' as const,
      url: 'data:image/png;base64,unwarmed-' + Math.random().toString(36).slice(2),
    };

    expect(peekWarmedEmojiSpriteSheetUrl(config)).toBeNull();
  });

  it('does not cache local/non-remote URLs in the shared retained map', async () => {
    // Local URLs are returned directly with `cached: false` and intentionally
    // skip the shared retained map so the consumer keeps the original URL.
    const config = {
      source: 'custom' as const,
      url: '/sprites/local-sheet.png',
    };

    const asset = await warmEmojiSpriteSheet(config);

    expect(asset.url).toBe('/sprites/local-sheet.png');
    expect(asset.cached).toBe(false);
    expect(peekWarmedEmojiSpriteSheetUrl(config)).toBeNull();
  });
});

describe('warmEmojiSpriteSheet (remote)', () => {
  it('shares the warmed object URL across calls (retained sprite sheet)', async () => {
    const sharedConfig = {
      source: 'custom' as const,
      url: 'https://example.test/retained-shared-' + Math.random().toString(36).slice(2) + '.png',
      cache: {
        enabled: true,
        mode: 'custom' as const,
        adapter: {
          load: vi.fn().mockResolvedValue(null),
          save: vi.fn().mockImplementation(async () => ({
            url: 'blob:mojix:shared-' + Math.random().toString(36).slice(2),
            cached: true,
          })),
        },
      },
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      clone() {
        return this;
      },
      async blob() {
        return new Blob([new Uint8Array(1)], { type: 'image/png' });
      },
    });
    vi.stubGlobal('fetch', fetchMock);

    const first = await warmEmojiSpriteSheet(sharedConfig);
    const second = await warmEmojiSpriteSheet(sharedConfig);

    expect(first.cached).toBe(true);
    expect(second.url).toBe(first.url);
    // The second warm request should hit the shared retained map and not
    // re-invoke fetch or the adapter.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sharedConfig.cache.adapter.load).toHaveBeenCalledTimes(1);
    expect(peekWarmedEmojiSpriteSheetUrl(sharedConfig)).toBe(first.url);
  });

  it('reuses the cached adapter response without invoking fetch', async () => {
    const cachedUrl = 'blob:mojix:cache-hit-' + Math.random().toString(36).slice(2);
    const adapter = {
      load: vi.fn().mockResolvedValue({ url: cachedUrl, cached: true }),
      save: vi.fn(),
    };

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const config = {
      source: 'custom' as const,
      url: 'https://example.test/cache-hit-' + Math.random().toString(36).slice(2) + '.png',
      cache: {
        enabled: true,
        mode: 'custom' as const,
        adapter,
      },
    };

    const asset = await warmEmojiSpriteSheet(config);

    expect(asset.url).toBe(cachedUrl);
    expect(asset.cached).toBe(true);
    expect(adapter.load).toHaveBeenCalledTimes(1);
    expect(adapter.save).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('dedupes concurrent warmups for the same cache key', async () => {
    let resolveLoad!: (value: null) => void;
    const adapter = {
      load: vi.fn(
        () =>
          new Promise<null>((resolve) => {
            resolveLoad = resolve;
          }),
      ),
      save: vi.fn().mockImplementation(async () => ({
        url: 'blob:mojix:concurrent-' + Math.random().toString(36).slice(2),
        cached: true,
      })),
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      clone() {
        return this;
      },
      async blob() {
        return new Blob([new Uint8Array(1)], { type: 'image/png' });
      },
    });
    vi.stubGlobal('fetch', fetchMock);

    const config = {
      source: 'custom' as const,
      url: 'https://example.test/concurrent-' + Math.random().toString(36).slice(2) + '.png',
      cache: {
        enabled: true,
        mode: 'custom' as const,
        adapter,
      },
    };

    const firstPromise = warmEmojiSpriteSheet(config);
    const secondPromise = warmEmojiSpriteSheet(config);

    resolveLoad(null);
    const [first, second] = await Promise.all([firstPromise, secondPromise]);

    expect(first.url).toBe(second.url);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(adapter.save).toHaveBeenCalledTimes(1);
  });
});

describe('createBrowserSpriteSheetCacheAdapter', () => {
  it('returns null cached responses when no Cache Storage entry exists', async () => {
    const cacheStorageMock = {
      open: vi.fn().mockResolvedValue({
        match: vi.fn().mockResolvedValue(undefined),
        put: vi.fn().mockResolvedValue(undefined),
      }),
    };
    vi.stubGlobal('caches', cacheStorageMock);

    const adapter = createBrowserSpriteSheetCacheAdapter({
      cacheName: 'mojix-test:browser-cache',
    });

    const cached = await adapter.load({
      key: 'missing',
      url: 'https://example.test/missing.png',
      vendor: 'twitter',
      sheetSize: 64,
      variant: 'indexed-256',
      source: 'custom',
      version: '16.0.0',
      packageName: 'emoji-datasource',
    });

    expect(cached).toBeNull();
  });
});

describe('preloadSpriteSheetUrl', () => {
  it('decodes the same URL only once across repeated calls', async () => {
    const url = 'https://example.test/decode-once-' + Math.random().toString(36).slice(2) + '.png';
    const decodeSpy = vi.fn().mockResolvedValue(undefined);

    class MockImage {
      decoding = '';
      onload: (() => void) | null = null;
      onerror: ((error: Error) => void) | null = null;
      complete = false;

      set src(_value: string) {
        queueMicrotask(() => {
          this.complete = true;
          this.onload?.();
        });
      }

      decode = decodeSpy;
    }

    vi.stubGlobal('Image', MockImage);

    await preloadSpriteSheetUrl(url);
    await preloadSpriteSheetUrl(url);

    expect(decodeSpy).toHaveBeenCalledTimes(1);
  });
});

describe('createSpriteSheetCacheKey', () => {
  it('produces stable keys for equivalent configurations', () => {
    const a = createSpriteSheetCacheKey({
      vendor: 'twitter',
      sheetSize: 64,
      variant: 'indexed-256',
      source: 'custom',
      url: 'https://example.test/sheet.png',
    });
    const b = createSpriteSheetCacheKey({
      vendor: 'twitter',
      sheetSize: 64,
      variant: 'indexed-256',
      source: 'custom',
      url: 'https://example.test/sheet.png',
    });

    expect(a).toBe(b);
  });

  it('changes the key when the URL changes', () => {
    const a = createSpriteSheetCacheKey({
      vendor: 'twitter',
      sheetSize: 64,
      variant: 'indexed-256',
      source: 'custom',
      url: 'https://example.test/sheet-a.png',
    });
    const b = createSpriteSheetCacheKey({
      vendor: 'twitter',
      sheetSize: 64,
      variant: 'indexed-256',
      source: 'custom',
      url: 'https://example.test/sheet-b.png',
    });

    expect(a).not.toBe(b);
  });
});
