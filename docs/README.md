# MojiX Docs

## Guides

- [API Reference](./api/README.md)
- [Migration Guide](./MIGRATION.md)
- [Package Delivery](./guides/package-delivery.md)
- [Custom Layouts](./guides/custom-layouts.md)
- [Tauri and WebView2](./guides/tauri-webview.md)
- [Release Notes](./releases/1.0.0-beta.2.md)

## Notes

- MojiX does not expose HTTP endpoints. In this docs folder, "API" means the public JavaScript/TypeScript surface exported from `src/index.ts`.
- The API reference is split by category so it is easier to scan while building integrations.
- Release note bodies live in [`docs/releases/`](./releases/) and are used by the GitHub Release workflow.
