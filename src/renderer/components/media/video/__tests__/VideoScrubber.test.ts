import { describe, it, expect } from "vitest"
import { formatTime } from "../video-constants"

describe("VideoScrubber hover & preview calculations", () => {
  it("calculates accurate hover seek time from pointer position", () => {
    const duration = 120 // 2 minutes
    const containerWidth = 600

    const getHoverTime = (clientX: number, left: number, width: number) => {
      const rawX = clientX - left
      const clampedX = Math.max(0, Math.min(width, rawX))
      const ratio = clampedX / (width || 1)
      return Math.max(0, Math.min(duration, ratio * duration))
    }

    expect(getHoverTime(0, 0, containerWidth)).toBe(0)
    expect(getHoverTime(300, 0, containerWidth)).toBe(60)
    expect(getHoverTime(600, 0, containerWidth)).toBe(120)
    expect(getHoverTime(-50, 0, containerWidth)).toBe(0)
    expect(getHoverTime(700, 0, containerWidth)).toBe(120)
  })

  it("clamps tooltip horizontal position to prevent viewport clipping", () => {
    const containerWidth = 400
    const tooltipWidth = 176
    const halfWidth = tooltipWidth / 2
    const margin = 8
    const minCenter = halfWidth + margin
    const maxCenter = Math.max(minCenter, containerWidth - halfWidth - margin)

    const getClampedX = (xPos: number) => Math.max(minCenter, Math.min(maxCenter, xPos))

    // Far left hover
    expect(getClampedX(10)).toBe(minCenter) // 96px
    // Center hover
    expect(getClampedX(200)).toBe(200)
    // Far right hover
    expect(getClampedX(390)).toBe(maxCenter) // 304px
  })

  it("formats preview timestamps cleanly", () => {
    expect(formatTime(0)).toBe("0:00")
    expect(formatTime(65)).toBe("1:05")
    expect(formatTime(3599)).toBe("59:59")
    expect(formatTime(NaN)).toBe("0:00")
  })

  it("ensures pointer seek calculations are 1:1 consistent across container bounds", () => {
    const duration = 180
    const rect = { left: 100, width: 500 }

    const computeSeek = (clientX: number) => {
      const rawX = clientX - rect.left
      const clampedX = Math.max(0, Math.min(rect.width, rawX))
      const ratio = clampedX / (rect.width || 1)
      return { ratio, time: ratio * duration }
    }

    expect(computeSeek(100)).toEqual({ ratio: 0, time: 0 })
    expect(computeSeek(350)).toEqual({ ratio: 0.5, time: 90 })
    expect(computeSeek(600)).toEqual({ ratio: 1, time: 180 })
  })
})
