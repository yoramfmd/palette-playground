# Palette Playground repository rules

These rules apply to every file in this repository.

## Non-negotiable compatibility guardrails

1. Never change `name: palette-playground`, `build.appId: com.paletteplayground.app`, `build.productName: Palette Playground`, or the effective Electron user-data profile without an explicit, tested migration plan.
2. `electron/main.js` must continue loading `app/index.html`. Moving the renderer requires a compatibility-preserving transition and tests.
3. Never call `indexedDB.deleteDatabase`, clear browser/application data, drop object stores, or automatically delete Image Library or Deleted Images records.
4. Duplicate detection is read-only by default. A record may be removed or moved only after an explicit user action and confirmation.
5. Preserve the existing IndexedDB database and store names, keys, record shapes, and upgrade path. Schema changes must be additive and backward compatible.
6. Treat Image Library and Deleted Images as one compatibility boundary: upgrades must retain and render both collections.
7. Do not include Huemint live-API experiments on `main`. Collector, scraping, API, and model-mimic work belongs on an experiment/research branch.

## Required workflow

- Use a branch for every experiment or feature.
- Run `npm test` before committing changes that touch Electron startup, storage, image libraries, duplicate handling, or packaging.
- Run the Electron preview with `npm start` and visually inspect the affected flow before any macOS package is built.
- Build a Mac package only after preview approval. Never treat a successful package build as UI or storage verification.
- Do not commit user data, IndexedDB files, screenshots from the user's library, build output, or dependency directories.
- Prefer small, reversible commits. Document any migration and include a rollback path.

## Stable baseline

The initial `main` commit is the extracted v90 SAFE installed application. Keep `app/index.html` intact unless a change is required and verified. Refactoring the large single file into `app/css/` and `app/js/` is allowed only as a behavior-preserving branch with regression coverage.
