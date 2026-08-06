import { describe, it, expect } from "vitest"
import { cosineSimilarity } from "../../services/ai.service"

describe("cosineSimilarity", () => {
  it("returns 1.0 for identical vectors", () => {
    const v1 = new Float32Array([0.5, 0.5, 0.5, 0.5])
    const v2 = new Float32Array([0.5, 0.5, 0.5, 0.5])
    expect(cosineSimilarity(v1, v2)).toBeCloseTo(1.0, 5)
  })

  it("returns 0.5 for orthogonal vectors", () => {
    const v1 = new Float32Array([1.0, 0.0, 0.0, 0.0])
    const v2 = new Float32Array([0.0, 1.0, 0.0, 0.0])
    expect(cosineSimilarity(v1, v2)).toBeCloseTo(0.5, 5)
  })

  it("returns 0.0 for opposite vectors", () => {
    const v1 = new Float32Array([1.0, 2.0, 3.0])
    const v2 = new Float32Array([-1.0, -2.0, -3.0])
    expect(cosineSimilarity(v1, v2)).toBeCloseTo(0.0, 5)
  })

  it("handles empty or mismatched vector lengths safely", () => {
    const v1 = new Float32Array([])
    const v2 = new Float32Array([1, 2, 3])
    expect(cosineSimilarity(v1, v2)).toBe(0)

    const v3 = new Float32Array([1, 2])
    expect(cosineSimilarity(v3, v2)).toBe(0)
  })
})
