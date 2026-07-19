# Galleo

A desktop app for cleaning up and organizing local photo and video libraries. Scan folders on your machine, surface low-quality and duplicate files, review them in a focused workflow, and sort media into date-based folder structures — all offline, with no cloud upload.

## Features
### Smart library scanning & cache sync

- **Multi-Root scans:** Scan one or more root folders with configurable depth, file-size limits, and glob exclude patterns (e.g. `node_modules`, `.git`).
- **All Media View:** Browse, search, and audit media across all registered root folders simultaneously using the global catalog view.
- **Concurrent scan engine:** Discover files via parallel `fs.stat` traversals and analyze up to 4 files concurrently (blur score, image parameters, metadata parsing).
- **Fast incremental scanning:** Uses database caching verified against file size and modification times (`mtime`) to skip unchanged items on subsequent rescans.
- **Deduplication and Pruning:** Automatically blocks redundant subfolders in Settings, and prunes media from the database if they were deleted from the disk since the last scan.
- **Format support:** Standard photos (JPEG, PNG, GIF, WebP, HEIC, BMP, TIFF) and video files (MP4, MOV, AVI, MKV, WebM).
- **Format upgrades:** Automatically detects legacy formats and updates thumbnail caches to the latest standards.

### Quality & duplicate analysis

Automatically flags low-value or clutter media:

- **Blurry** — perceptual sharpness scoring via image analysis.
- **Dark** — average brightness below a configurable threshold.
- **Low resolution** — below minimum pixel bounds or very small files.
- **Screenshots** — filename heuristics (e.g. `screenshot`, `capture`, `ss_`).
- **Duplicates (Perceptual & Exact)** — groups media using blockhash and Hamming distance. Differentiates between *pure exact duplicates* (same name and size) and *similar media* (perceptual variations).
- **Quality scoring:** Files receive a composite quality score (0–100) for sorting and prioritization.

### Browse and filter

- Grid, list, and timeline layout modes.
- Filter catalog by media type (photo/video), quality tags (blurry, dark, etc.), and review state (pending, kept, trash).
- Inline preview for images and video players.
- Bulk keep/delete actions directly from the browse workspace.

### Media Culling & Duplicate Audit

- **Media Culling:** Focused culling workspace with Swipe mode (sequential card reviews) or progress-controlled lists.
- **Duplicate Audit & Cards:** Side-by-side duplicate group cards for side-by-side comparison, metadata inspection, and card stack review navigation.
- **Automated Auto-Cleanup:** Automatically resolves exact duplicates (retaining the highest-quality file while trashing copies) with safety confirmation dialogs and a virtualized history browser to review past decisions.
- **Scoped & Batch Undo:** Revert decisions selectively based on page source (e.g. undo culling only). Automated cleanup runs are undone transactionally as a single batch.
- **Checkpoints:** Automatically saves session progress per folder, with worst-first, oldest-first, newest-first, and random review ordering.

### Date-based organization

- Plan and preview moves into folder hierarchies using patterns like `YYYY/MM - MMMM/`
- Date inference from EXIF, filename patterns, or filesystem timestamps
- Configurable conflict resolution (rename, skip, overwrite) and copy-vs-move behavior
- Destination can be a custom folder or in-place reorganization

### Interactive Context-Aware Help

- Contextual tips and keyboard shortcut guides are accessible from the top bar for every view (Dashboard, Browse, Culling, Audit, Organize, Settings).

### Automatic Update Checker

- Automatically checks for updates against GitHub releases on startup.
- Displays sidebar update badges/banners and lets you download platform-matched installers (EXE, DMG, AppImage, etc.) or view markdown-rendered release notes inside Settings.

### Safety and privacy

- All processing runs locally — no cloud or network calls for media files.
- Deletions are sent to the system Recycle Bin/Trash, an app-managed trash directory, or deleted permanently (configurable).
- Optional confirmation dialogs for all destructive changes.

### Settings and onboarding

- First-run setup wizard to pick an initial scan folder.
- Settings for folders, scan rules, defect sensitivity, theme, and UI preferences.
- Reset option to clear app data and start fresh.

## Tech stack

| Layer | Technology |
|-------|------------|
| Desktop shell | Electron 42 |
| UI | React 19, TypeScript, Tailwind CSS 4, shadcn/ui |
| Build | Vite 8, vite-plugin-electron |
| State | Zustand |
| Database | better-sqlite3 |
| Image processing | sharp, blockhash-core, ExifReader |
| Video processing | fluent-ffmpeg, ffmpeg-static |
| Testing | Vitest |
| Package manager | pnpm |

## Prerequisites

- **Node.js** 20 or later (Node 24 recommended — matches `@types/node` in the project)
- **pnpm** 9+
- **Windows** is the primary packaging target (NSIS installer via electron-builder). Development on macOS/Linux should work for the Electron app, but installers are currently configured for Windows only.

