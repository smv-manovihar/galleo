# Galleo v1.1.2

## What's New

* **Adjustable Visual Similarity Radius:** Visual similarity search now honors a configurable perceptual distance. Set the default radius under Settings → Quality Thresholds, and refine live during a search with the "View More Results" button at the bottom of the results grid — each click broadens the range in steps until the entire library is covered.
* **Directional View Transitions:** Page transitions now animate with direction awareness — navigating forward through the sidebar slides content up, while going back slides it down, matching the mental model of browsing a media workflow.

## Improvements

* **Folder-Scoped Similarity & Search:** Visual similarity results and text search are now strictly confined to the active folder, matching either the folder itself or its subdirectories — eliminating false matches from sibling folders with similar names.
* **Default Radius Persistence:** The similarity radius chosen under Quality Thresholds is stored with your settings and applied to every new visual search.

## Bug Fixes

* **Folder Prefix Collision:** Fixed folder queries matching items from unrelated directories whose names share a common prefix (e.g., `Vacation` also matching `Vacation2`).
* **Removed Misleading Search Badge:** Eliminated the confidence-percentage badge on search result cards that didn't reflect true result relevance.
