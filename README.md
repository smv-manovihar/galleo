# MediaPurge

A desktop app for cleaning up and organizing local photo and video libraries. Scan folders on your machine, surface low-quality and duplicate files, review them in a focused workflow, and sort media into date-based folder structures — all offline, with no cloud upload.

## Features

### Smart library scanning

- Scan one or more root folders with configurable depth, file-size limits, and glob exclude patterns (e.g. `node_modules`, `.git`).
- Supports common photo formats (JPEG, PNG, GIF, WebP, HEIC, BMP, TIFF) and video formats (MP4, MOV, AVI, MKV, WebM).
- Incremental scans with progress reporting; cancel an in-progress scan at any time.
- Extracts EXIF metadata, generates thumbnails, and caches results in a local SQLite database.

### Quality analysis

Automatically flags media that is likely clutter or low value:

- **Blurry** — perceptual sharpness scoring via image analysis
- **Dark** — average brightness below a configurable threshold
- **Low resolution** — below a minimum pixel count or very small file size
- **Screenshots** — filename heuristics (e.g. `screenshot`, `capture`, `ss_`)
- **Duplicates** — perceptual hashing (blockhash) with Hamming-distance grouping; keeps the highest-quality copy per group

Each file receives a composite quality score (0–100) used for sorting and review ordering.

### Browse and filter

- Grid, list, and timeline views
- Filter by media type, quality flags, and review state
- Inline preview for photos and videos
- Bulk keep/delete actions from the browse view

### Review workflow

- **Swipe mode** — sequential card-by-card review (keep / delete / skip)
- **Batch mode** — table-style review for duplicates and flagged items
- **Summary** — session overview after review
- Checkpoints persist progress per folder; review order is configurable (worst-first, oldest-first, newest-first, random)

### Date-based organization

- Plan and preview moves into folder hierarchies using patterns like `YYYY/MM - MMMM/`
- Date inference from EXIF, filename patterns, or filesystem timestamps
- Configurable conflict resolution (rename, skip, overwrite) and copy-vs-move behavior
- Destination can be a custom folder or in-place reorganization

### Safety and privacy

- All processing runs locally — no network calls for media analysis
- Deletes can go to the system Recycle Bin, an app-managed trash folder, or permanent deletion (configurable)
- Optional confirmation before destructive actions

### Settings and onboarding

- First-run setup wizard to pick an initial scan folder
- Settings for folders, scan rules, defect sensitivity, theme, and UI preferences
- Reset option to clear app data and start fresh

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
git clone https://www.github.com/smv-manovihar/media-purge.git
cd media-pruge

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

### Packaging (Windows)

Production packaging uses [electron-builder](https://www.electron.build/). After a successful build:

```bash
pnpm build
pnpm exec electron-builder --config electron-builder.json
```

Output is written to `dist-build/`. The NSIS installer is configured in `electron-builder.json` (`oneClick`, desktop and Start Menu shortcuts).

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
- **Native rebuilds:** If `better-sqlite3` or `sharp` fail after a Node version change, run `pnpm rebuild better-sqlite3 sharp ffmpeg-static`.
- **UI components:** Add shadcn primitives with `npx shadcn@latest add <component>`. Components land in `src/components/ui/`.

## Roadmap ideas

This is early-stage software (`v0.0.1`). Planned direction:

- **AI agent** — An all-in-one assistant with powerful tools that can carry out complex media-library tasks on your behalf (batch cleanup, organization, tagging, and multi-step workflows from natural-language instructions).
- **Semantic search** — Vector indexing over photos and videos so you can find media by meaning, scene, or description — not just filename and folder path.
- **Richer metadata indexing** — Deeper EXIF extraction, including more reliable date resolution and GPS/location parsing from image metadata, with geocoding and map-based browsing.
- **Cross-platform packaging** — macOS and Linux installers alongside the current Windows NSIS build.
- **Stronger video analysis** — Quality scoring and duplicate detection tuned for video, not only still images.
- **Review exports** — Summaries and reports of keep/delete decisions for audit or backup workflows.

