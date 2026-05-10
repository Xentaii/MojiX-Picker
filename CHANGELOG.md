# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0-beta.2] - 2026-05-10

### Added

- Tauri React fixture that installs the packed local package and verifies
  offline WebView usage with local data, locale packs, and local sprite sheets.
- Root-level Tauri scripts for packing the local npm artifact, installing it
  into the fixture, building the WebView app, and running the WebDriver smoke
  path when `tauri-driver` is available.
- Prepared emoji data cache with idle chunking and an optional Worker pipeline
  to reduce repeated picker startup cost.
- Public API and CDN E2E coverage for shard loading, prepared-cache behavior,
  sprite caches, preload exports, and package subpaths.

### Changed

- Emoji category data now lazy-loads by shard, with adaptive virtual-grid
  overscan based on scroll velocity.
- Sprite rendering now caches generated style objects, retains warmed sprite
  sheets, and shares decoded object URLs to reduce WebView paint/decode churn.
- Demo UI was tightened for mobile and narrow picker layouts, with denser
  controls and collapsible demo chrome.
- Documentation now covers prepared caches, shard loading, sprite cache
  behavior, and the updated public API; the docs can sync to GitHub Wiki from
  the main branch.
- CI/release workflows were aligned with Node 24 actions and the npm publish
  path was kept focused on package publishing.

### Fixed

- Improved Windows WebView2/Tauri picker smoothness by giving native emoji an
  explicit emoji font stack, keeping a larger adaptive virtualized window, and
  suppressing hover preview updates while virtualized grids are actively
  scrolling.
- Tauri profiling runs no longer inject Vite's HMR websocket client or Vite
  forward-console handling, preventing repeated `client:438` console errors
  when the dev server is not running.
- Tauri fixture installs now force the freshly packed local tarball so the
  fixture lockfile cannot stay pinned to an older prerelease with the same
  `file:` dependency path.
- npm provenance metadata now points at the canonical repository URL.

## [1.0.0-beta.1] - 2026-04-26

> Major beta release. Migration is required before upgrading apps that depend
> on synchronous data access, implicit locale registration, CommonJS, or the
> previous generated data contract. Review [docs/MIGRATION.md](./docs/MIGRATION.md)
> before rolling this out.

### Added

- CDN-first unicode emoji data loading via `loadEmojiData()` and offline preload via `preloadEmojiData(...)`.
- Async locale pack loading via `loadLocale()` plus offline locale subpaths `mojix-picker/locales/<code>`.
- Offline data subpath `mojix-picker/data` and vendor sprite preset subpaths `mojix-picker/sprites/<vendor>`.
- `onDataError` on `EmojiPicker` / `MojiX.Root`.
- Browser-side caching for CDN JSON assets through the shared asset cache adapter.
- Playwright coverage for CDN default, CDN failure, and offline bootstrap flows.
- Headless-only `mojix-picker/headless` entry.
- Optional `mojix-picker/icons/extra` entry for non-default category glyphs.
- Lazy search-index loading through `loadEmojiLocaleSearchIndex(...)`.
- Precompressed `.br` and `.gz` data/code assets for self-hosted package mirrors.
- Vendor availability sidecar files for sprite presets.

### Changed

- Main package entry is now ESM-only and no longer includes emoji JSON payloads.
- `emojiPickerLocales` now reflects only locale packs explicitly registered at runtime.
- Package publish layout now ships `dist/lib/` plus `dist/data/`, with jsDelivr serving the mirrored JSON assets.
- Default `EmojiGrid` defers the virtualized grid implementation into a lazy chunk.
- Generated locale packs split emoji names from lazy keyword search indexes.
- Non-English locale name packs are delta-coded against English.
- Generated `emoji-data.json` uses the compact column payload and no longer carries English names or vendor availability.
- Package size is now about `1.44 MB` tarball and `2.93 MB` unpacked, while default app bundles still avoid inlining data unless consumers opt into data subpaths.

### Fixed

- Hovering an emoji in recents no longer highlights the duplicate cell in its source category.

## [0.5.5] - 2026-04-19

### Added

- Virtualized emoji grid that renders only visible rows, keeping large categories smooth on lower-end hardware.
- Built-in locale packs for `de`, `es`, `fr`, `ja`, `pt`, and `uk` with matching `mojix-picker/locales/<code>` subpath exports.
- `mojix-picker/style.css` subpath export so consumers can import the stylesheet via the package name.
- Playwright accessibility coverage for the picker, wired into CI alongside the existing Vitest suite.
- `scripts/check-package.mjs` pack-check helper to validate the publishable tarball layout.

### Changed

- Sprite sheet loader and related types reworked to support the virtualized grid and reduce redundant paint work in Chrome.
- Emoji data generator emits per-locale JSON for the expanded locale set, keeping per-locale bundle sizes predictable.

### Fixed

- Reduced hover/re-render cost in the emoji grid with layout/paint containment and memoized cells.
- Chrome/WebKit built-in search clear control stays hidden so only the custom clear button is visible.

