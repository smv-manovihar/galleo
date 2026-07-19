import { describe, it, expect } from "vitest"
import { extractDateFromFilename } from "../filename-parser"

describe("extractDateFromFilename", () => {
  it("parses standard camera names: IMG_YYYYMMDD_HHMMSS", () => {
    const date = extractDateFromFilename("IMG_20231225_143022.jpg")
    expect(date).not.toBeNull()
    expect(date!.getFullYear()).toBe(2023)
    expect(date!.getMonth()).toBe(11) // December
    expect(date!.getDate()).toBe(25)
    expect(date!.getHours()).toBe(14)
    expect(date!.getMinutes()).toBe(30)
    expect(date!.getSeconds()).toBe(22)
  })

  it("parses pixel names: PXL_YYYYMMDD_HHMMSS000", () => {
    const date = extractDateFromFilename("PXL_20240301_090000123.jpg")
    expect(date).not.toBeNull()
    expect(date!.getFullYear()).toBe(2024)
    expect(date!.getMonth()).toBe(2) // March
    expect(date!.getDate()).toBe(1)
    expect(date!.getHours()).toBe(9)
  })

  it("parses WhatsApp format: WhatsApp Image 2024-03-15 at 10.30.45", () => {
    const date = extractDateFromFilename(
      "WhatsApp Image 2024-03-15 at 10.30.45.jpeg"
    )
    expect(date).not.toBeNull()
    expect(date!.getFullYear()).toBe(2024)
    expect(date!.getMonth()).toBe(2)
    expect(date!.getDate()).toBe(15)
    expect(date!.getHours()).toBe(10)
    expect(date!.getMinutes()).toBe(30)
  })

  it("parses Screenshot format: Screenshot_2024-01-15-10-30-45", () => {
    const date = extractDateFromFilename("Screenshot_2024-01-15-10-30-45.png")
    expect(date).not.toBeNull()
    expect(date!.getFullYear()).toBe(2024)
    expect(date!.getMonth()).toBe(0) // Jan
    expect(date!.getDate()).toBe(15)
    expect(date!.getHours()).toBe(10)
  })

  it("parses date-only compact formats: 20240315", () => {
    const date = extractDateFromFilename("backup_20240315_photo.jpg")
    expect(date).not.toBeNull()
    expect(date!.getFullYear()).toBe(2024)
    expect(date!.getMonth()).toBe(2)
    expect(date!.getDate()).toBe(15)
  })

  it("parses date-only dash formats: 2024-03-15", () => {
    const date = extractDateFromFilename("vacation-2024-03-15.jpg")
    expect(date).not.toBeNull()
    expect(date!.getFullYear()).toBe(2024)
    expect(date!.getMonth()).toBe(2)
    expect(date!.getDate()).toBe(15)
  })

  it("parses Unix timestamps in milliseconds", () => {
    // 1711368000000 corresponds to 2024-03-25T12:00:00 (UTC approx)
    const date = extractDateFromFilename("1711368000000.png")
    expect(date).not.toBeNull()
    expect(date!.getFullYear()).toBe(2024)
    expect(date!.getMonth()).toBe(2) // March
  })

  it("returns null for names without dates", () => {
    expect(extractDateFromFilename("vacation.jpg")).toBeNull()
    expect(extractDateFromFilename("image123.png")).toBeNull()
    expect(extractDateFromFilename("999999.png")).toBeNull() // too short for unix
  })

  it("rejects invalid dates (overflow check)", () => {
    expect(extractDateFromFilename("IMG_20231325_143022.jpg")).toBeNull() // Month 13
    expect(extractDateFromFilename("IMG_20231232_143022.jpg")).toBeNull() // Day 32
  })
})
