import "./polyfill"

import fs from "fs"
import path from "path"
import { Readable } from "stream"
import { fileURLToPath } from "url"

import { app, BrowserWindow, protocol } from "electron"

import { registerIpcHandlers } from "./ipc-router"
import { initDatabase, closeDatabase } from "./infrastructure/database"

// Register custom media protocol to load local files safely in Electron
protocol.registerSchemesAsPrivileged([
  {
    scheme: "media",
    privileges: {
      bypassCSP: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      standard: true,
    },
  },
])

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: "Galleo",
    backgroundColor: "#0c0d12",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })

  // Open developer tools in development
  const devServerUrl = process.env.VITE_DEV_SERVER_URL
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl)
  } else {
    mainWindow.loadFile(path.join(__dirname, "../../dist/index.html"))
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show()
  })

  mainWindow.on("closed", () => {
    mainWindow = null
  })

  // Initialize SQLite schema and SQLite connection
  initDatabase()

  // Register IPC Routing Handlers
  registerIpcHandlers(mainWindow)
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase().slice(1)
  const mimeTypes: Record<string, string> = {
    // Video
    mp4: "video/mp4",
    webm: "video/webm",
    mkv: "video/x-matroska",
    mov: "video/quicktime",
    avi: "video/x-msvideo",
    wmv: "video/x-ms-wmv",
    flv: "video/x-flv",
    // Audio
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    m4a: "audio/mp4",
    flac: "audio/flac",
    // Images
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    bmp: "image/bmp",
    ico: "image/x-icon",
  }
  return mimeTypes[ext] || "application/octet-stream"
}

interface CachedMediaStat {
  size: number
  mtimeMs: number
  etag: string
  lastModified: string
  mimeType: string
  cachedAt: number
}

const mediaStatCache = new Map<string, CachedMediaStat>()
const MAX_MEDIA_STAT_CACHE = 2000
const MEDIA_STAT_CACHE_TTL_MS = 60_000

async function getMediaFileStat(filePath: string): Promise<CachedMediaStat | null> {
  const now = Date.now()
  const cached = mediaStatCache.get(filePath)
  if (cached && now - cached.cachedAt < MEDIA_STAT_CACHE_TTL_MS) {
    return cached
  }

  try {
    const stats = await fs.promises.stat(filePath)
    if (!stats.isFile()) return null
    const fileSize = stats.size
    const mimeType = getMimeType(filePath)
    const etag = `"${stats.mtimeMs.toString(36)}-${fileSize.toString(36)}"`
    const lastModified = stats.mtime.toUTCString()
    const entry: CachedMediaStat = {
      size: fileSize,
      mtimeMs: stats.mtimeMs,
      etag,
      lastModified,
      mimeType,
      cachedAt: now,
    }

    if (mediaStatCache.size >= MAX_MEDIA_STAT_CACHE) {
      const oldestKey = mediaStatCache.keys().next().value
      if (oldestKey) mediaStatCache.delete(oldestKey)
    }
    mediaStatCache.set(filePath, entry)
    return entry
  } catch {
    return null
  }
}

app.whenReady().then(() => {
  // Handle media:/// requests by fetching from local file system asynchronously
  protocol.handle("media", async (request) => {
    try {
      const url = new URL(request.url)
      let resolvedPath: string
      try {
        resolvedPath = decodeURIComponent(url.pathname)
      } catch {
        return new Response("Bad Request: Invalid URI encoding", { status: 400 })
      }

      // If Electron normalized the drive letter as host, reconstruct the Windows path
      if (url.host) {
        if (url.host.length === 1 && /^[a-zA-Z]$/.test(url.host)) {
          resolvedPath = url.host + ":" + resolvedPath
        } else {
          resolvedPath = url.host + resolvedPath
        }
      }

      // Strip leading slash before drive letter on Windows if present (e.g. "/D:/..." -> "D:/...")
      if (
        resolvedPath.startsWith("/") &&
        resolvedPath.length > 2 &&
        resolvedPath[2] === ":"
      ) {
        resolvedPath = resolvedPath.slice(1)
      }

      const mediaStat = await getMediaFileStat(resolvedPath)
      if (!mediaStat) {
        return new Response("Not Found", { status: 404 })
      }

      const fileSize = mediaStat.size
      const mimeType = mediaStat.mimeType
      const etag = mediaStat.etag
      const lastModified = mediaStat.lastModified

      // Handle conditional validation for instant 304 Not Modified cache hits
      const ifNoneMatch = request.headers.get("if-none-match")
      const ifModifiedSince = request.headers.get("if-modified-since")

      if (
        ifNoneMatch === etag ||
        (ifModifiedSince &&
          !isNaN(Date.parse(ifModifiedSince)) &&
          new Date(ifModifiedSince).getTime() >=
            Math.floor(mediaStat.mtimeMs / 1000) * 1000)
      ) {
        return new Response(null, {
          status: 304,
          headers: {
            "ETag": etag,
            "Last-Modified": lastModified,
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        })
      }

      // Support Range request for video seeking
      const range = request.headers.get("range")
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-")
        const start = parseInt(parts[0], 10)
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1

        if (start >= fileSize || end >= fileSize || start > end) {
          return new Response("Range Not Satisfiable", {
            status: 416,
            headers: {
              "Content-Range": `bytes */${fileSize}`,
            },
          })
        }

        const chunksize = end - start + 1
        const fileStream = fs.createReadStream(resolvedPath, { start, end })
        if (request.signal) {
          request.signal.addEventListener("abort", () => {
            fileStream.destroy()
          })
        }
        const webStream = Readable.toWeb(fileStream)

        return new Response(webStream as unknown as ReadableStream, {
          status: 206,
          headers: {
            "Content-Range": `bytes ${start}-${end}/${fileSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": chunksize.toString(),
            "Content-Type": mimeType,
            "ETag": etag,
            "Last-Modified": lastModified,
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        })
      } else {
        const fileStream = fs.createReadStream(resolvedPath)
        if (request.signal) {
          request.signal.addEventListener("abort", () => {
            fileStream.destroy()
          })
        }
        const webStream = Readable.toWeb(fileStream)
        return new Response(webStream as unknown as ReadableStream, {
          status: 200,
          headers: {
            "Content-Length": fileSize.toString(),
            "Content-Type": mimeType,
            "Accept-Ranges": "bytes",
            "ETag": etag,
            "Last-Modified": lastModified,
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        })
      }
    } catch (err: unknown) {
      console.error("Failed to resolve local media resource:", err)
      return new Response("Not Found", { status: 404 })
    }
  })

  createWindow()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("will-quit", () => {
  // Close database cleanly
  closeDatabase()
})
