import type { CSSProperties } from 'react';
import {
  DEFAULT_SPRITE_BASE_PATH,
  DEFAULT_SPRITE_CACHE_MODE,
  EMOJI_DATASET_VERSION,
  EMOJI_SHEET_GRID_SIZE,
  EMOJI_SHEET_PADDING,
} from './constants';
import type {
  EmojiSpriteSheetCacheConfig,
  EmojiSpriteSheetConfig,
  EmojiSpriteSheetContext,
  EmojiSpriteSheetSource,
  EmojiSpriteSheetVariant,
  EmojiVendorAvailability,
  EmojiVendor,
  UnicodeEmojiAvailability,
} from './types';

const VENDOR_PACKAGES: Partial<Record<EmojiVendor, string>> = {
  apple: 'emoji-datasource-apple',
  google: 'emoji-datasource-google',
  twitter: 'emoji-datasource-twitter',
  facebook: 'emoji-datasource-facebook',
};
const SPRITE_STYLE_CACHE_LIMIT = 4096;
const spriteStyleCache = new Map<string, CSSProperties>();

export interface ResolvedEmojiSpriteSheetConfig
  extends Omit<
    Required<
      Omit<
        EmojiSpriteSheetConfig,
        'availability' | 'cache' | 'url'
      >
    >,
    never
  > {
  url: string | ((context: EmojiSpriteSheetContext) => string);
  availability?: ReadonlySet<string>;
  cache: Omit<Required<EmojiSpriteSheetCacheConfig>, 'adapter'> &
    Pick<EmojiSpriteSheetCacheConfig, 'adapter'>;
}

function getSpritesheetFolder(variant: EmojiSpriteSheetVariant) {
  switch (variant) {
    case 'indexed-128':
      return 'sheets-128';
    case 'indexed-256':
      return 'sheets-256';
    case 'clean':
      return 'sheets-clean';
    default:
      return 'sheets';
  }
}

export function resolveVendorPackageName(vendor: EmojiVendor) {
  return VENDOR_PACKAGES[vendor] ?? 'emoji-datasource';
}

function createSpriteSheetUrl(
  options: Partial<EmojiSpriteSheetContext> = {},
  source: Extract<EmojiSpriteSheetSource, 'cdn' | 'local'>,
) {
  const vendor = options.vendor ?? 'twitter';
  const sheetSize = options.sheetSize ?? 64;
  const variant = options.variant ?? 'indexed-256';
  const folder = getSpritesheetFolder(variant);

  if (source === 'local') {
    const basePath = options.basePath ?? DEFAULT_SPRITE_BASE_PATH;
    return `${basePath.replace(/\/$/, '')}/${vendor}/${folder}/${sheetSize}.png`;
  }

  const version = options.version ?? EMOJI_DATASET_VERSION;
  const packageName = options.packageName ?? resolveVendorPackageName(vendor);
  return `https://cdn.jsdelivr.net/npm/${packageName}@${version}/img/${vendor}/${folder}/${sheetSize}.png`;
}

export function createEmojiCdnUrl(
  options: Partial<EmojiSpriteSheetContext> = {},
) {
  return createSpriteSheetUrl(options, 'cdn');
}

export function createEmojiLocalUrl(
  options: Partial<EmojiSpriteSheetContext> = {},
) {
  return createSpriteSheetUrl(options, 'local');
}

export function createEmojiSpriteSheet(
  options: EmojiSpriteSheetConfig = {},
): EmojiSpriteSheetConfig {
  const source = options.source ?? (options.url ? 'custom' : 'cdn');
  const vendor = options.vendor ?? 'twitter';
  const sheetSize = options.sheetSize ?? 64;
  const variant = options.variant ?? 'indexed-256';
  const version = options.version ?? EMOJI_DATASET_VERSION;
  const packageName = options.packageName ?? resolveVendorPackageName(vendor);
  const basePath = options.basePath ?? DEFAULT_SPRITE_BASE_PATH;

  let url = options.url;

  if (!url && (source === 'local' || source === 'cdn')) {
    url = createSpriteSheetUrl(
      {
        vendor,
        sheetSize,
        variant,
        version,
        packageName,
        basePath,
      },
      source,
    );
  }

  return {
    vendor,
    availability: options.availability,
    sheetSize,
    padding: options.padding ?? EMOJI_SHEET_PADDING,
    gridSize: options.gridSize ?? EMOJI_SHEET_GRID_SIZE,
    variant,
    fallbackNative: options.fallbackNative ?? true,
    source,
    version,
    packageName,
    basePath,
    cache: options.cache,
    url,
  };
}

