# Sprite Sheets

These exports help build and describe emoji spritesheet delivery.

## Sprite Builders

| Export | Kind | Description |
| --- | --- | --- |
| `createEmojiSpriteSheet` | Function | Normalizes a full spritesheet config from partial input. |
| `createEmojiCdnSpriteSheet` | Function | Builds a CDN-backed spritesheet config. |
| `createEmojiLocalSpriteSheet` | Function | Builds a local-path spritesheet config. |
| `defaultSpriteSheet` | Constant | Default CDN sprite config used by the picker when no custom strategy is provided. |

## URL Helpers

| Export | Kind | Description |
| --- | --- | --- |
| `createEmojiCdnUrl` | Function | Builds a CDN URL for a vendor sheet. |
| `createEmojiLocalUrl` | Function | Builds a local URL for a vendor sheet. |
| `resolveVendorPackageName` | Function | Maps a vendor to the underlying `emoji-datasource-*` package name. |

## Runtime Helpers

| Export | Kind | Description |
| --- | --- | --- |
| `clearEmojiSpriteStyleCache` | Function | Clears the internal cache of computed sprite tile styles. Most apps never need this; it is useful for tests or apps that rotate through many custom sheet URLs. |

## Related Types

- `EmojiSpriteSheetConfig`
- `EmojiSpriteSheetContext`
- `EmojiSpriteSheetSource`
- `EmojiSpriteSheetVariant`
- `EmojiVendor`
