import {
  DEFAULT_DATA_CACHE_NAME,
  DEFAULT_PREPARED_DATA_CACHE_NAME,
} from './constants';
import { createBrowserAssetCacheAdapter } from './sprite-cache';
import type { EmojiDataPayload } from './data';
import type {
  EmojiLocaleEmojiTranslation,
  EmojiLocaleSearchIndex,
} from './types';

export type MojiXDataAssetKind =
  | 'emoji-data'
  | 'locale'
  | 'locale-search';

export interface MojiXDataFetchRequest {
  kind: MojiXDataAssetKind;
  key: string;
  path: string;
  url: string;
  locale?: string;
  init: RequestInit;
}

export type MojiXDataFetcher = <T = unknown>(
  request: MojiXDataFetchRequest,
) => Promise<Response | T>;

export interface MojiXDataSourceConfig {
  baseUrl?: string | ((
    path: string,
    request: Omit<MojiXDataFetchRequest, 'init' | 'url'>,
  ) => string);
  cache?: boolean;
  cacheName?: string;
  preparedCache?: boolean;
  preparedCacheName?: string;
  fetcher?: MojiXDataFetcher;
  /**
   * When `true`, route the heaviest part of emoji preparation
   * (search-token generation) through a Web Worker. Falls back to the main
   * thread automatically when `Worker` is unavailable.
   */
  workerPreparation?: boolean;
}

export interface EmojiDataBootstrapPayload {
  version?: 1;
  data: EmojiDataPayload;
  locales?: Record<string, Record<string, EmojiLocaleEmojiTranslation>>;
}

let dataSourceConfig: MojiXDataSourceConfig = {};

export function configureMojiXDataSource(
  config: MojiXDataSourceConfig | null,
) {
  dataSourceConfig = config ? { ...dataSourceConfig, ...config } : {};
}

export function resetMojiXDataSource() {
  dataSourceConfig = {};
}

function createPackageDataUrl(
  path: string,
  request: Omit<MojiXDataFetchRequest, 'init' | 'url'>,
) {
  const normalizedPath = path.replace(/^\//, '');
  const { baseUrl } = dataSourceConfig;

  if (typeof baseUrl === 'function') {
    return baseUrl(normalizedPath, request);
  }

  if (baseUrl) {
    return `${baseUrl.replace(/\/$/, '')}/${normalizedPath}`;
  }

  return `https://cdn.jsdelivr.net/npm/mojix-picker@${__MOJIX_VERSION__}/data/${normalizedPath}`;
}

function createVersionedCacheKey(key: string, url: string) {
  return `${__MOJIX_VERSION__}:${key}:${url}`;
}

export function createMojiXDataAssetCacheInfo(options: {
  kind: MojiXDataAssetKind;
  key: string;
  path: string;
  locale?: string;
}) {
  const requestBase = {
    kind: options.kind,
    key: options.key,
    path: options.path,
    locale: options.locale,
  };
  const url = createPackageDataUrl(options.path, requestBase);

  return {
    key: createVersionedCacheKey(options.key, url),
    url,
  };
}

export function shouldUsePreparedEmojiDataCache() {
  return dataSourceConfig.preparedCache !== false;
}

export function getPreparedEmojiDataCacheName() {
  return dataSourceConfig.preparedCacheName ?? DEFAULT_PREPARED_DATA_CACHE_NAME;
}

export function shouldUseWorkerPreparation() {
  return dataSourceConfig.workerPreparation === true;
}

function isResponseLike(value: unknown): value is Response {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'ok' in value &&
      'json' in value &&
      typeof (value as Response).json === 'function',
  );
}

async function fetchResponse<T>(
  request: MojiXDataFetchRequest,
): Promise<Response | T> {
  if (dataSourceConfig.fetcher) {
    return dataSourceConfig.fetcher<T>(request);
  }

  if (typeof fetch === 'undefined') {
    throw new Error('MojiX data loading requires fetch or a custom fetcher.');
  }

  return fetch(request.url, request.init);
}

async function fetchJsonAsset<T>(options: {
  kind: MojiXDataAssetKind;
  key: string;
  path: string;
  locale?: string;
}) {
  const requestBase = {
    kind: options.kind,
    key: options.key,
    path: options.path,
    locale: options.locale,
  };
  const { key: cacheKey, url } = createMojiXDataAssetCacheInfo(requestBase);
  const cacheEnabled = dataSourceConfig.cache !== false;

  if (cacheEnabled) {
    const assetCache = createBrowserAssetCacheAdapter({
      cacheName: dataSourceConfig.cacheName ?? DEFAULT_DATA_CACHE_NAME,
    });
    const cached = await assetCache.load({ key: cacheKey }).catch(() => null);

    if (cached) {
      try {
        return (await cached.json()) as T;
      } catch {
        // Ignore unreadable cached data and refresh it from the configured source.
      }
    }
  }

  const init: RequestInit = {
    credentials: 'omit',
    mode: 'cors',
  };
  const fetched = await fetchResponse<T>({
    ...requestBase,
    url,
    init,
  });

  if (!isResponseLike(fetched)) {
    return fetched as T;
  }

  const response = fetched;

  if (!response.ok) {
    throw new Error(
      `Failed to fetch MojiX asset: ${response.status} ${response.statusText}`,
    );
  }

  if (cacheEnabled) {
    const assetCache = createBrowserAssetCacheAdapter({
      cacheName: dataSourceConfig.cacheName ?? DEFAULT_DATA_CACHE_NAME,
    });
    const responseForCache = response.clone();

    void assetCache
      .save({ key: cacheKey }, responseForCache)
      .catch(() => undefined);
  }

  return (await response.json()) as T;
}

export function loadEmojiDataFromCdn() {
  return fetchJsonAsset<EmojiDataPayload>({
    kind: 'emoji-data',
    key: 'emoji-data',
    path: 'emoji-data.json',
  });
}

export function loadEmojiDataBootstrapFromCdn() {
  return fetchJsonAsset<EmojiDataBootstrapPayload>({
    kind: 'emoji-data',
    key: 'emoji-bootstrap:en',
    path: 'emoji-bootstrap.en.json',
  });
}

export function loadEmojiDataShardFromCdn(categoryId: string) {
  return fetchJsonAsset<EmojiDataPayload>({
    kind: 'emoji-data',
    key: `emoji-shard:${categoryId}`,
    path: `emoji-shard.${categoryId}.json`,
  });
}

export function loadEmojiLocalePackFromCdn(locale: string) {
  return fetchJsonAsset<Record<string, EmojiLocaleEmojiTranslation>>({
    kind: 'locale',
    key: `locale:${locale}`,
    path: `locales/${locale}.json`,
    locale,
  });
}

export function loadEmojiLocaleSearchFromCdn(locale: string) {
  return fetchJsonAsset<EmojiLocaleSearchIndex>({
    kind: 'locale-search',
    key: `locale-search:${locale}`,
    path: `locales/${locale}.search.json`,
    locale,
  });
}
