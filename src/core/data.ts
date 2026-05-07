import {
  createMojiXDataAssetCacheInfo,
  getPreparedEmojiDataCacheName,
  loadEmojiDataBootstrapFromCdn,
  loadEmojiDataFromCdn,
  loadEmojiDataShardFromCdn,
  shouldUsePreparedEmojiDataCache,
  shouldUseWorkerPreparation,
  type EmojiDataBootstrapPayload,
} from './data-source';
import {
  loadPreparedEmojiDataFromCache,
  savePreparedEmojiDataToCache,
} from './prepared-cache';
import { computeEmojiSearchTokensOnWorker } from './data-prepare-worker';
import {
  getEmojiLocaleRegistrySnapshot,
  getLocalizedCategoryLabel,
  getLocalizedEmojiKeywords,
  getLocalizedEmojiName,
  loadLocale,
  registerEmojiLocalePack,
  resolveLocaleDefinition,
} from './i18n';
import {
  CATEGORY_META,
  humanizeCategoryId,
  isSystemCategoryId,
} from './constants';
import type {
  BuiltInEmojiCategoryId,
  CustomEmoji,
  EmojiLocaleDefinition,
  EmojiRenderable,
  EmojiSelection,
  EmojiSkinTone,
  EmojiSkinVariant,
  PreparedCustomEmoji,
  UnicodeEmoji,
  UnicodeEmojiAvailability,
} from './types';

type PreparedUnicodeEmojiRecord = Omit<
  UnicodeEmoji,
  'kind' | 'searchTokens' | 'categoryLabel'
>;

type EmojiDataAvailabilityInput = UnicodeEmojiAvailability | number;

type EmojiSkinVariantInput = Omit<EmojiSkinVariant, 'unified'> & {
  unified?: string;
};

type EmojiSkinToneWithoutDefault = Exclude<EmojiSkinTone, 'default'>;

type UnicodeEmojiColumnField =
  | 'id'
  | 'native'
  | 'name'
  | 'aliases'
  | 'emoticons'
  | 'categoryId'
  | 'category'
  | 'cat'
  | 'subcategory'
  | 'sub'
  | 'sheetX'
  | 'x'
  | 'sheetY'
  | 'y'
  | 'availability'
  | 'av'
  | 'skins';

type UnicodeEmojiCanonicalColumnField =
  | 'id'
  | 'native'
  | 'name'
  | 'aliases'
  | 'emoticons'
  | 'categoryId'
  | 'subcategory'
  | 'sheetX'
  | 'sheetY'
  | 'availability'
  | 'skins';

type UnicodeEmojiColumnValue =
  | string
  | number
  | string[]
  | EmojiSkinVariantColumnRow[]
  | null;

export type EmojiSkinVariantColumnRow = [
  tone: number | EmojiSkinToneWithoutDefault,
  unified: string,
  native: string,
  sheetX: number,
  sheetY: number,
];

export type UnicodeEmojiDataRecord = Omit<
  PreparedUnicodeEmojiRecord,
  'unified' | 'availability' | 'name' | 'skins' | 'subcategory'
> & {
  unified?: string;
  name?: string;
  subcategory?: string;
  availability?: EmojiDataAvailabilityInput;
  skins: EmojiSkinVariantInput[];
};

export interface UnicodeEmojiColumnData {
  version?: 1;
  fields: readonly UnicodeEmojiColumnField[];
  categories?: readonly BuiltInEmojiCategoryId[];
  subcategories?: readonly string[];
  skinTones?: readonly EmojiSkinToneWithoutDefault[];
  rows: readonly (readonly UnicodeEmojiColumnValue[])[];
}

export type EmojiDataPayload =
  | UnicodeEmojiDataRecord[]
  | UnicodeEmojiColumnData;

export type EmojiDataInput =
  | EmojiDataPayload
  | {
      default: EmojiDataPayload;
    };

type EmojiDataStoreStatus = 'idle' | 'loading' | 'ready' | 'error';

interface PreparedUnicodeEmojiData {
  list: UnicodeEmoji[];
  byId: Map<string, UnicodeEmoji>;
  byNative: Map<string, UnicodeEmoji>;
  byCategory: Record<BuiltInEmojiCategoryId, UnicodeEmoji[]>;
}

const EMOJI_PREPARE_CHUNK_SIZE = 192;
const EMOJI_PREPARE_IDLE_TIMEOUT = 50;

interface LocalizedSearchTokensCacheEntry {
  tokens: string[];
  registryVersion: number;
}

const localizedSearchTokensCache = new WeakMap<
  EmojiRenderable,
  Map<string, LocalizedSearchTokensCacheEntry>
>();

export interface EmojiDataStoreSnapshot {
  ready: boolean;
  status: EmojiDataStoreStatus;
  error: unknown;
  version: number;
}

