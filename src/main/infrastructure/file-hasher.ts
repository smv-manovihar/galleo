import fs from "fs"
import crypto from "crypto"
import { type Result, ok, fail } from "../../shared/types/results"

const FULL_HASH_THRESHOLD = 10 * 1024 * 1024 // 10 MB
const CHUNK_SIZE = 64 * 1024 // 64 KB

/**
 * Computes a fast, deterministic content hash (exactHash) for a media file.
 * - Files <= 10MB: Full SHA-256 hash of file content.
 * - Files > 10MB: Sparse SHA-256 hash (File size + 64KB head + 64KB mid + 64KB tail).
 * Takes <1ms even for multi-gigabyte video files.
 */
export async function computeFastContentHash(
  filePath: string,
  fileSize: number
): Promise<Result<string>> {
  try {
    if (fileSize <= 0) {
      return ok("empty_file_0")
    }

    if (fileSize <= FULL_HASH_THRESHOLD) {
      // Full SHA-256 stream for smaller files
      return new Promise<Result<string>>((resolve) => {
        const hash = crypto.createHash("sha256")
        const stream = fs.createReadStream(filePath)

        stream.on("data", (chunk) => hash.update(chunk))
        stream.on("end", () => resolve(ok(hash.digest("hex"))))
        stream.on("error", (err) =>
          resolve(
            fail({
              code: "HASH_FAILED",
              path: filePath,
              reason: err.message || "Failed to read file stream",
            })
          )
        )
      })
    }

    // Sparse chunk hash for large files (> 10MB)
    let handle: fs.promises.FileHandle | null = null
    try {
      handle = await fs.promises.open(filePath, "r")
      const hash = crypto.createHash("sha256")

      // Include total file size in string representation
      hash.update(`size:${fileSize};`)

      // Chunk 1: Head (first 64KB)
      const headBuf = Buffer.alloc(CHUNK_SIZE)
      const headRead = await handle.read(headBuf, 0, CHUNK_SIZE, 0)
      hash.update(headBuf.subarray(0, headRead.bytesRead))

      // Chunk 2: Mid (middle 64KB)
      const midOffset = Math.floor(fileSize / 2)
      const midBuf = Buffer.alloc(CHUNK_SIZE)
      const midRead = await handle.read(midBuf, 0, CHUNK_SIZE, midOffset)
      hash.update(midBuf.subarray(0, midRead.bytesRead))

      // Chunk 3: Tail (last 64KB)
      const tailOffset = Math.max(0, fileSize - CHUNK_SIZE)
      const tailBuf = Buffer.alloc(CHUNK_SIZE)
      const tailRead = await handle.read(tailBuf, 0, CHUNK_SIZE, tailOffset)
      hash.update(tailBuf.subarray(0, tailRead.bytesRead))

      return ok(hash.digest("hex"))
    } finally {
      if (handle) {
        await handle.close()
      }
    }
  } catch (e: unknown) {
    const err = e as { message?: string }
    return fail({
      code: "HASH_FAILED",
      path: filePath,
      reason: err.message || "Failed to compute file content hash",
    })
  }
}
