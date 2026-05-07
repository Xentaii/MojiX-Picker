import { describe, expect, it } from 'vitest';
import {
  clearEmojiSpriteStyleCache,
  createEmojiSpriteSheet,
  getSpriteStyle,
  resolveSpriteSheetConfig,
  vendorCanRenderEmoji,
} from '../src/core/sprites';

describe('sprite style helpers', () => {
  it('reuses sprite style objects for identical tiles', () => {
    clearEmojiSpriteStyleCache();

    const firstStyle = getSpriteStyle({
      sheetX: 2,
      sheetY: 3,
      renderSize: 22,
      spriteSheet: {
        sheetSize: 64,
        padding: 1,
        gridSize: 64,
        source: 'custom',
        url: 'https://example.com/emoji.png',
      },
    });
    const secondStyle = getSpriteStyle({
      sheetX: 2,
      sheetY: 3,
      renderSize: 22,
      spriteSheet: {
        sheetSize: 64,
        padding: 1,
        gridSize: 64,
        source: 'custom',
        url: 'https://example.com/emoji.png',
      },
    });

    expect(secondStyle).toBe(firstStyle);
  });

  it('renders scaled sprite tiles with percentage-based sprite positioning', () => {
    expect(
      getSpriteStyle({
        sheetX: 2,
        sheetY: 3,
        renderSize: 22,
        spriteSheet: {
          sheetSize: 64,
          padding: 1,
          gridSize: 64,
          source: 'custom',
          url: 'https://example.com/emoji.png',
        },
      }),
    ).toMatchObject({
      width: '22px',
      height: '22px',
      backgroundSize: '6600% 6600%',
      backgroundPosition:
        '3.1971153846153846% 4.783653846153846%',
    });
  });

  it('matches emoji-mart style math when the spritesheet has no padding', () => {
    expect(
      getSpriteStyle({
        sheetX: 2,
        sheetY: 3,
        renderSize: 22,
        spriteSheet: {
          sheetSize: 64,
          padding: 0,
          gridSize: 64,
          source: 'custom',
          url: 'https://example.com/emoji.png',
        },
      }),
    ).toMatchObject({
      backgroundSize: '6400% 6400%',
      backgroundPosition:
        '3.1746031746031744% 4.761904761904762%',
    });
  });

  it('produces a fresh style object after the cache is cleared', () => {
    clearEmojiSpriteStyleCache();

    const args = {
      sheetX: 4,
      sheetY: 5,
      renderSize: 22,
      spriteSheet: {
        sheetSize: 64,
        padding: 1,
        gridSize: 64,
        source: 'custom' as const,
        url: 'https://example.com/clear-cache.png',
      },
    };

    const cached = getSpriteStyle(args);
    expect(getSpriteStyle(args)).toBe(cached);

    clearEmojiSpriteStyleCache();

    const recomputed = getSpriteStyle(args);
    expect(recomputed).not.toBe(cached);
    expect(recomputed).toEqual(cached);
  });

  it('returns distinct style objects for different sprite tile coordinates', () => {
    clearEmojiSpriteStyleCache();

    const baseConfig = {
      sheetSize: 64,
      padding: 1,
      gridSize: 64,
      source: 'custom' as const,
      url: 'https://example.com/distinct.png',
    };

    const first = getSpriteStyle({
      sheetX: 0,
      sheetY: 0,
      renderSize: 22,
      spriteSheet: baseConfig,
    });
    const second = getSpriteStyle({
      sheetX: 1,
      sheetY: 0,
      renderSize: 22,
      spriteSheet: baseConfig,
    });

    expect(first).not.toBe(second);
    expect(first.backgroundPosition).not.toBe(second.backgroundPosition);
  });

  it('uses vendor availability tables to block missing emoji sprites', () => {
    const spriteSheet = resolveSpriteSheetConfig(
      createEmojiSpriteSheet({
        vendor: 'facebook',
        availability: ['1f600'],
      }),
    );

    expect(
      vendorCanRenderEmoji('facebook', undefined, {
        emojiId: '1f600',
        missingEmojiIds: spriteSheet.availability,
      }),
    ).toBe(false);
    expect(
      vendorCanRenderEmoji('facebook', undefined, {
        emojiId: '1f603',
        missingEmojiIds: spriteSheet.availability,
      }),
    ).toBe(true);
  });
});
