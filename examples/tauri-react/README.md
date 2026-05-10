# MojiX Tauri React Fixture

This fixture verifies that the published MojiX package shape works inside a
Tauri WebView app.

It intentionally imports MojiX through the package entry points:

- `mojix-picker`
- `mojix-picker/style.css`
- `mojix-picker/data`
- `mojix-picker/locales/en`
- `mojix-picker/locales/en/search`
- `mojix-picker/locales/ru`
- `mojix-picker/locales/ru/search`

The fixture disables MojiX runtime data fetches, preloads local package data,
and renders emoji from the local Twitter sprite sheet in `public/sprites`.
This avoids Windows WebView2 color-font rendering and verifies the recommended
Tauri path: local sprites, warmed assets, and no grid virtualization for the
full emoji list.

## From The Repo Root

```bash
npm run test:tauri:build
```

Builds `dist/lib`, installs this fixture, and compiles the Tauri app in debug
mode without bundling an installer.

The setup step packs the local library to `.tmp/mojix-picker-local.tgz` and
installs that tarball, so the fixture consumes the same `files` and `exports`
surface that npm consumers get. It removes the previous local fixture install
before reinstalling, which keeps repeated runs from accidentally using an older
tarball with the same package version.

```bash
npm run dev:tauri
```

Runs the fixture as a desktop Tauri app.

```bash
npm run test:tauri:e2e
```

Builds the app and runs the Selenium smoke test through `tauri-driver`.

## WebDriver Prerequisites

Install Tauri's WebDriver bridge:

```bash
cargo install tauri-driver --locked
```

On Windows, `msedgedriver.exe` must also be on `PATH` and match the installed
Microsoft Edge version. Tauri's WebDriver docs recommend using the matching Edge
driver because Tauri delegates to the native platform driver.
