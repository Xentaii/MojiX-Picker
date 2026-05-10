# Picker Configuration

These props are accepted by both `EmojiPicker` and `MojiX.Root`.

`EmojiPickerProps` also extends `HTMLAttributes<HTMLDivElement>`, so regular container props such as `className`, `id`, `aria-*`, and `data-*` are valid too.

## State

| Prop | Type | Purpose |
| --- | --- | --- |
| `value` | `string` | Marks an emoji id as selected in the grid. |
| `searchQuery` | `string` | Controlled search value. |
| `defaultSearchQuery` | `string` | Initial search value for uncontrolled mode. |
| `onSearchQueryChange` | `(query) => void` | Fired when the search query changes. |
| `activeCategory` | `EmojiCategoryId` | Controlled active category id. |
| `defaultActiveCategory` | `EmojiCategoryId` | Initial category for uncontrolled mode. |
| `onActiveCategoryChange` | `(categoryId) => void` | Fired when the active category changes. |
| `skinTone` | `EmojiSkinTone` | Controlled skin tone. |
| `defaultSkinTone` | `EmojiSkinTone` | Initial skin tone for uncontrolled mode. |
| `onSkinToneChange` | `(tone) => void` | Fired when the skin tone changes. |

## Layout and UI

| Prop | Type | Purpose |
| --- | --- | --- |
| `emojiSize` | `number` | Render size for emoji cells. |
| `columns` | `number` | Number of emoji columns in the grid. |
| `loading` | `boolean` | Forces the loading UI on, in addition to the built-in async data loading state. |
| `showPreview` | `boolean` | Shows or hides the default bottom preview area. |
| `showRecents` | `boolean` | Legacy switch for the recent category. Still supported. |
| `showSkinTones` | `boolean` | Shows or hides the skin tone control. |
| `colors` | `EmojiPickerColors` | High-level color tokens plus per-emoji/per-category hover overrides. |
| `autoScrollCategoriesOnHover` | `boolean` | Enables edge-hover autoscroll for the horizontal category row when it overflows. |
| `emptyState` | `ReactNode` | Custom content for the empty state. |
| `unstyled` | `boolean` | Disables built-in styling classes. |
| `classNames` | `EmojiPickerClassNames` | Per-slot class overrides. |
| `styles` | `EmojiPickerStyles` | Per-slot inline style overrides. |
| `style` | `CSSProperties` | Root inline styles. |

## Recents

| Prop | Type | Purpose |
| --- | --- | --- |
| `recentLimit` | `number` | Legacy max size for recent entries. |
| `recentStorageKey` | `string` | Legacy localStorage key for recents. |
| `recentStore` | `EmojiRecentStore` | Legacy custom recent store injection. |
| `recent` | `EmojiRecentCategoryConfig` | New recent-category config block. Controls enablement, limit, sort mode, empty seeded emojis, default activation, storage key, and custom store. |

## Localization

| Prop | Type | Purpose |
| --- | --- | --- |
| `locale` | `EmojiLocaleCode` | Active locale code. |
| `fallbackLocale` | `EmojiLocaleCode \| EmojiLocaleCode[]` | Locale fallback chain. |
| `locales` | `Partial<Record<string, Partial<EmojiLocaleDefinition>>>` | Locale overrides or extra locales. |
| `labels` | `Partial<EmojiPickerLabels>` | UI text overrides. |

## Categories and Icons

| Prop | Type | Purpose |
| --- | --- | --- |
| `categories` | `Partial<Record<string, EmojiCategoryConfig>>` | Per-category overrides for label, icon, icon style, visibility, and order. |
| `categoryIcons` | `EmojiCategoryIconsMap` | Shortcut map for overriding category icons without redefining the whole category config. |
| `categoryIconStyle` | `EmojiCategoryIconPreset` | Global category icon preset. Use `outline`, `solid`, `native`, `picker`, or vendor styles like `twitter` / `google`. `mono-filled` maps to `solid`, and `mono-outline` maps to `outline` for compatibility. |

## Assets and Data

| Prop | Type | Purpose |
| --- | --- | --- |
| `spriteSheet` | `EmojiSpriteSheetConfig` | Spritesheet source and delivery config. |
| `assetSource` | `EmojiAssetSource` | Shared asset strategy for grid and preview. |
| `gridAssetSource` | `EmojiAssetSource` | Grid-only asset strategy. |
| `previewAssetSource` | `EmojiAssetSource` | Preview-only asset strategy. |
| `customEmojis` | `CustomEmoji[]` | Custom emoji records, including custom categories. |
| `loadCategoryShards` | `boolean` | When `true`, the picker fetches missing per-category data shards on demand as the user navigates. Pair with `preloadEmojiPicker({ shards: [...] })` to ship a smaller initial payload. See [Category Shards](./data-and-localization.md#category-shards-lazy-loading). |

## Virtualization

| Prop | Type | Purpose |
| --- | --- | --- |
| `virtualization` | `boolean \| EmojiPickerVirtualization` | Enables or disables row virtualization. Pass an object to fine-tune. |

`EmojiPickerVirtualization` fields:

| Field | Type | Default | Purpose |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `true` | Master switch. |
| `overscanRows` | `number` | `8` | Base number of rows to render outside the viewport. Used as a floor — adaptive overscan only grows above this when scrolling. |
| `adaptiveOverscan` | `boolean` | `true` | When enabled, overscan grows with scroll velocity (up to ~48 rows during fast wheel/trackpad bursts) and shrinks below `overscanRows` while idle. Set to `false` to keep `overscanRows` constant. |

## Rendering and Events

| Prop | Type | Purpose |
| --- | --- | --- |
| `renderEmoji` | `(emoji, state) => ReactNode` | Custom emoji cell renderer. |
| `renderPreview` | `(emoji, selection) => ReactNode` | Custom bottom preview renderer. |
| `renderCategoryIcon` | `(props) => ReactNode` | Custom category icon renderer for sidebar and section headers. |
| `onDataError` | `(error) => void` | Fired when CDN data loading fails. |
| `onEmojiSelect` | `(emoji) => void` | Fired when an emoji is selected. Returns normalized `EmojiSelection`. |

## Related Types

- `EmojiPickerProps`
- `EmojiPickerColors`
- `EmojiRecentCategoryConfig`
- `EmojiCategoryConfig`
- `EmojiCategoryIconsMap`
- `EmojiCategoryIconPreset`