const emojiDataStoreListeners = new Set<() => void>();
const emojiDataStore: {
  status: EmojiDataStoreStatus;
  prepared: PreparedUnicodeEmojiData | null;
  loadedCategories: Set<BuiltInEmojiCategoryId>;
  error: unknown;
  promise: Promise<UnicodeEmoji[]> | null;
  version: number;
} = {
  status: 'idle',
  prepared: null,
  loadedCategories: new Set(),
  error: null,
  promise: null,
  version: 0,
};
let emojiDataStoreSnapshot: EmojiDataStoreSnapshot = {
  ready: false,
  status: 'idle',
  error: null,
  version: 0,
};

const DEFAULT_COLUMN_CATEGORIES: readonly BuiltInEmojiCategoryId[] = [
  'smileys',
  'people',
  'animals',
  'food',
  'activities',
  'travel',
  'objects',
  'symbols',
  'flags',
];

const DEFAULT_COLUMN_SKIN_TONES: readonly EmojiSkinToneWithoutDefault[] = [
  'light',
  'medium-light',
  'medium',
  'medium-dark',
  'dark',
];

const COLUMN_FIELD_ALIASES: Record<
  UnicodeEmojiCanonicalColumnField,
  readonly UnicodeEmojiColumnField[]
> = {
  id: ['id'],
  native: ['native'],
  name: ['name'],
  aliases: ['aliases'],
  emoticons: ['emoticons'],
  categoryId: ['categoryId', 'category', 'cat'],
  subcategory: ['subcategory', 'sub'],
  sheetX: ['sheetX', 'x'],
  sheetY: ['sheetY', 'y'],
  availability: ['availability', 'av'],
  skins: ['skins'],
};

function syncEmojiDataStoreSnapshot() {
  emojiDataStoreSnapshot = {
    ready: emojiDataStore.prepared !== null,
    status: emojiDataStore.status,
    error: emojiDataStore.error,
    version: emojiDataStore.version,
  };
}

function emitEmojiDataStoreChange() {
  emojiDataStore.version += 1;
  syncEmojiDataStoreSnapshot();

  for (const listener of emojiDataStoreListeners) {
    listener();
  }
}

function normalizeQuery(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/gu, ' ')
    .replace(/[^\p{L}\p{N}:+()<> ]+/gu, ' ')
    .replace(/\s+/gu, ' ');
}

function waitForEmojiPreparationSlot() {
  return new Promise<void>((resolve) => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => resolve(), {
        timeout: EMOJI_PREPARE_IDLE_TIMEOUT,
      });
      return;
    }

    setTimeout(resolve, 0);
  });
}

async function mapEmojiDataInChunks<T, R>(
  items: readonly T[],
  mapper: (item: T, index: number) => R,
  chunkSize = EMOJI_PREPARE_CHUNK_SIZE,
) {
  const mapped = new Array<R>(items.length);

  for (let index = 0; index < items.length; index += 1) {
    mapped[index] = mapper(items[index]!, index);

    if (
      (index + 1) % chunkSize === 0 &&
      index + 1 < items.length
    ) {
      await waitForEmojiPreparationSlot();
    }
  }

  return mapped;
}

function createSearchTokens(options: {
  name: string;
  categoryLabel: string;
  subcategory: string;
  aliases: string[];
  emoticons: string[];
}) {
  return Array.from(
    new Set(
      [
        options.name,
        options.categoryLabel,
        options.subcategory,
        ...options.aliases,
        ...options.aliases.map((alias) => alias.replaceAll('_', ' ')),
        ...options.aliases.map((alias) => `:${alias}:`),
        ...options.emoticons,
      ]
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
        .map((value) => normalizeQuery(value))
        .filter(Boolean),
    ),
  );
}

function unwrapEmojiDataInput(raw: EmojiDataInput): EmojiDataPayload {
  if (
    raw &&
    typeof raw === 'object' &&
    'default' in raw &&
    raw.default &&
    typeof raw.default === 'object'
  ) {
    return raw.default;
  }

  return raw as EmojiDataPayload;
}

function isColumnEmojiData(
  raw: EmojiDataPayload,
): raw is UnicodeEmojiColumnData {
  return (
    raw !== null &&
    typeof raw === 'object' &&
    !Array.isArray(raw) &&
    Array.isArray(raw.fields) &&
    Array.isArray(raw.rows)
  );
}

function createColumnFieldIndexes(fields: readonly UnicodeEmojiColumnField[]) {
  const indexes: Partial<Record<UnicodeEmojiCanonicalColumnField, number>> = {};

  for (const [field, aliases] of Object.entries(COLUMN_FIELD_ALIASES) as Array<
    [
      UnicodeEmojiCanonicalColumnField,
      readonly UnicodeEmojiColumnField[],
    ]
  >) {
    const index = fields.findIndex((candidate) => aliases.includes(candidate));

    if (index >= 0) {
      indexes[field] = index;
    }
  }

  return indexes;
}

