# Palette Playground

Palette Playground is a local-first Electron app for exploring palettes, recoloring artwork, and managing an IndexedDB-backed image library.

`main` starts from the installed **v90 SAFE** app. This is the stable line: it preserves the v86 Electron identity and storage profile, keeps Image Library and Deleted Images compatible, and contains no Huemint live-API experiment.

## Identity contract

These values are compatibility-sensitive and must not change without a documented migration:

- package name: `palette-playground`
- app ID: `com.paletteplayground.app`
- product name: `Palette Playground`
- Electron entry point: `electron/main.js`
- renderer entry point: `app/index.html`
- image database: `PalettePlaygroundImages`, schema version 2
- backup database: `PalettePlaygroundDesktopBackup`

Changing the Electron identity can make the existing IndexedDB library appear empty because Electron opens a different application profile.

## Development

```sh
npm install
npm test
npm start
```

Before packaging for macOS, run the tests and inspect the app with `npm start`. Build only after the preview has been approved:

```sh
npm run build:mac
```

## Repository layout

```text
app/                 Stable renderer; currently kept as the proven single-file app
  index.html
  css/               Reserved for behavior-preserving extraction from index.html
  js/                Reserved for behavior-preserving extraction from index.html
electron/
  main.js             Electron window and app/index.html loader
tests/                Identity, storage, and baseline guardrails
scripts/              Maintenance and verification helpers
data/palettes/        Versioned palette fixtures and research datasets
```

## Workflow

- Keep `main` stable and recoverable.
- Develop each feature or experiment on a branch.
- Keep Huemint collection/research on `research/huemint-collector` (or a descendant branch), never in the stable baseline.
- Never auto-delete IndexedDB records or image-library data.
- Keep both Image Library and Deleted Images backward compatible.
- Preview and verify before creating a Mac package.

See [AGENTS.md](AGENTS.md) for the repository guardrails used by Codex.
