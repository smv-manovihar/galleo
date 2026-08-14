import { describe, it, expect } from "vitest"
import { formatTime, PLAYBACK_SPEEDS } from "../video-constants"

describe("video-constants", () => {
  describe("formatTime", () => {
    it("formats 0 seconds as 0:00", () => {
      expect(formatTime(0)).toBe("0:00")
    })

    it("formats under a minute properly with leading zero", () => {
      expect(formatTime(5)).toBe("0:05")
      expect(formatTime(45)).toBe("0:45")
    })

    it("formats minutes and seconds accurately", () => {
      expect(formatTime(65)).toBe("1:05")
      expect(formatTime(600)).toBe("10:00")
      expect(formatTime(3599)).toBe("59:59")
    })

    it("handles invalid or non-finite numbers safely", () => {
      expect(formatTime(NaN)).toBe("0:00")
      expect(formatTime(Infinity)).toBe("0:00")
      expect(formatTime(-Infinity)).toBe("0:00")
    })
  })

  describe("PLAYBACK_SPEEDS", () => {
    it("includes standard 1x playback speed", () => {
      expect(PLAYBACK_SPEEDS).toContain(1)
    })

    it("is sorted in ascending order", () => {
      for (let i = 0; i < PLAYBACK_SPEEDS.length - 1; i++) {
        expect(PLAYBACK_SPEEDS[i]).toBeLessThan(PLAYBACK_SPEEDS[i + 1])
      }
    })
  })
})
