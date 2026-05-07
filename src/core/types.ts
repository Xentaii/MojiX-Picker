import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

export type EmojiVendor =
  | 'apple'
  | 'google'
  | 'twitter'
  | 'facebook'
  | (string & {});

export type EmojiLocaleCode =
  | 'de'
  | 'en'
  | 'es'
  | 'fr'
  | 'ja'
  | 'pt'
  | 'ru'
  | 'uk'
  | (string & {});

export type EmojiSkinTone =
  | 'default'
  | 'light'
  | 'medium-light'
  | 'medium'
  | 'medium-dark'
  | 'dark';

export type EmojiSystemCategoryId =
  | 'recent'
  | 'smileys'
  | 'people'
  | 'animals'
  | 'food'
  | 'activities'
  | 'travel'
  | 'objects'
  | 'symbols'
  | 'flags'
  | 'custom';

export type EmojiCategoryId =
  | EmojiSystemCategoryId
  | (string & {});

export type BuiltInEmojiCategoryId = Exclude<
  EmojiSystemCategoryId,
  'recent' | 'custom'
>;

export type EmojiCategoryIconGlyph =
  | EmojiSystemCategoryId
  | 'sparkles'
  | 'star'
  | 'heart'
  | 'bolt'
  | 'music'
  | 'gamepad'
  | 'palette'
  | 'code'
  | 'leaf'
  | 'gift'
  | 'rocket';

export type EmojiCategoryIconPreset =
  | 'solid'
  | 'outline'
  | 'mono-filled'
  | 'mono-outline'
  | 'native'
  | 'picker'
  | EmojiVendor;

export interface EmojiCategoryIconConfig {
  glyph?: EmojiCategoryIconGlyph;
  emoji?: string;
  emojiId?: string;
  style?: EmojiCategoryIconPreset;
}

export type EmojiCategoryIconInput =
  | EmojiCategoryIconGlyph
  | string
  | EmojiCategoryIconConfig;

export type EmojiCategoryIconsMap = Partial<
  Record<string, EmojiCategoryIconInput>
>;

export type EmojiSpriteSheetVariant =
  | 'default'
  | 'indexed-128'
  | 'indexed-256'
  | 'clean';

export type EmojiSpriteSheetSource = 'cdn' | 'local' | 'custom';

export type EmojiSpriteSheetCacheMode = 'off' | 'browser' | 'custom';

export interface EmojiSkinVariant {
  tone: Exclude<EmojiSkinTone, 'default'>;
  unified: string;
  native: string;
  sheetX: number;
  sheetY: number;
}

export interface UnicodeEmojiAvailability {
  apple: boolean;
  google: boolean;
  twitter: boolean;
  facebook: boolean;
}

export type EmojiVendorAvailability =
  | readonly string[]
  | ReadonlySet<string>
  | {
      missing?: readonly string[];
      unavailable?: readonly string[];
    };

export interface UnicodeEmoji {
  kind: 'unicode';
  id: string;
  unified: string;
  native: string;
  name: string;
  aliases: string[];
  emoticons: string[];
  searchTokens: string[];
  categoryId: BuiltInEmojiCategoryId;
  categoryLabel: string;
  subcategory: string;
  sheetX: number;
  sheetY: number;
  availability: UnicodeEmojiAvailability;
  skins: EmojiSkinVariant[];
}

export interface CustomEmojiSprite {
  sheetUrl?: string;
  sheetX: number;
  sheetY: number;
  sheetSize?: number;
  padding?: number;
  gridSize?: number;
}

export interface CustomEmoji {
  id: string;
  name: string;
  native?: string;
  shortcodes?: string[];
  keywords?: string[];
  emoticons?: string[];
  categoryId?: EmojiCategoryId;
  categoryLabel?: string;
  imageUrl?: string;
  sprite?: CustomEmojiSprite;
}

export interface PreparedCustomEmoji extends CustomEmoji {
  kind: 'custom';
  shortcodes: string[];
  emoticons: string[];
  searchTokens: string[];
  categoryId: EmojiCategoryId;
  categoryLabel: string;
}

export type EmojiRenderable = UnicodeEmoji | PreparedCustomEmoji;

