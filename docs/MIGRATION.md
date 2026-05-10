# Migration Guide for 1.0

`mojix-picker@1.0.0` is a **major release**. Migration is required if your app
depends on any of the old synchronous data assumptions, implicit locale
registration, or CommonJS consumption.

Use this guide together with:

- [README](../README.md)
- [API reference](./api/README.md)
- [Package Delivery](./guides/package-delivery.md)

## What changed

The 1.0 release moves MojiX to a CDN-first runtime model:

- unicode emoji data is no longer bundled into the main entry
- locale translation packs are loaded lazily or registered explicitly
- the package is now ESM-only
- offline mode is opt-in through dedicated subpath imports

This makes the default install much leaner, but it also means some older usage
patterns need to change.

## Breaking changes

### 1. `getUnicodeEmojiData()` is no longer safe before bootstrap

Old behavior:

```ts
import { getUnicodeEmojiData } from 'mojix-picker';

const data = getUnicodeEmojiData();
```

New behavior:

- `getUnicodeEmojiData()` now throws until data has been loaded
- use `await loadEmojiData()` for the CDN path
- or `preloadEmojiData(...)` for the offline path

Recommended migration:

```ts
import { loadEmojiData } from 'mojix-picker';

const data = await loadEmojiData();
```

Offline migration:

```ts
import emojiData from 'mojix-picker/data';
import { preloadEmojiData } from 'mojix-picker';

preloadEmojiData(emojiData);
```

### 2. `emojiPickerLocales` starts empty

Old behavior:

- locale packs could be assumed to exist in the global registry
- some imports worked by side effect

New behavior:

- `emojiPickerLocales` now reflects only packs explicitly registered at runtime
- built-in chrome labels still resolve for supported locales
- emoji name/keyword packs are either loaded on demand or registered manually

Recommended migration:

```ts
import ruLocale from 'mojix-picker/locales/ru';
import { registerEmojiLocalePack } from 'mojix-picker';

registerEmojiLocalePack('ru', ruLocale);
```

### 3. Side-effect locale imports should be replaced with explicit registration

Old pattern:

```ts
import 'mojix-picker/locales/ru';
```

New pattern:

```ts
import ruLocale from 'mojix-picker/locales/ru';
import { registerEmojiLocalePack } from 'mojix-picker';

registerEmojiLocalePack('ru', ruLocale);
```

This is clearer, more tree-shakable, and works consistently in offline boot
flows.

### 4. CommonJS is gone

MojiX is now **ESM-only**.

If your app or test environment still relies on `require('mojix-picker')`, you
need to migrate to `import`.

Typical migrations:

- Vite, Next 13+, Rspack, and modern Webpack users usually need no extra work
- Jest users may need an ESM transform rule or a move to `vitest`
- Node scripts should use ESM entry files or dynamic `import()`

## Migration recipes

### Default picker, CDN-first

If you only render `EmojiPicker` or `MojiX.Root`, the simplest migration is:

```tsx
import { EmojiPicker } from 'mojix-picker';
import 'mojix-picker/style.css';

<EmojiPicker locale="en" />;
```

No preload step is required. MojiX will fetch data from jsDelivr on first mount.

### Offline bootstrap

Use this when network access is not allowed at runtime:

```tsx
import emojiData from 'mojix-picker/data';
import ruLocale from 'mojix-picker/locales/ru';
import twitterSprites from 'mojix-picker/sprites/twitter';
import {
  EmojiPicker,
  preloadEmojiData,
  registerEmojiLocalePack,
} from 'mojix-picker';

preloadEmojiData(emojiData);
registerEmojiLocalePack('ru', ruLocale);

<EmojiPicker locale="ru" spriteSheet={twitterSprites} />;
```

### Error handling for CDN failures

If you want observability around failed CDN requests:

```tsx
<EmojiPicker
  onDataError={(error) => {
    console.error('MojiX data load failed', error);
  }}
/>
```

### Headless and engine usage

If you consume the engine directly, make the async bootstrap explicit:

```ts
import {
  createEmojiIndex,
  loadEmojiData,
  resolveLocaleDefinition,
} from 'mojix-picker';

await loadEmojiData();

const index = createEmojiIndex({
  locale: 'en',
});

const locale = resolveLocaleDefinition('en');
```

## Suggested upgrade path

1. Replace any direct early call to `getUnicodeEmojiData()` with `loadEmojiData()` or `preloadEmojiData(...)`.
2. Replace side-effect locale imports with `registerEmojiLocalePack(...)`.
3. Verify your app, tests, and scripts run under ESM.
4. If you ship in offline or regulated environments, move bootstrap to `mojix-picker/data` and `mojix-picker/locales/<code>`.
5. Re-run your bundle/package checks. The new default path is designed to be much leaner.

## Need-to-review areas

During migration, double-check:

- SSR boundaries around picker usage
- custom engine/bootstrap code
- Jest or Node scripts that still expect CommonJS
- any code that introspects `emojiPickerLocales` before explicit registration

## Summary

MojiX 1.0 is a better default package for real production apps, but it is not a
drop-in minor bump. Treat it as a proper migration, especially if your app
touches low-level data APIs or custom locale bootstrapping.