function resolveVendorAvailability(
  availability?: EmojiVendorAvailability,
) {
  if (!availability) {
    return undefined;
  }

  if (availability instanceof Set) {
    return availability;
  }

  if (Array.isArray(availability)) {
    return new Set(availability);
  }

  const missing =
    'missing' in availability
      ? availability.missing
      : 'unavailable' in availability
        ? availability.unavailable
        : [];

  return new Set(missing);
}

export function createEmojiCdnSpriteSheet(
  options: EmojiSpriteSheetConfig = {},
) {
  return createEmojiSpriteSheet({
    ...options,
    source: 'cdn',
  });
}

export function createEmojiLocalSpriteSheet(
  urlOrBasePath: string,
  options: Omit<EmojiSpriteSheetConfig, 'url'> = {},
) {
  const isDirectUrl = /\.png($|\?)/i.test(urlOrBasePath);

  return createEmojiSpriteSheet({
    ...options,
    source: 'local',
    ...(isDirectUrl
      ? { url: urlOrBasePath }
      : { basePath: urlOrBasePath }),
  });
}

export const defaultSpriteSheet = createEmojiCdnSpriteSheet();

export function resolveSpriteSheetConfig(
  config?: EmojiSpriteSheetConfig,
): ResolvedEmojiSpriteSheetConfig {
  const base = createEmojiSpriteSheet(config);
  const cache = {
    enabled: base.cache?.enabled ?? false,
    mode: base.cache?.mode ?? DEFAULT_SPRITE_CACHE_MODE,
    preload: base.cache?.preload ?? 'mount',
    key: base.cache?.key ?? '',
    adapter: base.cache?.adapter,
  };

  return {
    vendor: base.vendor ?? defaultSpriteSheet.vendor ?? 'twitter',
    availability: resolveVendorAvailability(base.availability),
    sheetSize: base.sheetSize ?? defaultSpriteSheet.sheetSize ?? 64,
    padding: base.padding ?? defaultSpriteSheet.padding ?? EMOJI_SHEET_PADDING,
    gridSize: base.gridSize ?? defaultSpriteSheet.gridSize ?? EMOJI_SHEET_GRID_SIZE,
    variant: base.variant ?? defaultSpriteSheet.variant ?? 'indexed-256',
    fallbackNative: base.fallbackNative ?? defaultSpriteSheet.fallbackNative ?? true,
    source: base.source ?? defaultSpriteSheet.source ?? 'cdn',
    version: base.version ?? defaultSpriteSheet.version ?? EMOJI_DATASET_VERSION,
    packageName:
      base.packageName ??
      defaultSpriteSheet.packageName ??
      resolveVendorPackageName(base.vendor ?? 'twitter'),
    basePath: base.basePath ?? defaultSpriteSheet.basePath ?? DEFAULT_SPRITE_BASE_PATH,
    url: base.url ?? defaultSpriteSheet.url ?? createEmojiCdnUrl(),
    cache,
  };
}

export function resolveSpriteSheetUrl(
  config?: EmojiSpriteSheetConfig,
  overrideUrl?: string,
) {
  if (overrideUrl) {
    return overrideUrl;
  }

  const resolved = resolveSpriteSheetConfig(config);

  if (typeof resolved.url === 'function') {
    return resolved.url({
      vendor: resolved.vendor,
      sheetSize: resolved.sheetSize,
      variant: resolved.variant,
      source: resolved.source,
      version: resolved.version,
      packageName: resolved.packageName,
      basePath: resolved.basePath,
    });
  }

  return resolved.url;
}

