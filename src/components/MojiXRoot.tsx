import type { CSSProperties, ReactNode } from 'react';
import { createContext, useContext, useMemo } from 'react';
import { SKIN_TONE_OPTIONS } from '../core/constants';
import { resolveEmojiAsset } from '../core/assets';
import type {
  EmojiAssetRenderContext,
  EmojiAssetSource,
  EmojiPickerColors,
  EmojiPickerProps,
  EmojiRenderable,
  EmojiResolvedAsset,
  EmojiSkinTone,
} from '../core/types';
import {
  getSlotClassName,
  getSlotStyle,
  type SlotStyleOptions,
} from './utils';
import {
  type EmojiPickerState,
  useEmojiPickerState,
} from './useEmojiPickerState';

const MojiXContext = createContext<EmojiPickerState | null>(null);

const retainedSpriteSheetStyle = {
  position: 'fixed',
  width: 1,
  height: 1,
  opacity: 0,
  pointerEvents: 'none',
  transform: 'translate(-9999px, -9999px)',
} satisfies CSSProperties;

export function useMojiXContext() {
  const context = useContext(MojiXContext);

  if (!context) {
    throw new Error('MojiX primitives must be used inside <MojiX.Root>.');
  }

  return context;
}

export function getContextSlotOptions(
  context: EmojiPickerState,
): SlotStyleOptions {
  return {
    unstyled: context.unstyled,
    classNames: context.classNames,
    styles: context.styles,
  };
}

export type RenderChild<T> = (props: T) => ReactNode;

export function renderChild<T>(
  child: ReactNode | RenderChild<T> | undefined,
  props: T,
) {
  if (typeof child === 'function') {
    return (child as RenderChild<T>)(props);
  }

  return child ?? null;
}

function getRootColorStyles(colors: EmojiPickerColors | undefined) {
  if (!colors) {
    return undefined;
  }

  return {
    ['--mx-accent' as string]: colors.accent,
    ['--mx-accent-soft' as string]: colors.accentSoft,
    ['--mx-hover' as string]: colors.hover,
    ['--mx-emoji-hover' as string]:
      typeof colors.emojiHover === 'string'
        ? colors.emojiHover
        : undefined,
    ['--mx-category-hover' as string]:
      typeof colors.categoryHover === 'string'
        ? colors.categoryHover
        : undefined,
    ['--mx-category-active-bg' as string]: colors.categoryActiveBg,
    ['--mx-category-active-color' as string]: colors.categoryActiveColor,
    ['--mx-scrollbar-thumb' as string]: colors.scrollbarThumb,
    ['--mx-scrollbar-thumb-hover' as string]:
      colors.scrollbarThumbHover ??
      (typeof colors.scrollbarThumb === 'string'
        ? `color-mix(in srgb, ${colors.scrollbarThumb} 82%, var(--mx-text) 18%)`
        : undefined),
  };
}

export interface MojiXRootProps
  extends Omit<EmojiPickerProps, 'children'> {
  children?: ReactNode | RenderChild<EmojiPickerState>;
}

