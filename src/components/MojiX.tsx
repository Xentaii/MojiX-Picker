import { useEffect, type HTMLAttributes } from 'react';
import { SKIN_TONE_OPTIONS } from '../core/constants';
import type {
  EmojiCategoryId,
  EmojiPickerProps,
  EmojiRenderable,
  EmojiSelection,
  EmojiSkinTone,
} from '../core/types';
import { EmojiGrid } from './EmojiGrid';
import { EmojiPreview } from './EmojiPreview';
import { EmojiSearchField } from './EmojiSearchField';
import { EmojiSidebar } from './EmojiSidebar';
import { EmojiSkinToneButton } from './EmojiSkinToneButton';
import { preloadVirtualizedEmojiGrid } from './virtualizedGridLoader';
import {
  getSlotClassName,
  getSlotStyle,
} from './utils';
import {
  MojiXRoot,
  getContextSlotOptions,
  renderChild,
  useActiveEmoji,
  useEmojiCategories,
  useEmojiSearch,
  useMojiXContext,
  useSkinTone,
  type RenderChild,
} from './MojiXRoot';
import type { EmojiPickerState } from './useEmojiPickerState';

function shouldPreloadVirtualizedGrid(
  virtualization: EmojiPickerProps['virtualization'],
) {
  return !(
    virtualization === false ||
    (typeof virtualization === 'object' && virtualization.enabled === false)
  );
}

export {
  MojiXRoot,
  useActiveEmoji,
  useEmojiAssets,
  useEmojiCategories,
  useEmojiSearch,
  useEmojiSelection,
  useMojiX,
  useSkinTone,
} from './MojiXRoot';
export type {
  MojiXRootProps,
  UseEmojiAssetsResult,
} from './MojiXRoot';

export interface MojiXSearchProps {
  children?: RenderChild<ReturnType<typeof useEmojiSearch>>;
}

export function MojiXSearch({ children }: MojiXSearchProps) {
  const context = useMojiXContext();
  const search = useEmojiSearch();

  if (children) {
    return <>{children(search)}</>;
  }

  return (
    <EmojiSearchField
      searchId={context.searchId}
      searchQuery={context.searchQuery}
      onSearchChange={context.setSearchQuery}
      labels={context.labelSet}
      unstyled={context.unstyled}
      classNames={context.classNames}
      styles={context.styles}
    />
  );
}

export interface MojiXViewportProps
  extends HTMLAttributes<HTMLDivElement> {}

export function MojiXViewport({
  className,
  style,
  children,
  ...rest
}: MojiXViewportProps) {
  const context = useMojiXContext();
  const slotOptions = getContextSlotOptions(context);

  return (
    <div
      {...rest}
      className={getSlotClassName('viewport', slotOptions, className)}
      style={getSlotStyle('viewport', slotOptions, style)}
      data-mx-slot="viewport"
    >
      {children}
    </div>
  );
}

export interface MojiXListProps {
  renderEmoji?: EmojiPickerProps['renderEmoji'];
  emptyState?: EmojiPickerProps['emptyState'];
  showEmptyState?: boolean;
}

export function MojiXList({
  renderEmoji,
  emptyState,
  showEmptyState = false,
}: MojiXListProps) {
  const context = useMojiXContext();

  useEffect(() => {
    if (shouldPreloadVirtualizedGrid(context.virtualization)) {
      preloadVirtualizedEmojiGrid();
    }
  }, [context.virtualization]);

  return (
    <EmojiGrid
      ref={context.gridRef}
      sections={context.sections}
      emojiSize={context.emojiSize}
      columns={context.columns}
      skinTone={context.skinTone}
      value={context.value}
      spriteSheet={context.activeSpriteSheet}
      assetSource={context.gridAssetSource}
      localeDefinition={context.localeDefinition}
      renderEmoji={renderEmoji ?? context.renderEmoji}
      renderCategoryIcon={context.renderCategoryIcon}
      onEmojiSelect={context.handleSelectEmoji}
      onEmojiHover={context.handleEmojiHover}
      onActiveCategoryChange={context.handleActiveCategoryChange}
      hoveredEmojiId={context.hoveredEmoji?.id ?? null}
      virtualization={context.virtualization}
      emptyState={emptyState ?? context.emptyState}
      hideEmptyState={!showEmptyState}
      labels={context.labelSet}
      unstyled={context.unstyled}
      classNames={context.classNames}
      styles={context.styles}
      resolveEmojiHoverColor={context.resolveEmojiHoverColor}
    />
  );
}

export interface MojiXEmptyProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  children?: RenderChild<{ sections: number }>;
}

export function MojiXEmpty({
  className,
  style,
  children,
  ...rest
}: MojiXEmptyProps) {
  const context = useMojiXContext();
  const slotOptions = getContextSlotOptions(context);

  if (context.loading || context.sections.length > 0) {
    return null;
  }

  return (
    <div
      {...rest}
      className={getSlotClassName('empty', slotOptions, className)}
      style={getSlotStyle('empty', slotOptions, style)}
      data-mx-slot="empty"
    >
      {renderChild(children, { sections: context.sections.length }) ??
        context.emptyState ?? (
          <>
            <strong>{context.labelSet.noResultsTitle}</strong>
            <span>{context.labelSet.noResultsBody}</span>
          </>
        )}
    </div>
  );
}

