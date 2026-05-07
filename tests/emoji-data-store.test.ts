import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getEmojiDataStoreSnapshot,
  hasEmojiData,
  loadEmojiData,
  peekUnicodeEmojiByCategory,
  peekUnicodeEmojiById,
  peekUnicodeEmojiByNative,
  peekUnicodeEmojiData,
} from '../src/core/data';
import type { MojiXDataFetcher } from '../src/core/data-source';

describe('emoji data store accessors', () => {
  it('reports ready state after the test setup preload', () => {
    const snapshot = getEmojiDataStoreSnapshot();

    expect(hasEmojiData()).toBe(true);
    expect(snapshot.ready).toBe(true);
    expect(snapshot.status).toBe('ready');
    expect(snapshot.error).toBeNull();
  });

  it('loadEmojiData resolves to the prepared list synchronously when ready', async () => {
    const list = await loadEmojiData();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    expect(list).toBe(peekUnicodeEmojiData());
  });

  it('peekUnicodeEmojiByCategory returns category-grouped emojis that share the categoryId', () => {
    const smileys = peekUnicodeEmojiByCategory('smileys');
    expect(smileys.length).toBeGreaterThan(0);
    for (const emoji of smileys.slice(0, 5)) {
      expect(emoji.categoryId).toBe('smileys');
    }
  });

  it('peekUnicodeEmojiById and peekUnicodeEmojiByNative resolve the same record', () => {
    const list = peekUnicodeEmojiData();
    expect(list).not.toBeNull();
    const sample = list?.find((emoji) => emoji.id === '1f600');
    expect(sample).toBeDefined();

    const byId = peekUnicodeEmojiById('1f600');
    expect(byId).toBe(sample);

    const byNative = peekUnicodeEmojiByNative('\u{1F600}');
    expect(byNative).toBe(sample);
  });

  it('records search tokens that include shortcodes and category labels', () => {
    const sample = peekUnicodeEmojiById('1f600');
    expect(sample).toBeDefined();
    expect(sample?.searchTokens.length).toBeGreaterThan(0);
    // Tokens are normalized to lowercase, so the prepared category label
    // should appear as 'smileys'.
    expect(sample?.searchTokens).toContain('smileys');
    // Aliases like 'grinning' / 'grinning_face' are normalized too.
    expect(
      sample?.searchTokens.some((token) => token.startsWith('grinning')),
    ).toBe(true);
  });
});

describe('loadEmojiData chunked preparation (idle scheduling)', () => {
  let originalRequestIdleCallback: typeof globalThis.requestIdleCallback | undefined;

  beforeEach(() => {
    originalRequestIdleCallback = globalThis.requestIdleCallback;
  });

  afterEach(() => {
    vi.resetModules();
    if (originalRequestIdleCallback) {
      globalThis.requestIdleCallback = originalRequestIdleCallback;
    } else {
      delete (globalThis as { requestIdleCallback?: unknown }).requestIdleCallback;
    }
  });

  it('uses requestIdleCallback to yield between chunks when preparing data on demand', async () => {
    const idleSpy = vi.fn((callback: () => void) => {
      // Run synchronously via microtask so the test does not stall.
      queueMicrotask(callback);
      return 0;
    });
    (globalThis as { requestIdleCallback?: unknown }).requestIdleCallback =
      idleSpy as unknown as typeof globalThis.requestIdleCallback;

    vi.resetModules();

    const dataModule = await import('../src/core/data');
    const dataSourceModule = await import('../src/core/data-source');
    const i18nModule = await import('../src/core/i18n');
    const enLocaleModule = await import('../src/entries/locales/en');
    const fixtureDataModule = await import('../src/entries/data');

    i18nModule.registerEmojiLocalePack('en', enLocaleModule.default);

    const fullPayload = fixtureDataModule.default;
    // The fixture is in column-oriented format. Slice its rows down to a
    // size that still spans at least two preparation chunks (chunk size is
    // 192 records).
    const slicedPayload =
      Array.isArray(fullPayload)
        ? fullPayload.slice(0, 220)
        : {
            ...fullPayload,
            rows: fullPayload.rows.slice(0, 220),
          };

    const fetcher: MojiXDataFetcher = async (request) => {
      if (
        request.kind === 'emoji-data' &&
        request.key === 'emoji-bootstrap:en'
      ) {
        return { data: slicedPayload } as never;
      }
      throw new Error('Unexpected fetch request: ' + request.key);
    };
    const fetcherSpy = vi.fn(fetcher);

    dataSourceModule.configureMojiXDataSource({
      cache: false,
      preparedCache: false,
      fetcher: fetcherSpy,
    });

    const list = await dataModule.loadEmojiData();
    expect(list.length).toBe(220);
    // The preparation pipeline must have yielded at least once when more than
    // one chunk was processed (chunk size is 192).
    expect(idleSpy).toHaveBeenCalled();
  });
});
