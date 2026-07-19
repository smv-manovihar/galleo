export type MediaType = "photo" | "video"

export interface QualityMetrics {
  blurScore: number // 0-100 (0 = highly blurry, 100 = perfectly sharp)
  brightness: number // 0-255 (average pixel brightness)
  isDark: boolean
  isBlurry: boolean
  isScreenshot: boolean
  isSmall: boolean // flagged by file size or resolution
  compositeScore: number // 0-100, combined quality score (higher = better quality)
}

export interface MediaItem {
  id: string // unique ID (usually SHA256 of file path or UUID)
  path: string
  name: string
  size: number // bytes
  extension: string
  mediaType: MediaType
  width?: number
  height?: number

  // Date Fields
  dateAdded: string // ISO date string when scanned
  dateOriginal?: string // ISO date string extracted from EXIF
  dateInferred?: string // ISO date string inferred from filename
  dateFileSystem: string // ISO date string from file creation/modified
  dateTarget: string // ISO date string determined to be the canonical date
  dateTargetSource: "exif" | "filename" | "filesystem"

  // Hash & Thumbnail
  hash?: string // perceptual hash for duplicate detection
  thumbnailPath?: string // path to local thumbnail file
  dateModified?: string // ISO date string from file mtime (used for incremental scan skipping)

  // Quality & Grouping
  quality?: QualityMetrics
  duplicateGroupId?: string
  isDuplicate: boolean
  isBestInDuplicateGroup: boolean

  // User review state
  reviewState: "pending" | "keep" | "delete" | "skipped"
  reviewedAt?: string // ISO string
}
