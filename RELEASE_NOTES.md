# Galleo v1.2.4

## Improvements

* **Clearer delete confirmation:** The confirmation before moving files to trash now shows how many files will be removed, how much space you'll get back, and which folders are affected.
* **Instant feedback:** Trashed files now disappear from the view immediately instead of lingering until the next refresh.
* **More reliable trash:** Deleting files now uses your system's native trash, so trashed files are recoverable as expected.

## Bug Fixes

* **Deleting files failed:** Moving files to trash could fail and leave files behind. Deletion now works reliably every time.
* **Accurate success reporting:** When some files fail to trash, Galleo now correctly reports which succeeded and which failed instead of marking everything as failed.
* **Culling trashed the wrong files:** Cleaning up from the culling summary could target the wrong set of files. It now trashes exactly the files you culled.
* **Duplicate cleanup stability:** Fix for crashes and missed saves when cleaning exact duplicates in a fresh session or after a restart.
* **Windows folders:** Fixed an issue where saved decisions could fail to match files in Windows folders.

---

**Full Changelog**: [v1.2.3...v1.2.4](https://github.com/smv-manovihar/galleo/compare/v1.2.3...v1.2.4)