export interface MojiXLoadingProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  children?: RenderChild<{ loading: boolean }>;
}

export function MojiXLoading({
  className,
  style,
  children,
  ...rest
}: MojiXLoadingProps) {
  const context = useMojiXContext();
  const slotOptions = getContextSlotOptions(context);

  if (!context.loading) {
    return null;
  }

  return (
    <div
      {...rest}
      className={getSlotClassName('loading', slotOptions, className)}
      style={getSlotStyle('loading', slotOptions, style)}
      data-mx-slot="loading"
    >
      {renderChild(children, { loading: context.loading }) ??
        'Loading emoji...'}
    </div>
  );
}

export interface MojiXFooterProps
  extends HTMLAttributes<HTMLDivElement> {}

export function MojiXFooter({
  className,
  style,
  children,
  ...rest
}: MojiXFooterProps) {
  const context = useMojiXContext();
  const slotOptions = getContextSlotOptions(context);

  return (
    <div
      {...rest}
      className={getSlotClassName('footer', slotOptions, className)}
      style={getSlotStyle('footer', slotOptions, style)}
      data-mx-slot="footer"
    >
      {children}
    </div>
  );
}

export interface MojiXCategoryNavProps {
  children?: RenderChild<{
    sections: EmojiPickerState['sections'];
    activeCategory: EmojiCategoryId;
    setActiveCategory: (categoryId: EmojiCategoryId) => void;
    selectCategory: (categoryId: EmojiCategoryId) => void;
  }>;
}

export function MojiXCategoryNav({ children }: MojiXCategoryNavProps) {
  const context = useMojiXContext();
  const categoryState = useEmojiCategories();

  if (children) {
    return <>{children(categoryState)}</>;
  }

  return (
    <EmojiSidebar
      sections={context.sections}
      activeCategory={context.activeCategory}
      onCategoryClick={context.handleCategoryClick}
      renderCategoryIcon={context.renderCategoryIcon}
      spriteSheet={context.activeSpriteSheet}
      unstyled={context.unstyled}
      classNames={context.classNames}
      styles={context.styles}
      resolveCategoryHoverColor={context.resolveCategoryHoverColor}
      autoScrollOnHover={context.autoScrollCategoriesOnHover}
    />
  );
}

export interface MojiXActiveEmojiProps {
  children?: RenderChild<{
    emoji: EmojiRenderable | null;
    selection: EmojiSelection | null;
  }>;
  renderPreview?: EmojiPickerProps['renderPreview'];
}

export function MojiXActiveEmoji({
  children,
  renderPreview,
}: MojiXActiveEmojiProps) {
  const context = useMojiXContext();
  const activeEmoji = useActiveEmoji();

  if (children) {
    return <>{children(activeEmoji)}</>;
  }

  return (
    <EmojiPreview
      emoji={context.previewEmoji}
      selection={context.previewSelection}
      spriteSheet={context.activeSpriteSheet}
      assetSource={context.previewAssetSource}
      renderPreview={renderPreview ?? context.renderPreview}
      unstyled={context.unstyled}
      classNames={context.classNames}
      styles={context.styles}
    />
  );
}

export interface MojiXSkinToneProps {
  children?: RenderChild<{
    skinTone: EmojiSkinTone;
    setSkinTone: (tone: EmojiSkinTone) => void;
    options: typeof SKIN_TONE_OPTIONS;
  }>;
}

export function MojiXSkinTone({ children }: MojiXSkinToneProps) {
  const skinToneState = useSkinTone();

  if (children) {
    return (
      <>{children({
        skinTone: skinToneState.skinTone,
        setSkinTone: skinToneState.setSkinTone,
        options: skinToneState.options,
      })}</>
    );
  }

  return <MojiXSkinToneButton />;
}

export interface MojiXSkinToneButtonProps {
  children?: RenderChild<ReturnType<typeof useSkinTone>>;
}

export function MojiXSkinToneButton({
  children,
}: MojiXSkinToneButtonProps = {}) {
  const context = useMojiXContext();
  const skinToneState = useSkinTone();

  if (children) {
    return <>{children(skinToneState)}</>;
  }

  return (
    <EmojiSkinToneButton
      skinTone={context.skinTone}
      onSkinToneChange={context.setSkinTone}
      labels={context.labelSet}
      localeDefinition={context.localeDefinition}
      spriteSheet={context.activeSpriteSheet}
      assetSource={context.gridAssetSource}
      unstyled={context.unstyled}
      classNames={context.classNames}
      styles={context.styles}
    />
  );
}

export const MojiX = {
  Root: MojiXRoot,
  Search: MojiXSearch,
  Viewport: MojiXViewport,
  List: MojiXList,
  Empty: MojiXEmpty,
  Loading: MojiXLoading,
  Footer: MojiXFooter,
  CategoryNav: MojiXCategoryNav,
  ActiveEmoji: MojiXActiveEmoji,
  SkinTone: MojiXSkinTone,
  SkinToneButton: MojiXSkinToneButton,
} as const;
