# Galleo v1.2.0

## What's New

* **Dramatically Faster Video Indexing:** Videos are now hashed from a single lightweight 480p poster frame captured with fast-seek entirely in memory, replacing the old multi-frame FFmpeg passes and temporary hash-file round-trips. Indexing video-heavy libraries finishes in a fraction of the time, uses fewer CPU cycles per clip, and leaves no temp frames behind on disk.
* **Similarity Gradient Sort:** A new sort mode arranges items as a smooth visual gradient: each item sits next to its nearest perceptual neighbor with no hard threshold and no artificial group breaks, making near-duplicates easy to spot at a glance.
* **Smarter Duplicate Detection:** Duplicate audit now matches byte-identical files via exact hashes, recognizes renamed copies by normalized filename plus size, and refuses to pair video clips whose durations differ by more than 10%. This dramatically cuts false matches between photos, screenshots, and unrelated videos.
* **On-the-Fly Thumbnails:** Grid thumbnails are downscaled on demand straight from the original file (with an in-memory cache), and video posters are captured as compact 480p frames in RAM, giving faster browsing and a much smaller thumbnail cache.
* **Shift-Click Range Selection:** Select entire spans of media in one gesture: shift-click any item to select everything between it and your last pick.

## Improvements

* **Instant Correct Theme at Launch:** The window now reads your saved theme before first paint, eliminating the flash of the wrong color scheme, and launching a second instance simply focuses the existing window.
* **{camera} Folder Token:** Folder templates accept a new `{camera}` token that inserts the capture device's model, alongside brace-wrapped date tokens like `{YYYY}`.
* **Wider Camera Filename Recognition:** Date inference now covers dedicated-camera patterns from Canon, Nikon, and Fujifilm (`_MG_`, `DSC0_`, `DSCF_`, `_DSF`) and extends the recognized year range to 1970 through 2099.
* **Timezone-Aware EXIF Dates:** EXIF timestamps with explicit UTC markers or offsets are now interpreted correctly instead of being read as local time.
* **Performance & Data Integrity:** A new exact-hash index accelerates duplicate clustering queries, file operations run SQLite cache updates in transactions that preserve AI embeddings when files move, free disk space is checked before cross-volume copies or moves, and conflict resolution plus filtering are faster across large libraries.

## Bug Fixes

* **Special-Character Folders:** Fixed folder-scoped search and similarity failing for folder names containing `%` or `_`.
* **Accurate Wasted-Space Totals:** Dashboard no longer double-counts space for items that are both duplicates and blurry/undersized.
* **Shortcut Leakage:** Global keyboard shortcuts no longer fire while the shortcuts dialog is open.
