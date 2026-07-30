import { describe, it, expect } from "vitest"
import { EmbeddingRepository } from "../../repositories/embedding.repository"

describe("Embedding Vector Serialization", () => {
  it("serializes Float32Array vector into Buffer BLOB and back without loss of precision", () => {
    const originalVector = new Float32Array(768)
    for (let i = 0; i < 768; i++) {
      originalVector[i] = (i % 100) / 100 - 0.5
    }

    const buffer = EmbeddingRepository.float32ToBuffer(originalVector)
    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.length).toBe(768 * 4) // 3072 bytes for 768 float32s

    const reconstructedVector = EmbeddingRepository.bufferToFloat32(buffer)
    expect(reconstructedVector.length).toBe(768)

    for (let i = 0; i < 768; i++) {
      expect(reconstructedVector[i]).toBeCloseTo(originalVector[i], 5)
    }
  })

  it("handles empty and single-element Float32Arrays correctly", () => {
    const emptyVector = new Float32Array(0)
    const emptyBuf = EmbeddingRepository.float32ToBuffer(emptyVector)
    expect(emptyBuf.length).toBe(0)
    const emptyReconstructed = EmbeddingRepository.bufferToFloat32(emptyBuf)
    expect(emptyReconstructed.length).toBe(0)

    const singleVector = new Float32Array([0.123456])
    const singleBuf = EmbeddingRepository.float32ToBuffer(singleVector)
    const singleReconstructed = EmbeddingRepository.bufferToFloat32(singleBuf)
    expect(singleReconstructed.length).toBe(1)
    expect(singleReconstructed[0]).toBeCloseTo(0.123456, 5)
  })
})
