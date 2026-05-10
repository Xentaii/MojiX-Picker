import {
  memo,
  type CSSProperties,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getLocalizedEmojiName } from '../core/i18n';
import type {
  EmojiAssetSource,
  EmojiCategoryIconRenderProps,
  EmojiCategoryId,
  EmojiLocaleDefinition,
  EmojiPickerClassNames,
  EmojiPickerStyles,
  EmojiPickerVirtualization,
  EmojiRenderable,
  EmojiRenderState,
  EmojiSection,
  EmojiSkinTone,
  EmojiSpriteSheetConfig,
} from '../core/types';
import { EmojiCategoryIcon } from './EmojiCategoryIcon';
import { EmojiSprite } from './EmojiSprite';
import {
  computeAdaptiveOverscanRows,
  computeEmojiGridPlaceholderHeight,
  computeEmojiGridVirtualWindow,
  createFullEmojiGridVirtualWindow,
  estimateEmojiGridRowHeight,
  expandEmojiGridVirtualWindow,
  findEmojiGridActiveSectionId,
  getEmojiGridRowCount,
  resolveEmojiGridVirtualization,
  type EmojiGridVirtualWindow,
} from './gridVirtualization';
import {
  formatEmojiName,
  getSlotClassName,
  getSlotStyle,
} from './utils';

export interface EmojiGridHandle {
  scrollToCategory: (
    id: EmojiCategoryId,
    options?: { behavior?: 'instant' | 'smooth' },
  ) => void;
}

export interface EmojiGridProps {
  ref?: Ref<EmojiGridHandle>;
  sections: EmojiSection[];
  emojiSize: number;
  columns: number;
  skinTone: EmojiSkinTone;
  value?: string;
  spriteSheet: EmojiSpriteSheetConfig;
  assetSource?: EmojiAssetSource;
  localeDefinition: EmojiLocaleDefinition;
  renderEmoji?: (
    emoji: EmojiRenderable,
    state: EmojiRenderState,
  ) => ReactNode;
  renderCategoryIcon?: (
    props: EmojiCategoryIconRenderProps,
  ) => ReactNode;
  onEmojiSelect: (emoji: EmojiRenderable) => void;
  onEmojiHover: (emoji: EmojiRenderable | null) => void;
  onActiveCategoryChange: (id: EmojiCategoryId) => void;
  hoveredEmojiId: string | null;
  virtualization?: boolean | EmojiPickerVirtualization;
  emptyState?: ReactNode;
  hideEmptyState?: boolean;
  labels: {
    noResultsTitle: string;
    noResultsBody: string;
  };
  unstyled?: boolean;
  classNames?: EmojiPickerClassNames;
  styles?: EmojiPickerStyles;
  resolveEmojiHoverColor?: (
    emoji: EmojiRenderable,
    state: EmojiRenderState,
  ) => string | undefined;
}

interface TabStop {
  sectionIndex: number;
  emojiIndex: number;
}

interface PreparedSection {
  section: EmojiSection;
  sectionIndex: number;
  rowCount: number;
}

interface MeasuredSectionLayout {
  id: EmojiCategoryId;
  sectionTop: number;
  gridTop: number;
  rowHeight: number;
  rowGap: number;
}

interface EmojiGridLayoutMetrics {
  paddingTop: number;
  sections: MeasuredSectionLayout[];
  byId: Record<string, MeasuredSectionLayout>;
}

const EMPTY_LAYOUT_METRICS: EmojiGridLayoutMetrics = {
  paddingTop: 0,
  sections: [],
  byId: {},
};

function getContainerPaddingTop(container: HTMLDivElement) {
  return Number.parseFloat(window.getComputedStyle(container).paddingTop) || 0;
}

function getScrollBehavior(mode: 'instant' | 'smooth' = 'smooth') {
  if (mode === 'instant') {
    return 'auto' as const;
  }

  if (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return 'auto' as const;
  }

  return 'smooth' as const;
}

function setContainerScrollTop(
  container: HTMLDivElement,
  top: number,
  behavior: 'instant' | 'smooth',
) {
  if (behavior === 'instant') {
    const previousInlineBehavior = container.style.scrollBehavior;
    container.style.scrollBehavior = 'auto';
    container.scrollTop = top;

    if (previousInlineBehavior) {
      container.style.scrollBehavior = previousInlineBehavior;
    } else {
      container.style.removeProperty('scroll-behavior');
    }
    return;
  }

  container.scrollTo({ top, behavior: getScrollBehavior('smooth') });
}

function getElementScrollTop(
  container: HTMLDivElement,
  element: HTMLElement,
) {
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const paddingTop = getContainerPaddingTop(container);

  return Math.max(
    container.scrollTop + elementRect.top - containerRect.top - paddingTop,
    0,
  );
}

function getInitialTabStop(sections: EmojiSection[]) {
  const sectionIndex = sections.findIndex(
    (section) => section.emojis.length > 0,
  );

  if (sectionIndex < 0) {
    return null;
  }

  return {
    sectionIndex,
    emojiIndex: 0,
  } satisfies TabStop;
}

function isSameTabStop(left: TabStop | null, right: TabStop | null) {
  return (
    left?.sectionIndex === right?.sectionIndex &&
    left?.emojiIndex === right?.emojiIndex
  );
}

