# Development and Build

This document describes how to develop, lint and build the BGA Carcassonne Color Manager WebExtension.

## Setup

Requires Node.js 18.18 or newer.

```bash
npm install
```

The extension itself has no runtime dependencies or build step. npm packages are only used for linting and packaging.

## Development

Load the repository root as an unpacked extension:
- **Chrome**: `chrome://extensions` → enable developer mode → "Load unpacked"
- **Firefox**: `about:debugging#/runtime/this-firefox` → "Load Temporary Add-on…" → select `manifest.json`

Firefox doesn’t support background service workers, but the extension has no background script, so the source manifest works in both browsers.

### Code Structure

- `content/main.js` entry point, loads settings and applies player colors
- `content/modules/player-colors.js` generates the color CSS for texts, meeples and tile borders
- `shared/` default settings and utilities shared by content scripts and popup
- `popup/` settings UI including the color picker

Content scripts and popup scripts are classic scripts sharing globals via `window`, so the load order in `manifest.json` and `popup/popup.html` matters.

## Linting

```bash
npm run lint
```

## Quick Commands

```bash
# Build unpacked extensions into build/
npm run build
npm run build:dev
npm run build:prod

# Build for a specific browser
npm run build:firefox
npm run build:chrome

# Create distribution packages in dist/
npm run dist
npm run dist:prod

# Create simple ZIP packages for testing
npm run pack

# Remove build/ and dist/
npm run clean

# Clean production build with distribution packages uploaded as GitHub release
npm run release
```

## Build Options

Options can be combined, e.g. `npm run build:prod -- --firefox --dist`.

### `--dev` / `--development`
- Adds "(Dev)" suffix to extension name

### `--prod` / `--production`
- Minifies code for Chrome
- Firefox code stays unminified so AMO doesn’t require a source code submission

### `--firefox` / `--chrome`
- Builds only one browser
- Firefox builds drop `minimum_chrome_version`, Chrome builds drop `browser_specific_settings`

### `--pack`
- Creates ZIP packages for testing

### `--dist`
- Creates store packages: XPI for Firefox, ZIP for the Chrome Web Store

### `--clean`
- Removes build and dist directories, alone it only cleans

### `--upload`
- Creates a GitHub release with the distribution packages, requires the `gh` CLI

### `--verbose`
- Shows file operations and error stack traces

## Distribution Packages

- **Firefox**: `bga-carcassonne-color-manager-v{version}.xpi`
- **Chrome**: `bga-carcassonne-color-manager-v{version}-chrome-webstore.zip`

## Release Process

1. **Update version** in `manifest.json`, the build syncs it to `package.json` and `package-lock.json`
2. **Create release build**: `npm run release`
3. **Test packages** by installing the XPI/ZIP files locally
4. **Submit to stores**
   - Firefox: upload the `.xpi` file to addons.mozilla.org
   - Chrome: upload the `-chrome-webstore.zip` file to the Chrome Web Store

Optionally check the Firefox build with Mozilla’s linter before submitting: `npx web-ext lint -s build/firefox`

## Validation

The build checks that each built manifest is valid JSON with name and version and that `content/main.js` exists.

## Contributing

Pull requests are welcome. Please
- follow the existing code style (tabs, double quotes)
- run `npm run lint` before submitting
- test changes in a live game or replay on Board Game Arena

---

Last updated: 2026-10-01 · version 0.3.2 · main branch commit 8bd394c
