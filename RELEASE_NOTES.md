# Galleo v1.3.0

## What's New

* **Multi-folder organize sources:** The date organizer now lets you pick multiple source folders (or the whole library) via a searchable folder picker with checkboxes, instead of being limited to the single sidebar selection.
* **Library folder tree API:** The backend now exposes the indexed folder hierarchy with per-folder item counts and depth, powering the new source picker.
* **Richer organize preview:** Preview rows now show thumbnails, file sizes, media-type icons, source folder names, and per-folder totals so you can verify the plan at a glance.

## Improvements

* **Self-contained organize page:** The organize page no longer gates on sidebar selection or scan state; source selection lives inside the organizer itself.
* **Smoother folder tree:** Shared file-tree primitives now memoize context, render leaf folders without a chevron, and support row actions and custom select handlers.
* **Multi-path organize plumbing:** Preview, execute, and post-organize refresh all accept one or many folder paths end to end.

## Bug Fixes

* **Preview lost file metadata:** Organized previews now carry through date target, date source, size, media type, and thumbnail instead of dropping them.

---

**Full Changelog**: [v1.2.4...v1.3.0](https://github.com/smv-manovihar/galleo/compare/v1.2.4...v1.3.0)
