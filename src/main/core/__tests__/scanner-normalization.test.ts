import { describe, it, expect } from "vitest"

function normalizePath(p: string): string {
  return p.replace(/\\/g, "/").toLowerCase()
}

function matchesRootPath(rootPath: string, targetPath: string): boolean {
  const normRoot = normalizePath(rootPath).replace(/\/+$/, "")
  const normTarget = normalizePath(targetPath)
  return normTarget === normRoot || normTarget.startsWith(normRoot + "/")
}

describe("Scanner Path Normalization & Matching", () => {
  it("normalizes Windows backslashes and casing", () => {
    expect(normalizePath("D:\\Photos\\SubFolder\\Image.JPG")).toBe(
      "d:/photos/subfolder/image.jpg"
    )
    expect(normalizePath("d:/photos/subfolder/image.jpg")).toBe(
      "d:/photos/subfolder/image.jpg"
    )
  })

  it("matches root paths regardless of slashes", () => {
    expect(
      matchesRootPath("D:\\Photos", "d:/photos/vacation/pic.jpg")
    ).toBe(true)
    expect(
      matchesRootPath("d:/photos/", "D:\\Photos\\vacation\\pic.jpg")
    ).toBe(true)
    expect(
      matchesRootPath("D:\\Photos", "D:\\Photos")
    ).toBe(true)
  })

  it("prevents false positive prefix matches across sibling directories", () => {
    expect(
      matchesRootPath("D:\\Photos", "D:\\Photos-Extra\\pic.jpg")
    ).toBe(false)
    expect(
      matchesRootPath("D:\\Photos", "D:\\PhotosExtra\\pic.jpg")
    ).toBe(false)
  })
})
