import { DEFAULT_SPRITE_CACHE_NAME } from './constants';
import {
  createSpriteSheetCacheKey,
  resolveSpriteSheetConfig,
  resolveSpriteSheetUrl,
} from './sprites';
import type {
  EmojiSpriteSheetCacheAdapter,
  EmojiSpriteSheetCachedAsset,
  EmojiSpriteSheetCacheRequest,
  EmojiSpriteSheetConfig,
} from './types';

const sharedSpriteSheetAssets = new Map<
  string,
  Pick<EmojiSpriteSheetCachedAsset, 'url'>
>();
const pendingSpriteSheetWarmups = new Map<
  string,
  Promise<EmojiSpriteSheetCachedAsset>
>();
const decodedSpriteSheetUrls = new Set<string>();
const pendingSpriteSheetDecodes = new Map<string, Promise<void>>();

interface BrowserAssetCacheRequest {
  key: string;
}

function canUseBrowserAssetCache() {
  return (
    typeof window !== 'undefined' &&
    typeof window.caches !== 'undefined' &&
    typeof window.fetch !== 'undefined' &&
    typeof URL !== 'undefined' &&
    typeof URL.createObjectURL === 'function'
  );
}

function createBrowserCacheRequest(key: string) {
  return new Request(`https://cache.mojix.invalid/${encodeURIComponent(key)}`);
}

function canDecodeImage() {
  return typeof Image !== 'undefined';
}

export async function preloadSpriteSheetUrl(url: string) {
  if (!canDecodeImage() || decodedSpriteSheetUrls.has(url)) {
    return;
  }

  const pendingDecode = pendingSpriteSheetDecodes.get(url);

  if (pendingDecode) {
    return pendingDecode;
  }

  const decodePromise = new Promise<void>((resolve, reject) => {
    const image = new Image();
    let settled = false;

    const finish = () => {
      if (settled) {
        return;
      }

      settled = true;
      const decode = image.decode?.();

      if (decode) {
        void decode.catch(() => undefined).finally(() => resolve());
      } else {
        resolve();
      }
    };

    image.decoding = 'async';
    image.onload = finish;
    image.onerror = () => {
      if (settled) {
        return;
      }

      settled = true;
      reject(new Error(`Failed to preload emoji sprite sheet: ${url}`));
    };
    image.src = url;

    if (image.complete) {
      finish();
    }
  })
    .then(() => {
      decodedSpriteSheetUrls.add(url);
    })
    .finally(() => {
      pendingSpriteSheetDecodes.delete(url);
    });

  pendingSpriteSheetDecodes.set(url, decodePromise);

  return decodePromise;
}

export function createBrowserAssetCacheAdapter(options: {
  cacheName?: string;
} = {}) {
  const cacheName = options.cacheName ?? DEFAULT_SPRITE_CACHE_NAME;

  return {
    async load(request: BrowserAssetCacheRequest) {
      if (!canUseBrowserAssetCache()) {
        return null;
      }

      const cache = await window.caches.open(cacheName);
      return cache.match(createBrowserCacheRequest(request.key));
    },
    async save(request: BrowserAssetCacheRequest, response: Response) {
      if (!canUseBrowserAssetCache()) {
        return response;
      }

      const cache = await window.caches.open(cacheName);
      await cache.put(createBrowserCacheRequest(request.key), response.clone());
      return response;
    },
  };
}

async function createCachedAssetFromResponse(
  response: Response,
): Promise<EmojiSpriteSheetCachedAsset> {
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  await preloadSpriteSheetUrl(objectUrl).catch(() => undefined);

  return {
    url: objectUrl,
    cached: true,
    release: () => URL.revokeObjectURL(objectUrl),
  };
}

function isRemoteUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

function getSharedSpriteSheetAsset(key: string) {
  const asset = sharedSpriteSheetAssets.get(key);

  if (!asset) {
    return null;
  }

  return {
    url: asset.url,
    cached: true,
  } satisfies EmojiSpriteSheetCachedAsset;
}

