import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { preloadEmojiPicker } from '../src/preload';
import {
  configureMojiXDataSource,
  resetMojiXDataSource,
} from '../src/core/data-source';
import {
  registerEmojiLocaleSearchIndex,
} from '../src/core/i18n';
import type {
  EmojiLocaleSearchIndex,
  MojiXDataFetcher,
} from '../src/index';

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
  vi.stubGlobal('Image', InstantImage);
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetMojiXDataSource();
});

describe('preloadEmojiPicker', () => {
  it('resolves the prepared emoji data and the default English locale', async () => {
    const result = await preloadEmojiPicker();

    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.locales).toHaveLength(1);
    expect(result.locales[0]?.code).toBe('en');
    expect(result.searchIndexes).toEqual([]);
    expect(result.spriteSheet).toBeNull();
  });

  it('skips sprite sheet warming unless warmSpriteSheet is true', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const result = await preloadEmojiPicker({
      virtualizedGrid: false,
    });

    expect(result.spriteSheet).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('warms the sprite sheet and returns its cached asset when requested', async () => {
    const customAdapter = {
      load: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockImplementation(async () => ({
        url: 'blob:mojix:preload-' + Math.random().toString(36).slice(2),
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

    const result = await preloadEmojiPicker({
      warmSpriteSheet: true,
      virtualizedGrid: false,
      spriteSheet: {
        source: 'custom',
        url:
          'https://example.test/preload-sheet-' +
          Math.random().toString(36).slice(2) +
          '.png',
        cache: {
          enabled: true,
          mode: 'custom',
          adapter: customAdapter,
        },
      },
    });

    expect(result.spriteSheet?.cached).toBe(true);
    expect(result.spriteSheet?.url).toMatch(/^blob:mojix:preload-/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('loads search indexes when search: true and the registry has an entry', async () => {
    // Register a search index for 'en' synchronously so the loader returns
    // immediately without going through fetch.
    const enIndex: EmojiLocaleSearchIndex = {
      '1f600': ['grinning'],
    };
    registerEmojiLocaleSearchIndex('en', enIndex);

    const result = await preloadEmojiPicker({
      search: true,
      virtualizedGrid: false,
    });

    expect(result.searchIndexes).toHaveLength(1);
    expect(result.searchIndexes[0]).toMatchObject({ '1f600': ['grinning'] });
  });

  it('routes locale loading through a configured custom fetcher', async () => {
    const fetcher: MojiXDataFetcher = async (request) => {
      if (request.kind === 'locale' && request.locale === 'fr') {
        return {
          '1f600': { name: 'Visage souriant', keywords: ['sourire'] },
        } as never;
      }
      throw new Error('Unexpected request: ' + request.kind);
    };
    const fetcherSpy = vi.fn(fetcher);

    configureMojiXDataSource({
      cache: false,
      fetcher: fetcherSpy,
    });

    const result = await preloadEmojiPicker({
      locale: 'en',
      fallbackLocale: 'fr',
      virtualizedGrid: false,
    });

    expect(fetcherSpy).toHaveBeenCalled();
    const localeCodes = result.locales.map((locale) => locale.code);
    expect(localeCodes).toContain('en');
    expect(localeCodes).toContain('fr');
  });

  it('preloads the virtualized grid module by default', async () => {
    await preloadEmojiPicker();

    const { loadVirtualizedEmojiGridModule } = await import(
      '../src/components/virtualizedGridLoader'
    );
    const moduleA = await loadVirtualizedEmojiGridModule();
    const moduleB = await loadVirtualizedEmojiGridModule();
    expect(moduleA).toBe(moduleB);
    expect(moduleA.VirtualizedEmojiGrid).toBeTypeOf('function');
  });
});
