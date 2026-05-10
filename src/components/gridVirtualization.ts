import type { EmojiPickerVirtualization } from '../core/types';

export interface ResolvedEmojiGridVirtualization {
  enabled: boolean;
  overscanRows: number;
  adaptiveOverscan: boolean;
}

export interface EmojiGridVirtualWindow {
  startRow: number;
  endRow: number;
  beforeRows: number;
  afterRows: number;
  rowHeight: number;
  rowGap: number;
}

const DEFAULT_OVERSCAN_ROWS = 16;
const ADAPTIVE_OVERSCAN_LOOKAHEAD_MS = 160;
const ADAPTIVE_OVERSCAN_MAX_ROWS = 72;

export function resolveEmojiGridVirtualization(
  virtualization?: boolean | EmojiPickerVirtualization,
): ResolvedEmojiGridVirtualization {
  if (virtualization === false) {
    return {
      enabled: false,
      overscanRows: 0,
      adaptiveOverscan: false,
    };
  }

  if (virtualization === true || virtualization === undefined) {
    return {
      enabled: true,
      overscanRows: DEFAULT_OVERSCAN_ROWS,
      adaptiveOverscan: true,
    };
  }

  return {
    enabled: virtualization.enabled ?? true,
    overscanRows: Math.max(
      0,
      Math.floor(virtualization.overscanRows ?? DEFAULT_OVERSCAN_ROWS),
    ),
    adaptiveOverscan: virtualization.adaptiveOverscan ?? true,
  };
}

/**
 * Returns the number of rows to render outside the viewport, scaled by the
 * current scroll velocity. When the user scrolls quickly we mount more rows
 * ahead of time to cover the upcoming travel; when idle we keep the configured
 * base window so WebView paints do not fall behind after a sudden fling.
 *
 * `velocityPxPerMs` should be the absolute value of recent scroll delta
 * divided by elapsed milliseconds. Pass `0` (or any non-positive value) to
 * indicate the viewport is idle.
 */
export function computeAdaptiveOverscanRows(options: {
  baseOverscanRows: number;
  velocityPxPerMs: number;
  rowHeight: number;
}): number {
  const base = Math.max(0, Math.floor(options.baseOverscanRows));
  const { velocityPxPerMs, rowHeight } = options;

  if (
    !Number.isFinite(velocityPxPerMs) ||
    velocityPxPerMs <= 0 ||
    !Number.isFinite(rowHeight) ||
    rowHeight <= 0
  ) {
    return Math.max(1, base);
  }

  const lookaheadRows =
    (velocityPxPerMs * ADAPTIVE_OVERSCAN_LOOKAHEAD_MS) / rowHeight;
  const adaptive = Math.ceil(base + lookaheadRows);

  return Math.min(ADAPTIVE_OVERSCAN_MAX_ROWS, Math.max(base, adaptive));
}

export function getEmojiGridRowCount(
  emojiCount: number,
  columns: number,
) {
  if (emojiCount <= 0 || columns <= 0) {
    return 0;
  }

  return Math.ceil(emojiCount / columns);
}

export function computeEmojiGridPlaceholderHeight(
  rowCount: number,
  rowHeight: number,
  rowGap: number,
) {
  if (rowCount <= 0) {
    return 0;
  }

  return rowCount * rowHeight + Math.max(0, rowCount - 1) * rowGap;
}

export function estimateEmojiGridRowHeight(options: {
  gridWidth: number;
  columns: number;
  columnGap: number;
  fallbackRowHeight: number;
}) {
  const { gridWidth, columns, columnGap, fallbackRowHeight } = options;

  if (gridWidth <= 0 || columns <= 0) {
    return fallbackRowHeight;
  }

  const totalGap = Math.max(0, columns - 1) * columnGap;
  const availableWidth = Math.max(0, gridWidth - totalGap);
  const estimatedCellSize = availableWidth / columns;

  if (!Number.isFinite(estimatedCellSize) || estimatedCellSize <= 0) {
    return fallbackRowHeight;
  }

  return estimatedCellSize;
}

export function findEmojiGridActiveSectionId<TSectionId extends string>(options: {
  sections: Array<{ id: TSectionId; sectionTop: number }>;
  thresholdTop: number;
  fallbackId: TSectionId;
}) {
  const { sections, thresholdTop, fallbackId } = options;
  let low = 0;
  let high = sections.length - 1;
  let activeId = fallbackId;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = sections[mid];

    if (!candidate) {
      break;
    }

    if (candidate.sectionTop <= thresholdTop) {
      activeId = candidate.id;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return activeId;
}

export function createFullEmojiGridVirtualWindow(options: {
  rowCount: number;
  rowHeight: number;
  rowGap: number;
}) {
  const { rowCount, rowHeight, rowGap } = options;

  return {
    startRow: 0,
    endRow: rowCount - 1,
    beforeRows: 0,
    afterRows: 0,
    rowHeight,
    rowGap,
  } satisfies EmojiGridVirtualWindow;
}

export function computeEmojiGridVirtualWindow(options: {
  rowCount: number;
  scrollTop: number;
  viewportHeight: number;
  gridTop: number;
  rowHeight: number;
  rowGap: number;
  overscanRows: number;
}) {
  const {
    rowCount,
    scrollTop,
    viewportHeight,
    gridTop,
    rowHeight,
    rowGap,
    overscanRows,
  } = options;

  if (rowCount <= 0) {
    return createFullEmojiGridVirtualWindow({
      rowCount,
      rowHeight,
      rowGap,
    });
  }

  const rowStride = Math.max(1, rowHeight + rowGap);
  const gridHeight = computeEmojiGridPlaceholderHeight(
    rowCount,
    rowHeight,
    rowGap,
  );
  const overscanPx = overscanRows * rowStride;
  const visibleTop = scrollTop - gridTop - overscanPx;
  const visibleBottom = scrollTop + viewportHeight - gridTop + overscanPx;

  if (visibleBottom <= 0 || visibleTop >= gridHeight) {
    return {
      startRow: 0,
      endRow: -1,
      beforeRows: rowCount,
      afterRows: 0,
      rowHeight,
      rowGap,
    } satisfies EmojiGridVirtualWindow;
  }

  const startRow = Math.max(
    0,
    Math.floor(Math.max(0, visibleTop) / rowStride),
  );
  const endRow = Math.min(
    rowCount - 1,
    Math.ceil(Math.max(0, visibleBottom) / rowStride) - 1,
  );

  return {
    startRow,
    endRow,
    beforeRows: startRow,
    afterRows: Math.max(0, rowCount - endRow - 1),
    rowHeight,
    rowGap,
  } satisfies EmojiGridVirtualWindow;
}

export function expandEmojiGridVirtualWindow(
  window: EmojiGridVirtualWindow,
  rowCount: number,
  targetRow: number | null,
) {
  if (
    targetRow === null ||
    targetRow < 0 ||
    rowCount <= 0 ||
    targetRow >= rowCount
  ) {
    return window;
  }

  const startRow =
    window.endRow < window.startRow
      ? targetRow
      : Math.min(window.startRow, targetRow);
  const endRow =
    window.endRow < window.startRow
      ? targetRow
      : Math.max(window.endRow, targetRow);

  return {
    ...window,
    startRow,
    endRow,
    beforeRows: startRow,
    afterRows: Math.max(0, rowCount - endRow - 1),
  } satisfies EmojiGridVirtualWindow;
}
