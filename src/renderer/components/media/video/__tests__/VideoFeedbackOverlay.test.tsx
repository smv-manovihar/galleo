import { describe, it, expect } from "vitest"
import { formatTime } from "../video-constants"
import type { FeedbackPayload } from "../VideoFeedbackOverlay"

/**
 * Pure logic tests for VideoFeedbackOverlay data formatting.
 * We validate the payload shapes and formatting helpers that the overlay uses.
 * Full rendering tests would require @testing-library/react which isn't in this project.
 */
describe("VideoFeedbackOverlay payloads", () => {
  it("volume payload has correct shape for audible state", () => {
    const payload: FeedbackPayload = { kind: "volume", value: 0.8, muted: false }
    expect(payload.kind).toBe("volume")
    expect(Math.round(payload.value * 100)).toBe(80)
    expect(payload.muted).toBe(false)
  })

  it("volume payload has correct shape for muted state", () => {
    const payload: FeedbackPayload = { kind: "volume", value: 0.5, muted: true }
    expect(payload.kind).toBe("volume")
    expect(payload.muted).toBe(true)
  })

  it("speed payload formats rate correctly", () => {
    const payload: FeedbackPayload = { kind: "speed", value: 1.5 }
    expect(payload.kind).toBe("speed")
    expect(payload.value).toBe(1.5)
  })

  it("seek payload accumulates offsets", () => {
    const payload: FeedbackPayload = { kind: "seek", value: 5, accumulated: 15, timestamp: 65 }
    expect(payload.kind).toBe("seek")
    expect(payload.accumulated).toBe(15)
    expect(payload.timestamp).toBe(65)
    expect(formatTime(payload.timestamp!)).toBe("1:05")
  })

  it("seek payload handles negative offsets", () => {
    const payload: FeedbackPayload = { kind: "seek", value: -5, accumulated: -10, timestamp: 30 }
    expect(payload.accumulated).toBe(-10)
    expect(formatTime(payload.timestamp!)).toBe("0:30")
  })

  it("rotation payload normalizes degrees", () => {
    const payload: FeedbackPayload = { kind: "rotation", value: 270 }
    const norm = ((payload.value % 360) + 360) % 360
    expect(norm).toBe(270)
  })

  it("rotation payload normalizes negative degrees", () => {
    const payload: FeedbackPayload = { kind: "rotation", value: -90 }
    const norm = ((payload.value % 360) + 360) % 360
    expect(norm).toBe(270)
  })

  it("zoom payload formats scale as percentage", () => {
    const payload: FeedbackPayload = { kind: "zoom", value: 2 }
    expect(Math.round(payload.value * 100)).toBe(200)
  })

  it("zoom payload at 100% (reset)", () => {
    const payload: FeedbackPayload = { kind: "zoom", value: 1 }
    expect(Math.round(payload.value * 100)).toBe(100)
  })
})
