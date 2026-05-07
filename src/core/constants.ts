import emojiMeta from './generated/emoji-meta.json';
import type {
  EmojiCategoryIconGlyph,
  EmojiCategoryMeta,
  EmojiCategoryIconPreset,
  EmojiPickerLabels,
  EmojiSpriteSheetCacheMode,
  EmojiSkinTone,
  EmojiSystemCategoryId,
} from './types';

export const EMOJI_DATASET_VERSION = emojiMeta.version;
export const EMOJI_SHEET_GRID_SIZE = emojiMeta.gridSize;
export const EMOJI_SHEET_PADDING = 1;
export const DEFAULT_SPRITE_BASE_PATH = '/sprites';
export const DEFAULT_SPRITE_CACHE_MODE: EmojiSpriteSheetCacheMode = 'browser';
export const DEFAULT_SPRITE_CACHE_NAME = 'mojix:sprite-sheets';
export const DEFAULT_DATA_CACHE_NAME = 'mojix:data';
export const DEFAULT_PREPARED_DATA_CACHE_NAME = 'mojix:prepared-data';

export const DEFAULT_EMOJI_SIZE = 24;
export const DEFAULT_COLUMNS = 8;
export const DEFAULT_RECENT_LIMIT = 28;
export const DEFAULT_RECENT_STORAGE_KEY = 'mojix:recent';
export const DEFAULT_SKIN_TONE_STORAGE_KEY = 'mojix:skin-tone';
export const DEFAULT_CATEGORY_ICON_STYLE: EmojiCategoryIconPreset =
  'outline';

export const CATEGORY_ICON_GLYPHS = [
  'recent',
  'smileys',
  'people',
  'animals',
  'food',
  'activities',
  'travel',
  'objects',
  'symbols',
  'flags',
  'custom',
  'sparkles',
  'star',
  'heart',
  'bolt',
  'music',
  'gamepad',
  'palette',
  'code',
  'leaf',
  'gift',
  'rocket',
] as const;

export const CATEGORY_ORDER: EmojiSystemCategoryId[] = [
  'recent',
  'smileys',
  'people',
  'animals',
  'food',
  'activities',
  'travel',
  'objects',
  'symbols',
  'flags',
  'custom',
];

export const BUILT_IN_CATEGORY_IDS = [
  'smileys',
  'people',
  'animals',
  'food',
  'activities',
  'travel',
  'objects',
  'symbols',
  'flags',
] as const;

const BUILT_IN_CATEGORY_ID_SET = new Set<string>(BUILT_IN_CATEGORY_IDS);

export function isBuiltInCategoryId(
  categoryId: string,
): categoryId is (typeof BUILT_IN_CATEGORY_IDS)[number] {
  return BUILT_IN_CATEGORY_ID_SET.has(categoryId);
}

export const CATEGORY_GLYPH_META: Record<
  EmojiCategoryIconGlyph,
  {
    glyph: EmojiCategoryIconGlyph;
    emoji: string;
    emojiId?: string;
  }
> = {
  recent: { glyph: 'recent', emoji: '\u{1F558}', emojiId: '1f558' },
  smileys: { glyph: 'smileys', emoji: '\u{1F642}', emojiId: '1f642' },
  people: { glyph: 'people', emoji: '\u{1FAF6}', emojiId: '1faf6' },
  animals: { glyph: 'animals', emoji: '\u{1F98A}', emojiId: '1f98a' },
  food: { glyph: 'food', emoji: '\u{1F35C}', emojiId: '1f35c' },
  activities: { glyph: 'activities', emoji: '\u26BD', emojiId: '26bd' },
  travel: { glyph: 'travel', emoji: '\u2708\uFE0F', emojiId: '2708-fe0f' },
  objects: { glyph: 'objects', emoji: '\u{1F4A1}', emojiId: '1f4a1' },
  symbols: { glyph: 'symbols', emoji: '\u{1F4AF}', emojiId: '1f4af' },
  flags: { glyph: 'flags', emoji: '\u{1F3F3}\uFE0F', emojiId: '1f3f3-fe0f' },
  custom: { glyph: 'custom', emoji: '\u2728', emojiId: '2728' },
  sparkles: { glyph: 'sparkles', emoji: '\u2728', emojiId: '2728' },
  star: { glyph: 'star', emoji: '\u2B50', emojiId: '2b50' },
  heart: { glyph: 'heart', emoji: '\u2764\uFE0F', emojiId: '2764-fe0f' },
  bolt: { glyph: 'bolt', emoji: '\u26A1', emojiId: '26a1' },
  music: { glyph: 'music', emoji: '\u{1F3B5}', emojiId: '1f3b5' },
  gamepad: { glyph: 'gamepad', emoji: '\u{1F3AE}', emojiId: '1f3ae' },
  palette: { glyph: 'palette', emoji: '\u{1F3A8}', emojiId: '1f3a8' },
  code: { glyph: 'code', emoji: '\u{1F4BB}', emojiId: '1f4bb' },
  leaf: { glyph: 'leaf', emoji: '\u{1F33F}', emojiId: '1f33f' },
  gift: { glyph: 'gift', emoji: '\u{1F381}', emojiId: '1f381' },
  rocket: { glyph: 'rocket', emoji: '\u{1F680}', emojiId: '1f680' },
};

