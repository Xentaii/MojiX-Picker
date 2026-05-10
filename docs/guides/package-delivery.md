# Package Delivery

MojiX 1.0 uses a CDN-first package shape: the default JavaScript entry stays
code-only, while emoji data, locale packs, search indexes, and availability
sidecars ship as explicit data assets under `dist/data/`.

## Runtime Paths

| Path | Use when | How it loads data |
| --- | --- | --- |
| CDN-first | Default browser apps | `loadEmojiData()` and `loadLocale()` fetch package data from the npm CDN mirror. |
| Offline bootstrap | Apps that cannot fetch at runtime | Import `mojix-picker/data` and locale subpaths, then call `preloadEmojiData(...)` and `registerEmojiLocalePack(...)`. |
| Progressive shards | First paint matters more than loading every category immediately | Call `preloadEmojiPicker({ shards: [...] })` and render with `loadCategoryShards`. |
| Native WebView | Tauri/Electron-style shells | Use local data plus local sprite sheets so rendering does not depend on network or OS color-font behavior. |

## Published Contents

Published packages include:

- `dist/lib/`: ESM runtime, type declarations, CSS, and subpath entries.
- `dist/data/`: emoji data, locale packs, search indexes, availability files,
  and precompressed `.br` / `.gz` assets.

The main entry does not inline the unicode emoji dataset. Apps only pay for
large data assets when they explicitly import offline data or when the runtime
fetches data on demand.

## Current Size

The `1.0.0-beta.2` dry-run package size is:

| Metric | Size |
| --- | ---: |
| Tarball download | 1.7 MB |
| Unpacked install | 3.6 MB |
| Files | 218 |

## Related Pages

- [Data and Localization](../api/data-and-localization.md)
- [Caching and Storage](../api/caching-and-storage.md)
- [Tauri and WebView2](./tauri-webview.md)
