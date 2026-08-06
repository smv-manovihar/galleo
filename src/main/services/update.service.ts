import { app } from "electron"
import path from "path"
import fs from "fs/promises"

import { type Result, ok, fail } from "../../shared/types/results"
import type { UpdateCheckResult } from "../../shared/types/ipc"

const GITHUB_RELEASES_URL =
  "https://api.github.com/repos/smv-manovihar/galleo/releases/latest"

const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour TTL

interface UpdateCache {
  data: UpdateCheckResult
  etag?: string
  timestamp: number
}

interface GitHubReleaseAsset {
  name: string
  browser_download_url: string
}

interface GitHubRelease {
  tag_name?: string
  html_url: string
  body?: string
  published_at?: string
  assets?: GitHubReleaseAsset[]
}

export class UpdateService {
  private static inMemoryCache: UpdateCache | null = null

  private getCacheFilePath(): string {
    return path.join(app.getPath("userData"), "update_cache.json")
  }

  private async loadCache(): Promise<UpdateCache | null> {
    if (UpdateService.inMemoryCache) {
      return UpdateService.inMemoryCache
    }
    try {
      const filePath = this.getCacheFilePath()
      const content = await fs.readFile(filePath, "utf-8")
      const parsed = JSON.parse(content) as UpdateCache
      if (parsed && parsed.data && typeof parsed.timestamp === "number") {
        UpdateService.inMemoryCache = parsed
        return parsed
      }
    } catch {
      // Cache file doesn't exist yet
    }
    return null
  }

  private async saveCache(cache: UpdateCache): Promise<void> {
    UpdateService.inMemoryCache = cache
    try {
      const filePath = this.getCacheFilePath()
      await fs.writeFile(filePath, JSON.stringify(cache, null, 2), "utf-8")
    } catch (e) {
      console.warn("Failed to persist update cache to disk:", e)
    }
  }

  /**
   * Checks for application updates by fetching the latest release from GitHub.
   * Uses caching and ETag header checks to reduce API requests and avoid rate limits.
   *
   * @param {boolean} [force=false] Bypasses TTL to perform a conditional HTTP fetch.
   * @returns {Promise<Result<UpdateCheckResult>>} The result containing update availability and metadata.
   */
  public async checkForUpdates(
    force = false
  ): Promise<Result<UpdateCheckResult>> {
    const cached = await this.loadCache()
    const now = Date.now()

    if (!force && cached && now - cached.timestamp < CACHE_TTL_MS) {
      return ok(cached.data)
    }

    try {
      const currentVersion = app.getVersion()
      const headers: Record<string, string> = {
        "User-Agent": "galleo-update-checker",
        Accept: "application/vnd.github.v3+json",
      }

      if (cached?.etag) {
        headers["If-None-Match"] = cached.etag
      }

      const response = await fetch(GITHUB_RELEASES_URL, {
        headers,
        signal: AbortSignal.timeout(10000),
      })

      if (response.status === 304 && cached) {
        cached.timestamp = now
        await this.saveCache(cached)
        return ok(cached.data)
      }

      if (!response.ok) {
        const isRateLimited =
          response.status === 403 || response.status === 429
        if (isRateLimited) {
          if (cached) {
            console.warn(
              "GitHub update check rate limited; serving cached update result."
            )
            return ok(cached.data)
          }
          return fail({
            code: "UNKNOWN",
            message:
              "GitHub API rate limit exceeded. Please try again later.",
          })
        }

        if (response.status === 404) {
          const fallbackData: UpdateCheckResult = {
            updateAvailable: false,
            currentVersion,
            latestVersion: currentVersion,
            releaseUrl: "https://github.com/smv-manovihar/galleo/releases",
            downloadUrl: "https://github.com/smv-manovihar/galleo/releases",
          }
          return ok(fallbackData)
        }

        if (cached) {
          return ok(cached.data)
        }

        return fail({
          code: "UNKNOWN",
          message: `Failed to fetch updates: ${response.statusText}`,
        })
      }

      const etag = response.headers.get("etag") || undefined
      const releaseInfo = (await response.json()) as GitHubRelease
      const latestVersion = releaseInfo.tag_name?.replace(/^v/, "") || ""

      if (!latestVersion) {
        if (cached) return ok(cached.data)
        return fail({
          code: "UNKNOWN",
          message: "GitHub response is missing tag_name",
        })
      }

      const updateAvailable = this.isVersionNewer(
        currentVersion,
        latestVersion
      )

      const platform = process.platform
      let downloadUrl = releaseInfo.html_url

      if (releaseInfo.assets && Array.isArray(releaseInfo.assets)) {
        const asset = this.findMatchingAsset(releaseInfo.assets, platform)
        if (asset) {
          downloadUrl = asset.browser_download_url
        }
      }

      const resultData: UpdateCheckResult = {
        updateAvailable,
        currentVersion,
        latestVersion,
        releaseUrl: releaseInfo.html_url,
        downloadUrl,
        releaseNotes: releaseInfo.body || undefined,
        releaseDate: releaseInfo.published_at || undefined,
      }

      await this.saveCache({
        data: resultData,
        etag,
        timestamp: now,
      })

      return ok(resultData)
    } catch (e: unknown) {
      if (cached) {
        return ok(cached.data)
      }
      const message =
        e instanceof Error ? e.message : "Check for updates failed"
      return fail({
        code: "UNKNOWN",
        message,
      })
    }
  }

  /**
   * Compares two SemVer versions to determine if the latest version is newer.
   *
   * @param {string} current The current application version.
   * @param {string} latest The latest released version.
   * @returns {boolean} True if latest is newer than current, false otherwise.
   */
  private isVersionNewer(current: string, latest: string): boolean {
    const parse = (v: string) => v.replace(/^v/, "").split(".").map(Number)
    const [cMajor = 0, cMinor = 0, cPatch = 0] = parse(current)
    const [lMajor = 0, lMinor = 0, lPatch = 0] = parse(latest)

    if (lMajor !== cMajor) {
      return lMajor > cMajor
    }
    if (lMinor !== cMinor) {
      return lMinor > cMinor
    }
    return lPatch > cPatch
  }

  /**
   * Finds the best installer asset for the user's platform.
   *
   * @param {GitHubReleaseAsset[]} assets The list of release assets.
   * @param {string} platform The operating system platform.
   * @returns {GitHubReleaseAsset | null} The matching asset object or null.
   */
  private findMatchingAsset(
    assets: GitHubReleaseAsset[],
    platform: string
  ): GitHubReleaseAsset | null {
    let patterns: RegExp[] = []
    if (platform === "win32") {
      patterns = [/\.exe$/i, /\.msi$/i]
    } else if (platform === "darwin") {
      patterns = [/\.dmg$/i, /\.pkg$/i, /mac\.zip$/i, /darwin\.zip$/i]
    } else if (platform === "linux") {
      patterns = [/\.appimage$/i, /\.deb$/i, /\.rpm$/i, /\.tar\.gz$/i]
    }

    for (const pattern of patterns) {
      const match = assets.find((asset) => pattern.test(asset.name))
      if (match) return match
    }
    return null
  }
}
