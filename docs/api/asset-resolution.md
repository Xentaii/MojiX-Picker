# Asset Resolution

These exports define how emoji visuals are resolved.

## Asset Factories and Resolvers

| Export | Kind | Description |
| --- | --- | --- |
| `createImageAssetSource` | Function | Creates an asset source that resolves emoji to raster image URLs. |
| `createMixedAssetSource` | Function | Creates a source that can route unicode, custom, and fallback assets differently. |
| `createNativeAssetSource` | Function | Creates a source that always prefers native browser/OS emoji. |
| `createSpriteSheetAssetSource` | Function | Creates a source that renders emoji from a spritesheet config. |
| `createSvgAssetSource` | Function | Creates an asset source that resolves emoji to SVG URLs. |
| `resolveEmojiAsset` | Function | Resolves the final asset descriptor for a given emoji request. |

## Common Use Cases

- Native-only emoji rendering
- Vendor sprite rendering for unicode emoji
- Custom SVG or PNG assets for branded emoji
- Mixed mode: sprites for unicode, images for custom emoji

## Related Types

- `EmojiAssetSource`
- `EmojiAssetRequest`
- `EmojiResolvedAsset`
- `EmojiImageAssetSource`
- `EmojiSvgAssetSource`
- `EmojiNativeAssetSource`
- `EmojiSpriteSheetAssetSource`
- `EmojiMixedAssetSource`