function areVirtualWindowsEqual(
  left: Record<string, EmojiGridVirtualWindow>,
  right: Record<string, EmojiGridVirtualWindow>,
) {
  const leftEntries = Object.entries(left);
  const rightEntries = Object.entries(right);

  if (leftEntries.length !== rightEntries.length) {
    return false;
  }

  return leftEntries.every(([key, leftWindow]) => {
    const rightWindow = right[key];

    if (!rightWindow) {
      return false;
    }

    return (
      leftWindow.startRow === rightWindow.startRow &&
      leftWindow.endRow === rightWindow.endRow &&
      leftWindow.beforeRows === rightWindow.beforeRows &&
      leftWindow.afterRows === rightWindow.afterRows &&
      leftWindow.rowHeight === rightWindow.rowHeight &&
      leftWindow.rowGap === rightWindow.rowGap
    );
  });
}

function areLayoutMetricsEqual(
  left: EmojiGridLayoutMetrics,
  right: EmojiGridLayoutMetrics,
) {
  if (
    left.paddingTop !== right.paddingTop ||
    left.sections.length !== right.sections.length
  ) {
    return false;
  }

  return left.sections.every((leftSection, index) => {
    const rightSection = right.sections[index];

    if (!rightSection) {
      return false;
    }

    return (
      leftSection.id === rightSection.id &&
      leftSection.sectionTop === rightSection.sectionTop &&
      leftSection.gridTop === rightSection.gridTop &&
      leftSection.rowHeight === rightSection.rowHeight &&
      leftSection.rowGap === rightSection.rowGap
    );
  });
}

function createLayoutMetrics(
  paddingTop: number,
  sections: MeasuredSectionLayout[],
) {
  return {
    paddingTop,
    sections,
    byId: Object.fromEntries(
      sections.map((section) => [section.id, section]),
    ),
  } satisfies EmojiGridLayoutMetrics;
}

function getGridGap(
  grid: HTMLDivElement,
  property: 'rowGap' | 'columnGap',
) {
  const computed = window.getComputedStyle(grid);
  const value = computed[property] || computed.gap;

  return Number.parseFloat(value) || 0;
}

function getMeasuredRowHeight(
  grid: HTMLDivElement,
  columns: number,
  fallbackRowHeight: number,
) {
  return estimateEmojiGridRowHeight({
    gridWidth: grid.clientWidth,
    columns,
    columnGap: getGridGap(grid, 'columnGap'),
    fallbackRowHeight,
  });
}

function getEmojiRowIndex(emojiIndex: number, columns: number) {
  return Math.floor(emojiIndex / columns);
}

function getEmojiTargetSelector(target: TabStop) {
  return `[data-mx-slot="emoji"][data-section="${target.sectionIndex}"][data-index="${target.emojiIndex}"]`;
}

function getFullVirtualWindows(
  sections: PreparedSection[],
  previousWindows: Record<string, EmojiGridVirtualWindow>,
  fallbackRowHeight: number,
) {
  return Object.fromEntries(
    sections.map(({ section, rowCount }) => {
      const previousWindow = previousWindows[section.id];

      return [
        section.id,
        createFullEmojiGridVirtualWindow({
          rowCount,
          rowHeight: previousWindow?.rowHeight ?? fallbackRowHeight,
          rowGap: previousWindow?.rowGap ?? 4,
        }),
      ];
    }),
  ) satisfies Record<string, EmojiGridVirtualWindow>;
}

function createGridPlaceholderStyle(height: number): CSSProperties {
  return {
    gridColumn: '1 / -1',
    height,
    pointerEvents: 'none',
  };
}

interface EmojiCellProps {
  emoji: EmojiRenderable;
  emojiSize: number;
  skinTone: EmojiSkinTone;
  selected: boolean;
  active: boolean;
  sectionId: EmojiCategoryId;
  sectionIndex: number;
  emojiIndex: number;
  initiallyFocusable: boolean;
  spriteSheet: EmojiSpriteSheetConfig;
  assetSource?: EmojiAssetSource;
  localeDefinition: EmojiLocaleDefinition;
  renderEmoji?: (
    emoji: EmojiRenderable,
    state: EmojiRenderState,
  ) => ReactNode;
  onEmojiSelect: (emoji: EmojiRenderable) => void;
  onEmojiHover: (
    emoji: EmojiRenderable | null,
    target?: TabStop,
  ) => void;
  onEmojiFocus: (
    event: React.FocusEvent<HTMLButtonElement>,
    emoji: EmojiRenderable,
    target: TabStop,
  ) => void;
  slotOptions: {
    unstyled?: boolean;
    classNames?: EmojiPickerClassNames;
    styles?: EmojiPickerStyles;
  };
  resolveEmojiHoverColor?: (
    emoji: EmojiRenderable,
    state: EmojiRenderState,
  ) => string | undefined;
}

