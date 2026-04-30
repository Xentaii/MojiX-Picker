# Contributing to MojiX

Thanks for your interest. This document covers how to get set up, the conventions the project follows, and how changes land.

## Getting started

```bash
git clone https://github.com/Xentaii/MojiX-Picker
cd MojiX-Picker
npm install
npm run emoji:data
npm run dev   # launch the playground at http://localhost:5173
```

`src/core/generated/` is a build artifact. Regenerate it with `npm run emoji:data` after changing the dataset or locale rules.

## Useful scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server for the demo playground |
| `npm run typecheck` | Strict TypeScript check for the app and library projects |
| `npm run test` | Vitest (jsdom) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run build:demo` | Build the playground |
| `npm run build:lib` | Build the publishable library (ESM + types) |
| `npm run build:package` | Regenerate data and build only the npm package artifacts |
| `npm run pack:check` | `npm pack --dry-run` against the current package layout |

## Before submitting a PR

1. `npm run typecheck` passes.
2. `npm run test` passes.
3. `npm run build:package` succeeds.
4. Update `CHANGELOG.md` under `## [Unreleased]`.
5. Update docs / README when you change the public API.

## Commit style

Short, imperative commit messages, following the recent history:

```
feat: add X
fix: correct Y
docs: refresh Z
refactor: split W
chore: bump deps
```

## Adding a locale

See [`scripts/README.md`](./scripts/README.md) for CLDR conventions, the generator rules, and the steps to register a new locale module under `src/core/i18n/locales/`.

## Release process

1. Finalize the version, move `Unreleased` notes into a versioned heading in `CHANGELOG.md`, and update `docs/MIGRATION.md` plus `docs/releases/<version>.md` when the release changes public behavior.
2. Run the `Create GitHub Release` workflow. It can create the missing `v<version>` tag from a target commit and uses `docs/releases/<version>.md` as the release body so the release shows up properly on the GitHub Releases page.
3. Publish the package with the existing `Publish to npm` workflow if you want an npm release alongside the GitHub release.

## Reporting bugs

Use the issue templates under `.github/ISSUE_TEMPLATE/`. A StackBlitz / CodeSandbox reproduction is the fastest path to a fix.
