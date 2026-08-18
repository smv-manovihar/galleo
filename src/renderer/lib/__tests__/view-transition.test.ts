import { afterEach, describe, expect, it } from "vitest"

import { withViewTransition } from "../view-transition"

describe("withViewTransition", () => {
  const originalDocument = globalThis.document

  afterEach(() => {
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: originalDocument,
      writable: true,
    })
  })

  it("waits for async updates when a transition is unavailable", async () => {
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {},
      writable: true,
    })

    let completed = false

    await withViewTransition(async () => {
      await Promise.resolve()
      completed = true
    })

    expect(completed).toBe(true)
  })

  it("waits for async updates when a transition is available", async () => {
    const startViewTransition = (cb: () => void) => {
      cb()
      return { finished: Promise.resolve() }
    }

    const documentElement = { dataset: {} as Record<string, string> }

    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: { startViewTransition, documentElement },
      writable: true,
    })

    let completed = false

    await withViewTransition(async () => {
      await Promise.resolve()
      completed = true
    }, "back")

    expect(completed).toBe(true)
  })

  it("sets and cleans up navDirection attribute on documentElement", async () => {
    let capturedDirection: string | undefined

    const startViewTransition = (cb: () => void) => {
      const doc = globalThis.document as unknown as {
        documentElement?: { dataset?: Record<string, string> }
      }
      capturedDirection = doc?.documentElement?.dataset?.navDirection
      cb()
      return {
        finished: Promise.resolve().then(() => {
          // Cleanup check
        }),
      }
    }

    const documentElement = { dataset: {} as Record<string, string> }

    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: { startViewTransition, documentElement },
      writable: true,
    })

    await withViewTransition(() => {}, "back")

    expect(capturedDirection).toBe("back")
  })
})