export const CATEGORY_META: Record<EmojiSystemCategoryId, EmojiCategoryMeta> = {
  recent: {
    label: 'Recent',
    icon: CATEGORY_GLYPH_META.recent,
  },
  smileys: {
    label: 'Smileys',
    icon: CATEGORY_GLYPH_META.smileys,
  },
  people: {
    label: 'People',
    icon: CATEGORY_GLYPH_META.people,
  },
  animals: {
    label: 'Animals',
    icon: CATEGORY_GLYPH_META.animals,
  },
  food: {
    label: 'Food',
    icon: CATEGORY_GLYPH_META.food,
  },
  activities: {
    label: 'Activities',
    icon: CATEGORY_GLYPH_META.activities,
  },
  travel: {
    label: 'Travel',
    icon: CATEGORY_GLYPH_META.travel,
  },
  objects: {
    label: 'Objects',
    icon: CATEGORY_GLYPH_META.objects,
  },
  symbols: {
    label: 'Symbols',
    icon: CATEGORY_GLYPH_META.symbols,
  },
  flags: {
    label: 'Flags',
    icon: CATEGORY_GLYPH_META.flags,
  },
  custom: {
    label: 'Custom',
    icon: CATEGORY_GLYPH_META.custom,
  },
};

const CATEGORY_ORDER_INDEX = Object.fromEntries(
  CATEGORY_ORDER.map((categoryId, index) => [categoryId, index]),
) as Record<string, number>;

const SYSTEM_CATEGORY_IDS = new Set(CATEGORY_ORDER);

export function isSystemCategoryId(
  categoryId: string,
): categoryId is EmojiSystemCategoryId {
  return SYSTEM_CATEGORY_IDS.has(categoryId as EmojiSystemCategoryId);
}

export function getDefaultCategoryOrder(
  categoryId: string,
  fallbackOrder = CATEGORY_ORDER.length,
) {
  return CATEGORY_ORDER_INDEX[categoryId] ?? fallbackOrder;
}

export function humanizeCategoryId(categoryId: string) {
  const normalized = categoryId
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

  if (!normalized) {
    return CATEGORY_META.custom.label;
  }

  return normalized.replace(/\b([a-z])/g, (letter) =>
    letter.toUpperCase(),
  );
}

export const DEFAULT_LABELS: EmojiPickerLabels = {
  searchPlaceholder: 'Search emoji, aliases, emoticons',
  noResultsTitle: 'Nothing found',
  noResultsBody: 'Try a shorter word, alias, or emoticon.',
  recents: 'Recent',
  custom: 'Custom',
  skinToneButton: 'Skin tone',
  clearSearch: 'Clear search',
};

export const SKIN_TONE_OPTIONS: Array<{
  tone: EmojiSkinTone;
  icon: string;
  label: string;
}> = [
  { tone: 'default', icon: '\u{1F91A}', label: 'Default' },
  { tone: 'light', icon: '\u{1F91A}\u{1F3FB}', label: 'Light' },
  {
    tone: 'medium-light',
    icon: '\u{1F91A}\u{1F3FC}',
    label: 'Medium light',
  },
  { tone: 'medium', icon: '\u{1F91A}\u{1F3FD}', label: 'Medium' },
  {
    tone: 'medium-dark',
    icon: '\u{1F91A}\u{1F3FE}',
    label: 'Medium dark',
  },
  { tone: 'dark', icon: '\u{1F91A}\u{1F3FF}', label: 'Dark' },
];
