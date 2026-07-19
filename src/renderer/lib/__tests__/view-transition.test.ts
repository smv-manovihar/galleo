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
    const startViewTransition = (cb: () => void) => cb()

    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: { startViewTransition },
      writable: true,
    })

    let completed = false

    await withViewTransition(async () => {
      await Promise.resolve()
      completed = true
    })

    expect(completed).toBe(true)
  })
})
