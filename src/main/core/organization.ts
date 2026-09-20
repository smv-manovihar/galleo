import type { OrganizePreviewItem } from "../../shared/types/ipc"
import type { MediaItem } from "../../shared/types/media"

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

/**
 * Builds the folder structure fragment based on a pattern and target date.
 * Supported tokens: {YYYY}/YYYY, {MM}/MM, {MMMM}/MMMM, {DD}/DD, {camera}/camera
 */
export function buildFolderPathFromPattern(
  pattern: string,
  date: Date,
  camera?: string
): string {
  const year = date.getFullYear().toString()
  const monthVal = date.getMonth() + 1
  const MM = monthVal.toString().padStart(2, "0")
  const MMMM = MONTH_NAMES[date.getMonth()]
  const DD = date.getDate().toString().padStart(2, "0")
  const cameraVal = camera ? camera.trim().replace(/[/\\:*?"<>|]/g, "_") : ""

  let result = pattern
    .replace(/\{YYYY\}|YYYY/g, year)
    .replace(/\{MMMM\}|MMMM/g, MMMM)
    .replace(/\{MM\}|MM/g, MM)
    .replace(/\{DD\}|DD/g, DD)
    .replace(/\{camera\}|camera/gi, cameraVal)

  // Normalize path separators (ensure forward slashes for internal consistency)
  result = result.replace(/\\/g, "/").replace(/\/+/g, "/")

  // Strip leading and trailing slashes from fragment
  const clean = result.replace(/^\/+|\/+$/g, "")
  return clean ? `${clean}/` : ""
}

/**
 * Generates a unique target filename if a file with the same name already exists in target path.
 * E.g. "photo.jpg" -> "photo_1.jpg"
 */
export function resolveFilenameConflict(
  originalName: string,
  existingNames: Set<string>
): string {
  if (!existingNames.has(originalName.toLowerCase())) {
    return originalName
  }

  const dotIndex = originalName.lastIndexOf(".")
  const base =
    dotIndex !== -1 ? originalName.substring(0, dotIndex) : originalName
  const ext = dotIndex !== -1 ? originalName.substring(dotIndex) : ""

  let counter = 1
  let newName = `${base}_${counter}${ext}`
  while (existingNames.has(newName.toLowerCase())) {
    counter++
    newName = `${base}_${counter}${ext}`
  }

  return newName
}

/**
 * Computes target destinations for a set of media items during a dry run organization phase.
 * Resolves naming conflicts among planned items and existing files in O(N+M) time.
 */
export function planOrganization(params: {
  items: MediaItem[]
  destinationDir?: string
  pattern: string
  // A set of lowercase file paths that already exist on disk in the destination directory,
  // to avoid overwriting existing files.
  existingFilePaths: Set<string>
}): OrganizePreviewItem[] {
  const { items, destinationDir, pattern, existingFilePaths } = params
  const result: OrganizePreviewItem[] = []

  // Normalize destinationDir
  const normalizedDest = destinationDir
    ? destinationDir.replace(/\\/g, "/").replace(/\/$/, "")
    : ""

  // Pre-index existing files by directory for O(1) filename conflict checks
  const existingFilesByDir = new Map<string, Set<string>>()
  for (const diskPath of existingFilePaths) {
    const norm = diskPath.replace(/\\/g, "/").toLowerCase()
    const lastSlash = norm.lastIndexOf("/")
    if (lastSlash !== -1) {
      const dir = norm.substring(0, lastSlash + 1)
      const filename = norm.substring(lastSlash + 1)
      let set = existingFilesByDir.get(dir)
      if (!set) {
        set = new Set()
        existingFilesByDir.set(dir, set)
      }
      set.add(filename)
    }
  }

  // Keep track of assigned files by target directory in this execution batch
  const assignedFilesByDir = new Map<string, Set<string>>()

  for (const item of items) {
    const date = new Date(item.dateTarget)
    if (isNaN(date.getTime())) {
      continue // Skip invalid dates
    }

    const folderFragment = buildFolderPathFromPattern(
      pattern,
      date,
      (item as unknown as { camera?: string }).camera
    )

    // Check if filename conflict exists in this target folder
    const targetFolderLower = normalizedDest
      ? `${normalizedDest}/${folderFragment}`.toLowerCase()
      : folderFragment.toLowerCase()

    const existingInDir = existingFilesByDir.get(targetFolderLower)
    const assignedInDir = assignedFilesByDir.get(targetFolderLower)

    const siblingNames = new Set<string>()
    if (existingInDir) {
      for (const name of existingInDir) siblingNames.add(name)
    }
    if (assignedInDir) {
      for (const name of assignedInDir) siblingNames.add(name)
    }

    // Resolve conflict (e.g. photo.jpg -> photo_1.jpg if target file already exists)
    const finalFilename = resolveFilenameConflict(item.name, siblingNames)

    // Track assigned filename in this directory
    let assignedSet = assignedFilesByDir.get(targetFolderLower)
    if (!assignedSet) {
      assignedSet = new Set()
      assignedFilesByDir.set(targetFolderLower, assignedSet)
    }
    assignedSet.add(finalFilename.toLowerCase())

    const relativePath = `${folderFragment}${finalFilename}`
    const targetPath = normalizedDest
      ? `${normalizedDest}/${relativePath}`
      : relativePath

    const isConflict = normalizedDest
      ? existingFilePaths.has(targetPath.toLowerCase()) ||
        item.path.toLowerCase() === targetPath.toLowerCase()
      : false

    result.push({
      mediaId: item.id,
      sourcePath: item.path,
      targetPath: targetPath.replace(/\//g, "\\"), // OS matching format
      relativePath: relativePath.replace(/\//g, "\\"),
      conflict: isConflict,
      conflictReason: isConflict ? "already_exists" : undefined,
      dateTarget: item.dateTarget,
      dateTargetSource: item.dateTargetSource,
      size: item.size,
      mediaType: item.mediaType,
      thumbnailPath: item.thumbnailPath,
    })
  }

  return result
}
