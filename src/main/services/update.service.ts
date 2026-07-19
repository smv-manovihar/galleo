import { app } from "electron"

import { type Result, ok, fail } from "../../shared/types/results"
import type { UpdateCheckResult } from "../../shared/types/ipc"

const GITHUB_RELEASES_URL =
  "https://api.github.com/repos/smv-manovihar/galleo/releases/latest"

export class UpdateService {
  /**
   * Checks for application updates by fetching the latest release from GitHub.
   *
   * @returns {Promise<Result<UpdateCheckResult>>} The result containing update availability and metadata.
   */
  public async checkForUpdates(): Promise<Result<UpdateCheckResult>> {
    try {
      const currentVersion = app.getVersion()
      const response = await fetch(GITHUB_RELEASES_URL, {
        headers: {
          "User-Agent": "galleo-update-checker",
          Accept: "application/vnd.github.v3+json",
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          // Gracefully handle if no releases are found (e.g. fresh repo)
          return ok({
            updateAvailable: false,
            currentVersion,
            latestVersion: currentVersion,
            releaseUrl: "https://github.com/smv-manovihar/galleo/releases",
            downloadUrl: "https://github.com/smv-manovihar/galleo/releases",
          })
        }
        return fail({
          code: "UNKNOWN",
          message: `Failed to fetch updates: ${response.statusText}`,
        })
      }

      const releaseInfo = (await response.json()) as any
      const latestVersion = releaseInfo.tag_name?.replace(/^v/, "") || ""

      if (!latestVersion) {
        return fail({
          code: "UNKNOWN",
          message: "GitHub response is missing tag_name",
        })
      }

      const updateAvailable = this.isVersionNewer(currentVersion, latestVersion)

      const platform = process.platform
      let downloadUrl = releaseInfo.html_url

      if (releaseInfo.assets && Array.isArray(releaseInfo.assets)) {
        const asset = this.findMatchingAsset(releaseInfo.assets, platform)
        if (asset) {
          downloadUrl = asset.browser_download_url
        }
      }

      return ok({
        updateAvailable,
        currentVersion,
        latestVersion,
        releaseUrl: releaseInfo.html_url,
        downloadUrl,
        releaseNotes: releaseInfo.body || undefined,
        releaseDate: releaseInfo.published_at || undefined,
      })
    } catch (e: any) {
      return fail({
        code: "UNKNOWN",
        message: e.message || "Check for updates failed",
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
   * @param {any[]} assets The list of release assets.
   * @param {string} platform The operating system platform.
   * @returns {any | null} The matching asset object or null.
   */
  private findMatchingAsset(assets: any[], platform: string): any | null {
    let patterns: RegExp[] = []
    if (platform === "win32") {
      patterns = [/\.exe$/i, /\.msi$/i]
    } else if (platform === "darwin") {
      patterns = [/\.dmg$/i, /\.pkg$/i, /mac\.zip$/i, /darwin\.zip$/i]
    } else if (platform === "linux") {
      patterns = [/\.appimage$/i, /\.deb$/i, /\.rpm$/i, /\.tar\.gz$/i]
    }

    for (const pattern of patterns) {
      const match = assets.find((asset: any) => pattern.test(asset.name))
      if (match) return match
    }
    return null
  }
}
