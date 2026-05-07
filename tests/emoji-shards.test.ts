import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MojiXDataFetcher } from '../src/core/data-source';

describe('loadEmojiCategoryShard', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.resetModules();
  });

  async function setupFreshModules(fetcher: MojiXDataFetcher) {
    const dataModule = await import('../src/core/data');
    const dataSourceModule = await import('../src/core/data-source');
    const i18nModule = await import('../src/core/i18n');
    const enLocaleModule = await import('../src/entries/locales/en');

    i18nModule.registerEmojiLocalePack('en', enLocaleModule.default);
    dataSourceModule.configureMojiXDataSource({
      cache: false,
      preparedCache: false,
      fetcher,
    });

    return { dataModule, dataSourceModule };
  }

  function makeShardFetcher(payloads: Record<string, unknown>) {
    const fetcher: MojiXDataFetcher = async (request) => {
      if (
        request.kind === 'emoji-data' &&
        request.key.startsWith('emoji-shard:')
      ) {
        const categoryId = request.key.slice('emoji-shard:'.length);
        const payload = payloads[categoryId];
        if (!payload) {
          throw new Error('No fixture for shard ' + categoryId);
        }
        return payload as never;
      }
      throw new Error('Unexpected fetch request: ' + request.key);
    };
    return vi.fn(fetcher);
  }

  function makeSmileyShardPayload() {
    return {
      version: 1,
      fields: [
        'id',
        'native',
        'aliases',
        'emoticons',
        'categoryId',
        'subcategory',
        'sheetX',
        'sheetY',
        'skins',
      ],
      categories: ['smileys'],
      subcategories: ['face-smiling'],
      skinTones: ['light'],
      rows: [
        [
          '1f600',
          '\u{1F600}',
          ['grinning'],
          [':D'],
          0,
          0,
          32,
          47,
          null,
        ],
      ],
    };
  }

  function makePeopleShardPayload() {
    return {
      version: 1,
      fields: [
        'id',
        'native',
        'aliases',
        'emoticons',
        'categoryId',
        'subcategory',
        'sheetX',
        'sheetY',
        'skins',
      ],
      categories: ['people'],
      subcategories: ['hand-fingers-open'],
      skinTones: ['light'],
      rows: [
        [
          '1f44b',
          '\u{1F44B}',
          ['wave'],
          null,
          0,
          0,
          4,
          55,
          [[0, '1F44B-1F3FB', '\u{1F44B}\u{1F3FB}', 4, 56]],
        ],
      ],
    };
  }

  it('loads a single category shard and exposes it via peek accessors', async () => {
    const fetcher = makeShardFetcher({
      smileys: makeSmileyShardPayload(),
    });

    const { dataModule } = await setupFreshModules(fetcher);

    const list = await dataModule.loadEmojiCategoryShard('smileys');

    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe('1f600');
    expect(list[0]?.categoryId).toBe('smileys');
    expect(dataModule.peekUnicodeEmojiByCategory('smileys')).toHaveLength(1);
    expect(dataModule.peekUnicodeEmojiById('1f600')?.unified).toBe('1F600');
    expect(dataModule.getEmojiDataStoreSnapshot().ready).toBe(true);
  });

  it('skips refetching a shard that is already loaded', async () => {
    const fetcher = makeShardFetcher({
      smileys: makeSmileyShardPayload(),
    });

    const { dataModule } = await setupFreshModules(fetcher);

    await dataModule.loadEmojiCategoryShard('smileys');
    expect(dataModule.isEmojiCategoryLoaded('smileys')).toBe(true);

    await dataModule.loadEmojiCategoryShard('smileys');

    expect(dataModule.peekUnicodeEmojiByCategory('smileys')).toHaveLength(1);
    expect(dataModule.peekUnicodeEmojiData()).toHaveLength(1);
    // Once a shard has been merged, subsequent loads short-circuit without
    // hitting the network again.
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('dedupes concurrent in-flight requests for the same shard', async () => {
    let resolveFetch!: (value: unknown) => void;
    const fetcher = vi.fn((request: { kind: string; key: string }) => {
      if (request.key === 'emoji-shard:smileys') {
        return new Promise((resolve) => {
          resolveFetch = resolve;
        });
      }
      throw new Error('Unexpected fetch ' + request.key);
    });

    const { dataModule } = await setupFreshModules(
      fetcher as unknown as MojiXDataFetcher,
    );

    const firstPromise = dataModule.loadEmojiCategoryShard('smileys');
    const secondPromise = dataModule.loadEmojiCategoryShard('smileys');

    resolveFetch(makeSmileyShardPayload());

    const [first, second] = await Promise.all([firstPromise, secondPromise]);

    expect(first).toBe(second);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('loadEmojiCategoryShards merges multiple shards into the store', async () => {
    const fetcher = makeShardFetcher({
      smileys: makeSmileyShardPayload(),
      people: makePeopleShardPayload(),
    });

    const { dataModule } = await setupFreshModules(fetcher);

    const list = await dataModule.loadEmojiCategoryShards(['smileys', 'people']);

    expect(list).toHaveLength(2);
    const ids = list.map((emoji) => emoji.id).sort();
    expect(ids).toEqual(['1f44b', '1f600']);
    expect(dataModule.peekUnicodeEmojiByCategory('people')).toHaveLength(1);
    expect(dataModule.peekUnicodeEmojiByCategory('smileys')).toHaveLength(1);
    expect(dataModule.peekUnicodeEmojiByCategory('animals')).toHaveLength(0);
  });
});

describe('preloadEmojiPicker with shards', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('loads only the requested shards instead of the full bootstrap', async () => {
    const dataModule = await import('../src/core/data');
    const dataSourceModule = await import('../src/core/data-source');
    const i18nModule = await import('../src/core/i18n');
    const enLocaleModule = await import('../src/entries/locales/en');
    const preloadModule = await import('../src/preload');

    i18nModule.registerEmojiLocalePack('en', enLocaleModule.default);

    const fetcher = vi.fn(async (request) => {
      if (request.key === 'emoji-shard:smileys') {
        return {
          version: 1,
          fields: [
            'id',
            'native',
            'aliases',
            'emoticons',
            'categoryId',
            'subcategory',
            'sheetX',
            'sheetY',
            'skins',
          ],
          categories: ['smileys'],
          subcategories: ['face-smiling'],
          skinTones: ['light'],
          rows: [
            [
              '1f600',
              '\u{1F600}',
              ['grinning'],
              [':D'],
              0,
              0,
              32,
              47,
              null,
            ],
          ],
        } as never;
      }
      throw new Error('Unexpected fetch: ' + request.key);
    });

    dataSourceModule.configureMojiXDataSource({
      cache: false,
      preparedCache: false,
      fetcher,
    });

    const result = await preloadModule.preloadEmojiPicker({
      shards: ['smileys'],
      virtualizedGrid: false,
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.id).toBe('1f600');
    expect(dataModule.peekUnicodeEmojiByCategory('smileys')).toHaveLength(1);
    // Only the requested shard was fetched — no bootstrap call.
    const fetchedKeys = fetcher.mock.calls.map(
      ([request]) => (request as { key: string }).key,
    );
    expect(fetchedKeys).toEqual(['emoji-shard:smileys']);
  });
});