export function createSpriteSheetCacheKey(config?: EmojiSpriteSheetConfig) {
  const resolved = resolveSpriteSheetConfig(config);
  const resolvedUrl = resolveSpriteSheetUrl(resolved);

  return (
    resolved.cache.key ||
    [
      'mojix',
      resolved.source,
      resolved.packageName,
      resolved.version,
      resolved.vendor,
      resolved.variant,
      resolved.sheetSize,
      resolvedUrl,
    ].join(':')
  );
}

function createSpriteStyleCacheKey(options: {
  sheetX: number;
  sheetY: number;
  renderSize: number;
  sheetUrl: string;
  sheetSize: number;
  padding: number;
  gridSize: number;
}) {
  return [
    options.sheetUrl,
    options.sheetX,
    options.sheetY,
    options.renderSize,
    options.sheetSize,
    options.padding,
    options.gridSize,
  ].join(':');
}

function cacheSpriteStyle(key: string, style: CSSProperties) {
  if (spriteStyleCache.size >= SPRITE_STYLE_CACHE_LIMIT) {
    const firstKey = spriteStyleCache.keys().next().value;

    if (firstKey !== undefined) {
      spriteStyleCache.delete(firstKey);
    }
  }

  spriteStyleCache.set(key, style);

  return style;
}

export function clearEmojiSpriteStyleCache() {
  spriteStyleCache.clear();
}

export function getSpriteStyle(options: {
  sheetX: number;
  sheetY: number;
  renderSize: number;
  spriteSheet?: EmojiSpriteSheetConfig;
  overrideUrl?: string;
  overrideSheetSize?: number;
  overridePadding?: number;
  overrideGridSize?: number;
}): CSSProperties {
  const resolved = resolveSpriteSheetConfig(options.spriteSheet);
  const sheetSize = options.overrideSheetSize ?? resolved.sheetSize;
  const padding = options.overridePadding ?? resolved.padding;
  const gridSize = options.overrideGridSize ?? resolved.gridSize;
  const cellSize = sheetSize + padding * 2;
  const sheetUrl = resolveSpriteSheetUrl(resolved, options.overrideUrl);
  const cacheKey = createSpriteStyleCacheKey({
    sheetX: options.sheetX,
    sheetY: options.sheetY,
    renderSize: options.renderSize,
    sheetUrl,
    sheetSize,
    padding,
    gridSize,
  });
  const cachedStyle = spriteStyleCache.get(cacheKey);

  if (cachedStyle) {
    return cachedStyle;
  }

  const backgroundScalePercent =
    (gridSize * cellSize * 100) / Math.max(1, sheetSize);
  const backgroundTravel = Math.max(
    1,
    gridSize * cellSize - sheetSize,
  );
  const backgroundPositionXPercent =
    ((options.sheetX * cellSize + padding) * 100) / backgroundTravel;
  const backgroundPositionYPercent =
    ((options.sheetY * cellSize + padding) * 100) / backgroundTravel;

  return cacheSpriteStyle(cacheKey, {
    width: `${options.renderSize}px`,
    height: `${options.renderSize}px`,
    backgroundImage: `url("${sheetUrl}")`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${backgroundScalePercent}% ${backgroundScalePercent}%`,
    backgroundPosition: `${backgroundPositionXPercent}% ${backgroundPositionYPercent}%`,
    borderRadius: `${Math.max(4, options.renderSize * 0.22)}px`,
    flexShrink: 0,
  });
}

export function vendorCanRenderEmoji(
  vendor: EmojiVendor,
  availability?: UnicodeEmojiAvailability,
  options: {
    emojiId?: string;
    missingEmojiIds?: ReadonlySet<string>;
  } = {},
) {
  if (options.emojiId && options.missingEmojiIds) {
    return !options.missingEmojiIds.has(options.emojiId);
  }

  if (!availability) {
    return true;
  }

  switch (vendor) {
    case 'apple':
      return availability.apple;
    case 'google':
      return availability.google;
    case 'twitter':
      return availability.twitter;
    case 'facebook':
      return availability.facebook;
    default:
      return true;
  }
}
