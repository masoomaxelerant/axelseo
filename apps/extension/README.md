# AxelSEO Browser Extension

Instant SEO check for any page — a companion tool for the AxelSEO audit platform.

## Features

- Click the toolbar icon on any page for instant SEO analysis
- Title & meta description with length indicators (red/amber/green)
- H1 tag detection and heading hierarchy
- Canonical URL and meta robots
- Open Graph social preview card
- Schema.org structured data detection
- Page stats: images, links, word count
- "Full Audit" button — sends the URL to the main AxelSEO app
- "Save to Project" — bookmark URLs for client projects

## Development

```bash
cd apps/extension
pnpm install
pnpm dev
```

This starts Plasmo in dev mode and generates a `build/chrome-mv3-dev` directory.

### Load in Chrome

1. Go to `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select `apps/extension/build/chrome-mv3-dev`

### Load in Firefox

```bash
pnpm build:firefox
```

1. Go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select any file in `apps/extension/build/firefox-mv3-prod`

## Build for Distribution

```bash
# Chrome Web Store
pnpm build
pnpm package

# Firefox Add-ons
pnpm build:firefox
pnpm package --target=firefox-mv3
```

Outputs are in `build/` as `.zip` files ready for upload.

## Architecture

- **Plasmo framework** — Manifest V3 for Chrome and Firefox
- **Content script** (`lib/extract-seo.ts`) — injected on-demand via `chrome.scripting.executeScript`
- **Popup** (`popup.tsx`) — React UI shown when clicking the toolbar icon
- **No background service worker** — only runs when the user clicks the icon
- **Privacy** — only analyzes the current tab when explicitly clicked

## Permissions

| Permission | Why |
|---|---|
| `activeTab` | Read the current page DOM when clicked |
| `scripting` | Inject the SEO extraction script |
| `storage` | Persist auth token locally |