export interface ResolvedEmojiCategoryIcon {
  glyph: EmojiCategoryIconGlyph;
  emoji: string;
  emojiId?: string;
  style: EmojiCategoryIconPreset;
  renderable?: EmojiRenderable | null;
}

export interface EmojiCategoryIconRenderProps {
  categoryId: EmojiCategoryId;
  label: string;
  icon: ResolvedEmojiCategoryIcon;
  context: 'sidebar' | 'section';
  size: number;
  active: boolean;
  spriteSheet?: EmojiSpriteSheetConfig;
}

export interface EmojiSelection {
  id: string;
  name: string;
  englishName: string;
  native?: string;
  unified?: string;
  shortcodes: string[];
  emoticons: string[];
  categoryId: EmojiCategoryId;
  categoryLabel: string;
  englishCategoryLabel: string;
  custom: boolean;
  imageUrl?: string;
  skinTone: EmojiSkinTone;
  locale: EmojiLocaleCode;
}

export interface EmojiSpriteSheetContext {
  vendor: EmojiVendor;
  sheetSize: number;
  variant: EmojiSpriteSheetVariant;
  source: EmojiSpriteSheetSource;
  version: string;
  packageName: string;
  basePath: string;
}

export interface EmojiSpriteSheetCacheRequest {
  key: string;
  url: string;
  vendor: EmojiVendor;
  sheetSize: number;
  variant: EmojiSpriteSheetVariant;
  source: EmojiSpriteSheetSource;
  version: string;
  packageName: string;
}

export interface EmojiSpriteSheetCachedAsset {
  url: string;
  cached: boolean;
  release?: () => void;
}

export interface EmojiSpriteSheetCacheAdapter {
  load: (
    request: EmojiSpriteSheetCacheRequest,
  ) => Promise<EmojiSpriteSheetCachedAsset | null>;
  save: (
    request: EmojiSpriteSheetCacheRequest,
    response: Response,
  ) => Promise<EmojiSpriteSheetCachedAsset>;
}

export interface EmojiSpriteSheetCacheConfig {
  enabled?: boolean;
  mode?: EmojiSpriteSheetCacheMode;
  preload?: 'mount' | 'manual';
  key?: string;
  adapter?: EmojiSpriteSheetCacheAdapter;
}

export interface EmojiSpriteSheetConfig {
  url?: string | ((context: EmojiSpriteSheetContext) => string);
  vendor?: EmojiVendor;
  availability?: EmojiVendorAvailability;
  sheetSize?: number;
  padding?: number;
  gridSize?: number;
  variant?: EmojiSpriteSheetVariant;
  fallbackNative?: boolean;
  source?: EmojiSpriteSheetSource;
  version?: string;
  packageName?: string;
  basePath?: string;
  cache?: EmojiSpriteSheetCacheConfig;
}

export interface EmojiPickerLabels {
  searchPlaceholder: string;
  noResultsTitle: string;
  noResultsBody: string;
  recents: string;
  custom: string;
  skinToneButton: string;
  clearSearch: string;
}

export interface EmojiLocaleEmojiTranslation {
  name: string;
  keywords?: string[];
}

export type EmojiLocaleSearchIndex = Record<string, string[]>;

export type EmojiLocaleCategoryLabels =
  Record<EmojiSystemCategoryId, string> &
  Record<string, string>;

export interface EmojiLocaleDefinition {
  code: EmojiLocaleCode;
  labels: EmojiPickerLabels;
  categories: EmojiLocaleCategoryLabels;
  skinTones: Record<EmojiSkinTone, string>;
  emoji: Record<string, EmojiLocaleEmojiTranslation>;
}

export interface EmojiRecentStore {
  read: () => RecentEmojiRecord[];
  push: (
    entry: Pick<RecentEmojiRecord, 'id' | 'custom' | 'skinTone'>,
    limit?: number,
  ) => RecentEmojiRecord[];
}

export interface EmojiSearchTokenizeContext {
  emoji: EmojiRenderable;
  localeDefinition: EmojiLocaleDefinition;
}

