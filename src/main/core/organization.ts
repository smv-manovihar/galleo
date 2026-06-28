import type { OrganizePreviewItem } from '../../shared/types/ipc';
import type { MediaItem } from '../../shared/types/media';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Builds the folder structure fragment based on a pattern and target date.
 * Supported tokens: YYYY (year), MM (2-digit month), MMMM (full month name), DD (2-digit day)
 */
export function buildFolderPathFromPattern(pattern: string, date: Date): string {
  const year = date.getFullYear().toString();
  const monthVal = date.getMonth() + 1;
  const MM = monthVal.toString().padStart(2, '0');
  const MMMM = MONTH_NAMES[date.getMonth()];
  const DD = date.getDate().toString().padStart(2, '0');

  let result = pattern
    .replace(/YYYY/g, year)
    .replace(/MMMM/g, MMMM)
    .replace(/MM/g, MM)
    .replace(/DD/g, DD);

  // Normalize path separators (ensure forward/backward slashes match OS standard later)
  result = result.replace(/\\/g, '/');
  if (!result.endsWith('/')) {
    result += '/';
  }
  
  // Clean up any double slashes
  result = result.replace(/\/+/g, '/');
  
  return result;
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
    return originalName;
  }

  const dotIndex = originalName.lastIndexOf('.');
  const base = dotIndex !== -1 ? originalName.substring(0, dotIndex) : originalName;
  const ext = dotIndex !== -1 ? originalName.substring(dotIndex) : '';

  let counter = 1;
  let newName = `${base}_${counter}${ext}`;
  while (existingNames.has(newName.toLowerCase())) {
    counter++;
    newName = `${base}_${counter}${ext}`;
  }

  return newName;
}

/**
 * Computes target destinations for a set of media items during a dry run organization phase.
 * Resolves naming conflicts among planned items and existing files.
 */
export function planOrganization(params: {
  items: MediaItem[];
  destinationDir: string;
  pattern: string;
  // A set of lowercase file paths that already exist on disk in the destination directory,
  // to avoid overwriting existing files.
  existingFilePaths: Set<string>;
}): OrganizePreviewItem[] {
  const { items, destinationDir, pattern, existingFilePaths } = params;
  const result: OrganizePreviewItem[] = [];
  
  // Normalize destinationDir
  const normalizedDest = destinationDir.replace(/\\/g, '/').replace(/\/$/, '');

  // Keep track of target paths we have already assigned in THIS execution batch
  // to avoid internal conflicts.
  const assignedLowerPaths = new Set<string>();

  for (const item of items) {
    const date = new Date(item.dateTarget);
    if (isNaN(date.getTime())) {
      continue; // Skip invalid dates
    }

    const folderFragment = buildFolderPathFromPattern(pattern, date);
    
    // Check if filename conflict exists
    // Find all files already allocated in the target subfolder
    // Combine existing files on disk + files we just planned for this subfolder
    const targetFolderLower = `${normalizedDest}/${folderFragment}`.toLowerCase();
    
    // We collect files that map to this folder
    const siblingNames = new Set<string>();
    
    // 1. Scan existing file paths on disk for matches in this subfolder
    for (const diskPath of existingFilePaths) {
      const normalizedDiskPath = diskPath.replace(/\\/g, '/');
      if (normalizedDiskPath.toLowerCase().startsWith(targetFolderLower)) {
        const name = normalizedDiskPath.substring(targetFolderLower.length);
        if (name && !name.includes('/')) {
          siblingNames.add(name.toLowerCase());
        }
      }
    }

    // 2. Scan already assigned paths in this dry-run
    for (const assignedPath of assignedLowerPaths) {
      if (assignedPath.startsWith(targetFolderLower)) {
        const name = assignedPath.substring(targetFolderLower.length);
        if (name && !name.includes('/')) {
          siblingNames.add(name.toLowerCase());
        }
      }
    }

    // Resolve conflict
    const finalFilename = resolveFilenameConflict(item.name, siblingNames);
    const relativePath = `${folderFragment}${finalFilename}`;
    const targetPath = `${normalizedDest}/${relativePath}`;

    assignedLowerPaths.add(targetPath.toLowerCase());

    const isConflict = 
      existingFilePaths.has(targetPath.toLowerCase()) || 
      item.path.toLowerCase() === targetPath.toLowerCase();

    result.push({
      mediaId: item.id,
      sourcePath: item.path,
      targetPath: targetPath.replace(/\//g, '\\'), // OS matching format
      relativePath: relativePath.replace(/\//g, '\\'),
      conflict: isConflict,
      conflictReason: isConflict ? 'already_exists' : undefined
    });
  }

  return result;
}
