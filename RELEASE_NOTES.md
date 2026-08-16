# Galleo v1.1.1

## What's New

* **Direct In-App Updates & One-Click Installation:** Galleo can now download release installers directly within the desktop app without sending users to external browser pages. Real-time streaming progress is displayed across the app, and clicking "Install & Restart" applies the update seamlessly.
* **Non-Blocking Background Updating:** Update downloads run completely in the background, leaving users free to browse, cull media, or organize libraries while the installer downloads. Real-time progress is visible in the sidebar footer and completed downloads trigger an actionable toast notification.

## Improvements

* **Robust SemVer & Architecture Matching:** Upgraded SemVer comparison logic to cleanly handle pre-releases and tag prefixes without numeric comparison bugs, with architecture-aware matching across Windows (x64), macOS (ARM64 Apple Silicon & Intel x64), and Linux (AppImage & DEB).
* **Sidebar Update Widget & Render Isolation:** Refactored the update footer into an isolated, memoized subcomponent to prevent the main navigation and folder trees from re-rendering on percentage progress updates.
* **Direct GitHub Releases Documentation:** Added a dedicated Download section with platform-specific installer links in the README.

## Bug Fixes

* **Update Cache Version Synchronization:** Fixed an issue where the update checker returned stale cached versions and false-positive update flags on TTL cache hits and HTTP 304 responses after upgrading.
* **Sidebar Footer Single-Row Layout:** Fixed layout wrapping in the sidebar footer so update status, download progress, and actions stay strictly on a single row.
* **Eliminated Duplicate Action Controls:** Streamlined the About settings view to remove redundant secondary action banners.

---

# Galleo v1.1.0

## What's New

* **Visual Similarity Search:** Search and find visually similar photos and videos across your entire library using perceptual hash comparison. Trigger visual search from any media card or context menu, featuring an interactive search bar filter chip with thumbnail preview and one-click dismiss.
* **Duplicate Audit Progress Seeker & Folder Rules:** Introduced an interactive progress seeker for rapid group navigation across duplicate clusters, alongside automated folder rules for rule-based resolution (keep/delete precedence by folder priority and sibling counts).
* **Global Media Context Menu:** Introduced a right-click context menu across Browse Grid, Timeline, List, and Media Culling views for quick access to preview, review actions, visual similarity search, and file info.
* **Culling Session Decision History:** Added an in-place decision history dialog (`H` shortcut) in Media Culling mode to inspect and undo recent swipe decisions without leaving the deck.

## Improvements

* **High-Performance Media Streaming & Caching:** Implemented conditional HTTP caching with 304 response validation backed by an in-memory file stat cache in the desktop process, drastically reducing disk I/O when loading thumbnails and previews.
* **Off-Thread Image Preloading & Progressive Preview:** Added background image preloading and off-thread decoding for instant transitions, alongside progressive low-res thumbnail fallbacks while full-resolution images load.
* **Anchor-Based Duplicate Clustering:** Upgraded perceptual duplicate grouping to an anchor-based algorithm with strict cluster diameter constraints, eliminating loose transitive over-grouping.
* **Exact Duplicates Interface Refactor:** Modularized and streamlined the Exact Duplicates review interface with grouped batch selections and smooth animations.
* **Floating Toolbar & Batch Action Bar:** Redesigned the browse toolbar and multi-selection batch action bar as floating UI elements with deep render optimizations to eliminate unnecessary re-renders during high-volume library browsing.
* **Deterministic Sort Tie-Breakers:** Added comprehensive multi-level tie-breakers (blur sharpness, resolution, byte size, and filename) to prevent list jitter when sorting large media collections.
* **Video Scrubber Precision:** Enhanced seekbar hitboxes, timecode rendering, and hover preview tooltips for smooth, accurate video scrubbing.
* **Quality Score Overlays:** Refreshed quality score badges and hover cards with improved visual hierarchy, typography, and contrast.

## Bug Fixes

* **Duplicate Group Retention:** Fixed an issue where items in perceptual duplicate groups were prematurely filtered out during review sessions, ensuring all candidate items remain accessible for manual review.
* **Cross-Folder Visual Search Scope:** Fixed folder filter constraints so visual similarity queries properly search across all folders in the library regardless of active folder selection.
* **Visual Search Ranking Stability:** Ensured visual search preserves similarity distance ranking without being overridden by default date sorting.
* **Shortcut & Dialog Isolation:** Resolved shortcut leakage across background views when modals, dialogs, or text inputs are active.
* **Exact Duplicate List Interactions:** Resolved alignment, spacing, and hover state issues in the exact duplicate review list.

---

**Full Changelog**: [v1.0.1...v1.1.0](https://github.com/smv-manovihar/galleo/compare/v1.0.1...v1.1.0)
