import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { UpdateService } from "../update.service"
import { app } from "electron"
import fs from "fs/promises"
import { existsSync } from "fs"
import path from "path"
import { getUpdatesDir } from "../../infrastructure/app-paths"

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

vi.mock("../../infrastructure/app-paths", () => ({
  getUpdateCachePath: vi.fn(() => "/mock/path/update_cache.json"),
  getUpdatesDir: vi.fn(() => "/mock/path/updates"),
}))

vi.mock("../storage.service", () => ({
  storageService: {
    invalidateCache: vi.fn(),
  },
}))

vi.mock("fs", () => {
  const fsMock = {
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
    createWriteStream: vi.fn(() => ({
      write: vi.fn(),
      end: vi.fn((cb?: () => void) => {
        if (cb) cb()
      }),
      on: vi.fn(),
    })),
  }
  return {
    ...fsMock,
    default: fsMock,
  }
})

vi.mock("fs/promises", () => {
  const fspMock = {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    chmod: vi.fn(),
    readdir: vi.fn().mockResolvedValue([]),
    unlink: vi.fn().mockResolvedValue(undefined),
    stat: vi.fn().mockResolvedValue({ size: 12345678, mtimeMs: 1000 }),
  }
  return {
    ...fspMock,
    default: fspMock,
  }
})

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

  describe("extractVersionFromFilename", () => {
    it("extracts version strings correctly from setup filenames", () => {
      expect(
        updateService.extractVersionFromFilename("Galleo-Setup-1.2.3.exe")
      ).toBe("1.2.3")
      expect(
        updateService.extractVersionFromFilename("galleo_1.2.3_amd64.deb")
      ).toBe("1.2.3")
      expect(
        updateService.extractVersionFromFilename("Galleo-1.2.3-arm64.dmg")
      ).toBe("1.2.3")
      expect(
        updateService.extractVersionFromFilename("Galleo-1.2.3-beta.1.AppImage")
      ).toBe("1.2.3-beta.1")
      expect(updateService.extractVersionFromFilename("unknown.txt")).toBe(null)
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

  describe("cleanupPreviousVersions", () => {
    it("removes older version installers and preserves newer/active installer", async () => {
      vi.mocked(app.getVersion).mockReturnValue("1.1.1")
      ;(
        vi.mocked(fs.readdir) as unknown as ReturnType<typeof vi.fn>
      ).mockImplementation(async (dir: unknown) => {
        if (String(dir).includes("updates")) {
          return [
            { name: "Galleo-Setup-1.0.0.exe", isFile: () => true },
            { name: "Galleo-Setup-1.1.2.exe", isFile: () => true },
            { name: "download.partial", isFile: () => true },
          ]
        }
        return []
      })

      await updateService.cleanupPreviousVersions()

      // Should delete Galleo-Setup-1.0.0.exe (older than 1.1.1) and download.partial
      expect(fs.unlink).toHaveBeenCalledWith(
        expect.stringContaining("Galleo-Setup-1.0.0.exe")
      )
      expect(fs.unlink).toHaveBeenCalledWith(
        expect.stringContaining("download.partial")
      )
      // Should NOT delete Galleo-Setup-1.1.2.exe
      expect(fs.unlink).not.toHaveBeenCalledWith(
        expect.stringContaining("Galleo-Setup-1.1.2.exe")
      )
    })

    it("removes all other installers when activeInstallerPath is provided", async () => {
      ;(
        vi.mocked(fs.readdir) as unknown as ReturnType<typeof vi.fn>
      ).mockImplementation(async (dir: unknown) => {
        if (String(dir).includes("updates")) {
          return [
            { name: "Galleo-Setup-1.1.0.exe", isFile: () => true },
            { name: "Galleo-Setup-1.1.2.exe", isFile: () => true },
          ]
        }
        return []
      })

      const activePath = path.join(getUpdatesDir(), "Galleo-Setup-1.1.2.exe")
      await updateService.cleanupPreviousVersions(activePath)

      expect(fs.unlink).toHaveBeenCalledWith(
        expect.stringContaining("Galleo-Setup-1.1.0.exe")
      )
      expect(fs.unlink).not.toHaveBeenCalledWith(
        expect.stringContaining("Galleo-Setup-1.1.2.exe")
      )
    })
  })

  describe("getDownloadedInstallerInfo and deleteDownloadedInstaller", () => {
    it("returns installer metadata when an installer exists", async () => {
      vi.mocked(existsSync).mockReturnValue(true)
      const installerPath = path.join(
        getUpdatesDir(),
        "Galleo-Setup-1.1.2.exe"
      )
      updateService.setDownloadedInstallerPathForTesting(installerPath)
      vi.mocked(fs.stat).mockResolvedValueOnce({
        size: 52428800,
        mtimeMs: 2000,
      } as unknown as import("fs").Stats)

      const result = await updateService.getDownloadedInstallerInfo()
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data).toEqual({
          path: installerPath,
          filename: "Galleo-Setup-1.1.2.exe",
          sizeBytes: 52428800,
          version: "1.1.2",
          isCurrentVersion: false,
        })
      }
    })

    it("returns null when no installer is found", async () => {
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(fs.readdir).mockResolvedValueOnce([])

      const result = await updateService.getDownloadedInstallerInfo()
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data).toBeNull()
      }
    })

    it("deletes installer files and clears reference on deleteDownloadedInstaller", async () => {
      const installerPath = path.join(
        getUpdatesDir(),
        "Galleo-Setup-1.1.2.exe"
      )
      updateService.setDownloadedInstallerPathForTesting(installerPath)
      ;(
        vi.mocked(fs.readdir) as unknown as ReturnType<typeof vi.fn>
      ).mockImplementation(async (dir: unknown) => {
        if (String(dir).includes("updates")) {
          return [{ name: "Galleo-Setup-1.1.2.exe", isFile: () => true }]
        }
        return []
      })

      const result = await updateService.deleteDownloadedInstaller()
      expect(result.ok).toBe(true)
      expect(updateService.getDownloadedInstallerPath()).toBeNull()
      expect(fs.unlink).toHaveBeenCalled()
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

    it("fails installUpdate when no installer has been downloaded or found", async () => {
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(fs.readdir).mockResolvedValueOnce([])
      const result = await updateService.installUpdate()
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe("UNKNOWN")
      }
    })

    it("launches installer and quits app when installer path is set", async () => {
      vi.mocked(existsSync).mockReturnValue(true)
      updateService.setDownloadedInstallerPathForTesting(
        "/mock/path/updates/Galleo-Setup.exe"
      )
      const result = await updateService.installUpdate()
      expect(result.ok).toBe(true)
      expect(app.quit).toHaveBeenCalled()
    })
  })
})

