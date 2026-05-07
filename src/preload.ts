import {
  loadEmojiCategoryShards,
  loadEmojiData,
} from './core/data';
import {
  loadEmojiLocaleSearchIndex,
  loadLocale,
} from './core/i18n';
import { warmEmojiSpriteSheet } from './core/sprite-cache';
import type {
  BuiltInEmojiCategoryId,
  EmojiLocaleCode,
  EmojiLocaleSearchIndex,
  EmojiSpriteSheetCachedAsset,
  EmojiSpriteSheetConfig,
  UnicodeEmoji,
} from './core/types';
import { loadVirtualizedEmojiGridModule } from './components/virtualizedGridLoader';

export interface PreloadEmojiPickerOptions {
  locale?: EmojiLocaleCode;
  fallbackLocale?: EmojiLocaleCode | EmojiLocaleCode[];
  search?: boolean;
  spriteSheet?: EmojiSpriteSheetConfig;
  warmSpriteSheet?: boolean;
  virtualizedGrid?: boolean;
  /**
   * When provided, only the listed category shards are loaded instead of the
   * full bootstrap payload. Useful for first-paint optimization in large
   * applications: load `['smileys', 'people']` eagerly and lazy-load the rest
   * via {@link loadEmojiCategoryShard} when the user scrolls into them.
   */
  shards?: readonly BuiltInEmojiCategoryId[];
}

export interface PreloadEmojiPickerResult {
  data: UnicodeEmoji[];
  locales: Awaited<ReturnType<typeof loadLocale>>[];
  searchIndexes: EmojiLocaleSearchIndex[];
  spriteSheet: EmojiSpriteSheetCachedAsset | null;
}

function collectLocales(
  locale: EmojiLocaleCode | undefined,
  fallbackLocale: EmojiLocaleCode | EmojiLocaleCode[] | undefined,
) {
  const fallbackLocales = Array.isArray(fallbackLocale)
    ? fallbackLocale
    : fallbackLocale
      ? [fallbackLocale]
      : [];

  return Array.from(new Set([locale ?? 'en', ...fallbackLocales]));
}

export async function preloadEmojiPicker(
  options: PreloadEmojiPickerOptions = {},
): Promise<PreloadEmojiPickerResult> {
  const locales = collectLocales(options.locale, options.fallbackLocale);
  const virtualizedGridPromise =
    options.virtualizedGrid === false
      ? Promise.resolve(null)
      : loadVirtualizedEmojiGridModule();
  const spriteSheetPromise =
    options.warmSpriteSheet === false ||
    (!options.spriteSheet && options.warmSpriteSheet !== true)
      ? Promise.resolve(null)
      : warmEmojiSpriteSheet(options.spriteSheet);
  const dataPromise =
    options.shards && options.shards.length > 0
      ? loadEmojiCategoryShards(options.shards)
      : loadEmojiData();

  const [data, loadedLocales, searchIndexes, spriteSheet] =
    await Promise.all([
      dataPromise,
      Promise.all(locales.map((locale) => loadLocale(locale))),
      options.search
        ? Promise.all(
            locales.map((locale) => loadEmojiLocaleSearchIndex(locale)),
          )
        : Promise.resolve([]),
      spriteSheetPromise,
      virtualizedGridPromise,
    ] as const);

  return {
    data,
    locales: loadedLocales,
    searchIndexes,
    spriteSheet,
  };
}