function getColumnValue(
  row: readonly UnicodeEmojiColumnValue[],
  indexes: Partial<Record<UnicodeEmojiCanonicalColumnField, number>>,
  field: UnicodeEmojiCanonicalColumnField,
) {
  const index = indexes[field];

  return index === undefined ? undefined : row[index];
}

function requireColumnString(
  row: readonly UnicodeEmojiColumnValue[],
  indexes: Partial<Record<UnicodeEmojiCanonicalColumnField, number>>,
  field: UnicodeEmojiCanonicalColumnField,
) {
  const value = getColumnValue(row, indexes, field);

  if (typeof value !== 'string') {
    throw new Error(`Emoji data column is missing string field: ${field}`);
  }

  return value;
}

function getOptionalColumnString(
  row: readonly UnicodeEmojiColumnValue[],
  indexes: Partial<Record<UnicodeEmojiCanonicalColumnField, number>>,
  field: UnicodeEmojiCanonicalColumnField,
) {
  const value = getColumnValue(row, indexes, field);

  return typeof value === 'string' ? value : undefined;
}

function requireColumnNumber(
  row: readonly UnicodeEmojiColumnValue[],
  indexes: Partial<Record<UnicodeEmojiCanonicalColumnField, number>>,
  field: UnicodeEmojiCanonicalColumnField,
) {
  const value = getColumnValue(row, indexes, field);

  if (typeof value !== 'number') {
    throw new Error(`Emoji data column is missing number field: ${field}`);
  }

  return value;
}

function toStringArray(value: UnicodeEmojiColumnValue | undefined) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

function isBuiltInCategoryId(value: string): value is BuiltInEmojiCategoryId {
  return DEFAULT_COLUMN_CATEGORIES.includes(value as BuiltInEmojiCategoryId);
}

function resolveColumnCategory(
  value: UnicodeEmojiColumnValue | undefined,
  categories: readonly BuiltInEmojiCategoryId[],
) {
  if (typeof value === 'number') {
    const categoryId = categories[value];

    if (categoryId) {
      return categoryId;
    }
  }

  if (typeof value === 'string' && isBuiltInCategoryId(value)) {
    return value;
  }

  throw new Error('Emoji data column contains an invalid category reference.');
}

function resolveColumnSubcategory(
  value: UnicodeEmojiColumnValue | undefined,
  subcategories: readonly string[],
) {
  if (typeof value === 'number') {
    return subcategories[value] ?? '';
  }

  return typeof value === 'string' ? value : '';
}

function isSkinToneWithoutDefault(
  value: string,
): value is EmojiSkinToneWithoutDefault {
  return DEFAULT_COLUMN_SKIN_TONES.includes(
    value as EmojiSkinToneWithoutDefault,
  );
}

function resolveColumnSkinTone(
  value: EmojiSkinVariantColumnRow[0],
  skinTones: readonly EmojiSkinToneWithoutDefault[],
) {
  if (typeof value === 'number') {
    return skinTones[value] ?? null;
  }

  return isSkinToneWithoutDefault(value) ? value : null;
}

function expandColumnSkinVariant(
  skin: EmojiSkinVariantColumnRow,
  skinTones: readonly EmojiSkinToneWithoutDefault[],
) {
  const [toneRef, unified, native, sheetX, sheetY] = skin;
  const tone = resolveColumnSkinTone(toneRef, skinTones);

  if (
    !tone ||
    typeof unified !== 'string' ||
    typeof native !== 'string' ||
    typeof sheetX !== 'number' ||
    typeof sheetY !== 'number'
  ) {
    throw new Error('Emoji data column contains an invalid skin variant.');
  }

  return {
    tone,
    unified,
    native,
    sheetX,
    sheetY,
  };
}

function expandColumnSkins(
  value: UnicodeEmojiColumnValue | undefined,
  skinTones: readonly EmojiSkinToneWithoutDefault[],
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((skin): skin is EmojiSkinVariantColumnRow =>
      Array.isArray(skin),
    )
    .map((skin) => expandColumnSkinVariant(skin, skinTones));
}

function expandColumnEmojiData(
  raw: UnicodeEmojiColumnData,
): UnicodeEmojiDataRecord[] {
  const indexes = createColumnFieldIndexes(raw.fields);
  const categories = raw.categories ?? DEFAULT_COLUMN_CATEGORIES;
  const subcategories = raw.subcategories ?? [];
  const skinTones = raw.skinTones ?? DEFAULT_COLUMN_SKIN_TONES;

  return raw.rows.map((row) => ({
    id: requireColumnString(row, indexes, 'id'),
    native: requireColumnString(row, indexes, 'native'),
    name: getOptionalColumnString(row, indexes, 'name'),
    aliases: toStringArray(getColumnValue(row, indexes, 'aliases')),
    emoticons: toStringArray(getColumnValue(row, indexes, 'emoticons')),
    categoryId: resolveColumnCategory(
      getColumnValue(row, indexes, 'categoryId'),
      categories,
    ),
    subcategory: resolveColumnSubcategory(
      getColumnValue(row, indexes, 'subcategory'),
      subcategories,
    ),
    sheetX: requireColumnNumber(row, indexes, 'sheetX'),
    sheetY: requireColumnNumber(row, indexes, 'sheetY'),
    availability: getColumnValue(row, indexes, 'availability') as
      | EmojiDataAvailabilityInput
      | undefined,
    skins: expandColumnSkins(
      getColumnValue(row, indexes, 'skins'),
      skinTones,
    ),
  }));
}

