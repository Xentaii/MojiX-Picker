# Types

This file lists the TypeScript types exported from the package root.

## Picker and Selection

| Type | Description |
| --- | --- |
| `EmojiPickerProps` | Main prop surface for `EmojiPicker` and `MojiXRoot`. |
| `EmojiPickerClassNames` | Slot-to-className map for built-in UI parts. |
| `EmojiPickerColors` | High-level theme color tokens and hover-color overrides for the default UI. |
| `EmojiPickerSlot` | All styleable slot ids in the default UI. |
| `EmojiPickerStyles` | Slot-to-inline-style map for built-in UI parts. |
| `EmojiRenderState` | State passed to custom emoji renderers. |
| `EmojiRenderable` | Union of unicode and prepared custom emoji records. |
| `EmojiSelection` | Normalized selection payload returned by `onEmojiSelect`. |
| `EmojiSkinTone` | Supported skin-tone ids. |

## Categories and Icons

| Type | Description |
| --- | --- |
| `EmojiCategoryId` | Category id union, including custom ids. |
| `EmojiSystemCategoryId` | Built-in category ids shipped by the library. |
| `EmojiCategoryConfig` | Per-category label, icon, visibility, and ordering config. |
| `EmojiCategoryIconConfig` | Structured category icon descriptor. |
| `EmojiCategoryIconGlyph` | Named built-in glyph ids for category icons. |
| `EmojiCategoryIconInput` | Accepted category icon input shorthand. |
| `EmojiCategoryIconsMap` | Shortcut map for category icon overrides. |
| `EmojiCategoryIconPreset` | Category icon rendering preset. |
| `EmojiCategoryIconRenderProps` | Render props passed to `renderCategoryIcon`. |
| `ResolvedEmojiCategoryIcon` | Fully normalized category icon data used by the UI. |

## Custom Emoji and Data Records

| Type | Description |
| --- | --- |
| `BuiltInEmojiCategoryId` | Built-in category ids excluding `recent`/`custom`. Used by shard loaders. |
| `CustomEmoji` | Input record for custom emoji definitions. |
| `EmojiSearchTokensInput` | Per-record input for `computeEmojiSearchTokensOnWorker`. |
| `UnicodeEmoji` | Bundled unicode emoji record shape. |
| `EmojiRecentCategoryConfig` | Config block for the recent category behavior. |
| `EmojiRecentStore` | Storage interface for reading and writing recent emoji. |
| `EmojiLocaleCode` | Locale code union used by the picker. |
| `EmojiLocaleCategoryLabels` | Category label map for locale definitions. |
| `EmojiLocaleDefinition` | Fully resolved locale definition shape. |
| `EmojiLocaleEmojiTranslation` | Per-emoji localized text payload. |
| `EmojiPickerVirtualization` | Virtualization config block (`enabled`, `overscanRows`, `adaptiveOverscan`). |
| `MojiXDataSourceConfig` | Runtime data-source config, including CDN base URL, custom fetcher, raw cache controls, prepared IndexedDB cache controls, and `workerPreparation` opt-in. |
| `PreloadEmojiPickerOptions` | Options for warming data, locales, search indexes, virtualized grid code, sprites, and per-category shard preloading before mount. |
| `PreloadEmojiPickerResult` | Result returned from `preloadEmojiPicker(...)`. |

## Asset Resolution

| Type | Description |
| --- | --- |
| `EmojiAssetRenderContext` | Asset context identifier such as `grid` or `preview`. |
| `EmojiAssetRequest` | Asset resolution request shape. |
| `EmojiAssetSource` | Union of all supported asset source strategies. |
| `EmojiResolvedAsset` | Union of all resolved asset outputs. |
| `EmojiImageAsset` | Resolved raster image asset. |
| `EmojiImageAssetSource` | Image URL resolver source. |
| `EmojiSvgAsset` | Resolved SVG asset. |
| `EmojiSvgAssetSource` | SVG URL resolver source. |
| `EmojiNativeAsset` | Resolved native emoji asset. |
| `EmojiNativeAssetSource` | Native-only asset source. |
| `EmojiSpriteAsset` | Resolved spritesheet asset. |
| `EmojiSpriteSheetAssetSource` | Spritesheet asset source. |
| `EmojiMixedAssetSource` | Mixed asset source with per-kind routing. |

## Sprites and Cache

| Type | Description |
| --- | --- |
| `EmojiSpriteSheetConfig` | Public spritesheet config object. |
| `EmojiSpriteSheetContext` | Runtime context passed to dynamic spritesheet URL builders. |
| `EmojiSpriteSheetSource` | Spritesheet origin mode: CDN, local, or custom. |
| `EmojiSpriteSheetVariant` | Spritesheet folder/encoding variant. |
| `EmojiSpriteSheetCacheAdapter` | Interface for custom spritesheet cache adapters. |
| `EmojiSpriteSheetCacheConfig` | Cache config nested inside spritesheet config. |
| `EmojiSpriteSheetCacheMode` | Cache adapter mode identifier. |
| `EmojiSpriteSheetCachedAsset` | Normalized warmed-cache asset result. |
| `EmojiSpriteSheetCacheRequest` | Cache request descriptor passed into adapters. |
| `EmojiVendor` | Vendor id used for emoji spritesheet compatibility. |
