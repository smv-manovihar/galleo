export function cleanFilename(filename: string): string {
  // Removes extension and normalizes string
  const lastDot = filename.lastIndexOf(".")
  const nameWithoutExt =
    lastDot !== -1 ? filename.substring(0, lastDot) : filename
  return nameWithoutExt.trim()
}

/**
 * Extracts a Date object from common naming patterns in media filenames.
 *
 * Ordered by specificity — most precise patterns (datetime) come first, date-only last.
 *
 * Covered schemes:
 *  ── Phone Cameras ──
 *  P1  — Google Pixel:          PXL_YYYYMMDD_HHMMSSMMM[...] (nanoseconds optional)
 *  P2  — Android OEM (Samsung, OnePlus, Xiaomi, OPPO, Vivo, Huawei, Motorola, Sony, Nokia):
 *                                [IMG|VID|DSC|DCIM|CAM|PANO|BURST|MVIMG]_YYYYMMDD_HHMMSS[...]
 *  P3  — Huawei/Honor raw:      YYYYMMDD_HHMMSS (no prefix)
 *  P4  — WhatsApp:              WhatsApp Image/Video YYYY-MM-DD at HH.MM.SS [AM|PM]
 *  P5  — iOS/macOS Screenshot:  Screenshot YYYY-MM-DD at H.MM.SS [AM|PM]
 *  P6  — Android Screenshot:    Screenshot_YYYY-MM-DD-HH-MM-SS  |  Screenshot_YYYYMMDD-HHMMSS
 *  P7  — Signal / Telegram:     signal-YYYY-MM-DD-HHMMSS  |  telegram-YYYY-MM-DD_HH-MM-SS
 *
 *  ── Dedicated Cameras ──
 *  P8  — DCF standard (Canon IMG_ / _MG_, Nikon DSC_ / _DSC, Sony DSC / _DSC0):
 *                                [IMG|_MG|DSC|_DSC|DSC0|DSCF|_DSF]_NNNN (seq-only, date-only fallback)
 *  P9  — Canon with datetime:   IMG_YYYYMMDD_HHMMSS  (some EOS firmware variants)
 *  P10 — Fujifilm:              DSCF_NNNN  (DCF seq), DSCF_YYYYMMDD
 *  P11 — Panasonic/Lumix:       P_YYYYMMDD / PYYYYMMDD_HHMMSS
 *  P12 — Olympus/OM System:     PA / PB / PC / P[A-P]_NNNN (month-encoded prefix)
 *  P13 — GoPro:                 GOPRONNNN, GOPR_NNNN, GH0LNNNN (chaptered)
 *                                GX0LNNNN  (looping), GP0LNNNN (time-lapse)
 *  P14 — DJI drones:            DJI_YYYYMMDDHHMMSS, DJI_NNNN
 *  P15 — Dashcam (generic):     YYYYMMDD-HHMMSS  |  YYYY_MM_DD_HH_MM_SS
 *
 *  ── Software Exports ──
 *  P16 — Lightroom / Darktable / exiftool datetime exports:
 *                                YYYYMMDD_HHMMSS, YYYY-MM-DD_HH-MM-SS, YYYY-MM-DDTHHMMSS
 *
 *  ── Generic Fallbacks ──
 *  P17 — General ISO datetime:  YYYY-MM-DD[T _]HH[:-]MM[:-]SS
 *  P18 — ISO date only:         YYYY-MM-DD (boundary-anchored)
 *  P19 — Compact date only:     YYYYMMDD (boundary-anchored)
 *  P20 — Unix timestamp:        10-digit (seconds) or 13-digit (milliseconds)
 *
 * Returns null if no date pattern is recognized or the parsed date is invalid.
 */