async function expandColumnEmojiDataAsync(
  raw: UnicodeEmojiColumnData,
): Promise<UnicodeEmojiDataRecord[]> {
  const indexes = createColumnFieldIndexes(raw.fields);
  const categories = raw.categories ?? DEFAULT_COLUMN_CATEGORIES;
  const subcategories = raw.subcategories ?? [];
  const skinTones = raw.skinTones ?? DEFAULT_COLUMN_SKIN_TONES;

  return mapEmojiDataInChunks(raw.rows, (row) => ({
    id: requireColumnString(row, indexes, 'id'),
    native: requireColumnString(row, indexes, 'native'),
    name: getOptionalColumnString(row, indexes, 'name'),
    aliases: toStringArray(getColumnValue(row, indexes, 'aliases')),
    emoticons: toStringArray(getColumnValue(row, indexes, 'emoticons')),
    categoryId: resolveColumnCategory(
      getColumnValue(row, indexes, 'categoryId'),
      categories,
    ),
    subcategory: resolveColumnSubcategory(
      getColumnValue(row, indexes, 'subcategory'),
      subcategories,
    ),
    sheetX: requireColumnNumber(row, indexes, 'sheetX'),
    sheetY: requireColumnNumber(row, indexes, 'sheetY'),
    availability: getColumnValue(row, indexes, 'availability') as
      | EmojiDataAvailabilityInput
      | undefined,
    skins: expandColumnSkins(
      getColumnValue(row, indexes, 'skins'),
      skinTones,
    ),
  }));
}

function normalizeEmojiDataInput(raw: EmojiDataInput): UnicodeEmojiDataRecord[] {
  const payload = unwrapEmojiDataInput(raw);

  return isColumnEmojiData(payload) ? expandColumnEmojiData(payload) : payload;
}

async function normalizeEmojiDataInputAsync(
  raw: EmojiDataInput,
): Promise<UnicodeEmojiDataRecord[]> {
  const payload = unwrapEmojiDataInput(raw);

  return isColumnEmojiData(payload)
    ? expandColumnEmojiDataAsync(payload)
    : payload;
}

function idToUnified(id: string) {
  return id.toUpperCase();
}

function toFallbackEmojiName(id: string, aliases: string[]) {
  const candidate = aliases[0] ?? id;
  const normalized = candidate.replaceAll('_', ' ').replaceAll('-', ' ');

  return normalized.charAt(0).toLocaleUpperCase('en') + normalized.slice(1);
}

function resolveEnglishEmojiName(
  id: string,
  explicitName: string | undefined,
  aliases: string[],
) {
  if (explicitName) {
    return explicitName;
  }

  return (
    resolveLocaleDefinition('en').emoji[id]?.name ??
    toFallbackEmojiName(id, aliases)
  );
}

function normalizeAvailability(
  availability: EmojiDataAvailabilityInput | undefined,
): UnicodeEmojiAvailability {
  if (typeof availability === 'number') {
    return {
      apple: (availability & 1) !== 0,
      google: (availability & 2) !== 0,
      twitter: (availability & 4) !== 0,
      facebook: (availability & 8) !== 0,
    };
  }

  if (availability) {
    return {
      apple: Boolean(availability.apple),
      google: Boolean(availability.google),
      twitter: Boolean(availability.twitter),
      facebook: Boolean(availability.facebook),
    };
  }

  return {
    apple: true,
    google: true,
    twitter: true,
    facebook: true,
  };
}

function normalizeUnicodeEmojiRecord(
  emoji: UnicodeEmojiDataRecord,
): PreparedUnicodeEmojiRecord {
  const name = resolveEnglishEmojiName(
    emoji.id,
    emoji.name,
    emoji.aliases,
  );

  return {
    ...emoji,
    name,
    unified: emoji.unified ?? idToUnified(emoji.id),
    subcategory: emoji.subcategory ?? '',
    availability: normalizeAvailability(emoji.availability),
    skins: emoji.skins.map((skin) => ({
      ...skin,
      unified: skin.unified ?? idToUnified(emoji.id),
    })),
  };
}

