export function cleanFilename(filename: string): string {
  // Removes extension and normalizes string
  const lastDot = filename.lastIndexOf('.');
  const nameWithoutExt = lastDot !== -1 ? filename.substring(0, lastDot) : filename;
  return nameWithoutExt.trim();
}

/**
 * Extracts a Date object from common naming patterns in media filenames.
 * Returns null if no date pattern is recognized or if the parsed date is invalid.
 */
export function extractDateFromFilename(filename: string): Date | null {
  const clean = cleanFilename(filename);

  // 1. Matches formats like: IMG_20231225_143022, PXL_20240301_090000000, VID_20231225_143022
  // Format: YYYYMMDD_HHMMSS (or optionally trailing nanoseconds/digits)
  const pattern1 = /(?:IMG|PXL|VID|DSC)?_?(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})(?:\d+)?/i;
  const match1 = clean.match(pattern1);
  if (match1) {
    const [_, year, month, day, hour, minute, second] = match1;
    return createValidDate(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      parseInt(hour, 10),
      parseInt(minute, 10),
      parseInt(second, 10)
    );
  }

  // 2. Matches WhatsApp formats: WhatsApp Image 2024-03-15 at 10.30.45
  // Format: YYYY-MM-DD at HH.MM.SS
  const patternWhatsApp = /(?:WhatsApp [a-zA-Z ]*)?(\d{4})-(\d{2})-(\d{2}) at (\d{2})\.(\d{2})\.(\d{2})/i;
  const matchWA = clean.match(patternWhatsApp);
  if (matchWA) {
    const [_, year, month, day, hour, minute, second] = matchWA;
    return createValidDate(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      parseInt(hour, 10),
      parseInt(minute, 10),
      parseInt(second, 10)
    );
  }

  // 3. Matches format: Screenshot_2024-01-15-10-30-45 or Screenshot_20240115-103045
  // Format: YYYY-MM-DD-HH-MM-SS
  const patternScreenshot = /Screenshot_(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})/i;
  const matchScreenshot = clean.match(patternScreenshot);
  if (matchScreenshot) {
    const [_, year, month, day, hour, minute, second] = matchScreenshot;
    return createValidDate(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      parseInt(hour, 10),
      parseInt(minute, 10),
      parseInt(second, 10)
    );
  }

  // 4. Matches simple dash/underscore formats: 2023-12-25_14-30-22 or 2023-12-25 14.30.22
  const patternGeneral = /(\d{4})-(\d{2})-(\d{2})[ _](\d{2})[.-](\d{2})[.-](\d{2})/;
  const matchGeneral = clean.match(patternGeneral);
  if (matchGeneral) {
    const [_, year, month, day, hour, minute, second] = matchGeneral;
    return createValidDate(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      parseInt(hour, 10),
      parseInt(minute, 10),
      parseInt(second, 10)
    );
  }

  // 5. Matches YYYYMMDD without time (e.g. 20240315 or DSC_20240315)
  // Check that it's surrounded by non-digits to avoid matching arbitrary numbers
  const patternDateOnlyCompact = /(?:\b|[_-])(\d{4})(\d{2})(\d{2})(?:\b|[_-])/;
  const matchDOC = clean.match(patternDateOnlyCompact);
  if (matchDOC) {
    const [_, year, month, day] = matchDOC;
    const d = createValidDate(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      12, // Default to noon for date-only parses
      0,
      0
    );
    if (d) return d;
  }

  // 6. Matches YYYY-MM-DD without time (e.g. 2024-03-15)
  const patternDateOnlyDash = /(?:\b|[_-])(\d{4})-(\d{2})-(\d{2})(?:\b|[_-])/;
  const matchDOD = clean.match(patternDateOnlyDash);
  if (matchDOD) {
    const [_, year, month, day] = matchDOD;
    const d = createValidDate(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      12, // Default to noon
      0,
      0
    );
    if (d) return d;
  }

  // 7. Unix timestamp detection (10 digits for seconds, 13 digits for ms)
  // Matches a range from 1998 (approx 883612800) to 2035 (approx 2051222400)
  const matchUnix = clean.match(/(?:\b|[_-])(\d{10,13})(?:\b|[_-])/);
  if (matchUnix) {
    const val = parseInt(matchUnix[1], 10);
    const msValue = val < 9999999999 ? val * 1000 : val;
    const testDate = new Date(msValue);
    const year = testDate.getFullYear();
    // Validate that year is reasonable
    if (year >= 1998 && year <= 2035 && !isNaN(testDate.getTime())) {
      return testDate;
    }
  }

  return null;
}

function createValidDate(
  year: number,
  monthIndex: number,
  day: number,
  hour: number,
  minute: number,
  second: number
): Date | null {
  // Basic range validation to filter out junk matches (e.g. 9999-99-99)
  if (year < 1995 || year > 2035) return null;
  if (monthIndex < 0 || monthIndex > 11) return null;
  if (day < 1 || day > 31) return null;
  if (hour < 0 || hour > 23) return null;
  if (minute < 0 || minute > 59) return null;
  if (second < 0 || second > 59) return null;

  const date = new Date(year, monthIndex, day, hour, minute, second);
  
  // Verify date parameters actually map to values (prevents Date overflow conversion e.g. Feb 30 -> Mar 2)
  if (
    date.getFullYear() === year &&
    date.getMonth() === monthIndex &&
    date.getDate() === day
  ) {
    return date;
  }
  
  return null;
}
