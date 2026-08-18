export type NavigationDirection = "forward" | "back" | "none"

/**
 * Safely executes DOM updates inside browser View Transitions.
 * Supports sync or async work and falls back to direct execution when
 * View Transitions are unavailable.
 * Sets the navigation direction attribute on the document element so CSS
 * can style forward vs backward animations.
 */
export async function withViewTransition(
  updateFn: () => void | Promise<void>,
  direction: NavigationDirection = "forward"
): Promise<void> {
  const doc =
    typeof document !== "undefined"
      ? (document as Document & {
          startViewTransition?: (cb: () => void) => {
            finished?: Promise<void>
            ready?: Promise<void>
          }
        })
      : null

  if (doc && typeof doc.startViewTransition === "function") {
    if (doc.documentElement) {
      doc.documentElement.dataset.navDirection = direction
    }

    await new Promise<void>((resolve, reject) => {
      const runUpdate = () => {
        try {
          Promise.resolve(updateFn()).then(resolve, reject)
        } catch (error) {
          reject(error)
        }
      }

      try {
        const transition = doc.startViewTransition(runUpdate)
        if (transition && typeof transition.finished?.then === "function") {
          transition.finished.finally(() => {
            if (doc.documentElement?.dataset.navDirection === direction) {
              delete doc.documentElement.dataset.navDirection
            }
          })
        }
      } catch (error) {
        reject(error)
      }
    })
    return
  }

  await updateFn()
}