## [0.5.1] - 2026-04-19

### Fixed

- Reduced Chrome hover work in the emoji grid by memoizing emoji cells and adding layout/paint containment to the scrolling sections and grid.
- Hid Chrome/WebKit's built-in search clear control so the picker shows only the custom clear button.

## [0.5.0]

### Backward compatibility

- **No breaking changes.** All APIs and props shipped in `0.1.0` remain available with identical behavior: `EmojiPicker`, every prop on it, every `MojiX.*` primitive, every asset source factory, `createLocalStorageRecentStore`, all slot names, all CSS variables. The v0.5 surface is purely additive.
- `EmojiRecentStore.push`'s `limit` parameter is now optional. Existing implementations that accept `(entry, limit: number)` continue to satisfy the interface.

### Added

- **Engine layer, framework-agnostic.** New exports `createEmojiIndex`, `searchEmoji`, `resolveEmojiSelection`, `createRecentEmojiStore`, `createSkinToneStore` make the search/selection/persistence pipeline usable outside React.
- **Pluggable search.** `searchConfig` prop on `MojiX.Root` / `EmojiPicker` and on `createEmojiIndex({ searchConfig })` accepts `{ tokenize, normalize, rank }`. Each function is optional; missing pieces fall back to the default pipeline.
- **Controlled active emoji.** `activeEmojiId` / `defaultActiveEmojiId` / `onActiveEmojiChange` let host apps drive the preview state externally. `useActiveEmoji()` now returns `activeEmojiId` and `setActiveEmojiId`.
- **`useEmojiAssets()` hook** exposing the active sprite sheet, grid/preview sources, and a `resolve(emoji, { context, skinTone, assetSource })` helper for rendering emoji consistently outside the grid.
- **`CompactPicker` preset** under the new subpath export `mojix-picker/presets` — sidebarless, preview-less layout built on the public primitives.
- **Migration guide** at `docs/MIGRATION.md` covering monolith → composable, controlled state, search pipeline, and engine usage.
- `registerEmojiLocalePack(locale, pack)` for registering translation packs at runtime (extends built-in locales or creates new ones).
- Subpath exports `mojix-picker/locales/en` and `mojix-picker/locales/ru` that side-effect-register the corresponding emoji translation pack.
- CI workflow (`typecheck`, `test`, `build:package`, `pack:check`) on push and PR.
- npm publish workflow with provenance, triggered on `v*` tags.
- GitHub Pages deploy workflow for the demo.
- Vitest setup with jsdom and initial smoke tests for the public surface.
- `engines.node` field and expanded keywords in `package.json`.
- `prepublishOnly` script that runs `typecheck` + `test` + `build:package`.
- `CONTRIBUTING.md`, `CHANGELOG.md`, issue/PR templates.
- README note on SSR (Next.js / Remix) usage.

### Changed

- `EmojiPicker` and the new `CompactPicker` both compose the public `MojiX.*` primitives — they share the same reference implementation.
- Default search inside the picker flows through the new `filterEmojiWithSearchConfig` pipeline. Results are identical when no `searchConfig` is provided.
- `tsconfig.lib.json` now explicitly narrows `include` to the library surface and excludes test files.
- Built-in locale modules (`en`, `ru`) import their own generated JSON instead of a shared bundle. The generator now emits per-locale files (`emoji-locale.<code>.json`) so consumers who lazy-load locale modules no longer pull every translation into the main chunk.
- **Russian emoji translations are no longer in the default bundle.** The built-in `ru` locale still ships labels, categories, and skin-tone names. Consumers who need translated emoji names/keywords import the opt-in subpath `mojix-picker/locales/ru` (side-effect registers the pack) or pass it to the new `registerEmojiLocalePack` API. This drops the default ESM bundle from ~1,524 kB to ~874 kB (gzip ~198 kB → ~90 kB).
- Renamed `src/lib/` to `src/core/` so published type declarations no longer have the double `dist/lib/lib/...` nesting; the public `dist/lib/index.d.ts` entry is unchanged.
- Added `./locales/en`, `./locales/ru`, and `./presets` subpath exports to `package.json`.

## [0.1.0] - Initial release

### Added

- `EmojiPicker` default preset with search, recents, skin tones, preview, and category nav.
- Headless `MojiX.*` primitives on the same engine as `EmojiPicker`.
- Pluggable asset sources: native, spritesheet, image, SVG, mixed.
- CDN and local spritesheet presets with vendor variants (`twitter`, `google`, `apple`, `facebook`).
- Runtime sprite cache with adapter hook for Electron / Tauri.
- Built-in `en` and `ru` locales with CLDR-driven emoji name/keyword data.
- Three-layer theming: CSS variables, per-slot `classNames`/`styles`, and `unstyled` mode with `[data-mx-slot]` hooks.
- ESM + CJS + type declarations, React 18 and 19 peer support.
