import { describe, it, expect } from "vitest"
import { evaluateQuality, isScreenshotByName } from "../quality-scoring"

describe("isScreenshotByName", () => {
  it("correctly flags screenshot names", () => {
    expect(isScreenshotByName("Screenshot_2024.png")).toBe(true)
    expect(isScreenshotByName("screenshot.jpg")).toBe(true)
    expect(isScreenshotByName("SS_2024.png")).toBe(true)
    expect(isScreenshotByName("Screen_Shot_file.png")).toBe(true)
    expect(isScreenshotByName("photo.jpg")).toBe(false)
  })
})

describe("evaluateQuality", () => {
  const thresholds = {
    blurThreshold: 30,
    darknessThreshold: 40,
    screenshotDetection: true,
    minResolution: 300 * 300, // 90000 px
  }

  it("computes 100 score for perfect sharp bright images", () => {
    const res = evaluateQuality({
      blurScore: 80,
      brightness: 120,
      width: 1920,
      height: 1080,
      size: 500000,
      filename: "family.jpg",
      thresholds,
    })
    expect(res.compositeScore).toBe(100)
    expect(res.isBlurry).toBe(false)
    expect(res.isDark).toBe(false)
    expect(res.isScreenshot).toBe(false)
    expect(res.isSmall).toBe(false)
  })

  it("penalizes blurriness below threshold", () => {
    const res = evaluateQuality({
      blurScore: 15, // threshold is 30
      brightness: 120,
      width: 1920,
      height: 1080,
      size: 500000,
      filename: "blurry.jpg",
      thresholds,
    })
    expect(res.isBlurry).toBe(true)
    expect(res.compositeScore).toBeLessThan(80) // baseline penalty + proportional penalty
  })

  it("penalizes darkness below threshold", () => {
    const res = evaluateQuality({
      blurScore: 80,
      brightness: 20, // threshold is 40
      width: 1920,
      height: 1080,
      size: 500000,
      filename: "dark.jpg",
      thresholds,
    })
    expect(res.isDark).toBe(true)
    expect(res.compositeScore).toBeLessThan(85)
  })

  it("does not penalize low average brightness if peak brightness and contrast are high (e.g. black graphics, night lighting)", () => {
    const res = evaluateQuality({
      blurScore: 80,
      brightness: 20, // below threshold 40
      peakBrightness: 180, // high peak
      contrast: 160, // high contrast
      width: 1920,
      height: 1080,
      size: 500000,
      filename: "graphic.png",
      thresholds,
    })
    expect(res.isDark).toBe(false)
    expect(res.compositeScore).toBe(100) // no penalty
  })

  it("penalizes small files and low resolutions", () => {
    const res = evaluateQuality({
      blurScore: 80,
      brightness: 120,
      width: 100, // resolution: 10000 < 90000
      height: 100,
      size: 500000,
      filename: "tiny.jpg",
      thresholds,
    })
    expect(res.isSmall).toBe(true)
    expect(res.compositeScore).toBe(80) // -20 penalty
  })

  it("applies screenshot penalty", () => {
    const res = evaluateQuality({
      blurScore: 80,
      brightness: 120,
      width: 1080,
      height: 2400,
      size: 500000,
      filename: "Screenshot_2024-03.png",
      thresholds,
    })
    expect(res.isScreenshot).toBe(true)
    expect(res.compositeScore).toBe(85) // -15 penalty
  })

  it("aggregates multiple penalties, capping at 0", () => {
    const res = evaluateQuality({
      blurScore: 2, // severely blurry
      brightness: 5, // severely dark
      width: 100, // small res
      height: 100,
      size: 200, // small size
      filename: "Screenshot_blurry_dark.png", // screenshot
      thresholds,
    })
    expect(res.compositeScore).toBe(0)
  })
})
