/**
 * Formats a size in bytes into a human readable string (e.g. "1.2 MB").
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
}

/**
 * Parses a date string safely, supporting ISO formats, EXIF format ("YYYY:MM:DD HH:MM:SS"),
 * and standard date formats.
 */
export function parseDate(dateStr: string | undefined | null): Date | null {
  if (!dateStr) return null
  const cleaned = dateStr.trim()
  if (!cleaned) return null

  // 1. Match EXIF format: YYYY:MM:DD (with optional time / subseconds / timezone)
  const exifMatch = cleaned.match(
    /^(\d{4}):(\d{2}):(\d{2})(?:[\sT](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(?:Z|([+-]\d{2}:?\d{2}))?)?$/
  )
  if (exifMatch) {
    const [, year, month, day, hour = "0", minute = "0", second = "0"] = exifMatch
    const y = parseInt(year, 10)
    const m = parseInt(month, 10) - 1
    const d = parseInt(day, 10)
    const h = parseInt(hour, 10)
    const min = parseInt(minute, 10)
    const s = parseInt(second, 10)

    if (
      y >= 1970 &&
      y <= 2099 &&
      m >= 0 &&
      m <= 11 &&
      d >= 1 &&
      d <= 31 &&
      h >= 0 &&
      h <= 23 &&
      min >= 0 &&
      min <= 59 &&
      s >= 0 &&
      s <= 59
    ) {
      const date = new Date(y, m, d, h, min, s)
      if (
        date.getFullYear() === y &&
        date.getMonth() === m &&
        date.getDate() === d
      ) {
        return date
      }
    }
    return null
  }

  // 2. Standard ISO / Date constructor
  const standardDate = new Date(cleaned)
  if (!isNaN(standardDate.getTime())) {
    const y = standardDate.getFullYear()
    if (y >= 1970 && y <= 2099) {
      return standardDate
    }
  }

  return null
}

/**
 * Formats an ISO or EXIF date string into a user-friendly format (e.g., "March 15, 2024").
 */
export function formatDate(isoString: string | undefined): string {
  const date = parseDate(isoString)
  if (!date) return "Unknown Date"

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

/**
 * Formats an ISO or EXIF date string into a short layout (e.g., "2024-03-15").
 */
export function formatShortDate(isoString: string | undefined): string {
  const date = parseDate(isoString)
  if (!date) return "Unknown Date"

  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")

  return `${y}-${m}-${d}`
}