export function MojiXRoot({
  children,
  value,
  searchQuery,
  defaultSearchQuery,
  onSearchQueryChange,
  searchConfig,
  activeCategory,
  defaultActiveCategory,
  onActiveCategoryChange,
  activeEmojiId,
  defaultActiveEmojiId,
  onActiveEmojiChange,
  emojiSize,
  columns,
  loading,
  onDataError,
  showPreview,
  showRecents,
  showSkinTones,
  recentLimit,
  recentStorageKey,
  recentStore,
  recent,
  skinToneStorageKey,
  locale,
  fallbackLocale,
  locales,
  skinTone,
  defaultSkinTone,
  onSkinToneChange,
  labels,
  colors,
  virtualization,
  loadCategoryShards,
  autoScrollCategoriesOnHover,
  categories,
  categoryIcons,
  categoryIconStyle,
  spriteSheet,
  assetSource,
  gridAssetSource,
  previewAssetSource,
  customEmojis,
  emptyState,
  unstyled,
  classNames,
  styles,
  renderEmoji,
  renderPreview,
  renderCategoryIcon,
  onEmojiSelect,
  className,
  style,
  ...rest
}: MojiXRootProps) {
  const state = useEmojiPickerState({
    value,
    searchQuery,
    defaultSearchQuery,
    onSearchQueryChange,
    searchConfig,
    activeCategory,
    defaultActiveCategory,
    onActiveCategoryChange,
    activeEmojiId,
    defaultActiveEmojiId,
    onActiveEmojiChange,
    emojiSize,
    columns,
    loading,
    onDataError,
    showPreview,
    showRecents,
    showSkinTones,
    recentLimit,
    recentStorageKey,
    recentStore,
    recent,
    skinToneStorageKey,
    locale,
    fallbackLocale,
    locales,
    skinTone,
    defaultSkinTone,
    onSkinToneChange,
    labels,
    colors,
    virtualization,
    loadCategoryShards,
    autoScrollCategoriesOnHover,
    categories,
    categoryIcons,
    categoryIconStyle,
    spriteSheet,
    assetSource,
    gridAssetSource,
    previewAssetSource,
    customEmojis,
    emptyState,
    unstyled,
    classNames,
    styles,
    renderEmoji,
    renderPreview,
    renderCategoryIcon,
    onEmojiSelect,
  });
  const slotOptions = getContextSlotOptions(state);
  const rootColorStyles = getRootColorStyles(colors);

  return (
    <MojiXContext.Provider value={state}>
      <div
        {...rest}
        className={getSlotClassName('root', slotOptions, className)}
        style={getSlotStyle(
          'root',
          slotOptions,
          {
            ['--mx-emoji-size' as string]: `${state.emojiSize}px`,
            ['--mx-columns' as string]: `${state.columns}`,
          },
          rootColorStyles,
          style,
        )}
        data-mx-slot="root"
        data-mx-unstyled={state.unstyled ? 'true' : undefined}
        data-loading={state.loading ? 'true' : undefined}
      >
        {state.retainedSpriteSheetUrl ? (
          <img
            src={state.retainedSpriteSheetUrl}
            alt=""
            aria-hidden="true"
            decoding="async"
            loading="eager"
            style={retainedSpriteSheetStyle}
          />
        ) : null}
        {renderChild(children, state)}
      </div>
    </MojiXContext.Provider>
  );
}

export function useMojiX() {
  return useMojiXContext();
}

export function useEmojiSearch() {
  const context = useMojiXContext();

  return {
    searchId: context.searchId,
    searchQuery: context.searchQuery,
    setSearchQuery: context.setSearchQuery,
    labels: context.labelSet,
  };
}

export function useEmojiCategories() {
  const context = useMojiXContext();

  return {
    sections: context.sections,
    activeCategory: context.activeCategory,
    setActiveCategory: context.setActiveCategory,
    selectCategory: context.handleCategoryClick,
  };
}

export function useActiveEmoji() {
  const context = useMojiXContext();

  return {
    emoji: context.previewEmoji,
    selection: context.previewSelection,
    hoveredEmoji: context.hoveredEmoji,
    setHoveredEmoji: context.setHoveredEmoji,
    activeEmojiId: context.activeEmojiId,
    setActiveEmojiId: context.setActiveEmojiId,
  };
}

export interface UseEmojiAssetsResult {
  spriteSheet: ReturnType<typeof useMojiXContext>['activeSpriteSheet'];
  gridAssetSource: EmojiAssetSource | undefined;
  previewAssetSource: EmojiAssetSource | undefined;
  resolve: (
    emoji: EmojiRenderable,
    options?: {
      skinTone?: EmojiSkinTone;
      context?: EmojiAssetRenderContext;
      assetSource?: EmojiAssetSource;
    },
  ) => EmojiResolvedAsset | null;
}

export function useEmojiAssets(): UseEmojiAssetsResult {
  const context = useMojiXContext();

  return useMemo(
    () => ({
      spriteSheet: context.activeSpriteSheet,
      gridAssetSource: context.gridAssetSource,
      previewAssetSource: context.previewAssetSource,
      resolve(emoji, options = {}) {
        const renderContext = options.context ?? 'grid';
        const source =
          options.assetSource ??
          (renderContext === 'preview'
            ? context.previewAssetSource
            : context.gridAssetSource);

        return resolveEmojiAsset({
          emoji,
          skinTone: options.skinTone ?? context.skinTone,
          context: renderContext,
          spriteSheet: context.activeSpriteSheet,
          assetSource: source,
        });
      },
    }),
    [
      context.activeSpriteSheet,
      context.gridAssetSource,
      context.previewAssetSource,
      context.skinTone,
    ],
  );
}

export function useSkinTone() {
  const context = useMojiXContext();

  return {
    skinTone: context.skinTone,
    setSkinTone: context.setSkinTone,
    options: SKIN_TONE_OPTIONS,
    labels: context.labelSet,
    localeDefinition: context.localeDefinition,
  };
}

export function useEmojiSelection() {
  const context = useMojiXContext();

  return {
    value: context.value,
    selectEmoji: context.handleSelectEmoji,
  };
}