export interface EmojiSearchRankContext {
  emoji: EmojiRenderable;
  query: string;
  queryTerms: string[];
  tokens: string[];
  localeDefinition: EmojiLocaleDefinition;
}

export interface EmojiSearchConfigLike {
  tokenize?: (context: EmojiSearchTokenizeContext) => string[];
  normalize?: (value: string) => string;
  rank?: (context: EmojiSearchRankContext) => number;
}

export interface EmojiCategoryConfig {
  label?: string;
  icon?: EmojiCategoryIconInput;
  iconStyle?: EmojiCategoryIconPreset;
  hidden?: boolean;
  order?: number;
}

export interface EmojiRecentCategoryConfig {
  enabled?: boolean;
  limit?: number;
  showWhenEmpty?: boolean;
  defaultActive?: boolean;
  sort?: 'recent' | 'frequent';
  emptyEmojiIds?: string[];
  storageKey?: string;
  store?: EmojiRecentStore;
}

export interface EmojiRenderState {
  active: boolean;
  selected: boolean;
  skinTone: EmojiSkinTone;
  size: number;
}

export type EmojiAssetRenderContext = 'grid' | 'preview';

export interface EmojiAssetRequest {
  emoji: EmojiRenderable;
  skinTone: EmojiSkinTone;
  context: EmojiAssetRenderContext;
  spriteSheet?: EmojiSpriteSheetConfig;
}

export interface EmojiNativeAsset {
  kind: 'native';
  native: string;
}

export interface EmojiSpriteAsset {
  kind: 'sprite';
  sheetX: number;
  sheetY: number;
  spriteSheet?: EmojiSpriteSheetConfig;
  sheetUrl?: string;
  sheetSize?: number;
  padding?: number;
  gridSize?: number;
}

export interface EmojiImageAsset {
  kind: 'image';
  src: string;
  alt?: string;
}

export interface EmojiSvgAsset {
  kind: 'svg';
  src: string;
  alt?: string;
}

export type EmojiResolvedAsset =
  | EmojiNativeAsset
  | EmojiSpriteAsset
  | EmojiImageAsset
  | EmojiSvgAsset;

export interface EmojiImageAssetSource {
  type: 'image';
  resolveUrl: (
    request: EmojiAssetRequest,
  ) => string | null | undefined;
}

export interface EmojiSvgAssetSource {
  type: 'svg';
  resolveUrl: (
    request: EmojiAssetRequest,
  ) => string | null | undefined;
}

export interface EmojiNativeAssetSource {
  type: 'native';
}

export interface EmojiSpriteSheetAssetSource {
  type: 'spriteSheet';
  spriteSheet?: EmojiSpriteSheetConfig;
}

export interface EmojiMixedAssetSource {
  type: 'mixed';
  unicode?: EmojiAssetSource;
  custom?: EmojiAssetSource;
  fallback?: EmojiAssetSource;
}

export type EmojiAssetSource =
  | EmojiImageAssetSource
  | EmojiSvgAssetSource
  | EmojiNativeAssetSource
  | EmojiSpriteSheetAssetSource
  | EmojiMixedAssetSource;

export type EmojiPickerSlot =
  | 'root'
  | 'panel'
  | 'viewport'
  | 'toolbar'
  | 'search'
  | 'searchIcon'
  | 'searchInput'
  | 'searchClear'
  | 'tonePicker'
  | 'toneButton'
  | 'toneMenu'
  | 'toneOption'
  | 'content'
  | 'section'
  | 'sectionHeader'
  | 'sectionIcon'
  | 'grid'
  | 'gridPlaceholder'
  | 'emoji'
  | 'preview'
  | 'previewCard'
  | 'previewCopy'
  | 'previewHeading'
  | 'previewSubline'
  | 'previewMeta'
  | 'footer'
  | 'chip'
  | 'chipMuted'
  | 'empty'
  | 'loading'
  | 'sidebar'
  | 'navButton';

export type EmojiPickerClassNames = Partial<
  Record<EmojiPickerSlot, string>
>;

export type EmojiPickerStyles = Partial<
  Record<EmojiPickerSlot, CSSProperties>
>;

