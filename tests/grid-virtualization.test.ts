import { describe, expect, it } from 'vitest';
import {
  computeAdaptiveOverscanRows,
  computeEmojiGridPlaceholderHeight,
  computeEmojiGridVirtualWindow,
  expandEmojiGridVirtualWindow,
  findEmojiGridActiveSectionId,
  getEmojiGridRowCount,
  resolveEmojiGridVirtualization,
} from '../src/components/gridVirtualization';

describe('grid virtualization helpers', () => {
  it('resolves default virtualization settings', () => {
    expect(resolveEmojiGridVirtualization()).toEqual({
      enabled: true,
      overscanRows: 8,
      adaptiveOverscan: true,
    });
    expect(resolveEmojiGridVirtualization(false)).toEqual({
      enabled: false,
      overscanRows: 0,
      adaptiveOverscan: false,
    });
    expect(
      resolveEmojiGridVirtualization({ enabled: true, overscanRows: 6 }),
    ).toEqual({
      enabled: true,
      overscanRows: 6,
      adaptiveOverscan: true,
    });
    expect(
      resolveEmojiGridVirtualization({
        enabled: true,
        overscanRows: 6,
        adaptiveOverscan: false,
      }),
    ).toEqual({
      enabled: true,
      overscanRows: 6,
      adaptiveOverscan: false,
    });
  });

  it('computes row counts and placeholder heights', () => {
    expect(getEmojiGridRowCount(0, 8)).toBe(0);
    expect(getEmojiGridRowCount(17, 8)).toBe(3);
    expect(computeEmojiGridPlaceholderHeight(0, 40, 4)).toBe(0);
    expect(computeEmojiGridPlaceholderHeight(3, 40, 4)).toBe(128);
  });

  it('creates an empty window for fully offscreen sections', () => {
    expect(
      computeEmojiGridVirtualWindow({
        rowCount: 12,
        scrollTop: 0,
        viewportHeight: 200,
        gridTop: 500,
        rowHeight: 40,
        rowGap: 4,
        overscanRows: 2,
      }),
    ).toEqual({
      startRow: 0,
      endRow: -1,
      beforeRows: 12,
      afterRows: 0,
      rowHeight: 40,
      rowGap: 4,
    });
  });

  it('expands the rendered window to keep the active row mounted', () => {
    const window = computeEmojiGridVirtualWindow({
      rowCount: 20,
      scrollTop: 0,
      viewportHeight: 220,
      gridTop: 0,
      rowHeight: 40,
      rowGap: 4,
      overscanRows: 1,
    });

    expect(
      expandEmojiGridVirtualWindow(window, 20, 10),
    ).toMatchObject({
      startRow: 0,
      endRow: 10,
      beforeRows: 0,
      afterRows: 9,
    });
  });

  it('shrinks overscan when the viewport is idle', () => {
    expect(
      computeAdaptiveOverscanRows({
        baseOverscanRows: 8,
        velocityPxPerMs: 0,
        rowHeight: 40,
      }),
    ).toBe(6);
    expect(
      computeAdaptiveOverscanRows({
        baseOverscanRows: 4,
        velocityPxPerMs: 0,
        rowHeight: 40,
      }),
    ).toBe(3);
    // Very small base still keeps at least one overscan row.
    expect(
      computeAdaptiveOverscanRows({
        baseOverscanRows: 0,
        velocityPxPerMs: 0,
        rowHeight: 40,
      }),
    ).toBe(1);
  });

  it('expands overscan with rising scroll velocity', () => {
    const slow = computeAdaptiveOverscanRows({
      baseOverscanRows: 8,
      velocityPxPerMs: 0.5, // very slow
      rowHeight: 40,
    });
    const fast = computeAdaptiveOverscanRows({
      baseOverscanRows: 8,
      velocityPxPerMs: 5, // wheel/trackpad burst
      rowHeight: 40,
    });

    expect(slow).toBeGreaterThanOrEqual(8);
    expect(fast).toBeGreaterThan(slow);
    // Fast scroll over 100ms at 5px/ms covers ~12 rows on top of base 8.
    expect(fast).toBeGreaterThanOrEqual(20);
  });

  it('clamps the overscan to a sensible upper bound', () => {
    expect(
      computeAdaptiveOverscanRows({
        baseOverscanRows: 8,
        velocityPxPerMs: 999,
        rowHeight: 40,
      }),
    ).toBeLessThanOrEqual(48);
  });

  it('returns the idle value for non-finite or non-positive inputs', () => {
    expect(
      computeAdaptiveOverscanRows({
        baseOverscanRows: 8,
        velocityPxPerMs: Number.NaN,
        rowHeight: 40,
      }),
    ).toBe(6);
    expect(
      computeAdaptiveOverscanRows({
        baseOverscanRows: 8,
        velocityPxPerMs: 5,
        rowHeight: 0,
      }),
    ).toBe(6);
  });

  it('finds the active category from cached section offsets', () => {
    expect(
      findEmojiGridActiveSectionId({
        sections: [
          { id: 'recent', sectionTop: 0 },
          { id: 'smileys', sectionTop: 120 },
          { id: 'people', sectionTop: 320 },
        ],
        thresholdTop: 180,
        fallbackId: 'recent',
      }),
    ).toBe('smileys');
  });
});
