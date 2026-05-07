import { describe, expect, it } from 'vitest';
import * as api from '../src/index';

describe('public API surface', () => {
  it('exports the default EmojiPicker preset', () => {
    expect(api.EmojiPicker).toBeTypeOf('function');
  });

  it('exports the headless MojiX namespace with core primitives', () => {
    expect(api.MojiX).toBeDefined();
    expect(api.MojiX.Root).toBeTypeOf('function');
    expect(api.MojiX.Search).toBeTypeOf('function');
    expect(api.MojiX.List).toBeTypeOf('function');
    expect(api.MojiX.Viewport).toBeTypeOf('function');
  });

  it('exports hooks', () => {
    expect(api.useMojiX).toBeTypeOf('function');
    expect(api.useEmojiSearch).toBeTypeOf('function');
    expect(api.useEmojiCategories).toBeTypeOf('function');
  });

  it('exports asset source factories', () => {
    expect(api.createNativeAssetSource).toBeTypeOf('function');
    expect(api.createSpriteSheetAssetSource).toBeTypeOf('function');
    expect(api.createImageAssetSource).toBeTypeOf('function');
    expect(api.createSvgAssetSource).toBeTypeOf('function');
    expect(api.createMixedAssetSource).toBeTypeOf('function');
  });

  it('exports sprite helpers', () => {
    expect(api.createEmojiSpriteSheet).toBeTypeOf('function');
    expect(api.createEmojiCdnUrl).toBeTypeOf('function');
    expect(api.createEmojiLocalSpriteSheet).toBeTypeOf('function');
    expect(api.defaultSpriteSheet).toBeDefined();
  });

  it('exports i18n helpers', () => {
    expect(api.emojiPickerLocales).toBeDefined();
    expect(api.loadLocale).toBeTypeOf('function');
    expect(api.resolveLocaleDefinition).toBeTypeOf('function');
  });

  it('exports the engine layer', () => {
    expect(api.preloadEmojiData).toBeTypeOf('function');
    expect(api.loadEmojiData).toBeTypeOf('function');
    expect(api.createEmojiIndex).toBeTypeOf('function');
    expect(api.searchEmoji).toBeTypeOf('function');
    expect(api.resolveEmojiSelection).toBeTypeOf('function');
    expect(api.createRecentEmojiStore).toBeTypeOf('function');
    expect(api.createSkinToneStore).toBeTypeOf('function');
    expect(api.useEmojiAssets).toBeTypeOf('function');
    expect(api.preloadEmojiPicker).toBeTypeOf('function');
    expect(api.configureMojiXDataSource).toBeTypeOf('function');
    expect(api.clearPreparedEmojiDataCache).toBeTypeOf('function');
    expect(api.clearEmojiSpriteStyleCache).toBeTypeOf('function');
    expect(api.loadEmojiCategoryShard).toBeTypeOf('function');
    expect(api.loadEmojiCategoryShards).toBeTypeOf('function');
    expect(api.computeEmojiSearchTokensOnWorker).toBeTypeOf('function');
    expect(api.disposeEmojiPreparationWorker).toBeTypeOf('function');
    expect(api.isEmojiPreparationWorkerAvailable).toBeTypeOf('function');
  });

  it('createEmojiIndex search returns ranked results', () => {
    const index = api.createEmojiIndex();
    const hits = index.search('smile');
    expect(Array.isArray(hits)).toBe(true);
    expect(hits.length).toBeGreaterThan(0);
  });

  it('createRecentEmojiStore works without DOM (memory adapter fallback)', () => {
    const recents = api.createRecentEmojiStore({
      adapter: {
        read: () => [],
        write: () => undefined,
      },
    });
    const pushed = recents.push(
      { id: 'abc', custom: false, skinTone: 'default' },
      5,
    );
    expect(pushed).toHaveLength(1);
    expect(pushed[0]?.id).toBe('abc');
  });

  it('preloadEmojiData accepts compact data records', () => {
    const [emoji] = api.preloadEmojiData([
      {
        id: '1f600',
        native: '\u{1F600}',
        name: 'Grinning face',
        aliases: ['grinning'],
        emoticons: [],
        categoryId: 'smileys',
        sheetX: 32,
        sheetY: 47,
        availability: 4,
        skins: [],
      },
    ]);

    expect(emoji?.unified).toBe('1F600');
    expect(emoji?.availability).toEqual({
      apple: false,
      google: false,
      twitter: true,
      facebook: false,
    });
  });

  it('preloadEmojiData accepts column-oriented data records', () => {
    const [emoji] = api.preloadEmojiData({
      version: 1,
      fields: [
        'id',
        'native',
        'name',
        'aliases',
        'emoticons',
        'categoryId',
        'subcategory',
        'sheetX',
        'sheetY',
        'availability',
        'skins',
      ],
      categories: ['people'],
      subcategories: ['hand-fingers-open'],
      skinTones: ['light'],
      rows: [
        [
          '1f44b',
          '\u{1F44B}',
          'Waving hand',
          ['wave'],
          null,
          0,
          0,
          4,
          55,
          15,
          [[0, '1F44B-1F3FB', '\u{1F44B}\u{1F3FB}', 4, 56]],
        ],
      ],
    });

    expect(emoji?.categoryId).toBe('people');
    expect(emoji?.subcategory).toBe('hand-fingers-open');
    expect(emoji?.skins[0]).toMatchObject({
      tone: 'light',
      unified: '1F44B-1F3FB',
      sheetX: 4,
      sheetY: 56,
    });
  });

  it('preloadEmojiData accepts 2.0 column data without name or availability', () => {
    const [emoji] = api.preloadEmojiData({
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
    });

    expect(emoji?.name).toBe('Grinning face');
    expect(emoji?.availability).toEqual({
      apple: true,
      google: true,
      twitter: true,
      facebook: true,
    });
  });
});