function EmojiCell({
  emoji,
  emojiSize,
  skinTone,
  selected,
  active,
  sectionId,
  sectionIndex,
  emojiIndex,
  initiallyFocusable,
  spriteSheet,
  assetSource,
  localeDefinition,
  renderEmoji,
  onEmojiSelect,
  onEmojiHover,
  onEmojiFocus,
  slotOptions,
  resolveEmojiHoverColor,
}: EmojiCellProps) {
  const renderState: EmojiRenderState = {
    active,
    selected,
    skinTone,
    size: emojiSize,
  };
  const displayName = formatEmojiName(
    getLocalizedEmojiName(emoji, localeDefinition),
  );
  const hoverColor = resolveEmojiHoverColor?.(emoji, renderState);
  const buttonStyle = getSlotStyle(
    'emoji',
    slotOptions,
    hoverColor
      ? ({ ['--mx-emoji-hover']: hoverColor } as CSSProperties)
      : undefined,
  );

  return (
    <button
      type="button"
      role="gridcell"
      className={getSlotClassName('emoji', slotOptions)}
      style={buttonStyle}
      data-section={sectionIndex}
      data-index={emojiIndex}
      data-category-id={sectionId}
      data-mx-slot="emoji"
      data-active={active ? 'true' : undefined}
      data-selected={selected ? 'true' : undefined}
      tabIndex={initiallyFocusable ? 0 : -1}
      onClick={() => onEmojiSelect(emoji)}
      onMouseEnter={() =>
        onEmojiHover(emoji, {
          sectionIndex,
          emojiIndex,
        })
      }
      onMouseLeave={() =>
        onEmojiHover(null, {
          sectionIndex,
          emojiIndex,
        })
      }
      onFocus={(event) => {
        onEmojiFocus(event, emoji, {
          sectionIndex,
          emojiIndex,
        });
      }}
      onBlur={() =>
        onEmojiHover(null, {
          sectionIndex,
          emojiIndex,
        })
      }
      title={displayName}
      aria-label={displayName}
    >
      {renderEmoji?.(emoji, renderState) ?? (
        <EmojiSprite
          emoji={emoji}
          size={emojiSize}
          skinTone={skinTone}
          spriteSheet={spriteSheet}
          assetSource={assetSource}
          assetContext="grid"
          title={displayName}
          alt={displayName}
        />
      )}
    </button>
  );
}

const MemoEmojiCell = memo(
  EmojiCell,
  (previousProps, nextProps) =>
    previousProps.emoji === nextProps.emoji &&
    previousProps.emojiSize === nextProps.emojiSize &&
    previousProps.skinTone === nextProps.skinTone &&
    previousProps.selected === nextProps.selected &&
    previousProps.active === nextProps.active &&
    previousProps.sectionId === nextProps.sectionId &&
    previousProps.sectionIndex === nextProps.sectionIndex &&
    previousProps.emojiIndex === nextProps.emojiIndex &&
    previousProps.initiallyFocusable ===
      nextProps.initiallyFocusable &&
    previousProps.spriteSheet === nextProps.spriteSheet &&
    previousProps.assetSource === nextProps.assetSource &&
    previousProps.localeDefinition === nextProps.localeDefinition &&
    previousProps.renderEmoji === nextProps.renderEmoji &&
    previousProps.onEmojiSelect === nextProps.onEmojiSelect &&
    previousProps.onEmojiHover === nextProps.onEmojiHover &&
    previousProps.onEmojiFocus === nextProps.onEmojiFocus &&
    previousProps.slotOptions === nextProps.slotOptions &&
    previousProps.resolveEmojiHoverColor ===
      nextProps.resolveEmojiHoverColor,
);