function storeSharedSpriteSheetAsset(
  key: string,
  asset: EmojiSpriteSheetCachedAsset,
) {
  if (!asset.cached) {
    return asset;
  }

  const existingAsset = getSharedSpriteSheetAsset(key);

  if (existingAsset) {
    if (existingAsset.url !== asset.url) {
      asset.release?.();
    }

    return existingAsset;
  }

  sharedSpriteSheetAssets.set(key, {
    url: asset.url,
  });

  return {
    url: asset.url,
    cached: true,
  } satisfies EmojiSpriteSheetCachedAsset;
}

export function createBrowserSpriteSheetCacheAdapter(options: {
  cacheName?: string;
} = {}): EmojiSpriteSheetCacheAdapter {
  const assetCache = createBrowserAssetCacheAdapter({
    cacheName: options.cacheName ?? DEFAULT_SPRITE_CACHE_NAME,
  });

  return {
    async load(request) {
      const cached = await assetCache.load(request);

      if (!cached) {
        return null;
      }

      return createCachedAssetFromResponse(cached);
    },
    async save(request, response) {
      return createCachedAssetFromResponse(
        await assetCache.save(request, response),
      );
    },
  };
}

export function createSpriteSheetCacheRequest(
  spriteSheet?: EmojiSpriteSheetConfig,
): EmojiSpriteSheetCacheRequest {
  const resolved = resolveSpriteSheetConfig(spriteSheet);
  const url = resolveSpriteSheetUrl(resolved);

  return {
    key: createSpriteSheetCacheKey(resolved),
    url,
    vendor: resolved.vendor,
    sheetSize: resolved.sheetSize,
    variant: resolved.variant,
    source: resolved.source,
    version: resolved.version,
    packageName: resolved.packageName,
  };
}

function getSpriteSheetCacheAdapter(spriteSheet?: EmojiSpriteSheetConfig) {
  const resolved = resolveSpriteSheetConfig(spriteSheet);

  if (!resolved.cache.enabled) {
    return null;
  }

  if (resolved.cache.mode === 'custom') {
    return resolved.cache.adapter ?? null;
  }

  if (resolved.cache.mode === 'browser') {
    return createBrowserSpriteSheetCacheAdapter();
  }

  return null;
}

export function peekWarmedEmojiSpriteSheetUrl(
  spriteSheet?: EmojiSpriteSheetConfig,
) {
  const request = createSpriteSheetCacheRequest(spriteSheet);

  return sharedSpriteSheetAssets.get(request.key)?.url ?? null;
}

export async function warmEmojiSpriteSheet(
  spriteSheet?: EmojiSpriteSheetConfig,
): Promise<EmojiSpriteSheetCachedAsset> {
  const resolved = resolveSpriteSheetConfig(spriteSheet);
  const request = createSpriteSheetCacheRequest(resolved);
  const adapter = getSpriteSheetCacheAdapter(resolved);
  const sharedAsset = getSharedSpriteSheetAsset(request.key);

  if (sharedAsset) {
    return sharedAsset;
  }

  if (!adapter || !isRemoteUrl(request.url)) {
    await preloadSpriteSheetUrl(request.url).catch(() => undefined);

    return {
      url: request.url,
      cached: false,
    };
  }

  const pendingWarmup = pendingSpriteSheetWarmups.get(request.key);

  if (pendingWarmup) {
    return pendingWarmup;
  }

  const warmupPromise = (async () => {
    const cached = await adapter.load(request);

    if (cached) {
      return storeSharedSpriteSheetAsset(request.key, cached);
    }

    const response = await fetch(request.url, {
      credentials: 'omit',
      mode: 'cors',
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch emoji sprite sheet: ${response.status} ${response.statusText}`,
      );
    }

    return storeSharedSpriteSheetAsset(
      request.key,
      await adapter.save(request, response),
    );
  })();

  pendingSpriteSheetWarmups.set(request.key, warmupPromise);

  try {
    return await warmupPromise;
  } finally {
    pendingSpriteSheetWarmups.delete(request.key);
  }

}
