# Tauri and WebView2

Tauri on Windows runs inside WebView2, which has different scrolling and emoji
font behavior than a full desktop browser. The recommended MojiX setup for
native WebView shells is local data plus local sprite sheets.

## Recommended Setup

- Import offline data from `mojix-picker/data`.
- Register the locale packs your app needs.
- Use `createEmojiLocalSpriteSheet(...)` with assets bundled into the app.
- Use `createSpriteSheetAssetSource(...)` for grid and preview rendering.
- Warm the picker before opening it with `preloadEmojiPicker(...)`.
- Disable virtualization when rendering the full sprite-backed grid in a
  constrained WebView if profiling shows native scrolling is smoother.

## Fixture

The repository includes a Tauri React fixture under `examples/tauri-react`.
It installs the packed local npm artifact instead of importing source files, so
it validates the same package shape that consumers receive from npm.

From the repository root:

```bash
npm run test:tauri:build
```

This builds the package, packs it into `.tmp/mojix-picker-local.tgz`, installs
that tarball into the fixture, and compiles the Tauri app in debug mode.

For an interactive desktop run:

```bash
npm run dev:tauri
```

The fixture builds static frontend assets and lets Tauri serve them through its
built-in static dev server. It does not inject Vite's HMR websocket client, so
console output and scroll profiling stay focused on the picker.

## WebDriver Smoke Test

```bash
npm run test:tauri:e2e
```

This path requires `tauri-driver` and a matching platform WebDriver. On Windows,
put `msedgedriver.exe` on `PATH` and keep it aligned with the installed
Microsoft Edge version.

## Related Pages

- [Package Delivery](./package-delivery.md)
- [Sprite Sheets](../api/sprite-sheets.md)
- [Caching and Storage](../api/caching-and-storage.md)
