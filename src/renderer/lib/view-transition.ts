/**
 * Safely executes DOM updates inside browser View Transitions.
 * Supports sync or async work and falls back to direct execution when
 * View Transitions are unavailable.
 */
export async function withViewTransition(
  updateFn: () => void | Promise<void>,
): Promise<void> {
  const doc =
    typeof document !== "undefined"
      ? (document as Document & {
          startViewTransition?: (cb: () => void) => void
        })
      : null

  if (doc && typeof doc.startViewTransition === "function") {
    await new Promise<void>((resolve, reject) => {
      const runUpdate = () => {
        try {
          Promise.resolve(updateFn()).then(resolve, reject)
        } catch (error) {
          reject(error)
        }
      }

      try {
        doc.startViewTransition(runUpdate)
      } catch (error) {
        reject(error)
      }
    })
    return
  }

  await updateFn()
}
