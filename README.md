<div align="center">

# MojiX

React emoji picker for web apps.

<img src="./docs/assets/preview.svg" alt="MojiX picker preview" width="640" />

[![npm](https://img.shields.io/npm/v/mojix-picker?style=flat-square)](https://www.npmjs.com/package/mojix-picker)
[![downloads](https://img.shields.io/npm/dm/mojix-picker?style=flat-square)](https://www.npmjs.com/package/mojix-picker)
[![bundle size](https://img.shields.io/bundlephobia/minzip/mojix-picker?style=flat-square)](https://bundlephobia.com/package/mojix-picker)
[![CI](https://img.shields.io/github/actions/workflow/status/Xentaii/MojiX/ci.yml?branch=main&style=flat-square)](https://github.com/Xentaii/MojiX/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/mojix-picker?style=flat-square)](./LICENSE)
[![React](https://img.shields.io/badge/react-18%20%7C%2019-61dafb?style=flat-square)](https://react.dev)

[Live Demo](https://xentaii.github.io/MojiX/) - [npm](https://www.npmjs.com/package/mojix-picker) - [API Docs](./docs/api/README.md) - [Migration Guide](./docs/MIGRATION.md)

</div>

MojiX provides:

- a ready-to-use React emoji picker
- headless primitives for custom picker layouts
- async emoji data loading from the npm CDN mirror
- explicit offline data imports
- native emoji rendering, sprite sheet rendering, and custom asset sources
- locale packs and lazy search indexes

Current release line: `1.0.0-beta.1`. The package is still in beta; the public
API is intended to be stable, but the generated data contract and package shape
may still change before a stable `1.0.0`.

## 📚 Table of Contents

- [📦 Install](#install)
- [💾 Data](#data)
- [😀 Picker](#picker)
- [🧩 Headless API](#headless-api)
- [🎨 Emoji Rendering](#emoji-rendering)
- [🌍 Internationalization](#internationalization)
- [🖥️ SSR](#ssr)
- [🗂️ Package Contents](#package-contents)
- [🛠️ Development](#development)
- [📖 Docs](#docs)

<a id="install"></a>

## 📦 Install

```bash
npm install mojix-picker@beta
```

```tsx
import { EmojiPicker } from 'mojix-picker';
import 'mojix-picker/style.css';
```

`react` and `react-dom` are peer dependencies.

<a id="data"></a>

## 💾 Data

The default picker does not import the full emoji dataset into the main JS
entry. On first mount, MojiX loads the unicode emoji metadata and the active
locale from the package CDN mirror:

```text
https://cdn.jsdelivr.net/npm/mojix-picker@<version>/data/emoji-data.json
https://cdn.jsdelivr.net/npm/mojix-picker@<version>/data/locales/<code>.json
```

Locale keyword search indexes are split from locale name packs. They are loaded
only when search needs them:

```text
https://cdn.jsdelivr.net/npm/mojix-picker@<version>/data/locales/<code>.search.json
```

For apps that cannot use runtime network requests, import the data subpaths and
register them during bootstrap:

```tsx
import emojiData from 'mojix-picker/data';
import ruLocale from 'mojix-picker/locales/ru';
import ruSearch from 'mojix-picker/locales/ru/search';
import {
  preloadEmojiData,
  registerEmojiLocalePack,
  registerEmojiLocaleSearchIndex,
} from 'mojix-picker';

preloadEmojiData(emojiData);
registerEmojiLocalePack('ru', ruLocale);
registerEmojiLocaleSearchIndex('ru', ruSearch);
```

<a id="picker"></a>

## 😀 Picker

```tsx
import { EmojiPicker } from 'mojix-picker';
import 'mojix-picker/style.css';

export function ComposerEmojiPicker() {
  return (
    <EmojiPicker
      locale="ru"
      onEmojiSelect={(emoji) => {
        console.log(emoji.native, emoji.shortcodes);
      }}
    />
  );
}
```

The default picker includes:

- search
- recent emoji
- category navigation
- skin tone selection
- active emoji preview
- loading and empty states

<a id="headless-api"></a>

## 🧩 Headless API

Use `MojiX.*` primitives when the default picker layout is not enough.

```tsx
import { MojiX } from 'mojix-picker';

<MojiX.Root locale="ru" columns={9}>
  <MojiX.Search />

  <MojiX.Viewport>
    <MojiX.Loading />
    <MojiX.Empty />
    <MojiX.List />
  </MojiX.Viewport>

  <MojiX.Footer>
    <MojiX.SkinToneButton />
    <MojiX.ActiveEmoji />
  </MojiX.Footer>

  <MojiX.CategoryNav />
</MojiX.Root>;
```

Primitives:

- `MojiX.Root`
- `MojiX.Search`
- `MojiX.Viewport`
- `MojiX.List`
- `MojiX.Empty`
- `MojiX.Loading`
- `MojiX.Footer`
- `MojiX.CategoryNav`
- `MojiX.ActiveEmoji`
- `MojiX.SkinTone`
- `MojiX.SkinToneButton`

Hooks:

- `useMojiX`
- `useEmojiSearch`
- `useEmojiCategories`
- `useEmojiSelection`
- `useActiveEmoji`
- `useSkinTone`
- `useEmojiAssets`

<a id="emoji-rendering"></a>

## 🎨 Emoji Rendering

By default, MojiX can render native operating-system emoji. Sprite sheets and
custom assets are opt-in.

```tsx
import {
  EmojiPicker,
  createEmojiSpriteSheet,
  createSpriteSheetAssetSource,
} from 'mojix-picker';

<EmojiPicker
  spriteSheet={createEmojiSpriteSheet({
    source: 'cdn',
    vendor: 'twitter',
    sheetSize: 64,
    variant: 'indexed-256',
  })}
  gridAssetSource={createSpriteSheetAssetSource()}
/>;
```

Sprite sheets resolve through `emoji-datasource-*` CDN packages:

```text
https://cdn.jsdelivr.net/npm/emoji-datasource-twitter@16.0.0/img/twitter/sheets-256/64.png
```

Asset source helpers:

- `createNativeAssetSource`
- `createSpriteSheetAssetSource`
- `createImageAssetSource`
- `createSvgAssetSource`
- `createMixedAssetSource`

Sprite preset subpaths:

- `mojix-picker/sprites/twitter`
- `mojix-picker/sprites/apple`
- `mojix-picker/sprites/google`
- `mojix-picker/sprites/facebook`

<a id="internationalization"></a>

## 🌍 Internationalization

Built-in chrome locales:

- `en`
- `de`
- `es`
- `fr`
- `ja`
- `pt`
- `ru`
- `uk`

Setting `locale="ru"` loads the Russian emoji name pack on demand. Locale
search data is separate and can be loaded with `loadEmojiLocaleSearchIndex()`.

```tsx
import {
  EmojiPicker,
  loadEmojiLocaleSearchIndex,
} from 'mojix-picker';

await loadEmojiLocaleSearchIndex('ru');

<EmojiPicker locale="ru" />;
```

Local label overrides can be passed through the `locales` prop:

```tsx
<EmojiPicker
  locale="ru"
  fallbackLocale={['en']}
  locales={{
    ru: {
      labels: { searchPlaceholder: 'Find emoji' },
    },
  }}
/>;
```

`emojiPickerLocales` reflects locale packs explicitly registered in the current
runtime. It is not a static list of every locale shipped by the package.

<a id="ssr"></a>

## 🖥️ SSR

MojiX uses browser APIs such as `window`, `localStorage`, Cache Storage, and
DOM measurements. Render it from a client boundary in SSR frameworks.

```tsx
// Next.js App Router
'use client';
export { EmojiPicker } from 'mojix-picker';
```

```tsx
// Next.js Pages Router
import dynamic from 'next/dynamic';

export const EmojiPicker = dynamic(
  () => import('mojix-picker').then((mod) => mod.EmojiPicker),
  { ssr: false },
);
```

<a id="package-contents"></a>

## 🗂️ Package Contents

Published packages ship:

- `dist/lib/` - ESM runtime, type declarations, CSS, and subpath entries
- `dist/data/` - emoji data, locale packs, search indexes, availability files,
  and precompressed `.br` / `.gz` assets

Current `npm pack --dry-run` size for `1.0.0-beta.1`:

| Metric | Size |
| --- | ---: |
| Tarball download | 1.44 MB |
| Unpacked install | 2.93 MB |
| Files | 184 |

This package is larger than minimal headless emoji libraries because it carries
the data mirror needed for jsDelivr, self-hosting, and offline imports. The
default app bundle does not inline the full emoji dataset unless the app imports
`mojix-picker/data` or locale data subpaths directly.

<a id="development"></a>

## 🛠️ Development

```bash
git clone https://github.com/Xentaii/MojiX
cd MojiX
npm install
npm run emoji:data
npm run dev
```

Key scripts:

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the demo app |
| `npm run emoji:data` | Regenerate `src/core/generated/` from CLDR and `emoji-datasource` |
| `npm run typecheck` | Run TypeScript checks |
| `npm run test` | Run Vitest |
| `npm run test:e2e` | Run Playwright |
| `npm run build:demo` | Build the demo app |
| `npm run build:lib` | Build the library artifacts |
| `npm run build:package` | Regenerate data and build package artifacts |
| `npm run pack:check` | Verify package exports and packed assets |

Project layout:

```text
src/
|-- components/              React components and headless primitives
|-- core/                    Data store, i18n, search, sprites, storage
|-- entries/                 Package subpath entries
|-- demo/                    Demo app and test fixtures
`-- index.ts                 Public entry
scripts/
`-- build-emoji-data.mjs     Generator for src/core/generated/*
```

`src/core/generated/` is a build artifact. Regenerate it with
`npm run emoji:data`.

<a id="docs"></a>

## 📖 Docs

- [Live Demo](https://xentaii.github.io/MojiX/)
- [API reference](./docs/api/README.md)
- [Migration Guide](./docs/MIGRATION.md)
- [Bundle size roadmap](./docs/BUNDLE_SIZE_ROADMAP.md)
- [Headless API roadmap](./docs/HEADLESS_API_ROADMAP.md)
- [Release notes: 1.0.0-beta.1](./docs/releases/1.0.0-beta.1.md)
- [Generation rules](./scripts/README.md)
- [Changelog](./CHANGELOG.md)
- [Contributing](./CONTRIBUTING.md)

## ⚖️ License

[MIT](./LICENSE)
