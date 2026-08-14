const PREFIX = "galleo_"

function prefixed(key: string) {
  return PREFIX + key
}

export const storage = {
  get(key: string): string | null {
    return localStorage.getItem(prefixed(key))
  },
  set(key: string, value: string): void {
    localStorage.setItem(prefixed(key), value)
  },
  remove(key: string): void {
    localStorage.removeItem(prefixed(key))
  },
}

export function normalizeOrientation(degrees: number): number {
  return ((degrees % 360) + 360) % 360
}

export function getMediaOrientation(pathOrSrc: string): number {
  if (!pathOrSrc) return 0
  const normalizedKey = `orientation:${pathOrSrc.replace(/^media:\/\/\//, "").replace(/\\/g, "/")}`
  const val = storage.get(normalizedKey)
  if (val !== null) {
    const parsed = parseInt(val, 10)
    if (!isNaN(parsed)) {
      return normalizeOrientation(parsed)
    }
  }
  return 0
}

export function setMediaOrientation(pathOrSrc: string, degrees: number): void {
  if (!pathOrSrc) return
  const normalizedKey = `orientation:${pathOrSrc.replace(/^media:\/\/\//, "").replace(/\\/g, "/")}`
  const norm = normalizeOrientation(degrees)
  if (norm === 0) {
    storage.remove(normalizedKey)
  } else {
    storage.set(normalizedKey, norm.toString())
  }
}
