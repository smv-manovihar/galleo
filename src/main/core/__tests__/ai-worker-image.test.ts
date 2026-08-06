import { describe, it, expect } from "vitest"
import fs from "fs"
import path from "path"

describe("AI Worker Image Loading", () => {
  it("can read image buffer via RawImage.read(Blob)", async () => {
    const { RawImage } = await import("@huggingface/transformers")
    const thumbnailDir = path.join(process.cwd(), ".data", "thumbnails")

    if (!fs.existsSync(thumbnailDir)) {
      console.log("No thumbnail dir found, skipping test")
      return
    }

    const files = fs.readdirSync(thumbnailDir).filter((f) => f.endsWith(".webp"))
    if (files.length === 0) {
      console.log("No webp thumbnails found, skipping test")
      return
    }

    const testFile = path.join(thumbnailDir, files[0])
    const fileBuf = fs.readFileSync(testFile)
    const image = await RawImage.read(new Blob([fileBuf]))

    expect(image).toBeDefined()
    expect(image.width).toBeGreaterThan(0)
    expect(image.height).toBeGreaterThan(0)
    expect(image.channels).toBeGreaterThanOrEqual(1)
  })
})
