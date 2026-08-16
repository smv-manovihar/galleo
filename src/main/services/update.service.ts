import { app, BrowserWindow, shell } from "electron"
import { spawn } from "child_process"
import fs from "fs/promises"
import { createWriteStream } from "fs"
import path from "path"

import { type Result, ok, fail } from "../../shared/types/results"
import { IPC_CHANNELS, type UpdateCheckResult } from "../../shared/types/ipc"
import { getUpdateCachePath } from "../infrastructure/app-paths"

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
  private downloadedInstallerPath: string | null = null
  private downloadAbortController: AbortController | null = null

  public static clearInMemoryCache(): void {
    UpdateService.inMemoryCache = null
  }

  public getDownloadedInstallerPath(): string | null {
    return this.downloadedInstallerPath
  }

  public setDownloadedInstallerPathForTesting(filePath: string | null): void {
    this.downloadedInstallerPath = filePath
  }

  private getCacheFilePath(): string {
    return getUpdateCachePath()
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
    const currentVersion = app.getVersion()

    if (!force && cached && now - cached.timestamp < CACHE_TTL_MS) {
      const synchronizedData: UpdateCheckResult = {
        ...cached.data,
        currentVersion,
        updateAvailable: this.isVersionNewer(
          currentVersion,
          cached.data.latestVersion
        ),
      }
      if (cached.data.currentVersion !== currentVersion) {
        cached.data = synchronizedData
        this.saveCache(cached).catch(() => {})
      }
      return ok(synchronizedData)
    }

    try {
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
        cached.data.currentVersion = currentVersion
        cached.data.updateAvailable = this.isVersionNewer(
          currentVersion,
          cached.data.latestVersion
        )
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
            const synchronizedData: UpdateCheckResult = {
              ...cached.data,
              currentVersion,
              updateAvailable: this.isVersionNewer(
                currentVersion,
                cached.data.latestVersion
              ),
            }
            return ok(synchronizedData)
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
          await this.saveCache({
            data: fallbackData,
            timestamp: now,
          })
          return ok(fallbackData)
        }

        if (cached) {
          const synchronizedData: UpdateCheckResult = {
            ...cached.data,
            currentVersion,
            updateAvailable: this.isVersionNewer(
              currentVersion,
              cached.data.latestVersion
            ),
          }
          return ok(synchronizedData)
        }

        return fail({
          code: "UNKNOWN",
          message: `Failed to fetch updates: ${response.statusText}`,
        })
      }

      const etag = response.headers.get("etag") || undefined
      const releaseInfo = (await response.json()) as GitHubRelease
      const latestVersion = releaseInfo.tag_name?.replace(/^v/, "").trim() || ""

      if (!latestVersion) {
        if (cached) {
          const synchronizedData: UpdateCheckResult = {
            ...cached.data,
            currentVersion,
            updateAvailable: this.isVersionNewer(
              currentVersion,
              cached.data.latestVersion
            ),
          }
          return ok(synchronizedData)
        }
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
      const arch = process.arch
      let downloadUrl = releaseInfo.html_url

      if (releaseInfo.assets && Array.isArray(releaseInfo.assets)) {
        const asset = this.findMatchingAsset(releaseInfo.assets, platform, arch)
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
        const synchronizedData: UpdateCheckResult = {
          ...cached.data,
          currentVersion,
          updateAvailable: this.isVersionNewer(
            currentVersion,
            cached.data.latestVersion
          ),
        }
        return ok(synchronizedData)
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
   * Downloads the release installer binary to the temporary directory with live progress updates.
   *
   * @param {BrowserWindow} window The main Electron browser window for progress event delivery.
   * @param {string} downloadUrl The direct asset download URL.
   * @returns {Promise<Result<string>>} The absolute path to the downloaded installer.
   */
  public async downloadUpdate(
    window: BrowserWindow,
    downloadUrl: string
  ): Promise<Result<string>> {
    if (!downloadUrl || !/^https?:\/\//i.test(downloadUrl.trim())) {
      return fail({
        code: "UNKNOWN",
        message: "Invalid update download URL",
      })
    }

    try {
      this.downloadAbortController = new AbortController()

      let filename = "Galleo-Setup.exe"
      try {
        const parsedName = path.basename(new URL(downloadUrl).pathname)
        if (parsedName && parsedName.length > 3) {
          filename = parsedName
        }
      } catch {
        // Fallback default filename
      }

      const tempDir = app.getPath("temp")
      const targetPath = path.join(tempDir, filename)

      const response = await fetch(downloadUrl, {
        headers: {
          "User-Agent": "galleo-update-checker",
          Accept: "application/octet-stream, */*",
        },
        signal: this.downloadAbortController.signal,
      })

      if (!response.ok || !response.body) {
        return fail({
          code: "UNKNOWN",
          message: `Failed to download installer (HTTP ${response.status}: ${response.statusText})`,
        })
      }

      const contentLengthHeader = response.headers.get("content-length")
      const totalBytes = contentLengthHeader
        ? parseInt(contentLengthHeader, 10)
        : 0
      let receivedBytes = 0
      let lastReportedPercent = -1

      const reader = response.body.getReader()
      const fileStream = createWriteStream(targetPath)

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          if (value) {
            receivedBytes += value.length
            fileStream.write(Buffer.from(value))

            if (totalBytes > 0) {
              const percent = Math.min(
                100,
                Math.floor((receivedBytes / totalBytes) * 100)
              )
              if (percent !== lastReportedPercent) {
                lastReportedPercent = percent
                if (window && !window.isDestroyed()) {
                  window.webContents.send(
                    IPC_CHANNELS.APP_DOWNLOAD_UPDATE_PROGRESS,
                    percent
                  )
                }
              }
            }
          }
        }
      } finally {
        await new Promise<void>((resolve, reject) => {
          fileStream.end(() => resolve())
          fileStream.on("error", reject)
        })
      }

      this.downloadedInstallerPath = targetPath
      if (window && !window.isDestroyed()) {
        window.webContents.send(IPC_CHANNELS.APP_DOWNLOAD_UPDATE_PROGRESS, 100)
      }

      return ok(targetPath)
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Downloading update installer failed"
      return fail({
        code: "UNKNOWN",
        message,
      })
    } finally {
      this.downloadAbortController = null
    }
  }

  /**
   * Spawns the downloaded installer and gracefully exits the application.
   *
   * @returns {Promise<Result<void>>}
   */
  public async installUpdate(): Promise<Result<void>> {
    if (!this.downloadedInstallerPath) {
      return fail({
        code: "UNKNOWN",
        message: "No downloaded installer is ready for installation",
      })
    }

    const installerPath = this.downloadedInstallerPath

    try {
      if (process.platform === "win32") {
        const spawned = spawn(installerPath, [], {
          detached: true,
          stdio: "ignore",
        })
        spawned.unref()
        app.quit()
        return ok(undefined)
      } else if (process.platform === "darwin") {
        await shell.openPath(installerPath)
        app.quit()
        return ok(undefined)
      } else if (process.platform === "linux") {
        if (installerPath.endsWith(".AppImage")) {
          await fs.chmod(installerPath, 0o755)
          const spawned = spawn(installerPath, [], {
            detached: true,
            stdio: "ignore",
          })
          spawned.unref()
          app.quit()
          return ok(undefined)
        } else {
          await shell.openPath(installerPath)
          app.quit()
          return ok(undefined)
        }
      } else {
        await shell.openPath(installerPath)
        app.quit()
        return ok(undefined)
      }
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Failed to launch update installer"
      return fail({
        code: "UNKNOWN",
        message,
      })
    }
  }

  /**
   * Compares two SemVer versions to determine if the latest version is newer.
   * Correctly handles major/minor/patch segments and pre-release identifiers.
   *
   * @param {string} current The current application version.
   * @param {string} latest The latest released version.
   * @returns {boolean} True if latest is newer than current, false otherwise.
   */
  public isVersionNewer(current: string, latest: string): boolean {
    const parseVersion = (v: string) => {
      const clean = (v || "").trim().replace(/^v/i, "")
      const [core, prerelease] = clean.split("-")
      const parts = (core || "").split(".").map((p) => {
        const num = parseInt(p, 10)
        return isNaN(num) ? 0 : num
      })
      while (parts.length < 3) {
        parts.push(0)
      }
      return { parts, prerelease: prerelease ? prerelease.trim() : null }
    }

    const curr = parseVersion(current)
    const lat = parseVersion(latest)

    for (let i = 0; i < Math.max(curr.parts.length, lat.parts.length); i++) {
      const c = curr.parts[i] ?? 0
      const l = lat.parts[i] ?? 0
      if (l !== c) {
        return l > c
      }
    }

    // Core versions are equal (e.g. "1.1.0" vs "1.1.0")
    // Pre-release upgrade: 1.1.0-beta.1 -> 1.1.0 (stable is newer than pre-release)
    if (curr.prerelease && !lat.prerelease) {
      return true
    }
    // Stable compared against pre-release of same version: 1.1.0 -> 1.1.0-beta.1 (not newer)
    if (!curr.prerelease && lat.prerelease) {
      return false
    }
    // Both are pre-releases: e.g. beta.1 -> beta.2
    if (curr.prerelease && lat.prerelease) {
      return (
        lat.prerelease.localeCompare(curr.prerelease, undefined, {
          numeric: true,
        }) > 0
      )
    }

    return false
  }

  /**
   * Finds the best installer asset for the user's platform and architecture.
   *
   * @param {GitHubReleaseAsset[]} assets The list of release assets.
   * @param {string} platform The operating system platform.
   * @param {string} [arch] The operating system CPU architecture.
   * @returns {GitHubReleaseAsset | null} The matching asset object or null.
   */
  public findMatchingAsset(
    assets: GitHubReleaseAsset[],
    platform: string,
    arch: string = process.arch
  ): GitHubReleaseAsset | null {
    const isArm = arch === "arm64" || arch === "arm"

    // Filter out blockmap, yml, and checksum files
    const validAssets = assets.filter(
      (a) => !/\.(blockmap|yml|yaml|sha256|md5|sig)$/i.test(a.name)
    )

    let patterns: RegExp[] = []
    if (platform === "win32") {
      patterns = isArm
        ? [/arm64.*\.exe$/i, /arm64.*\.msi$/i, /\.exe$/i, /\.msi$/i]
        : [/(setup|x64|win).*\.exe$/i, /\.exe$/i, /\.msi$/i]
    } else if (platform === "darwin") {
      patterns = isArm
        ? [
            /arm64.*\.dmg$/i,
            /arm64.*\.pkg$/i,
            /\.dmg$/i,
            /\.pkg$/i,
            /mac\.zip$/i,
          ]
        : [/(x64|intel).*\.dmg$/i, /\.dmg$/i, /\.pkg$/i, /mac\.zip$/i]
    } else if (platform === "linux") {
      patterns = isArm
        ? [/arm64.*\.appimage$/i, /arm64.*\.deb$/i, /\.appimage$/i, /\.deb$/i]
        : [
            /(amd64|x86_64).*\.appimage$/i,
            /(amd64|x86_64).*\.deb$/i,
            /\.appimage$/i,
            /\.deb$/i,
            /\.rpm$/i,
          ]
    }

    for (const pattern of patterns) {
      const match = validAssets.find((asset) => pattern.test(asset.name))
      if (match) return match
    }

    return validAssets[0] || null
  }
}
