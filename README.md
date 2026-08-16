<div align="center">

<img src="build/icon.png" width="96" height="96" alt="Galleo Logo" />

# Galleo

### The Fast, Private Media Library Organizer for Desktop

**Organize, declutter, and sort your local photos and videos, completely offline.**

<br />

[![Release Version](https://img.shields.io/github/v/release/smv-manovihar/galleo?color=10b981&label=Latest%20Release&logo=github&style=for-the-badge)](https://github.com/smv-manovihar/galleo/releases/latest)
[![Total Downloads](https://img.shields.io/github/downloads/smv-manovihar/galleo/total?color=06b6d4&label=Downloads&logo=github&style=for-the-badge)](https://github.com/smv-manovihar/galleo/releases)
[![Platform Support](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-3b82f6?logo=electron&style=for-the-badge)](https://github.com/smv-manovihar/galleo/releases)

<br />

[**Download Installer**](#downloads) • [**Explore Features**](#core-features) • [**Getting Started**](#getting-started) • [**Tech Stack**](#tech-stack)

</div>

<br />

---

## Highlights

| 100% Offline & Private | Duplicates & Defect Audit | Tinder-Style Media Culling | In-App Auto Updates |
| :--- | :--- | :--- | :--- |
| Zero telemetry, no cloud accounts, and no uploads. All media, databases, and caches never leave your machine. | Cluster duplicate shots, distinguish exact clones, and resolve entire groups automatically with custom rules. | Rapid card-deck auditing: swipe or press right to keep and left to trash, clearing clutter in minutes. | Download and apply new releases directly inside the app with one click. |

---

## Downloads

Get the latest release for your operating system directly from **[GitHub Releases](https://github.com/smv-manovihar/galleo/releases/latest)**:

| Platform | Architecture | Package Format | Direct Download |
| :--- | :--- | :--- | :--- |
| <img src="https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/windows/default.svg" width="16" height="16" alt="Windows" align="middle" style="vertical-align: -3px;" /> **Windows** | 64-bit (`x64`) | NSIS Setup Wizard (`.exe`) | [![Download Windows](https://img.shields.io/badge/Download-Windows_x64-0078D6?style=flat-square&logo=windows11&logoColor=white)](https://github.com/smv-manovihar/galleo/releases/latest) |
| <img src="https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/apple/default.svg" width="16" height="16" alt="macOS" align="middle" style="vertical-align: -3px;" /> **macOS** | Apple Silicon (`arm64`) & Intel (`x64`) | Universal Disk Image (`.dmg`) | [![Download macOS](https://img.shields.io/badge/Download-macOS_Universal-000000?style=flat-square&logo=apple&logoColor=white)](https://github.com/smv-manovihar/galleo/releases/latest) |
| <img src="https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/linux/default.svg" width="16" height="16" alt="Linux" align="middle" style="vertical-align: -3px;" /> **Linux** | 64-bit (`x64` / `amd64`) | Standalone AppImage (`.AppImage`) | [![Download Linux AppImage](https://img.shields.io/badge/Download-Linux_AppImage-FCC624?style=flat-square&logo=linux&logoColor=black)](https://github.com/smv-manovihar/galleo/releases/latest) |
| <img src="https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/debian/default.svg" width="16" height="16" alt="Debian" align="middle" style="vertical-align: -3px;" /> **Linux (Debian / Ubuntu)** | Debian / Ubuntu (`amd64`) | Debian Package (`.deb`) | [![Download Debian](https://img.shields.io/badge/Download-Debian_Package-A81D33?style=flat-square&logo=debian&logoColor=white)](https://github.com/smv-manovihar/galleo/releases/latest) |

> **Tip:** Once installed, Galleo automatically checks for new releases and lets you update directly within the app.

---

## Core Features

### Smart Library Scanning
* **Multi-Folder Management:** Scan and manage one or multiple library folders in a unified catalog.
* **Fast Incremental Rescans:** Automatically skips unchanged files to keep rescan times instant.
* **Broad Format Support:** Photos (`JPEG`, `PNG`, `GIF`, `WebP`, `HEIC`, `BMP`, `TIFF`) and videos (`MP4`, `MOV`, `AVI`, `MKV`, `WebM`).

### Quality Scoring & Defect Detection
* **Blur & Sharpness Detection:** Automatically surfaces out-of-focus or motion-blurred shots.
* **Exposure Checks:** Identifies dark, underexposed, or overexposed captures.
* **Screenshots & Clutter Detection:** Automatically flags screenshots and low-resolution media.
* **Quality Score Rating:** Scores every file from 0 to 100 for easy sorting and review.

### Exact & Perceptual Duplicate Auditing
* **Exact & Visual Duplicates:** Accurately separates identical file copies from similar burst shots.
* **Side-by-Side Comparison:** Compare duplicate clusters side-by-side with visual difference highlights.
* **Automated Cleanup:** Clean entire duplicate groups with one click based on your preferred rules (keep best quality, oldest, or newest).
* **Cluster Seeker:** Easily jump between duplicate groups with a visual progress seeker.

### Tinder-Style Media Culling
* **Card Deck Auditing:** Rapidly review photos and videos with an intuitive swipe deck: keep (right) or trash (left).
* **Smart Review Ordering:** Review files sorted by lowest quality first, date, or randomized order.
* **In-Place Decision History:** Inspect and undo recent review actions without leaving the review deck.
* **Batch Undo:** Safely roll back automated cleanup actions or manual culling decisions.

### Date-Based Organization
* **Automatic Hierarchy Sorting:** Organize scattered media into structured date-based folders (e.g. `YYYY/MM - MMMM/`).
* **Smart Date Detection:** Automatically infers capture dates from photo metadata, filenames, or file timestamps.
* **Dry-Run Previews:** Preview all planned moves or copies before applying changes.

### In-App Updates
* **One-Click Updates:** Download and install new releases directly inside the app.
* **Release Notes Viewer:** View changelogs and new features directly inside Settings.

### Full Keyboard Navigation
* **Complete Keyboard Control:** Navigate libraries, review culling decks, control video playback, and manage dialogs entirely from your keyboard.

---

## Tech Stack

<div align="center">

| Technology | Role |
| :--- | :--- |
| **[Electron 42](https://www.electronjs.org/)** | Cross-Platform Desktop Shell & Native IPC Bridge |
| **[React 19](https://react.dev/)** | Declarative Component Architecture & Modern Hooks |
| **[TypeScript](https://www.typescriptlang.org/)** | End-to-End Type Safety & API Contracts |
| **[Tailwind CSS 4](https://tailwindcss.com/)** + **[shadcn/ui](https://ui.shadcn.com/)** | Design Tokens, Fluid Layouts & UI Primitives |
| **[Vite 8](https://vitejs.dev/)** | Ultra-Fast Hot Module Replacement & Bundler |
| **[Zustand](https://github.com/pmndrs/zustand)** | Atomic, High-Performance Global State Management |
| **[better-sqlite3](https://github.com/WiseLibs/better-sqlite3)** | High-Throughput Embedded Database for Metadata & Cache |
| **[Sharp](https://sharp.pixelplumbing.com/)** | Blazing Fast Image Processing & Thumbnail Generation |
| **[FFmpeg](https://ffmpeg.org/)** | Video Frame Extraction, Metadata & Keyframe Analysis |
| **[Vitest](https://vitest.dev/)** | Fast Unit & Integration Testing Suite |

</div>

---

## Getting Started

### Prerequisites

* **Node.js** 20 or higher (Node 24 recommended)
* **pnpm** 9+

```bash
# 1. Clone the repository
git clone https://github.com/smv-manovihar/galleo.git
cd galleo

# 2. Install dependencies
pnpm install

# 3. Rebuild native modules for the Electron ABI
pnpm postinstall

# 4. Launch development environment (Vite + Electron)
pnpm dev
```

---

## Available Scripts

| Command | Description |
| :--- | :--- |
| `pnpm dev` | Launch Vite dev server and desktop app in development mode |
| `pnpm build` | Typecheck and build production bundles for renderer and Electron |
| `pnpm typecheck` | Run TypeScript typechecker across the whole project |
| `pnpm lint` | Run ESLint checks |
| `pnpm format` | Format TypeScript and TSX code with Prettier |
| `pnpm test` | Run Vitest unit tests |
| `pnpm test:watch` | Run Vitest in interactive watch mode |
| `pnpm dist` | Build production assets and compile Windows NSIS installer |
| `pnpm postinstall` | Rebuild native Electron binaries (`better-sqlite3`, `sharp`, `ffmpeg-static`) |

---

## Packaging & Build

Production distribution binaries are generated using [electron-builder](https://www.electron.build/):

```bash
pnpm dist
```

Installers and packages are written to `dist-build/`.

---

## Roadmap

* **On-Device AI Semantic Search:** Natural language search powered by local vector embeddings.
* **Visual Scene & Concept Tagging:** Automatic offline scene categorization (e.g. documents, receipts, landscapes).
* **Facial Clustering:** Private on-device face grouping for people without cloud processing.