function createPreparedUnicodeEmojiDataFromList(
  list: UnicodeEmoji[],
): PreparedUnicodeEmojiData {
  const byId = new Map<string, UnicodeEmoji>();
  const byNative = new Map<string, UnicodeEmoji>();
  const byCategory: Record<BuiltInEmojiCategoryId, UnicodeEmoji[]> = {
    smileys: [],
    people: [],
    animals: [],
    food: [],
    activities: [],
    travel: [],
    objects: [],
    symbols: [],
    flags: [],
  };

  for (const emoji of list) {
    byId.set(emoji.id, emoji);
    byNative.set(emoji.native, emoji);
    byCategory[emoji.categoryId].push(emoji);
  }

  return {
    list,
    byId,
    byNative,
    byCategory,
  };
}

interface PartiallyPreparedUnicodeEmoji {
  base: PreparedUnicodeEmojiRecord;
  categoryLabel: string;
}

function partiallyPrepareUnicodeEmojiRecord(
  record: UnicodeEmojiDataRecord,
): PartiallyPreparedUnicodeEmoji {
  const base = normalizeUnicodeEmojiRecord(record);
  const categoryLabel = CATEGORY_META[base.categoryId].label;

  return { base, categoryLabel };
}

function finalizeUnicodeEmojiRecord(
  partial: PartiallyPreparedUnicodeEmoji,
  searchTokens: string[],
): UnicodeEmoji {
  return {
    ...partial.base,
    kind: 'unicode' as const,
    categoryLabel: partial.categoryLabel,
    searchTokens,
  };
}

function prepareUnicodeEmojiRecord(record: UnicodeEmojiDataRecord) {
  const partial = partiallyPrepareUnicodeEmojiRecord(record);

  return finalizeUnicodeEmojiRecord(
    partial,
    createSearchTokens({
      name: partial.base.name,
      categoryLabel: partial.categoryLabel,
      subcategory: partial.base.subcategory,
      aliases: partial.base.aliases,
      emoticons: partial.base.emoticons,
    }),
  );
}

function prepareUnicodeEmojiData(
  raw: UnicodeEmojiDataRecord[],
): PreparedUnicodeEmojiData {
  return createPreparedUnicodeEmojiDataFromList(
    raw.map((record) => prepareUnicodeEmojiRecord(record)),
  );
}

async function prepareUnicodeEmojiListAsync(
  raw: UnicodeEmojiDataRecord[],
): Promise<UnicodeEmoji[]> {
  if (shouldUseWorkerPreparation()) {
    const partials = await mapEmojiDataInChunks(raw, (record) =>
      partiallyPrepareUnicodeEmojiRecord(record),
    );

    const tokens = await computeEmojiSearchTokensOnWorker(
      partials.map((partial) => ({
        name: partial.base.name,
        categoryLabel: partial.categoryLabel,
        subcategory: partial.base.subcategory,
        aliases: partial.base.aliases,
        emoticons: partial.base.emoticons,
      })),
    );

    return partials.map((partial, index) =>
      finalizeUnicodeEmojiRecord(partial, tokens[index] ?? []),
    );
  }

  return mapEmojiDataInChunks(raw, (record) =>
    prepareUnicodeEmojiRecord(record),
  );
}

async function prepareUnicodeEmojiDataAsync(
  raw: UnicodeEmojiDataRecord[],
): Promise<PreparedUnicodeEmojiData> {
  const list = await prepareUnicodeEmojiListAsync(raw);

  await waitForEmojiPreparationSlot();

  return createPreparedUnicodeEmojiDataFromList(list);
}

function getLoadedPreparedUnicodeEmojiData() {
  if (!emojiDataStore.prepared) {
    throw new Error(
      'Emoji data has not been loaded yet. Call preloadEmojiData(...) or await loadEmojiData() first.',
    );
  }

  return emojiDataStore.prepared;
}

function getQueryTerms(query: string) {
  return normalizeQuery(query)
    .split(' ')
    .map((term) => term.trim())
    .filter(Boolean);
}

function getTokenScore(token: string, term: string) {
  if (token === term) {
    return 240;
  }

  if (token.startsWith(term)) {
    return 180;
  }

  if (token.includes(` ${term}`)) {
    return 120;
  }

  if (token.includes(term)) {
    return 70;
  }

  return -1;
}

function getSearchScore(tokens: string[], queryTerms: string[]) {
  if (queryTerms.length === 0) {
    return 0;
  }

  let score = 0;

  for (const term of queryTerms) {
    let bestScore = -1;

    for (const token of tokens) {
      const tokenScore = getTokenScore(token, term);

      if (tokenScore > bestScore) {
        bestScore = tokenScore;
      }
    }

    if (bestScore < 0) {
      return -1;
    }

    score += bestScore;
  }

  return score;
}

export function subscribeEmojiDataStore(listener: () => void) {
  emojiDataStoreListeners.add(listener);

  return () => {
    emojiDataStoreListeners.delete(listener);
  };
}

export function getEmojiDataStoreSnapshot(): EmojiDataStoreSnapshot {
  return emojiDataStoreSnapshot;
}

