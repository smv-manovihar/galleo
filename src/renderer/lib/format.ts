/**
 * Formats a size in bytes into a human readable string (e.g. "1.2 MB").
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Formats an ISO date string into a user-friendly format (e.g., "March 15, 2024").
 */
export function formatDate(isoString: string | undefined): string {
  if (!isoString) return 'Unknown Date';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return 'Unknown Date';
  
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Formats an ISO date string into a short layout (e.g., "2024-03-15").
 */
export function formatShortDate(isoString: string | undefined): string {
  if (!isoString) return 'Unknown Date';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return 'Unknown Date';
  
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  
  return `${y}-${m}-${d}`;
}
