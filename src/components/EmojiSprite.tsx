import type { CSSProperties } from 'react';
import { resolveEmojiAsset } from '../core/assets';
import { resolveUnicodeEmojiVariant } from '../core/data';
import { getSpriteStyle, resolveSpriteSheetConfig } from '../core/sprites';
import type {
  EmojiAssetRenderContext,
  EmojiAssetSource,
  EmojiRenderable,
  EmojiSkinTone,
  EmojiSpriteSheetConfig,
} from '../core/types';
import { createClassName } from './utils';

export interface EmojiSpriteProps {
  emoji: EmojiRenderable;
  spriteSheet?: EmojiSpriteSheetConfig;
  assetSource?: EmojiAssetSource;
  assetContext?: EmojiAssetRenderContext;
  skinTone?: EmojiSkinTone;
  size?: number;
  className?: string;
  title?: string;
  alt?: string;
}

export function EmojiSprite({
  emoji,
  spriteSheet,
  assetSource,
  assetContext = 'grid',
  skinTone = 'default',
  size = 24,
  className,
  title,
  alt,
}: EmojiSpriteProps) {
  // Empty-string title/alt are treated as decorative; render no DOM
  // attribute so the closest ancestor's tooltip / a11y label can take over.
  const ariaLabelAttr = alt === '' ? undefined : (alt ?? emoji.name);
  const spanTitle =
    title === '' ? undefined : (title ?? alt ?? emoji.name);

  if (assetSource?.type === 'native') {
    const native =
      emoji.kind === 'unicode'
        ? resolveUnicodeEmojiVariant(emoji, skinTone).native
        : emoji.native;

    if (native) {
      return (
        <span
          role="img"
          aria-label={ariaLabelAttr}
          title={spanTitle}
          className={createClassName('mx-emoji-native', className)}
          style={{ fontSize: `${size}px`, lineHeight: 1 }}
        >
          {native}
        </span>
      );
    }
  }

  const resolvedConfig = resolveSpriteSheetConfig(spriteSheet);
  const asset = resolveEmojiAsset({
    emoji,
    skinTone,
    context: assetContext,
    spriteSheet: resolvedConfig,
    assetSource,
  });

  if (!asset) {
    return null;
  }

  if (asset.kind === 'image' || asset.kind === 'svg') {
    const imgTitle =
      title === '' ? undefined : (title ?? alt ?? asset.alt ?? emoji.name);

    return (
      <img
        className={createClassName('mx-emoji-sprite', className)}
        src={asset.src}
        alt={alt === '' ? '' : (alt ?? asset.alt ?? emoji.name)}
        title={imgTitle}
        width={size}
        height={size}
        loading="lazy"
        style={
          {
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: `${Math.max(4, size * 0.22)}px`,
          } satisfies CSSProperties
        }
      />
    );
  }

  if (asset.kind === 'native') {
    return (
      <span
        role="img"
        aria-label={ariaLabelAttr}
        title={spanTitle}
        className={createClassName('mx-emoji-native', className)}
        style={{ fontSize: `${size}px`, lineHeight: 1 }}
      >
        {asset.native}
      </span>
    );
  }

  const effectiveSpriteSheet = asset.spriteSheet ?? resolvedConfig;

  return (
    <span
      role="img"
      aria-label={ariaLabelAttr}
      title={spanTitle}
      className={createClassName('mx-emoji-sprite', className)}
      style={getSpriteStyle({
        sheetX: asset.sheetX,
        sheetY: asset.sheetY,
        renderSize: size,
        spriteSheet: effectiveSpriteSheet,
        overrideUrl: asset.sheetUrl,
        overrideSheetSize: asset.sheetSize,
        overridePadding: asset.padding,
        overrideGridSize: asset.gridSize,
      })}
    />
  );
}