export function hasEmojiData() {
  return emojiDataStore.prepared !== null;
}

function setPreparedEmojiData(prepared: PreparedUnicodeEmojiData) {
  emojiDataStore.prepared = prepared;
  emojiDataStore.status = 'ready';
  emojiDataStore.error = null;
  emojiDataStore.promise = Promise.resolve(prepared.list);
  // Full preload covers every built-in category so consumers do not retry
  // shard loads after a bootstrap.
  for (const categoryId of DEFAULT_COLUMN_CATEGORIES) {
    emojiDataStore.loadedCategories.add(categoryId);
  }
  emitEmojiDataStoreChange();

  return prepared.list;
}

export function preloadEmojiData(raw: EmojiDataInput) {
  return setPreparedEmojiData(
    prepareUnicodeEmojiData(normalizeEmojiDataInput(raw)),
  );
}

async function prepareEmojiDataInputAsync(
  raw: EmojiDataInput,
  preparedCacheKey?: string,
) {
  const prepared = await prepareUnicodeEmojiDataAsync(
    await normalizeEmojiDataInputAsync(raw),
  );
  const list = setPreparedEmojiData(prepared);

  if (preparedCacheKey && shouldUsePreparedEmojiDataCache()) {
    void savePreparedEmojiDataToCache({
      key: preparedCacheKey,
      list,
      cacheName: getPreparedEmojiDataCacheName(),
    }).catch(() => undefined);
  }

  return list;
}

async function prepareEmojiDataBootstrapAsync(
  raw: EmojiDataBootstrapPayload,
  preparedCacheKey?: string,
) {
  for (const [locale, pack] of Object.entries(raw.locales ?? {})) {
    registerEmojiLocalePack(locale, pack);
  }

  return prepareEmojiDataInputAsync(raw.data, preparedCacheKey);
}

function createPreparedEmojiDataCacheKeys() {
  return {
    bootstrap: createMojiXDataAssetCacheInfo({
      kind: 'emoji-data',
      key: 'emoji-bootstrap:en',
      path: 'emoji-bootstrap.en.json',
    }).key,
    legacy: createMojiXDataAssetCacheInfo({
      kind: 'emoji-data',
      key: 'emoji-data',
      path: 'emoji-data.json',
    }).key,
  };
}

async function loadPreparedEmojiDataCache(
  cacheKey: string,
) {
  if (!shouldUsePreparedEmojiDataCache()) {
    return null;
  }

  const list = await loadPreparedEmojiDataFromCache({
    key: cacheKey,
    cacheName: getPreparedEmojiDataCacheName(),
  }).catch(() => null);

  return list ? createPreparedUnicodeEmojiDataFromList(list) : null;
}

async function loadAnyPreparedEmojiDataCache(
  keys: readonly string[],
) {
  for (const key of keys) {
    const prepared = await loadPreparedEmojiDataCache(key);

    if (prepared) {
      return prepared;
    }
  }

  return null;
}

function ensurePartialPreparedStore(): PreparedUnicodeEmojiData {
  if (!emojiDataStore.prepared) {
    emojiDataStore.prepared = createPreparedUnicodeEmojiDataFromList([]);
  }
  return emojiDataStore.prepared;
}

function mergeEmojiShardIntoStore(
  categoryId: BuiltInEmojiCategoryId,
  shardList: UnicodeEmoji[],
) {
  const prepared = ensurePartialPreparedStore();
  let inserted = 0;

  for (const emoji of shardList) {
    if (prepared.byId.has(emoji.id)) {
      continue;
    }

    prepared.byId.set(emoji.id, emoji);
    prepared.byNative.set(emoji.native, emoji);
    prepared.byCategory[emoji.categoryId].push(emoji);
    prepared.list.push(emoji);
    inserted += 1;
  }

  emojiDataStore.loadedCategories.add(categoryId);
  emojiDataStore.status = 'ready';
  emojiDataStore.error = null;
  emojiDataStore.promise = Promise.resolve(prepared.list);
  emitEmojiDataStoreChange();

  return { list: prepared.list, inserted };
}

const pendingShardLoads = new Map<BuiltInEmojiCategoryId, Promise<UnicodeEmoji[]>>();

export function loadEmojiCategoryShard(
  categoryId: BuiltInEmojiCategoryId,
): Promise<UnicodeEmoji[]> {
  if (emojiDataStore.loadedCategories.has(categoryId) && emojiDataStore.prepared) {
    return Promise.resolve(emojiDataStore.prepared.list);
  }

  const pending = pendingShardLoads.get(categoryId);

  if (pending) {
    return pending;
  }

  const promise = (async () => {
    const raw = await loadEmojiDataShardFromCdn(categoryId);
    const records = await normalizeEmojiDataInputAsync(raw);
    const list = await prepareUnicodeEmojiListAsync(records);

    return mergeEmojiShardIntoStore(categoryId, list).list;
  })().finally(() => {
    pendingShardLoads.delete(categoryId);
  });

  pendingShardLoads.set(categoryId, promise);

  return promise;
}

