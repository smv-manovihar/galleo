import { extractDateFromFilename } from "./filename-parser"

export interface DateResolution {
  targetDate: string // ISO String
  source: "exif" | "filename" | "filesystem"
}

/**
 * Normalizes EXIF string date representations into standard ISO strings.
 * EXIF dates are typically formatted as: "YYYY:MM:DD HH:MM:SS"
 */
export function parseExifDate(
  exifDateStr: string | undefined | null
): Date | null {
  if (!exifDateStr) return null

  const cleaned = exifDateStr.trim()

  // 1. Check EXIF colon format: YYYY:MM:DD HH:MM:SS
  const exifRegex = /^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/
  const match = cleaned.match(exifRegex)

  if (match) {
    const [_, year, month, day, hour, minute, second] = match
    const y = parseInt(year, 10)
    const m = parseInt(month, 10) - 1
    const d = parseInt(day, 10)
    const h = parseInt(hour, 10)
    const min = parseInt(minute, 10)
    const s = parseInt(second, 10)

    if (
      y >= 1995 &&
      y <= 2035 &&
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

  // 2. Try standard Date constructor, but validate year is within a reasonable range and not NaN
  const standardDate = new Date(cleaned)
  if (!isNaN(standardDate.getTime())) {
    const y = standardDate.getFullYear()
    // Prevent parsing generic numbers/junk as valid standard dates
    if (y >= 1995 && y <= 2035) {
      return standardDate
    }
  }

  return null
}

/**
 * Resolves the final target date using a fallback chain: EXIF -> Inferred Filename -> Filesystem.
 */
export function resolveTargetDate(params: {
  exifDateOriginal?: string | null
  filename: string
  fsBirthTime?: string | null
  fsMTime?: string | null
}): DateResolution {
  // 1. Check EXIF date original
  const exifDate = parseExifDate(params.exifDateOriginal)
  if (exifDate) {
    return {
      targetDate: exifDate.toISOString(),
      source: "exif",
    }
  }

  // 2. Check filename date
  const filenameDate = extractDateFromFilename(params.filename)
  if (filenameDate) {
    return {
      targetDate: filenameDate.toISOString(),
      source: "filename",
    }
  }

  // 3. Fallback to filesystem birth time (creation)
  if (params.fsBirthTime) {
    const birthDate = new Date(params.fsBirthTime)
    if (!isNaN(birthDate.getTime())) {
      // Validate it's a reasonable date (e.g. not Jan 1 1970)
      if (birthDate.getFullYear() > 1980) {
        return {
          targetDate: birthDate.toISOString(),
          source: "filesystem",
        }
      }
    }
  }

  // 4. Fallback to filesystem modified time (mtime)
  if (params.fsMTime) {
    const mDate = new Date(params.fsMTime)
    if (!isNaN(mDate.getTime())) {
      return {
        targetDate: mDate.toISOString(),
        source: "filesystem",
      }
    }
  }

  // 5. Hard fallback to now
  return {
    targetDate: new Date().toISOString(),
    source: "filesystem",
  }
}
