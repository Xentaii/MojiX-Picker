# Headless Primitives

MojiX exposes a headless composition layer through the `MojiX` namespace plus several hooks.

## Namespace Export

| Export | Kind | Description |
| --- | --- | --- |
| `MojiX` | Namespace object | Bundles the headless primitives under one import. |

## Primitive Components

| Export | Kind | Description |
| --- | --- | --- |
| `MojiXRoot` | Component | State container and provider for headless layouts. Accepts the same props as `EmojiPicker` except `children`. |
| `MojiXSearch` | Component | Renders the default search field or a render-prop child. |
| `MojiXViewport` | Component | Layout wrapper for the scrollable picker body. |
| `MojiXList` | Component | Renders the emoji sections list. |
| `MojiXEmpty` | Component | Renders when the visible result set is empty. |
| `MojiXLoading` | Component | Renders when `loading` is enabled. |
| `MojiXFooter` | Component | Footer layout container. |
| `MojiXCategoryNav` | Component | Category navigation UI or render-prop entry point. |
| `MojiXActiveEmoji` | Component | Access point for the current preview emoji and selection. |
| `MojiXSkinTone` | Component | Headless access to skin-tone state and options. |
| `MojiXSkinToneButton` | Component | Default skin-tone button UI. |

## Hooks

| Export | Returns | Description |
| --- | --- | --- |
| `useMojiX` | Full picker state | Low-level access to the current root context. |
| `useEmojiSearch` | Search state helpers | Gives `searchId`, `searchQuery`, `setSearchQuery`, and localized labels. |
| `useEmojiCategories` | Category helpers | Gives `sections`, `activeCategory`, `setActiveCategory`, and `selectCategory`. |
| `useEmojiSelection` | Selection helpers | Gives current `value` and the `selectEmoji` callback. |
| `useActiveEmoji` | Preview helpers | Gives `emoji`, `selection`, `hoveredEmoji`, and `setHoveredEmoji`. |
| `useSkinTone` | Skin-tone helpers | Gives current tone, setter, preset options, labels, and locale definition. |

## Usage Notes

- Use `MojiXRoot` when you want one picker state tree shared across a custom layout.
- `EmojiPicker` is already built on top of these primitives.
- `renderCategoryIcon` from `EmojiPickerProps` also works on `MojiXRoot`.