export function loadEmojiCategoryShards(
  categoryIds: readonly BuiltInEmojiCategoryId[],
): Promise<UnicodeEmoji[]> {
  return Promise.all(categoryIds.map(loadEmojiCategoryShard)).then(
    () => ensurePartialPreparedStore().list,
  );
}

export function loadEmojiData(): Promise<UnicodeEmoji[]> {
  if (emojiDataStore.prepared) {
    return Promise.resolve(emojiDataStore.prepared.list);
  }

  if (emojiDataStore.promise) {
    return emojiDataStore.promise;
  }

  emojiDataStore.status = 'loading';
  emojiDataStore.error = null;

  const preparedCacheKeys = createPreparedEmojiDataCacheKeys();
  const loadPromise = loadAnyPreparedEmojiDataCache([
    preparedCacheKeys.bootstrap,
    preparedCacheKeys.legacy,
  ])
    .then((cachedPrepared) => {
      if (cachedPrepared) {
        return setPreparedEmojiData(cachedPrepared);
      }

      return loadEmojiDataBootstrapFromCdn()
        .then((raw) =>
          prepareEmojiDataBootstrapAsync(raw, preparedCacheKeys.bootstrap),
        )
        .catch(() =>
          Promise.all([
            loadEmojiDataFromCdn(),
            loadLocale('en').catch(() => null),
          ]).then(([raw]) =>
            prepareEmojiDataInputAsync(raw, preparedCacheKeys.legacy),
          ),
        );
    })
    .catch((error) => {
      emojiDataStore.status = 'error';
      emojiDataStore.error = error;
      emojiDataStore.promise = null;
      emitEmojiDataStoreChange();
      throw error;
    });

  emojiDataStore.promise = loadPromise;
  emitEmojiDataStoreChange();

  return loadPromise;
}

export function peekUnicodeEmojiData() {
  return emojiDataStore.prepared?.list ?? null;
}

export function isEmojiCategoryLoaded(categoryId: BuiltInEmojiCategoryId) {
  return emojiDataStore.loadedCategories.has(categoryId);
}

export function getLoadedEmojiCategories(): readonly BuiltInEmojiCategoryId[] {
  return Array.from(emojiDataStore.loadedCategories);
}

export function peekUnicodeEmojiByCategory(
  categoryId: BuiltInEmojiCategoryId,
) {
  return emojiDataStore.prepared?.byCategory[categoryId] ?? [];
}

export function peekUnicodeEmojiById(id: string) {
  return emojiDataStore.prepared?.byId.get(id);
}

export function peekUnicodeEmojiByNative(native: string) {
  return emojiDataStore.prepared?.byNative.get(native);
}

export function getUnicodeEmojiData() {
  return getLoadedPreparedUnicodeEmojiData().list;
}

export function getUnicodeEmojiByCategory(categoryId: BuiltInEmojiCategoryId) {
  return getLoadedPreparedUnicodeEmojiData().byCategory[categoryId];
}

export function getUnicodeEmojiById(id: string) {
  return getLoadedPreparedUnicodeEmojiData().byId.get(id);
}

export function getUnicodeEmojiByNative(native: string) {
  return getLoadedPreparedUnicodeEmojiData().byNative.get(native);
}

export function resolveUnicodeEmojiVariant(
  emoji: UnicodeEmoji,
  skinTone: EmojiSkinTone,
) {
  if (skinTone === 'default') {
    return {
      native: emoji.native,
      unified: emoji.unified,
      sheetX: emoji.sheetX,
      sheetY: emoji.sheetY,
    };
  }

  const variant = emoji.skins.find((skin) => skin.tone === skinTone);

  if (!variant) {
    return {
      native: emoji.native,
      unified: emoji.unified,
      sheetX: emoji.sheetX,
      sheetY: emoji.sheetY,
    };
  }

  return {
    native: variant.native,
    unified: variant.unified,
    sheetX: variant.sheetX,
    sheetY: variant.sheetY,
  };
}

export function filterEmoji<T extends { searchTokens: string[] }>(
  emojiList: T[],
  query: string,
  getLocalizedSearchTokens?: (emoji: T) => string[],
) {
  if (!query.trim()) {
    return emojiList;
  }

  const queryTerms = getQueryTerms(query);

  return emojiList
    .map((emoji, index) => {
      const englishScore = getSearchScore(emoji.searchTokens, queryTerms);
      const localizedTokens = getLocalizedSearchTokens?.(emoji) ?? [];
      const localizedScore = getSearchScore(localizedTokens, queryTerms);

      if (englishScore < 0 && localizedScore < 0) {
        return null;
      }

      const finalScore =
        englishScore >= 0
          ? 1000 + englishScore + Math.max(localizedScore, 0) * 0.01
          : localizedScore;

      return {
        emoji,
        index,
        score: finalScore,
      };
    })
    .filter((entry): entry is { emoji: T; index: number; score: number } => Boolean(entry))
    .sort((left, right) => {
      if (right.score === left.score) {
        return left.index - right.index;
      }

      return right.score - left.score;
    })
    .map((entry) => entry.emoji);
}

