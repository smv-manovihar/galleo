import { describe, it, expect, beforeEach } from "vitest"
import {
  storage,
  normalizeOrientation,
  getMediaOrientation,
  setMediaOrientation,
} from "../storage"

const mockStorage = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

if (typeof globalThis.localStorage === "undefined") {
  Object.defineProperty(globalThis, "localStorage", {
    value: mockStorage,
    writable: true,
  })
}

describe("storage orientation helpers", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("normalizes orientations correctly", () => {
    expect(normalizeOrientation(0)).toBe(0)
    expect(normalizeOrientation(90)).toBe(90)
    expect(normalizeOrientation(180)).toBe(180)
    expect(normalizeOrientation(270)).toBe(270)
    expect(normalizeOrientation(360)).toBe(0)
    expect(normalizeOrientation(-90)).toBe(270)
    expect(normalizeOrientation(-180)).toBe(180)
    expect(normalizeOrientation(450)).toBe(90)
  })

  it("persists and retrieves orientation per file path or media URI", () => {
    const fileA = "C:/Photos/trip/beach.jpg"
    const fileB = "media:///C:/Photos/trip/sunset.mp4"

    expect(getMediaOrientation(fileA)).toBe(0)
    expect(getMediaOrientation(fileB)).toBe(0)

    setMediaOrientation(fileA, 90)
    expect(getMediaOrientation(fileA)).toBe(90)
    expect(getMediaOrientation(fileB)).toBe(0)

    setMediaOrientation(fileB, 270)
    expect(getMediaOrientation(fileB)).toBe(270)

    // Resetting to 0 removes key from storage
    setMediaOrientation(fileA, 0)
    expect(getMediaOrientation(fileA)).toBe(0)
    expect(storage.get("orientation:C:/Photos/trip/beach.jpg")).toBeNull()
  })
})
