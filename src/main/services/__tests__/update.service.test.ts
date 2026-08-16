import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { UpdateService } from "../update.service"
import { app } from "electron"
import fs from "fs/promises"

vi.mock("electron", () => ({
  app: {
    getVersion: vi.fn(() => "1.1.1"),
    getPath: vi.fn(() => "/mock/temp"),
    quit: vi.fn(),
  },
  shell: {
    openPath: vi.fn().mockResolvedValue(""),
  },
}))

vi.mock("../infrastructure/app-paths", () => ({
  getUpdateCachePath: vi.fn(() => "/mock/path/update_cache.json"),
}))

vi.mock("fs/promises", () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    chmod: vi.fn(),
  },
}))

vi.mock("child_process", () => ({
  spawn: vi.fn(() => ({
    unref: vi.fn(),
  })),
}))

describe("UpdateService", () => {
  let updateService: UpdateService

  beforeEach(() => {
    vi.clearAllMocks()
    UpdateService.clearInMemoryCache()
    updateService = new UpdateService()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("isVersionNewer", () => {
    it("detects newer minor and patch releases", () => {
      expect(updateService.isVersionNewer("1.0.0", "1.1.0")).toBe(true)
      expect(updateService.isVersionNewer("1.0.1", "1.1.0")).toBe(true)
      expect(updateService.isVersionNewer("1.1.0", "1.1.1")).toBe(true)
      expect(updateService.isVersionNewer("1.0.0", "2.0.0")).toBe(true)
    })

    it("handles leading 'v' prefixes cleanly", () => {
      expect(updateService.isVersionNewer("v1.0.0", "v1.1.0")).toBe(true)
      expect(updateService.isVersionNewer("1.0.0", "v1.1.0")).toBe(true)
      expect(updateService.isVersionNewer("v1.1.0", "1.1.0")).toBe(false)
    })

    it("returns false when latest version is older or identical", () => {
      expect(updateService.isVersionNewer("1.1.1", "1.1.0")).toBe(false)
      expect(updateService.isVersionNewer("1.1.0", "1.1.0")).toBe(false)
      expect(updateService.isVersionNewer("2.0.0", "1.9.9")).toBe(false)
    })

    it("handles pre-release tags correctly", () => {
      // Stable release is newer than pre-release of the same version
      expect(updateService.isVersionNewer("1.1.0-beta.1", "1.1.0")).toBe(true)
      expect(updateService.isVersionNewer("1.1.0-dev", "1.1.0")).toBe(true)

      // Pre-release is not newer than stable release of the same version
      expect(updateService.isVersionNewer("1.1.0", "1.1.0-beta.1")).toBe(false)

      // Pre-release progression
      expect(
        updateService.isVersionNewer("1.1.0-alpha.1", "1.1.0-beta.1")
      ).toBe(true)
      expect(
        updateService.isVersionNewer("1.1.0-beta.2", "1.1.0-beta.1")
      ).toBe(false)

      // Newer core version pre-release is newer than older stable
      expect(updateService.isVersionNewer("1.0.0", "1.1.0-beta.1")).toBe(true)
    })
  })

  describe("findMatchingAsset", () => {
    const mockAssets = [
      {
        name: "Galleo-1.1.0-arm64.dmg",
        browser_download_url: "https://dl/arm64.dmg",
      },
      {
        name: "Galleo-1.1.0-arm64.dmg.blockmap",
        browser_download_url: "https://dl/dmg.blockmap",
      },
      {
        name: "Galleo-1.1.0-x64.dmg",
        browser_download_url: "https://dl/x64.dmg",
      },
      {
        name: "Galleo-1.1.0.AppImage",
        browser_download_url: "https://dl/appimage",
      },
      {
        name: "Galleo-Setup-1.1.0.exe",
        browser_download_url: "https://dl/setup.exe",
      },
      {
        name: "Galleo-Setup-1.1.0.exe.blockmap",
        browser_download_url: "https://dl/exe.blockmap",
      },
      {
        name: "galleo_1.1.0_amd64.deb",
        browser_download_url: "https://dl/deb",
      },
      { name: "latest.yml", browser_download_url: "https://dl/yml" },
    ]

    it("matches Windows installer on win32 x64", () => {
      const asset = updateService.findMatchingAsset(mockAssets, "win32", "x64")
      expect(asset?.name).toBe("Galleo-Setup-1.1.0.exe")
      expect(asset?.browser_download_url).toBe("https://dl/setup.exe")
    })

    it("matches macOS ARM64 installer on darwin arm64", () => {
      const asset = updateService.findMatchingAsset(
        mockAssets,
        "darwin",
        "arm64"
      )
      expect(asset?.name).toBe("Galleo-1.1.0-arm64.dmg")
      expect(asset?.browser_download_url).toBe("https://dl/arm64.dmg")
    })

    it("matches macOS Intel installer on darwin x64", () => {
      const asset = updateService.findMatchingAsset(mockAssets, "darwin", "x64")
      expect(asset?.name).toBe("Galleo-1.1.0-x64.dmg")
      expect(asset?.browser_download_url).toBe("https://dl/x64.dmg")
    })

    it("matches Linux package on linux x64", () => {
      const asset = updateService.findMatchingAsset(mockAssets, "linux", "x64")
      expect(["galleo_1.1.0_amd64.deb", "Galleo-1.1.0.AppImage"]).toContain(
        asset?.name
      )
    })
  })

  describe("checkForUpdates cache synchronization", () => {
    it("synchronizes currentVersion and updateAvailable on TTL cache hit", async () => {
      vi.mocked(app.getVersion).mockReturnValue("1.1.1")

      const staleCache = {
        data: {
          updateAvailable: true,
          currentVersion: "1.0.1",
          latestVersion: "1.1.0",
          releaseUrl: "https://github.com/releases/1.1.0",
          downloadUrl: "https://github.com/releases/1.1.0/setup.exe",
        },
        timestamp: Date.now() - 1000,
      }

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(staleCache))

      const result = await updateService.checkForUpdates(false)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.currentVersion).toBe("1.1.1")
        expect(result.data.updateAvailable).toBe(false)
      }
    })

    it("synchronizes currentVersion and updateAvailable on HTTP 304 response", async () => {
      vi.mocked(app.getVersion).mockReturnValue("1.1.1")

      const staleCache = {
        data: {
          updateAvailable: true,
          currentVersion: "1.0.1",
          latestVersion: "1.1.0",
          releaseUrl: "https://github.com/releases/1.1.0",
          downloadUrl: "https://github.com/releases/1.1.0/setup.exe",
        },
        etag: "W/mocketag",
        timestamp: Date.now() - 10000000,
      }

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(staleCache))

      global.fetch = vi.fn().mockResolvedValue({
        status: 304,
        ok: false,
        headers: new Headers(),
      })

      const result = await updateService.checkForUpdates(true)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.currentVersion).toBe("1.1.1")
        expect(result.data.updateAvailable).toBe(false)
      }
    })
  })

  describe("downloadUpdate and installUpdate", () => {
    it("fails downloadUpdate when given invalid URL", async () => {
      const mockWindow = {
        isDestroyed: vi.fn(() => false),
        webContents: { send: vi.fn() },
      } as unknown as import("electron").BrowserWindow

      const result = await updateService.downloadUpdate(
        mockWindow,
        "invalid-url"
      )
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe("UNKNOWN")
      }
    })

    it("fails installUpdate when no installer has been downloaded", async () => {
      const result = await updateService.installUpdate()
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe("UNKNOWN")
      }
    })

    it("launches installer and quits app when installer path is set", async () => {
      updateService.setDownloadedInstallerPathForTesting(
        "/mock/temp/Galleo-Setup.exe"
      )
      const result = await updateService.installUpdate()
      expect(result.ok).toBe(true)
      expect(app.quit).toHaveBeenCalled()
    })
  })
})