export function prepareCustomEmojis(customEmojis: CustomEmoji[] = []) {
  return customEmojis.map<PreparedCustomEmoji>((emoji) => {
    const categoryId = emoji.categoryId?.trim() || 'custom';
    const categoryLabel =
      emoji.categoryLabel?.trim() ||
      (isSystemCategoryId(categoryId)
        ? CATEGORY_META[categoryId].label
        : humanizeCategoryId(categoryId));
    const shortcodes = Array.from(
      new Set(
        (emoji.shortcodes ?? []).filter(
          (value): value is string => typeof value === 'string' && value.length > 0,
        ),
      ),
    );
    const emoticons = Array.from(
      new Set(
        (emoji.emoticons ?? []).filter(
          (value): value is string => typeof value === 'string' && value.length > 0,
        ),
      ),
    );
    const searchTokens = Array.from(
      new Set(
        [
          emoji.name,
          emoji.categoryLabel,
          ...shortcodes,
          ...shortcodes.map((shortcode) => shortcode.replaceAll('_', ' ')),
          ...shortcodes.map((shortcode) => `:${shortcode}:`),
          ...(emoji.keywords ?? []),
          ...emoticons,
        ]
          .filter((value): value is string => typeof value === 'string' && value.length > 0)
          .map((value) => normalizeQuery(value))
          .filter(Boolean),
      ),
    );

    return {
      ...emoji,
      kind: 'custom',
      shortcodes,
      emoticons,
      searchTokens,
      categoryId,
      categoryLabel,
    };
  });
}

export function createEmojiSelection(
  emoji: EmojiRenderable,
  skinTone: EmojiSkinTone,
  localeDefinition: EmojiLocaleDefinition,
  options: {
    categoryLabel?: string;
  } = {},
): EmojiSelection {
  if (emoji.kind === 'custom') {
    const localizedCategoryLabel =
      options.categoryLabel ??
      getLocalizedCategoryLabel(
        emoji.categoryId,
        localeDefinition,
        emoji.categoryLabel,
      );

    return {
      id: emoji.id,
      name: emoji.name,
      englishName: emoji.name,
      native: emoji.native,
      shortcodes: emoji.shortcodes,
      emoticons: emoji.emoticons,
      categoryId: emoji.categoryId,
      categoryLabel: localizedCategoryLabel,
      englishCategoryLabel: emoji.categoryLabel || localizedCategoryLabel,
      custom: true,
      imageUrl: emoji.imageUrl,
      skinTone,
      locale: localeDefinition.code,
    };
  }

  const variant = resolveUnicodeEmojiVariant(emoji, skinTone);
  const localizedName = getLocalizedEmojiName(emoji, localeDefinition);
  const localizedCategoryLabel = getLocalizedCategoryLabel(
    emoji.categoryId,
    localeDefinition,
    options.categoryLabel ?? emoji.categoryLabel,
  );

  return {
    id: emoji.id,
    name: localizedName,
    englishName: emoji.name,
    native: variant.native,
    unified: variant.unified,
    shortcodes: emoji.aliases,
    emoticons: emoji.emoticons,
    categoryId: emoji.categoryId,
    categoryLabel: localizedCategoryLabel,
    englishCategoryLabel: emoji.categoryLabel,
    custom: false,
    skinTone,
    locale: localeDefinition.code,
  };
}

export function getLocalizedSearchTokens(
  emoji: EmojiRenderable,
  localeDefinition: EmojiLocaleDefinition,
) {
  if (emoji.kind === 'custom') {
    return [];
  }

  const registryVersion = getEmojiLocaleRegistrySnapshot();
  let perEmojiCache = localizedSearchTokensCache.get(emoji);
  const cachedEntry = perEmojiCache?.get(localeDefinition.code);

  if (cachedEntry && cachedEntry.registryVersion === registryVersion) {
    return cachedEntry.tokens;
  }

  const tokens = createSearchTokens({
    name: getLocalizedEmojiName(emoji, localeDefinition),
    categoryLabel: getLocalizedCategoryLabel(emoji.categoryId, localeDefinition),
    subcategory: emoji.subcategory,
    aliases: emoji.aliases,
    emoticons: [
      ...emoji.emoticons,
      ...getLocalizedEmojiKeywords(emoji, localeDefinition),
    ],
  });

  if (!perEmojiCache) {
    perEmojiCache = new Map();
    localizedSearchTokensCache.set(emoji, perEmojiCache);
  }

  perEmojiCache.set(localeDefinition.code, {
    tokens,
    registryVersion,
  });

  return tokens;
}
