# Custom Layouts

MojiX can be used as a drop-in picker, a themed picker, or a fully custom
composition built from public primitives. The default `EmojiPicker` is itself
assembled on top of the same state layer exposed through `MojiX.*`.

## Choose a Layer

| Layer | Best for | Main exports |
| --- | --- | --- |
| Default picker | Fast integration with the bundled UI | `EmojiPicker` |
| Preset | Smaller opinionated layout with the same behavior | `CompactPicker` from `mojix-picker/presets` |
| Headless primitives | Custom layout with MojiX-managed state | `MojiX.Root`, `MojiX.Search`, `MojiX.List`, hooks |
| Engine helpers | Framework-agnostic search, selection, and persistence | `createEmojiIndex`, `searchEmoji`, `resolveEmojiSelection` |

## Minimal Headless Picker

```tsx
import { MojiX } from 'mojix-picker';
import 'mojix-picker/style.css';

export function CustomEmojiPicker() {
  return (
    <MojiX.Root onEmojiSelect={(emoji) => console.log(emoji)}>
      <MojiX.Search />
      <MojiX.Viewport>
        <MojiX.Empty>No emoji found.</MojiX.Empty>
        <MojiX.List />
      </MojiX.Viewport>
      <MojiX.CategoryNav />
    </MojiX.Root>
  );
}
```

## Design Notes

- Start with `EmojiPicker` when the bundled layout is close enough.
- Use `classNames`, `styles`, and CSS variables before replacing structure.
- Move to `MojiX.*` when layout order, surrounding chrome, or render-prop
  access matters.
- Use engine helpers only when React UI is not the integration point.

## Related Pages

- [Headless Primitives](../api/headless-primitives.md)
- [Picker Configuration](../api/picker-configuration.md)
- [Components](../api/components.md)
