# MojiX API Reference

This folder documents the public API surface exported by MojiX.

MojiX does not ship network endpoints, so this reference is organized around:

- components
- props
- headless primitives
- asset helpers
- sprite helpers
- cache and storage helpers
- localization and data helpers
- exported types

## Quick Examples

### 1. Drop-in picker

```tsx
import { EmojiPicker } from 'mojix-picker';
import 'mojix-picker/style.css';

<EmojiPicker onEmojiSelect={(emoji) => console.log(emoji.native)} />;
```

### 2. Picker with seeded recents and custom category icons

```tsx
<EmojiPicker
  showPreview={false}
  recent={{
    showWhenEmpty: true,
    emptyEmojiIds: ['1f44b', '1f389', '2728', '1f680'],
  }}
  categories={{
    brand: { label: 'Brand Kit', order: 2.5 },
    people: { iconStyle: 'outline' },
  }}
  categoryIcons={{
    brand: 'rocket',
  }}
  onEmojiSelect={handleSelect}
/>
```

### 3. Headless layout

```tsx
import { MojiX } from 'mojix-picker';

<MojiX.Root onEmojiSelect={handleSelect} unstyled>
  <MojiX.Search />
  <MojiX.Viewport>
    <MojiX.Empty>No emoji found.</MojiX.Empty>
    <MojiX.List />
  </MojiX.Viewport>
  <MojiX.CategoryNav />
</MojiX.Root>
```

### 4. Custom category icon rendering

```tsx
<EmojiPicker
  renderCategoryIcon={({ categoryId, icon, context, active }) => {
    if (categoryId === 'brand') {
      return <span data-context={context} data-active={active}>BR</span>;
    }

    return <EmojiCategoryIcon icon={icon} label="Brand" />;
  }}
/>
```

### 5. Offline bootstrap

```tsx
import emojiData from 'mojix-picker/data';
import ruLocale from 'mojix-picker/locales/ru';
import {
  EmojiPicker,
  preloadEmojiData,
  registerEmojiLocalePack,
} from 'mojix-picker';

preloadEmojiData(emojiData);
registerEmojiLocalePack('ru', ruLocale);

<EmojiPicker locale="ru" />;
```

### 6. Warm before opening

```tsx
import { preloadEmojiPicker } from 'mojix-picker';

button.addEventListener('pointerenter', () => {
  void preloadEmojiPicker({ locale: 'en' });
});
```

`preloadEmojiPicker()` also benefits from the browser prepared-data cache: once
CDN data has been normalized, future mounts can reuse that IndexedDB entry. Use
`configureMojiXDataSource({ preparedCache: false })` to disable it.

### 7. Lazy-load categories on demand

```tsx
import { EmojiPicker, preloadEmojiPicker } from 'mojix-picker';

await preloadEmojiPicker({ shards: ['smileys', 'people'] });

<EmojiPicker loadCategoryShards />;
```

The picker auto-fetches the remaining categories as the user navigates to
them. Useful when first-paint payload size matters more than total bytes. See
[Category Shards](./data-and-localization.md#category-shards-lazy-loading).

### 8. Off-main-thread preparation

```ts
import { configureMojiXDataSource, preloadEmojiPicker } from 'mojix-picker';

configureMojiXDataSource({ workerPreparation: true });

await preloadEmojiPicker({ locale: 'en' });
```

Routes search-token generation through an inlined Web Worker and silently
falls back to the main thread on environments without `Worker`.

## Reference Pages

- [Picker Configuration](./picker-configuration.md)
  Covers `EmojiPickerProps` and the shared prop surface used by `MojiX.Root`.
- [Components](./components.md)
  Covers the ready-made picker and the lower-level UI components.
- [Headless Primitives](./headless-primitives.md)
  Covers `MojiX.*` exports and state hooks.
- [Asset Resolution](./asset-resolution.md)
  Covers asset-source factories and asset resolution.
- [Sprite Sheets](./sprite-sheets.md)
  Covers spritesheet builders and URL helpers.
- [Caching and Storage](./caching-and-storage.md)
  Covers cache warmup plus recent/skin-tone persistence helpers.
- [Data and Localization](./data-and-localization.md)
  Covers unicode emoji data loading, locale helpers, shards, and search indexes.
- [TypeScript Types](./typescript-types.md)
  Covers all exported TypeScript types.
