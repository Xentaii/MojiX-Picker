# Components

These exports are the ready-made UI pieces available from the package root.

## Primary Components

| Export | Kind | Description |
| --- | --- | --- |
| `EmojiPicker` | Component | Batteries-included picker composed from the public primitives. |
| `EmojiGrid` | Component | Scrollable emoji grid with sections, keyboard navigation, and virtualization placeholders. |
| `EmojiCategoryIcon` | Component | Default category icon renderer for outline, emoji-native, and vendor sprite styles. |
| `EmojiPreview` | Component | Default bottom preview card. |
| `EmojiSearchField` | Component | Default search field UI. |
| `EmojiSidebar` | Component | Default category navigation UI. |
| `EmojiSkinToneButton` | Component | Default skin tone picker trigger and menu. |
| `EmojiSprite` | Component | Generic emoji asset renderer for sprite, native, image, or svg assets. |
| `EmojiToolbar` | Component | Default toolbar wrapper used by the bundled UI. |

## Usage Notes

- `EmojiPicker` is the best starting point when you want a drop-in experience.
- The lower-level components are useful when you already have picker state and want to compose your own layout.
- `EmojiCategoryIcon` is the easiest way to reuse the same category icon logic in custom layouts when you override `renderCategoryIcon`.

## Related Files

- [Picker Configuration](./picker-configuration.md)
- [Headless Primitives](./headless-primitives.md)
