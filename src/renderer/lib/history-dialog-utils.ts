import type { MediaItem } from "../../shared/types/media"

export interface HistoryDialogBaseItem {
  id: string
  mediaId: string
  name: string
  thumbnailPath?: string
  path: string
  currentDecision: "keep" | "delete" | "skipped" | "pending"
  mediaItem?: MediaItem
}

/**
 * Resolves a full MediaItem for previewing from a history dialog entry.
 * Checks the attached mediaItem, store cache, or synthesizes a minimal fallback.
 */
export function resolveHistoryMediaItem(
  item: HistoryDialogBaseItem,
  storeItems: MediaItem[]
): MediaItem {
  if (item.mediaItem) return item.mediaItem

  const found = storeItems.find(
    (i) => i.id === item.mediaId || (item.path && i.path === item.path)
  )
  if (found) return found

  const ext = item.path ? item.path.split(".").pop()?.toLowerCase() || "" : ""
  const isVideo = ["mp4", "webm", "mov", "avi", "mkv", "m4v"].includes(ext)
  return {
    id: item.mediaId,
    path: item.path,
    name: item.name,
    size: 0,
    extension: ext,
    mediaType: isVideo ? "video" : "photo",
    dateAdded: new Date().toISOString(),
    dateFileSystem: new Date().toISOString(),
    dateTarget: new Date().toISOString(),
    dateTargetSource: "filesystem",
    thumbnailPath: item.thumbnailPath,
    isDuplicate: false,
    isBestInDuplicateGroup: false,
    reviewState:
      item.currentDecision === "pending"
        ? "pending"
        : item.currentDecision === "keep"
          ? "keep"
          : item.currentDecision === "delete"
            ? "delete"
            : "skipped",
  }
}
