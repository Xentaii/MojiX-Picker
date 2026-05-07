# Localization and Data

These exports cover locale resolution, async locale/data loading, and access to
the unicode emoji dataset when it has been preloaded or fetched already.

## Localization

| Export | Kind | Description |
| --- | --- | --- |
| `emojiPickerLocales` | Constant | Registry of locale packs explicitly registered at runtime. Starts empty. |
| `getLocalizedCategoryLabel` | Function | Resolves the visible label for a category id. |
| `getLocalizedEmojiKeywords` | Function | Returns localized keyword tokens for a renderable emoji. |
| `getLocalizedEmojiName` | Function | Returns the localized display name for a renderable emoji. |
| `getLocalizedSkinToneLabel` | Function | Resolves the label for a skin-tone option. |
| `loadLocale` | Function | Loads a locale pack on demand from the package CDN mirror and registers it. |
| `registerEmojiLocalePack` | Function | Registers a locale pack or merges locale overrides into the runtime registry. |
| `resolveLocaleDefinition` | Function | Resolves the active locale plus fallback chain into a normalized locale definition. |

## Data Access

| Export | Kind | Description |
| --- | --- | --- |
| `getUnicodeEmojiData` | Function | Returns the loaded unicode emoji dataset. Throws until data is ready. |
| `loadEmojiData` | Function | Loads the unicode emoji dataset from the package CDN mirror. The default path first checks the prepared IndexedDB cache, then tries the combined English bootstrap payload, then falls back to separate data and locale requests. |
| `loadEmojiCategoryShard` | Function | Fetches a single per-category data shard from the CDN, prepares it off the bootstrap path, and merges it into the live store. Idempotent — repeat calls for the same category short-circuit. |
| `loadEmojiCategoryShards` | Function | Loads multiple shards concurrently. Useful from `preloadEmojiPicker({ shards: [...] })`. |
| `isEmojiCategoryLoaded` | Function | Returns `true` once the given built-in category has been merged into the store (via bootstrap, full preload, or a shard). |
| `getLoadedEmojiCategories` | Function | Snapshot of currently loaded built-in categories. Useful for diagnostics or for deciding which shards to prefetch. |
| `preloadEmojiPicker` | Function | Warms emoji data, locale packs, the virtualized grid chunk, optional search indexes, and optional spritesheet assets before mounting the picker. Fresh CDN data is prepared in idle chunks. Pass `{ shards: [...] }` to skip the full bootstrap and load only those categories. |
| `preloadEmojiData` | Function | Seeds the unicode emoji dataset synchronously from local JSON or fetched data. |
| `computeEmojiSearchTokensOnWorker` | Function | Off-main-thread search-token builder. Used internally when `workerPreparation` is enabled and exposed for advanced consumers. Falls back to the main thread when `Worker` is unavailable. |
| `isEmojiPreparationWorkerAvailable` | Function | Reports whether the runtime can construct the preparation Worker (i.e., `Worker`, `Blob`, and `URL.createObjectURL` are all present and the worker hasn't failed to start). |
| `disposeEmojiPreparationWorker` | Function | Terminates the preparation Worker singleton. Useful in tests and during teardown of long-lived processes. |
| `configureMojiXDataSource` | Function | Overrides the default package CDN base URL, fetcher, raw cache, prepared cache name, cache behavior, and Worker-preparation opt-in. |
| `resetMojiXDataSource` | Function | Restores the default CDN data source. |

## Custom Data Source

```ts
import { configureMojiXDataSource, preloadEmojiPicker } from 'mojix-picker';

configureMojiXDataSource({
  baseUrl: '/mojix-data',
  preparedCacheName: 'my-app:mojix-prepared',
});

await preloadEmojiPicker({ locale: 'en' });
```

Set `preparedCache: false` when normalized emoji data should not be persisted,
for example in private sessions or deterministic tests. The raw JSON Cache
Storage layer is controlled separately with `cache` and `cacheName`.

## Category Shards (lazy loading)

`emoji-bootstrap.en.json` is ~250 KB minified and bundles every built-in
category. For first-paint-sensitive applications, the package also ships nine
per-category shard files (`emoji-shard.<category>.json`) that range from
~5 KB (`activities`) to ~100 KB (`people`). They use the same column-oriented
record format as the bootstrap payload, just filtered to a single category.

```ts
import { preloadEmojiPicker, EmojiPicker } from 'mojix-picker';

// Load only what the user is likely to see first.
await preloadEmojiPicker({ shards: ['smileys', 'people'] });

// Picker auto-fetches the rest as the user navigates.
<EmojiPicker loadCategoryShards />;
```

When `loadCategoryShards` is enabled on the picker, the sidebar always shows
all built-in categories — clicking or programmatically activating a category
that has not been fetched yet triggers `loadEmojiCategoryShard(categoryId)`.
The store carries each shard's records permanently, so navigating back is a
free no-op. If `activeCategory` is `'recent'` (the default when recents are
enabled) and no built-in category is loaded yet, the picker also kicks off a
`smileys` fetch so the grid is not visibly empty.

### Programmatic shard control

```ts
import {
  isEmojiCategoryLoaded,
  loadEmojiCategoryShard,
} from 'mojix-picker';

if (!isEmojiCategoryLoaded('flags')) {
  await loadEmojiCategoryShard('flags');
}
```

This pairs well with intent signals like the user opening a flag/region
picker or hovering a category nav button.

## Worker-Backed Preparation

Search-token generation is the heaviest pure-CPU step in emoji preparation
(string normalization across ~2,000 records). Opt in to running it inside a
Web Worker so the main thread stays free during the first mount or after a
shard fetch:

```ts
import { configureMojiXDataSource } from 'mojix-picker';

configureMojiXDataSource({ workerPreparation: true });
```

The worker is constructed from an inlined source string via `Blob` +
`URL.createObjectURL`, so no bundler-specific worker conventions are required.
When `Worker`, `Blob`, or `URL.createObjectURL` are unavailable (SSR, jsdom,
restricted CSP) — or when the constructor throws — the same logic runs on the
main thread automatically. `disposeEmojiPreparationWorker()` terminates the
singleton; the next request reconstructs it lazily.

## Subpath Modules

| Subpath | Default Export | Purpose |
| --- | --- | --- |
| `mojix-picker/data` | emoji dataset JSON | Offline/bootstrap path for `preloadEmojiData(...)`. |
| `mojix-picker/locales/<code>` | locale translation pack JSON | Offline/bootstrap path for `registerEmojiLocalePack(...)`. |
| `mojix-picker/sprites/<vendor>` | sprite config object | Tiny CDN sprite preset for one vendor. |

## Related Types

- `EmojiLocaleCode`
- `EmojiLocaleDefinition`
- `EmojiLocaleCategoryLabels`
- `EmojiLocaleEmojiTranslation`
- `UnicodeEmoji`
