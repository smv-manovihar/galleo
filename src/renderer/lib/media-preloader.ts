import type { MediaItem } from "../../shared/types/media"

const MAX_CACHE_SIZE = 60
const decodedUrlCache = new Set<string>()
const inFlightPromises = new Map<string, Promise<void>>()

/**
 * Converts a filesystem path to a safe media:// protocol URL
 */
export function toMediaUrl(filePath: string): string {
  if (!filePath) return ""
  if (filePath.startsWith("media:///")) return filePath
  return `media:///${filePath.replace(/\\/g, "/")}`
}

/**
 * Preload and off-thread decode an image URL so it renders instantly (0ms)
 * without progressive top-to-bottom paints when mounted in the DOM.
 */
export function preloadImage(url: string): Promise<void> {
  if (!url || decodedUrlCache.has(url)) {
    return Promise.resolve()
  }

  const existing = inFlightPromises.get(url)
  if (existing) {
    return existing
  }

  // Handle environments where Image constructor might not exist (e.g. Node test environment)
  if (typeof Image === "undefined") {
    decodedUrlCache.add(url)
    return Promise.resolve()
  }

  const promise = new Promise<void>((resolve) => {
    const img = new Image()

    const onComplete = () => {
      inFlightPromises.delete(url)
      // LRU eviction if cache exceeds capacity
      if (decodedUrlCache.size >= MAX_CACHE_SIZE) {
        const first = decodedUrlCache.values().next().value
        if (first) decodedUrlCache.delete(first)
      }
      decodedUrlCache.add(url)
      resolve()
    }

    img.onload = () => {
      if ("decode" in img && typeof img.decode === "function") {
        img
          .decode()
          .catch(() => {
            // Ignore decode failures (e.g. non-fatal decoding interruptions)
          })
          .finally(onComplete)
      } else {
        onComplete()
      }
    }

    img.onerror = () => {
      inFlightPromises.delete(url)
      resolve()
    }

    img.src = url
  })

  inFlightPromises.set(url, promise)
  return promise
}

/**
 * Preload adjacent media items ahead of time (e.g. 1 item before and 2 items ahead)
 * so that next/previous navigation is instantaneous.
 */
export function preloadAdjacentMedia(
  items: MediaItem[] | undefined,
  currentIndex: number,
  lookahead = 2,
  lookbehind = 1
): void {
  if (!items || items.length === 0 || currentIndex < 0) return

  const targets: string[] = []

  // Preload preceding items
  for (let i = 1; i <= lookbehind; i++) {
    const prevIdx = currentIndex - i
    if (prevIdx >= 0) {
      const item = items[prevIdx]
      if (item.mediaType === "photo") {
        targets.push(toMediaUrl(item.path))
      }
      if (item.thumbnailPath) {
        targets.push(toMediaUrl(item.thumbnailPath))
      }
    }
  }

  // Preload succeeding items
  for (let i = 1; i <= lookahead; i++) {
    const nextIdx = currentIndex + i
    if (nextIdx < items.length) {
      const item = items[nextIdx]
      if (item.mediaType === "photo") {
        targets.push(toMediaUrl(item.path))
      }
      if (item.thumbnailPath) {
        targets.push(toMediaUrl(item.thumbnailPath))
      }
    }
  }

  // Fire preloads asynchronously
  for (const url of targets) {
    void preloadImage(url)
  }
}

/**
 * Check if a URL has already been pre-decoded into memory.
 */
export function isImagePreloaded(url: string): boolean {
  return decodedUrlCache.has(url)
}

/**
 * Clear preloader cache (useful for testing or memory pressure).
 */
export function clearMediaPreloadCache(): void {
  decodedUrlCache.clear()
  inFlightPromises.clear()
}