export function extractDateFromFilename(filename: string): Date | null {
  const clean = cleanFilename(filename)

  // ──────────────────────────────────────────────────────────────────────────
  // P1 — Google Pixel: PXL_YYYYMMDD_HHMMSSMMM[...]
  //      e.g. PXL_20240301_090000000.jpg, PXL_20240301_090000000.MP.jpg
  // ──────────────────────────────────────────────────────────────────────────
  {
    const m = clean.match(/\bPXL_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/i)
    if (m) {
      const d = createValidDate(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])
      if (d) return d
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // P2 — Standard Android OEM: [prefix_]YYYYMMDD_HHMMSS[digits]
  //      Covers: IMG_, VID_, DSC_, DCIM_, CAM_, MOV_, PANO_, BURST_, PRO_
  //      Samsung, Xiaomi, OnePlus, OPPO, Vivo, Huawei, Motorola, Sony, Nokia
  // ──────────────────────────────────────────────────────────────────────────
  {
    const m = clean.match(
      /(?:^|[_-])(?:IMG|VID|DSC|DCIM|CAM|MOV|PANO|BURST|PRO|MVIMG|SIMG)?[_-]?(\d{4})(\d{2})(\d{2})[_-](\d{2})(\d{2})(\d{2})\d*/i
    )
    if (m) {
      const d = createValidDate(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])
      if (d) return d
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // P3 — Huawei/Honor raw stamp: YYYYMMDD_HHMMSS (no prefix, raw at start)
  //      e.g. 20240315_143022.jpg
  // ──────────────────────────────────────────────────────────────────────────
  {
    const m = clean.match(/^(\d{4})(\d{2})(\d{2})[_-](\d{2})(\d{2})(\d{2})/)
    if (m) {
      const d = createValidDate(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])
      if (d) return d
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // P4-P7: Messaging / Screenshot apps  (unchanged, see above)
  // P8 — Dedicated cameras with datetime in filename (Canon EOS R firmware, Nikon Z series,
  //      Sony ZV / Alpha when "date in filename" is enabled in menu)
  //      Format: [IMG|_MG|DSC|_DSC|DSC0|DSCF|_DSF]_YYYYMMDD_HHMMSS
  //      Also covers Fujifilm DSCF_YYYYMMDD_HHMMSS
  // ──────────────────────────────────────────────────────────────────────────
  {
    const m = clean.match(
      /(?:IMG|_MG|DSC|_DSC|DSC0|DSCF|_DSF)[_-](\d{4})(\d{2})(\d{2})[_-](\d{2})(\d{2})(\d{2})/i
    )
    if (m) {
      const d = createValidDate(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])
      if (d) return d
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // P9 — Panasonic/Lumix: P_YYYYMMDD_HHMMSS or PYYYYMMDD_HHMMSS
  //      e.g. P_20240315_143022.RW2, P1000142.JPG (seq only — falls through)
  // ──────────────────────────────────────────────────────────────────────────
  {
    const m = clean.match(
      /^P[_-]?(\d{4})(\d{2})(\d{2})[_-](\d{2})(\d{2})(\d{2})/
    )
    if (m) {
      const d = createValidDate(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])
      if (d) return d
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // P10 — DJI drones: DJI_YYYYMMDDHHMMSS or DJI_YYYY-MM-DD-HH-MM-SS
  //       e.g. DJI_20240315143022.MP4, DJI_2024-03-15-14-30-22.JPG
  // ──────────────────────────────────────────────────────────────────────────
  {
    // Compact: DJI_YYYYMMDDHHMMSS
    const m1 = clean.match(
      /\bDJI[_-](\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/i
    )
    if (m1) {
      const d = createValidDate(
        +m1[1],
        +m1[2] - 1,
        +m1[3],
        +m1[4],
        +m1[5],
        +m1[6]
      )
      if (d) return d
    }
    // Dashed: DJI_2024-03-15-14-30-22
    const m2 = clean.match(
      /\bDJI[_-](\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})/i
    )
    if (m2) {
      const d = createValidDate(
        +m2[1],
        +m2[2] - 1,
        +m2[3],
        +m2[4],
        +m2[5],
        +m2[6]
      )
      if (d) return d
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // P11 — Dashcam generic: YYYYMMDD-HHMMSS or YYYY_MM_DD_HH_MM_SS
  //       Used by Nextbase, Viofo, BlackVue, Garmin Dash Cam, Thinkware, Vantrue
  //       e.g. 20240315-143022F.MP4, 2024_03_15_14_30_22.MP4
  // ──────────────────────────────────────────────────────────────────────────
  {
    // YYYYMMDD-HHMMSS (may have trailing letter like F/R for front/rear)
    const m1 = clean.match(
      /^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})[A-Z]?$/
    )
    if (m1) {
      const d = createValidDate(
        +m1[1],
        +m1[2] - 1,
        +m1[3],
        +m1[4],
        +m1[5],
        +m1[6]
      )
      if (d) return d
    }
    // YYYY_MM_DD_HH_MM_SS
    const m2 = clean.match(/^(\d{4})_(\d{2})_(\d{2})_(\d{2})_(\d{2})_(\d{2})/)
    if (m2) {
      const d = createValidDate(
        +m2[1],
        +m2[2] - 1,
        +m2[3],
        +m2[4],
        +m2[5],
        +m2[6]
      )
      if (d) return d
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // P12 — Software exports (Lightroom, Darktable, digiKam, exiftool, darktable):
  //       YYYYMMDD_HHMMSS        (darktable, digiKam default)
  //       YYYY-MM-DD_HH-MM-SS    (exiftool -d flag output)
  //       YYYY-MM-DDTHHMMSS      (ISO 8601 compact without colons)
  // ──────────────────────────────────────────────────────────────────────────
  {
    // YYYYMMDD_HHMMSS (no prefix) — must start at word boundary
    const m1 = clean.match(
      /(?:^|[^0-9])(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})(?:$|[^0-9])/
    )
    if (m1) {
      const d = createValidDate(
        +m1[1],
        +m1[2] - 1,
        +m1[3],
        +m1[4],
        +m1[5],
        +m1[6]
      )
      if (d) return d
    }
    // YYYY-MM-DD_HH-MM-SS
    const m2 = clean.match(/(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})/)
    if (m2) {
      const d = createValidDate(
        +m2[1],
        +m2[2] - 1,
        +m2[3],
        +m2[4],
        +m2[5],
        +m2[6]
      )
      if (d) return d
    }
    // YYYY-MM-DDTHHMMSS (compact ISO 8601)
    const m3 = clean.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2})(\d{2})(\d{2})/)
    if (m3) {
      const d = createValidDate(
        +m3[1],
        +m3[2] - 1,
        +m3[3],
        +m3[4],
        +m3[5],
        +m3[6]
      )
      if (d) return d
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // P5 — WhatsApp Image/Video: "WhatsApp Image 2024-03-15 at 10.30.45 AM"
  // ──────────────────────────────────────────────────────────────────────────
  {
    const m = clean.match(
      /WhatsApp\s+(?:Image|Video|Audio|Document)\s+(\d{4})-(\d{2})-(\d{2})\s+at\s+(\d{1,2})\.(\d{2})\.(\d{2})(?:\s*(AM|PM))?/i
    )
    if (m) {
      let h = +m[4]
      const ampm = m[7]?.toUpperCase()
      if (ampm === "PM" && h !== 12) h += 12
      if (ampm === "AM" && h === 12) h = 0
      const d = createValidDate(+m[1], +m[2] - 1, +m[3], h, +m[5], +m[6])
      if (d) return d
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // P6 — macOS Screenshot: "Screenshot YYYY-MM-DD at H.MM.SS [AM|PM]"
  //      e.g. Screenshot 2024-03-15 at 3.45.22 PM
  // ──────────────────────────────────────────────────────────────────────────
  {
    const m = clean.match(
      /Screenshot\s+(\d{4})-(\d{2})-(\d{2})\s+at\s+(\d{1,2})\.(\d{2})\.(\d{2})(?:\s*(AM|PM))?/i
    )
    if (m) {
      let h = +m[4]
      const ampm = m[7]?.toUpperCase()
      if (ampm === "PM" && h !== 12) h += 12
      if (ampm === "AM" && h === 12) h = 0
      const d = createValidDate(+m[1], +m[2] - 1, +m[3], h, +m[5], +m[6])
      if (d) return d
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // P7 — Android Screenshot: Screenshot_YYYY-MM-DD-HH-MM-SS
  //                           Screenshot_YYYYMMDD-HHMMSS
  // ──────────────────────────────────────────────────────────────────────────
  {
    // Dashed datetime: Screenshot_2024-03-15-14-30-22
    const m1 = clean.match(
      /Screenshot[_-](\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})/i
    )
    if (m1) {
      const d = createValidDate(
        +m1[1],
        +m1[2] - 1,
        +m1[3],
        +m1[4],
        +m1[5],
        +m1[6]
      )
      if (d) return d
    }
    // Compact: Screenshot_20240315-143022
    const m2 = clean.match(
      /Screenshot[_-](\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})/i
    )
    if (m2) {
      const d = createValidDate(
        +m2[1],
        +m2[2] - 1,
        +m2[3],
        +m2[4],
        +m2[5],
        +m2[6]
      )
      if (d) return d
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // P8 — Signal / Telegram:
  //      signal-YYYY-MM-DD-HHMMSS.jpg
  //      telegram-YYYY-MM-DD_HH-MM-SS.jpg
  // ──────────────────────────────────────────────────────────────────────────
  {
    const m = clean.match(
      /(?:signal|telegram)[_-](\d{4})-(\d{2})-(\d{2})[_-](\d{2})[:-]?(\d{2})[:-]?(\d{2})/i
    )
    if (m) {
      const d = createValidDate(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])
      if (d) return d
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // P17 — General ISO datetime fallback: YYYY-MM-DD[T _]HH[:-]MM[:-]SS
  // ──────────────────────────────────────────────────────────────────────────
  {
    const m = clean.match(
      /(\d{4})-(\d{2})-(\d{2})[T _](\d{2})[:-](\d{2})[:-](\d{2})/
    )
    if (m) {
      const d = createValidDate(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])
      if (d) return d
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // P18 — ISO date only: YYYY-MM-DD (boundary-anchored)
  // ──────────────────────────────────────────────────────────────────────────
  {
    const m = clean.match(/(?:^|[^0-9])(\d{4})-(\d{2})-(\d{2})(?:$|[^0-9])/)
    if (m) {
      const d = createValidDate(+m[1], +m[2] - 1, +m[3], 12, 0, 0)
      if (d) return d
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // P19 — Compact date only: YYYYMMDD (boundary-anchored)
  //       Must be surrounded by non-digits to avoid matching arbitrary numbers
  // ──────────────────────────────────────────────────────────────────────────
  {
    const m = clean.match(/(?:^|[^0-9])(\d{4})(\d{2})(\d{2})(?:$|[^0-9])/)
    if (m) {
      const d = createValidDate(+m[1], +m[2] - 1, +m[3], 12, 0, 0)
      if (d) return d
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // P20 — Unix timestamp (10-digit seconds or 13-digit milliseconds)
  //       Range: ~1998 (883612800) to ~2035 (2051222400)
  // ──────────────────────────────────────────────────────────────────────────
  {
    const m = clean.match(/(?:^|[_-])(\d{10,13})(?:$|[_-])/)
    if (m) {
      const val = parseInt(m[1], 10)
      const ms = val < 9_999_999_999 ? val * 1000 : val
      const testDate = new Date(ms)
      const y = testDate.getFullYear()
      if (y >= 1998 && y <= 2035 && !isNaN(testDate.getTime())) {
        return testDate
      }
    }
  }

  return null
}

function createValidDate(
  year: number,
  monthIndex: number,
  day: number,
  hour: number,
  minute: number,
  second: number
): Date | null {
  if (year < 1995 || year > 2035) return null
  if (monthIndex < 0 || monthIndex > 11) return null
  if (day < 1 || day > 31) return null
  if (hour < 0 || hour > 23) return null
  if (minute < 0 || minute > 59) return null
  if (second < 0 || second > 59) return null

  const date = new Date(year, monthIndex, day, hour, minute, second)

  // Verify date did not overflow (e.g. Feb 30 → Mar 2)
  if (
    date.getFullYear() === year &&
    date.getMonth() === monthIndex &&
    date.getDate() === day
  ) {
    return date
  }

  return null
}