export interface EmojiPickerColors {
  accent?: string;
  accentSoft?: string;
  hover?: string;
  emojiHover?:
    | string
    | ((emoji: EmojiRenderable, state: EmojiRenderState) => string | undefined);
  categoryHover?:
    | string
    | ((categoryId: EmojiCategoryId) => string | undefined);
  categoryActiveBg?: string;
  categoryActiveColor?: string;
  scrollbarThumb?: string;
  scrollbarThumbHover?: string;
}

export interface EmojiPickerVirtualization {
  enabled?: boolean;
  overscanRows?: number;
  /**
   * When `true` (default), the rendered window expands during fast scrolling
   * to keep upcoming rows mounted, and contracts when idle to reduce DOM
   * pressure. Set to `false` to keep `overscanRows` constant regardless of
   * scroll velocity.
   */
  adaptiveOverscan?: boolean;
}

export interface EmojiPickerProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  colors?: EmojiPickerColors;
  virtualization?: boolean | EmojiPickerVirtualization;
  /**
   * When `true`, the picker fetches missing per-category data shards on
   * demand as the user navigates between categories. Use together with
   * {@link preloadEmojiPicker} `{ shards: [...] }` to ship a smaller initial
   * payload and lazy-load the rest.
   */
  loadCategoryShards?: boolean;
  autoScrollCategoriesOnHover?: boolean;
  value?: string;
  searchQuery?: string;
  defaultSearchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  searchConfig?: EmojiSearchConfigLike;
  activeCategory?: EmojiCategoryId;
  defaultActiveCategory?: EmojiCategoryId;
  onActiveCategoryChange?: (categoryId: EmojiCategoryId) => void;
  activeEmojiId?: string | null;
  defaultActiveEmojiId?: string | null;
  onActiveEmojiChange?: (emojiId: string | null) => void;
  emojiSize?: number;
  columns?: number;
  loading?: boolean;
  onDataError?: (error: unknown) => void;
  showPreview?: boolean;
  showRecents?: boolean;
  showSkinTones?: boolean;
  recentLimit?: number;
  recentStorageKey?: string;
  recentStore?: EmojiRecentStore;
  recent?: EmojiRecentCategoryConfig;
  skinToneStorageKey?: string;
  locale?: EmojiLocaleCode;
  fallbackLocale?: EmojiLocaleCode | EmojiLocaleCode[];
  locales?: Partial<Record<string, Partial<EmojiLocaleDefinition>>>;
  skinTone?: EmojiSkinTone;
  defaultSkinTone?: EmojiSkinTone;
  onSkinToneChange?: (tone: EmojiSkinTone) => void;
  labels?: Partial<EmojiPickerLabels>;
  categories?: Partial<Record<string, EmojiCategoryConfig>>;
  categoryIcons?: EmojiCategoryIconsMap;
  categoryIconStyle?: EmojiCategoryIconPreset;
  spriteSheet?: EmojiSpriteSheetConfig;
  assetSource?: EmojiAssetSource;
  gridAssetSource?: EmojiAssetSource;
  previewAssetSource?: EmojiAssetSource;
  customEmojis?: CustomEmoji[];
  emptyState?: ReactNode;
  unstyled?: boolean;
  classNames?: EmojiPickerClassNames;
  styles?: EmojiPickerStyles;
  renderEmoji?: (
    emoji: EmojiRenderable,
    state: EmojiRenderState,
  ) => ReactNode;
  renderPreview?: (
    emoji: EmojiRenderable,
    selection: EmojiSelection,
  ) => ReactNode;
  renderCategoryIcon?: (
    props: EmojiCategoryIconRenderProps,
  ) => ReactNode;
  onEmojiSelect?: (emoji: EmojiSelection) => void;
  style?: CSSProperties;
}

export interface EmojiSection {
  id: EmojiCategoryId;
  label: string;
  icon: ResolvedEmojiCategoryIcon;
  emojis: EmojiRenderable[];
}

export interface EmojiCategoryMeta {
  label: string;
  icon: EmojiCategoryIconConfig;
}

export interface RecentEmojiRecord {
  id: string;
  custom: boolean;
  skinTone: EmojiSkinTone;
  count: number;
  usedAt: number;
}
