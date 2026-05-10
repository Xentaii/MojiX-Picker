# Caching and Storage

These exports cover prepared emoji data caching, runtime spritesheet warmup,
and local persistence helpers for recents and skin tone.

## Cache Helpers

| Export | Kind | Description |
| --- | --- | --- |
| `clearPreparedEmojiDataCache` | Function | Clears the IndexedDB cache that stores normalized unicode emoji data for faster repeat CDN mounts. |
| `clearEmojiSpriteStyleCache` | Function | Clears the in-memory cache of sprite tile CSS objects. Use after a major sheet swap. |
| `createBrowserSpriteSheetCacheAdapter` | Function | Creates a browser cache adapter for spritesheet fetches. |
| `preloadSpriteSheetUrl` | Function | Decodes a spritesheet URL into the browser image cache without changing picker state. |
| `warmEmojiSpriteSheet` | Function | Preloads and decodes a spritesheet, using the configured cache adapter when available. Returns the cached asset URL when one is available so the picker can reuse it across mounts. |

### Prepared data cache (IndexedDB)

`loadEmojiData()` and `preloadEmojiPicker()` use the prepared data cache
automatically in browsers with IndexedDB. The cache stores **already
normalized** records (with search tokens, category labels, etc.) so a returning
user skips the JSON parse + normalize phase entirely on the next mount.

Records are tagged with the current MojiX package version. After a library
upgrade, mismatched entries are silently discarded and refetched, so the
on-disk format never blocks an update.

Configure the cache through
`configureMojiXDataSource({ preparedCache, preparedCacheName })`; the raw JSON
Cache Storage layer remains controlled by `cache` and `cacheName`. Pass
`preparedCache: false` for private sessions or deterministic tests.

### Worker-backed preparation

Search-token generation can be moved off the main thread via
`configureMojiXDataSource({ workerPreparation: true })`. See
[Worker-Backed Preparation](./data-and-localization.md#worker-backed-preparation)
in the data-and-localization section for how the inline-blob worker is
constructed and when it falls back.

### Spritesheet warmup and retained sheet

For WebView shells such as Tauri, call `preloadEmojiPicker({ spriteSheet, warmSpriteSheet: true })`
before opening a sprite-backed picker. This warms the grid chunk and decodes the
sheet before virtualized rows enter the viewport.

Sprite-backed pickers retain the active sheet as a hidden eager `<img>`
positioned offscreen for as long as the picker is mounted. This keeps the
decoded bitmap warm in the browser image cache (some WebViews are aggressive
about evicting decoded images that are not currently rendered, which would
otherwise cause flicker on fast scroll).

Repeated sprite tile styles are cached internally — the same `(sheetUrl, x, y,
size)` key returns the same frozen `CSSProperties` object across renders. This
keeps React's reconciler happy and reduces GC pressure during virtualized scroll.

### Localized search-token cache

`getLocalizedSearchTokens(emoji, localeDefinition)` is invoked per emoji per
keystroke during search. Internally MojiX caches the resulting token array per
`(emoji, localeCode)` pair using a `WeakMap`, with the current locale registry
version stored alongside the entry. The cache invalidates automatically when
`registerEmojiLocalePack(...)` or `registerEmojiLocaleSearchIndex(...)` bumps
that version. There is no public API to clear it manually — registering a new
pack does that for you.

## Recent and Skin Tone Storage

| Export | Kind | Description |
| --- | --- | --- |
| `createLocalStorageRecentStore` | Function | Creates a recent-emoji store backed by `localStorage`. |
| `pushRecentEmoji` | Function | Inserts or updates a recent record and trims to a limit. |
| `readRecentEmoji` | Function | Reads recent emoji records from storage. |
| `writeRecentEmoji` | Function | Writes recent emoji records to storage. |
| `readStoredSkinTone` | Function | Reads a persisted skin tone with fallback handling. |
| `writeStoredSkinTone` | Function | Persists the current skin tone. |

## Related Types

- `EmojiRecentStore`
- `EmojiSpriteSheetCacheAdapter`
- `EmojiSpriteSheetCacheConfig`
- `EmojiSpriteSheetCacheMode`
- `EmojiSpriteSheetCachedAsset`
- `EmojiSpriteSheetCacheRequest`
