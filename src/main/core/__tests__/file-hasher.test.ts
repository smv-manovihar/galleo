import { describe, it, expect, beforeAll, afterAll } from "vitest"
import fs from "fs"
import path from "path"
import os from "os"
import { computeFastContentHash } from "../../infrastructure/file-hasher"

describe("computeFastContentHash", () => {
  let tmpDir: string
  let smallFilePath: string
  let smallCopyPath: string
  let differentSmallPath: string

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "galleo_hasher_test_"))
    smallFilePath = path.join(tmpDir, "small1.dat")
    smallCopyPath = path.join(tmpDir, "small1_copy.dat")
    differentSmallPath = path.join(tmpDir, "small2.dat")

    const content1 = Buffer.from("Hello Galleo Media Indexer! Byte Content Hash Test 1")
    const content2 = Buffer.from("Hello Galleo Media Indexer! Byte Content Hash Test 2")

    fs.writeFileSync(smallFilePath, content1)
    fs.writeFileSync(smallCopyPath, content1)
    fs.writeFileSync(differentSmallPath, content2)
  })

  afterAll(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    } catch {
      // ignore cleanup errors
    }
  })

  it("produces identical SHA-256 content hashes for identical small files", async () => {
    const stat1 = fs.statSync(smallFilePath)
    const stat2 = fs.statSync(smallCopyPath)

    const res1 = await computeFastContentHash(smallFilePath, stat1.size)
    const res2 = await computeFastContentHash(smallCopyPath, stat2.size)

    expect(res1.ok).toBe(true)
    expect(res2.ok).toBe(true)
    if (res1.ok && res2.ok) {
      expect(res1.data).toBe(res2.data)
    }
  })

  it("produces distinct content hashes for files with different bytes", async () => {
    const stat1 = fs.statSync(smallFilePath)
    const stat3 = fs.statSync(differentSmallPath)

    const res1 = await computeFastContentHash(smallFilePath, stat1.size)
    const res3 = await computeFastContentHash(differentSmallPath, stat3.size)

    expect(res1.ok).toBe(true)
    expect(res3.ok).toBe(true)
    if (res1.ok && res3.ok) {
      expect(res1.data).not.toBe(res3.data)
    }
  })

  it("returns fallback for empty file size <= 0", async () => {
    const res = await computeFastContentHash("nonexistent.dat", 0)
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.data).toBe("empty_file_0")
    }
  })
})
