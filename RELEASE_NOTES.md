# Galleo v1.2.2

## Bug Fixes

* **Best Item Resolution Priority:** Fixed an issue where lower-resolution media items (e.g. 720p/1080p downscaled images) were erroneously chosen as the "Best Item" / "Best Choice" over higher-resolution originals (e.g. 4K/12MP photos) due to elevated Laplacian sharpness scores on downscaled images and checking `blurScore` before pixel resolution.
* **Spurious Quality Score Penalty:** Fixed an issue where clear, non-blurry photos that passed the blur threshold were penalized up to 10 points on their composite quality score, causing downscaled copies to outscore full-resolution originals.

## Improvements

* **Consistent Quality Sorting:** Updated library sorting for Highest Quality (`score-desc`) and Lowest Quality (`score-asc`) to evaluate pixel resolution ahead of sharpness tie-breakers.
* **Centralized Media Quality Module:** Established a unified `compareMediaQuality` utility module for quality comparison, component isolation, and full test parity.

---

**Full Changelog**: [v1.2.1...v1.2.2](https://github.com/smv-manovihar/galleo/compare/v1.2.1...v1.2.2)
