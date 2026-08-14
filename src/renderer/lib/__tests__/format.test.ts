import { describe, it, expect } from "vitest"
import { parseDate, formatDate, formatShortDate, formatBytes } from "../format"

describe("format.ts", () => {
  describe("parseDate", () => {
    it("parses ISO date strings", () => {
      const d = parseDate("2023-10-13T14:30:00.000Z")
      expect(d).not.toBeNull()
      expect(d!.getUTCFullYear()).toBe(2023)
      expect(d!.getUTCMonth()).toBe(9) // October
      expect(d!.getUTCDate()).toBe(13)
    })

    it("parses EXIF formatted date strings: YYYY:MM:DD HH:MM:SS", () => {
      const d = parseDate("2023:10:13 14:30:00")
      expect(d).not.toBeNull()
      expect(d!.getFullYear()).toBe(2023)
      expect(d!.getMonth()).toBe(9)
      expect(d!.getDate()).toBe(13)
      expect(d!.getHours()).toBe(14)
      expect(d!.getMinutes()).toBe(30)
    })

    it("parses EXIF date-only strings: YYYY:MM:DD", () => {
      const d = parseDate("2023:10:13")
      expect(d).not.toBeNull()
      expect(d!.getFullYear()).toBe(2023)
      expect(d!.getMonth()).toBe(9)
      expect(d!.getDate()).toBe(13)
    })

    it("returns null for invalid or empty dates", () => {
      expect(parseDate(undefined)).toBeNull()
      expect(parseDate(null)).toBeNull()
      expect(parseDate("")).toBeNull()
      expect(parseDate("invalid date string")).toBeNull()
      expect(parseDate("0000:00:00 00:00:00")).toBeNull()
    })
  })

  describe("formatDate", () => {
    it("formats standard ISO string into readable date", () => {
      const formatted = formatDate("2023-10-13T12:00:00.000Z")
      expect(formatted).toContain("October")
      expect(formatted).toContain("2023")
    })

    it("formats EXIF colon-separated date string into readable date", () => {
      const formatted = formatDate("2023:10:13 14:30:00")
      expect(formatted).toContain("October")
      expect(formatted).toContain("13")
      expect(formatted).toContain("2023")
    })

    it("returns 'Unknown Date' for invalid date strings", () => {
      expect(formatDate(undefined)).toBe("Unknown Date")
      expect(formatDate("")).toBe("Unknown Date")
      expect(formatDate("invalid-date")).toBe("Unknown Date")
    })
  })

  describe("formatShortDate", () => {
    it("formats ISO date string into YYYY-MM-DD", () => {
      const date = new Date(2023, 9, 13) // local date
      const iso = date.toISOString()
      const formatted = formatShortDate(iso)
      expect(formatted).toBe("2023-10-13")
    })

    it("formats EXIF date string into YYYY-MM-DD", () => {
      const formatted = formatShortDate("2023:10:13 14:30:00")
      expect(formatted).toBe("2023-10-13")
    })

    it("returns 'Unknown Date' for invalid date strings", () => {
      expect(formatShortDate(undefined)).toBe("Unknown Date")
      expect(formatShortDate("")).toBe("Unknown Date")
    })
  })

  describe("formatBytes", () => {
    it("formats 0 bytes", () => {
      expect(formatBytes(0)).toBe("0 Bytes")
    })

    it("formats kilobytes and megabytes", () => {
      expect(formatBytes(1024)).toBe("1 KB")
      expect(formatBytes(1024 * 1024 * 4.04)).toBe("4.04 MB")
    })
  })
})