export function VirtualizedEmojiGrid({
  ref,
  sections,
  emojiSize,
  columns,
  skinTone,
  value,
  spriteSheet,
  assetSource,
  localeDefinition,
  renderEmoji,
  renderCategoryIcon,
  onEmojiSelect,
  onEmojiHover,
  onActiveCategoryChange,
  virtualization,
  emptyState,
  hideEmptyState,
  labels,
  unstyled,
  classNames,
  styles,
  resolveEmojiHoverColor,
}: EmojiGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const gridRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const pendingCategoryScrollRef = useRef<{
    id: EmojiCategoryId;
    top: number;
  } | null>(null);
  const pendingFocusRef = useRef<TabStop | null>(null);
  const virtualizationFrameRef = useRef<number | null>(null);
  const layoutMeasureFrameRef = useRef<number | null>(null);
  const scrollVelocityRef = useRef<{
    lastScrollTop: number;
    lastScrollTime: number;
    velocityPxPerMs: number;
  }>({
    lastScrollTop: 0,
    lastScrollTime: 0,
    velocityPxPerMs: 0,
  });
  const scrollIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressHoverDuringScrollRef = useRef(false);
  const layoutMetricsRef = useRef<EmojiGridLayoutMetrics>(
    EMPTY_LAYOUT_METRICS,
  );
  const slotOptions = useMemo(
    () => ({ unstyled, classNames, styles }),
    [classNames, styles, unstyled],
  );
  const hasRenderableEmoji = sections.some(
    (section) => section.emojis.length > 0,
  );
  const preparedSections = useMemo(
    () =>
      sections.map((section, sectionIndex) => ({
        section,
        sectionIndex,
        rowCount: getEmojiGridRowCount(section.emojis.length, columns),
      })),
    [columns, sections],
  );
  const virtualizationConfig = useMemo(
    () => resolveEmojiGridVirtualization(virtualization),
    [virtualization],
  );
  const onActiveCategoryChangeRef = useRef(onActiveCategoryChange);
  const lastMeasuredRowHeightRef = useRef(Math.max(emojiSize, 1));
  const [tabStop, setTabStop] = useState<TabStop | null>(() =>
    getInitialTabStop(sections),
  );
  const [activeCell, setActiveCell] = useState<TabStop | null>(null);
  const activeCellRef = useRef<TabStop | null>(null);
  const [virtualWindows, setVirtualWindows] = useState<
    Record<string, EmojiGridVirtualWindow>
  >(() =>
    getFullVirtualWindows(
      preparedSections,
      {},
      lastMeasuredRowHeightRef.current,
    ),
  );
  const virtualWindowsRef = useRef(virtualWindows);

  virtualWindowsRef.current = virtualWindows;
  onActiveCategoryChangeRef.current = onActiveCategoryChange;

  const setActiveCellTarget = useCallback((target: TabStop | null) => {
    activeCellRef.current = target;
    setActiveCell((current) =>
      isSameTabStop(current, target) ? current : target,
    );
  }, []);

  useEffect(() => {
    const nextTabStop =
      tabStop &&
      preparedSections[tabStop.sectionIndex]?.section.emojis[tabStop.emojiIndex]
        ? tabStop
        : getInitialTabStop(sections);

    if (!isSameTabStop(tabStop, nextTabStop)) {
      setTabStop(nextTabStop);
    }
  }, [preparedSections, sections, tabStop]);

  useEffect(() => {
    const nextCell =
      activeCell &&
      preparedSections[activeCell.sectionIndex]?.section.emojis[
        activeCell.emojiIndex
      ]
        ? activeCell
        : null;

    if (!isSameTabStop(activeCell, nextCell)) {
      setActiveCellTarget(nextCell);
    }
  }, [activeCell, preparedSections, setActiveCellTarget]);

  useEffect(() => {
    const nextWindows = getFullVirtualWindows(
      preparedSections,
      virtualWindowsRef.current,
      lastMeasuredRowHeightRef.current,
    );

    if (!areVirtualWindowsEqual(virtualWindowsRef.current, nextWindows)) {
      virtualWindowsRef.current = nextWindows;
      setVirtualWindows(nextWindows);
    }
  }, [preparedSections]);

  const measureLayoutMetrics = useCallback(() => {
    const container = scrollRef.current;

    if (!container) {
      return layoutMetricsRef.current;
    }

    const previousMetrics = layoutMetricsRef.current;
    const nextSections = preparedSections.map(({ section }) => {
      const previousSection = previousMetrics.byId[section.id];
      const previousWindow = virtualWindowsRef.current[section.id];
      const fallbackRowHeight =
        previousSection?.rowHeight ??
        previousWindow?.rowHeight ??
        lastMeasuredRowHeightRef.current;
      const fallbackRowGap =
        previousSection?.rowGap ??
        previousWindow?.rowGap ??
        4;
      const sectionElement = sectionRefs.current[section.id];
      const gridElement = gridRefs.current[section.id];
      const sectionTop = sectionElement
        ? getElementScrollTop(container, sectionElement)
        : previousSection?.sectionTop ?? 0;
      const rowGap = gridElement
        ? getGridGap(gridElement, 'rowGap') || fallbackRowGap
        : fallbackRowGap;
      const rowHeight = gridElement
        ? getMeasuredRowHeight(
            gridElement,
            columns,
            Math.max(fallbackRowHeight, emojiSize),
          )
        : fallbackRowHeight;

      if (rowHeight > 0) {
        lastMeasuredRowHeightRef.current = rowHeight;
      }

      return {
        id: section.id,
        sectionTop,
        gridTop: gridElement
          ? getElementScrollTop(container, gridElement)
          : previousSection?.gridTop ?? sectionTop,
        rowHeight,
        rowGap,
      } satisfies MeasuredSectionLayout;
    });
    const nextMetrics = createLayoutMetrics(
      getContainerPaddingTop(container),
      nextSections,
    );

    if (!areLayoutMetricsEqual(previousMetrics, nextMetrics)) {
      layoutMetricsRef.current = nextMetrics;
    }

    return layoutMetricsRef.current;
  }, [columns, emojiSize, preparedSections]);

  const measureVirtualWindows = useCallback((
    layoutMetrics: EmojiGridLayoutMetrics = layoutMetricsRef.current,
  ) => {
    const container = scrollRef.current;

    if (!container) {
      return;
    }

    if (!virtualizationConfig.enabled) {
      const nextWindows = getFullVirtualWindows(
        preparedSections,
        virtualWindowsRef.current,
        lastMeasuredRowHeightRef.current,
      );

      if (!areVirtualWindowsEqual(virtualWindowsRef.current, nextWindows)) {
        virtualWindowsRef.current = nextWindows;
        setVirtualWindows(nextWindows);
      }

      return;
    }

    const nextWindows = Object.fromEntries(
      preparedSections.map(({ section, sectionIndex, rowCount }) => {
        const previousWindow = virtualWindowsRef.current[section.id];
        const sectionLayout = layoutMetrics.byId[section.id];
        const fallbackRowHeight =
          sectionLayout?.rowHeight ??
          previousWindow?.rowHeight ??
          lastMeasuredRowHeightRef.current;
        const fallbackRowGap =
          sectionLayout?.rowGap ??
          previousWindow?.rowGap ??
          4;

        if (!sectionLayout) {
          return [
            section.id,
            createFullEmojiGridVirtualWindow({
              rowCount,
              rowHeight: fallbackRowHeight,
              rowGap: fallbackRowGap,
            }),
          ];
        }

        const effectiveOverscanRows = virtualizationConfig.adaptiveOverscan
          ? computeAdaptiveOverscanRows({
              baseOverscanRows: virtualizationConfig.overscanRows,
              velocityPxPerMs: scrollVelocityRef.current.velocityPxPerMs,
              rowHeight: sectionLayout.rowHeight,
            })
          : virtualizationConfig.overscanRows;

        let window = computeEmojiGridVirtualWindow({
          rowCount,
          scrollTop: container.scrollTop,
          viewportHeight: container.clientHeight,
          gridTop: sectionLayout.gridTop,
          rowHeight: sectionLayout.rowHeight,
          rowGap: sectionLayout.rowGap,
          overscanRows: effectiveOverscanRows,
        });

        const pinnedRows = [
          tabStop?.sectionIndex === sectionIndex
            ? getEmojiRowIndex(tabStop.emojiIndex, columns)
            : null,
          pendingFocusRef.current?.sectionIndex === sectionIndex
            ? getEmojiRowIndex(pendingFocusRef.current.emojiIndex, columns)
            : null,
        ];

        for (const targetRow of pinnedRows) {
          window = expandEmojiGridVirtualWindow(window, rowCount, targetRow);
        }

        return [section.id, window];
      }),
    ) satisfies Record<string, EmojiGridVirtualWindow>;

    if (!areVirtualWindowsEqual(virtualWindowsRef.current, nextWindows)) {
      virtualWindowsRef.current = nextWindows;
      setVirtualWindows(nextWindows);
    }
  }, [
    columns,
    preparedSections,
    tabStop,
    virtualizationConfig.adaptiveOverscan,
    virtualizationConfig.enabled,
    virtualizationConfig.overscanRows,
  ]);

  const scheduleVirtualWindowMeasure = useCallback(() => {
    if (virtualizationFrameRef.current !== null) {
      return;
    }

    virtualizationFrameRef.current = requestAnimationFrame(() => {
      virtualizationFrameRef.current = null;
      measureVirtualWindows();
    });
  }, [measureVirtualWindows]);

  const trackScrollVelocity = useCallback(() => {
    const container = scrollRef.current;

    if (!container) {
      return;
    }

    if (!suppressHoverDuringScrollRef.current) {
      suppressHoverDuringScrollRef.current = true;

      if (activeCellRef.current) {
        setActiveCellTarget(null);
        onEmojiHover(null);
      }
    }

    const tracking = scrollVelocityRef.current;
    const now =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
    const dt = now - tracking.lastScrollTime;

    if (dt > 0 && dt < 200 && tracking.lastScrollTime > 0) {
      const dy = Math.abs(container.scrollTop - tracking.lastScrollTop);
      tracking.velocityPxPerMs = dy / dt;
    } else {
      tracking.velocityPxPerMs = 0;
    }

    tracking.lastScrollTop = container.scrollTop;
    tracking.lastScrollTime = now;

    if (scrollIdleTimerRef.current !== null) {
      clearTimeout(scrollIdleTimerRef.current);
    }

    scrollIdleTimerRef.current = setTimeout(() => {
      scrollIdleTimerRef.current = null;
      suppressHoverDuringScrollRef.current = false;
      scrollVelocityRef.current.velocityPxPerMs = 0;
      // Recompute the window once we settle so it shrinks back to idle size.
      scheduleVirtualWindowMeasure();
    }, 200);
  }, [onEmojiHover, scheduleVirtualWindowMeasure, setActiveCellTarget]);

  const handleVirtualizedScroll = useCallback(() => {
    trackScrollVelocity();
    scheduleVirtualWindowMeasure();
  }, [scheduleVirtualWindowMeasure, trackScrollVelocity]);

  const scheduleLayoutMeasure = useCallback(() => {
    if (layoutMeasureFrameRef.current !== null) {
      return;
    }

    layoutMeasureFrameRef.current = requestAnimationFrame(() => {
      layoutMeasureFrameRef.current = null;
      const nextLayout = measureLayoutMetrics();
      measureVirtualWindows(nextLayout);
    });
  }, [measureLayoutMetrics, measureVirtualWindows]);

  useLayoutEffect(() => {
    const nextLayout = measureLayoutMetrics();
    measureVirtualWindows(nextLayout);
  }, [measureLayoutMetrics, measureVirtualWindows]);

  useEffect(() => {
    const container = scrollRef.current;

    if (!container) {
      return;
    }

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            scheduleLayoutMeasure();
          })
        : null;

    resizeObserver?.observe(container);
    for (const { section } of preparedSections) {
      const sectionElement = sectionRefs.current[section.id];
      const gridElement = gridRefs.current[section.id];

      if (sectionElement) {
        resizeObserver?.observe(sectionElement);
      }

      if (gridElement) {
        resizeObserver?.observe(gridElement);
      }
    }
    window.addEventListener('resize', scheduleLayoutMeasure);

    return () => {
      window.removeEventListener('resize', scheduleLayoutMeasure);
      resizeObserver?.disconnect();
    };
  }, [
    preparedSections,
    scheduleLayoutMeasure,
  ]);

  useEffect(() => {
    const container = scrollRef.current;

    if (!container || !virtualizationConfig.enabled) {
      return;
    }

    container.addEventListener('scroll', handleVirtualizedScroll, {
      passive: true,
    });

    return () => {
      container.removeEventListener(
        'scroll',
        handleVirtualizedScroll,
      );
    };
  }, [
    handleVirtualizedScroll,
    virtualizationConfig.enabled,
  ]);

  useEffect(() => {
    return () => {
      if (virtualizationFrameRef.current !== null) {
        cancelAnimationFrame(virtualizationFrameRef.current);
      }

      if (layoutMeasureFrameRef.current !== null) {
        cancelAnimationFrame(layoutMeasureFrameRef.current);
      }

      if (scrollIdleTimerRef.current !== null) {
        clearTimeout(scrollIdleTimerRef.current);
        scrollIdleTimerRef.current = null;
      }
    };
  }, []);

  const scrollEmojiIntoView = useCallback(
    (
      target: TabStop,
      behavior: 'instant' | 'smooth' = 'instant',
    ) => {
      const container = scrollRef.current;
      const preparedSection = preparedSections[target.sectionIndex];
      const sectionId = preparedSection?.section.id;
      const sectionLayout = sectionId
        ? layoutMetricsRef.current.byId[sectionId]
        : undefined;

      if (!container || !preparedSection) {
        return;
      }

      let rowGap = sectionLayout?.rowGap ?? 4;
      let rowHeight =
        sectionLayout?.rowHeight ??
        Math.max(lastMeasuredRowHeightRef.current, emojiSize);
      let gridTop = sectionLayout?.gridTop;

      if (gridTop === undefined) {
        const gridElement = sectionId ? gridRefs.current[sectionId] : null;

        if (!gridElement) {
          return;
        }

        rowGap = getGridGap(gridElement, 'rowGap') || rowGap;
        rowHeight = getMeasuredRowHeight(
          gridElement,
          columns,
          Math.max(rowHeight, emojiSize),
        );
        gridTop = getElementScrollTop(container, gridElement);
      }

      if (rowHeight > 0) {
        lastMeasuredRowHeightRef.current = rowHeight;
      }

      const rowIndex = getEmojiRowIndex(target.emojiIndex, columns);
      const rowStride = rowHeight + rowGap;
      const rowTop = gridTop + rowIndex * rowStride;
      const rowBottom = rowTop + rowHeight;
      const viewportTop = container.scrollTop;
      const viewportBottom = viewportTop + container.clientHeight;

      if (rowTop < viewportTop) {
        setContainerScrollTop(
          container,
          Math.max(rowTop - rowGap, 0),
          behavior,
        );
        return;
      }

      if (rowBottom > viewportBottom) {
        setContainerScrollTop(
          container,
          Math.max(rowBottom - container.clientHeight + rowGap, 0),
          behavior,
        );
      }
    },
    [columns, emojiSize, preparedSections],
  );

  useLayoutEffect(() => {
    const pendingTarget = pendingFocusRef.current;

    if (!pendingTarget) {
      return;
    }

    const container = scrollRef.current;
    const nextTarget = container?.querySelector(
      getEmojiTargetSelector(pendingTarget),
    ) as HTMLButtonElement | null;

    if (!nextTarget) {
      return;
    }

    pendingFocusRef.current = null;
    nextTarget.focus();
  }, [virtualWindows]);

  const scrollToCategory = useCallback((
    id: EmojiCategoryId,
    options?: { behavior?: 'instant' | 'smooth' },
  ) => {
    const container = scrollRef.current;
    const target = sectionRefs.current[id];
    if (!container || !target) {
      return;
    }

    const behavior = options?.behavior ?? 'smooth';
    const nextTop =
      layoutMetricsRef.current.byId[id]?.sectionTop ??
      getElementScrollTop(container, target);
    pendingCategoryScrollRef.current = {
      id,
      top: nextTop,
    };
    setContainerScrollTop(container, nextTop, behavior);

    requestAnimationFrame(() => {
      const nextContainer = scrollRef.current;
      const nextTarget = sectionRefs.current[id];
      if (!nextContainer || !nextTarget) {
        return;
      }

      const settledTop =
        layoutMetricsRef.current.byId[id]?.sectionTop ??
        getElementScrollTop(nextContainer, nextTarget);
      if (Math.abs(nextContainer.scrollTop - settledTop) <= 1) {
        return;
      }

      pendingCategoryScrollRef.current = {
        id,
        top: settledTop,
      };
      setContainerScrollTop(nextContainer, settledTop, behavior);
    });
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      scrollToCategory,
    }),
    [scrollToCategory],
  );

  useEffect(() => {
    const container = scrollRef.current;
    const firstSection = sections[0];
    if (!container || !firstSection) {
      return;
    }

    const activeContainer = container;
    const initialCategory = firstSection.id;
    let rafId = 0;

    function updateActiveCategory() {
      const pendingScroll = pendingCategoryScrollRef.current;

      if (pendingScroll) {
        if (
          Math.abs(activeContainer.scrollTop - pendingScroll.top) <= 2
        ) {
          pendingCategoryScrollRef.current = null;
        }

        onActiveCategoryChangeRef.current(pendingScroll.id);
        return;
      }

      const layoutMetrics = layoutMetricsRef.current;
      const nextCategory =
        layoutMetrics.sections.length > 0
          ? findEmojiGridActiveSectionId({
              sections: layoutMetrics.sections,
              thresholdTop:
                activeContainer.scrollTop +
                layoutMetrics.paddingTop +
                48,
              fallbackId: initialCategory,
            })
          : initialCategory;

      onActiveCategoryChangeRef.current(nextCategory);
    }

    function scheduleActiveCategoryUpdate() {
      if (rafId !== 0) {
        return;
      }

      rafId = requestAnimationFrame(() => {
        rafId = 0;
        updateActiveCategory();
      });
    }

    updateActiveCategory();
    activeContainer.addEventListener('scroll', scheduleActiveCategoryUpdate, {
      passive: true,
    });
    window.addEventListener('resize', scheduleActiveCategoryUpdate);

    return () => {
      if (rafId !== 0) {
        cancelAnimationFrame(rafId);
      }
      activeContainer.removeEventListener(
        'scroll',
        scheduleActiveCategoryUpdate,
      );
      window.removeEventListener('resize', scheduleActiveCategoryUpdate);
    };
  }, [sections]);

  function handleKeyDown(event: React.KeyboardEvent) {
    const target = event.target as HTMLElement;
    if (target.dataset.mxSlot !== 'emoji') return;

    const sectionIdx = Number(target.dataset.section);
    const emojiIdx = Number(target.dataset.index);
    if (Number.isNaN(sectionIdx) || Number.isNaN(emojiIdx)) return;

    const currentSection = sections[sectionIdx];
    if (!currentSection) return;

    let nextSection = sectionIdx;
    let nextIndex = emojiIdx;

    switch (event.key) {
      case 'ArrowRight':
        nextIndex = emojiIdx + 1;
        if (nextIndex >= currentSection.emojis.length) {
          nextSection = sectionIdx + 1;
          nextIndex = 0;
        }
        break;
      case 'ArrowLeft':
        nextIndex = emojiIdx - 1;
        if (nextIndex < 0) {
          nextSection = sectionIdx - 1;
          if (nextSection >= 0) {
            nextIndex = (sections[nextSection]?.emojis.length ?? 1) - 1;
          }
        }
        break;
      case 'ArrowDown':
        nextIndex = emojiIdx + columns;
        if (nextIndex >= currentSection.emojis.length) {
          nextSection = sectionIdx + 1;
          const nextSectionData = sections[nextSection];
          if (nextSectionData) {
            nextIndex = Math.min(
              emojiIdx % columns,
              nextSectionData.emojis.length - 1,
            );
          }
        }
        break;
      case 'ArrowUp':
        nextIndex = emojiIdx - columns;
        if (nextIndex < 0) {
          nextSection = sectionIdx - 1;
          const previousSection = sections[nextSection];
          if (previousSection) {
            const previousLength = previousSection.emojis.length;
            const lastRowStart =
              Math.floor((previousLength - 1) / columns) * columns;
            nextIndex = Math.min(
              lastRowStart + (emojiIdx % columns),
              previousLength - 1,
            );
          }
        }
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = currentSection.emojis.length - 1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        target.click();
        return;
      default:
        return;
    }

    event.preventDefault();

    const targetSection = sections[nextSection];
    if (!targetSection) return;
    if (nextSection < 0 || nextSection >= sections.length) return;
    if (nextIndex < 0 || nextIndex >= targetSection.emojis.length) return;

    const nextTarget = {
      sectionIndex: nextSection,
      emojiIndex: nextIndex,
    } satisfies TabStop;

    setTabStop(nextTarget);

    const container = scrollRef.current;
    const nextButton = container?.querySelector(
      getEmojiTargetSelector(nextTarget),
    ) as HTMLButtonElement | null;

    if (nextButton) {
      nextButton.focus();
      return;
    }

    pendingFocusRef.current = nextTarget;
    scrollEmojiIntoView(nextTarget);
    scheduleVirtualWindowMeasure();
  }

  const handleEmojiFocus = useCallback((
    _event: React.FocusEvent<HTMLButtonElement>,
    emoji: EmojiRenderable,
    target: TabStop,
  ) => {
    pendingFocusRef.current = null;
    setActiveCellTarget(target);
    setTabStop((current) =>
      isSameTabStop(current, target) ? current : target,
    );
    onEmojiHover(emoji);
  }, [onEmojiHover, setActiveCellTarget]);

  const handleEmojiHover = useCallback((
    emoji: EmojiRenderable | null,
    target?: TabStop,
  ) => {
    if (suppressHoverDuringScrollRef.current) {
      return;
    }

    if (emoji && target) {
      setActiveCellTarget(target);
      onEmojiHover(emoji);
      return;
    }

    if (target && !isSameTabStop(activeCellRef.current, target)) {
      return;
    }

    setActiveCellTarget(null);
    onEmojiHover(null);
  }, [onEmojiHover, setActiveCellTarget]);

  return (
    <div
      className={getSlotClassName('content', slotOptions)}
      style={getSlotStyle('content', slotOptions)}
      ref={scrollRef}
      onKeyDown={handleKeyDown}
      data-mx-slot="content"
    >
      {!hasRenderableEmoji && !hideEmptyState && (
        <div
          className={getSlotClassName('empty', slotOptions)}
          style={getSlotStyle('empty', slotOptions)}
          data-mx-slot="empty"
        >
          {emptyState ?? (
            <>
              <strong>{labels.noResultsTitle}</strong>
              <span>{labels.noResultsBody}</span>
            </>
          )}
        </div>
      )}

      {preparedSections.map(({ section, sectionIndex, rowCount }) => {
        const virtualWindow =
          virtualWindows[section.id] ??
          createFullEmojiGridVirtualWindow({
            rowCount,
            rowHeight: lastMeasuredRowHeightRef.current,
            rowGap: 4,
          });
        const visibleEmojiStart =
          virtualWindow.endRow >= virtualWindow.startRow
            ? virtualWindow.startRow * columns
            : 0;
        const visibleEmojiEnd =
          virtualWindow.endRow >= virtualWindow.startRow
            ? Math.min(
                section.emojis.length,
                (virtualWindow.endRow + 1) * columns,
              )
            : 0;
        const visibleEmoji = section.emojis.slice(
          visibleEmojiStart,
          visibleEmojiEnd,
        );
        const beforeHeight = computeEmojiGridPlaceholderHeight(
          virtualWindow.beforeRows,
          virtualWindow.rowHeight,
          virtualWindow.rowGap,
        );
        const afterHeight = computeEmojiGridPlaceholderHeight(
          virtualWindow.afterRows,
          virtualWindow.rowHeight,
          virtualWindow.rowGap,
        );

        return (
          <section
            key={section.id}
            className={getSlotClassName('section', slotOptions)}
            style={getSlotStyle('section', slotOptions)}
            data-category-id={section.id}
            data-mx-slot="section"
            ref={(node) => {
              sectionRefs.current[section.id] = node;
            }}
          >
            <header
              className={getSlotClassName('sectionHeader', slotOptions)}
              style={getSlotStyle('sectionHeader', slotOptions)}
              data-mx-slot="sectionHeader"
            >
              <span
                className={getSlotClassName('sectionIcon', slotOptions)}
                style={getSlotStyle('sectionIcon', slotOptions)}
                aria-hidden="true"
                data-mx-slot="sectionIcon"
              >
                {renderCategoryIcon?.({
                  categoryId: section.id,
                  label: section.label,
                  icon: section.icon,
                  context: 'section',
                  size: 15,
                  active: false,
                  spriteSheet,
                }) ?? (
                  <EmojiCategoryIcon
                    icon={section.icon}
                    label={section.label}
                    size={15}
                    spriteSheet={spriteSheet}
                  />
                )}
              </span>
              <strong>{section.label}</strong>
              <span>{section.emojis.length}</span>
            </header>

            <div
              className={getSlotClassName('grid', slotOptions)}
              style={getSlotStyle('grid', slotOptions)}
              role="grid"
              aria-label={section.label}
              data-mx-slot="grid"
              ref={(node) => {
                gridRefs.current[section.id] = node;
              }}
            >
              {beforeHeight > 0 && (
                <div
                  className={getSlotClassName(
                    'gridPlaceholder',
                    slotOptions,
                  )}
                  style={getSlotStyle(
                    'gridPlaceholder',
                    slotOptions,
                    createGridPlaceholderStyle(beforeHeight),
                  )}
                  aria-hidden="true"
                  data-position="before"
                  data-mx-slot="gridPlaceholder"
                />
              )}

              {visibleEmoji.map((emoji, relativeIndex) => {
                const emojiIndex = visibleEmojiStart + relativeIndex;

                return (
                  <MemoEmojiCell
                    key={`${section.id}:${emoji.id}`}
                    emoji={emoji}
                    emojiSize={emojiSize}
                    skinTone={skinTone}
                    selected={value === emoji.id}
                    active={
                      activeCell?.sectionIndex === sectionIndex &&
                      activeCell.emojiIndex === emojiIndex
                    }
                    sectionId={section.id}
                    sectionIndex={sectionIndex}
                    emojiIndex={emojiIndex}
                    initiallyFocusable={
                      tabStop?.sectionIndex === sectionIndex &&
                      tabStop.emojiIndex === emojiIndex
                    }
                    spriteSheet={spriteSheet}
                    assetSource={assetSource}
                    localeDefinition={localeDefinition}
                    renderEmoji={renderEmoji}
                    onEmojiSelect={onEmojiSelect}
                    onEmojiHover={handleEmojiHover}
                    onEmojiFocus={handleEmojiFocus}
                    slotOptions={slotOptions}
                    resolveEmojiHoverColor={resolveEmojiHoverColor}
                  />
                );
              })}

              {afterHeight > 0 && (
                <div
                  className={getSlotClassName(
                    'gridPlaceholder',
                    slotOptions,
                  )}
                  style={getSlotStyle(
                    'gridPlaceholder',
                    slotOptions,
                    createGridPlaceholderStyle(afterHeight),
                  )}
                  aria-hidden="true"
                  data-position="after"
                  data-mx-slot="gridPlaceholder"
                />
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
