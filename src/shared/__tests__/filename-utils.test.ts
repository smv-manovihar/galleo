import { describe, it, expect } from "vitest"
import { getNormalizedFilenameBase } from "../filename-utils"

describe("getNormalizedFilenameBase", () => {
  it("preserves 4-digit camera sequence numbers in DCF and standard camera formats", () => {
    expect(getNormalizedFilenameBase("DSC_0001.jpg")).toBe("0001")
    expect(getNormalizedFilenameBase("IMG_1024.jpg")).toBe("1024")
    expect(getNormalizedFilenameBase("DSC01234.JPG")).toBe("01234")
    expect(getNormalizedFilenameBase("PXL_20240315_001.jpg")).toBe("20240315_001")
  })

  it("strips true duplicate copy suffixes", () => {
    expect(getNormalizedFilenameBase("photo (1).jpg")).toBe("photo")
    expect(getNormalizedFilenameBase("photo - Copy.jpg")).toBe("photo")
    expect(getNormalizedFilenameBase("photo - Copy (2).jpg")).toBe("photo")
    expect(getNormalizedFilenameBase("photo_1.jpg")).toBe("photo")
    expect(getNormalizedFilenameBase("photo_02.jpg")).toBe("photo")
  })

  it("does not normalize names down to empty strings", () => {
    expect(getNormalizedFilenameBase("DSC.jpg")).toBe("dsc")
    expect(getNormalizedFilenameBase("img.png")).toBe("img")
  })
})
