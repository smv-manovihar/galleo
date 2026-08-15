# Galleo v1.0.1

## Improvements & Fixes

* **Duplicate Audit Navigation:** Fixed an issue where pressing the Right Arrow key in Similar Media duplicate review inadvertently opened the media preview modal instead of advancing to the next group.
* **Preview Shortcut Isolation:** Prevented closed media preview instances from listening to or intercepting global hotkeys and navigation keys in the background.
* **Culling Card Shortcut Isolation:** Prevented embedded video card player thumbnails from capturing arrow keys during card-deck culling, ensuring smooth keep/delete/undo hotkey operation.
* **File Info Dialog Guard:** Ensured background keyboard navigation is properly paused while the Media Info dialog is active.
* **Automated CI/CD Release Pipeline:** Enhanced GitHub Actions workflow to automatically populate release notes and publish multi-platform builds.

---

**Full Changelog**: [v1.0.0...v1.0.1](https://github.com/smv-manovihar/galleo/compare/v1.0.0...v1.0.1)