Native modules (`better-sqlite3`, `sharp`, `ffmpeg-static`) are compiled during install. pnpm is configured to build them automatically via `onlyBuiltDependencies`.

## Getting started

```bash
# Clone the repository
git clone https://www.github.com/smv-manovihar/galleo.git
cd galleo

# Install dependencies (builds native modules)
pnpm install

# Start the Electron app in development mode
pnpm dev
```

`pnpm dev` runs the Vite dev server and launches the Electron window. File-system access, folder pickers, and scanning require Electron — a browser-only preview shows a warning banner and cannot select folders.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Vite + Electron in development mode |
| `pnpm build` | Typecheck and build the renderer + Electron bundles |
| `pnpm preview` | Preview the production renderer build (browser only) |
| `pnpm typecheck` | Run TypeScript without emitting |
| `pnpm lint` | Run ESLint |
| `pnpm format` | Format TypeScript/TSX with Prettier |
| `pnpm test` | Run Vitest unit tests |
| `pnpm test:watch` | Run Vitest in watch mode |
| `pnpm postinstall` | Automatically run after installation to rebuild native dependencies matching Electron |
| `pnpm dist` | Generate gradient assets, build codebase, and compile standard Windows installer |

### Packaging (Windows)

Production packaging uses [electron-builder](https://www.electron.build/). To extract the brand logo and gradients, compile the codebase, and package the installer in one command:

```bash
pnpm dist
```

Output is written to `dist-build/`. The standard NSIS installer is configured in `electron-builder.json` (with custom sidebar/header brand gradients, shortcuts, and custom installation paths/multi-user options).

## Project structure

```
src/
├── main/                 # Electron main process
│   ├── core/             # Pure logic: quality scoring, duplicates, organization, date inference
│   ├── infrastructure/   # SQLite, filesystem, image/video processors
│   ├── repositories/     # Data access layer
│   └── services/         # Business logic orchestration
├── preload/              # Context-isolated IPC bridge (window.api)
├── renderer/             # React UI
│   ├── components/       # Feature components (media, review, organize, settings, layout)
│   ├── pages/            # Top-level views (Dashboard, Browse, Review, Organize, Settings)
│   └── stores/           # Zustand state (media, settings, session, UI)
├── shared/               # Types, constants, IPC channel definitions
└── components/ui/        # shadcn/ui primitives
```

### Architecture

The app follows a layered Electron architecture:

1. **Renderer** — React pages and stores; communicates only through `window.api` (preload).
2. **Preload** — Exposes a typed, sandboxed IPC API to the renderer.
3. **Main process** — IPC handlers route to services; services call repositories and core logic.
4. **Core** — Framework-agnostic algorithms (quality, duplicates, organization) covered by unit tests.

Local media files are served to the renderer via a custom `media://` protocol registered in the main process.

## Configuration

Settings are stored in SQLite and mirror the defaults in `src/shared/constants.ts`. Key areas:

- **Folders** — root paths, destination, trash behavior
- **Scanning** — depth, excludes, extension whitelist, size bounds
- **Quality** — blur/darkness thresholds, duplicate hash distance, screenshot detection, minimum resolution
- **Organization** — folder pattern tokens (`YYYY`, `MM`, `MMMM`, `DD`), conflict policy
- **UI** — theme, font size, grid density, default view, review order
- **Performance** — thumbnail cache size, batch size, concurrency limit

## Testing

Unit tests live alongside core logic in `src/main/core/__tests__/`. They cover quality scoring, duplicate grouping, date inference, filename parsing, and organization planning.

```bash
pnpm test
```

## Development notes

- **Web preview:** Running Vite without Electron (`vite` directly) loads the UI but cannot access the file system. Use `pnpm dev` for full functionality.
- **Native rebuilds:** If native modules (such as `better-sqlite3`) fail after a Node or Electron version change, run `pnpm postinstall` to rebuild native dependencies matching Electron, or use `pnpm rebuild better-sqlite3 sharp ffmpeg-static` if rebuilding from source is specifically needed.
- **UI components:** Add shadcn primitives with `npx shadcn@latest add <component>`. Components land in `src/components/ui/`.

## Roadmap ideas

This is early-stage software (`v0.1.2`). Planned direction:

- **AI assistant integration** — An embedded automation agent with tools to execute complex media library operations from natural language requests.
- **Semantic search** — Local vector embedding index to search photos and videos using natural text descriptions.
- **Object detection** — Object tag extraction to categorize media contents (e.g. food, beaches, documents).
- **Local face grouping** — Face detection and clustering to identify and filter media by specific people.
- **Geo-location map** — Interactive map interface grouping media by location using GPS metadata coordinates.
- **Dedicated video quality scoring** — Frame-by-frame analysis to detect video corruption, audio static, or compression defects.