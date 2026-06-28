import './polyfill';

import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { fileURLToPath } from 'url';

import { app, BrowserWindow, protocol } from 'electron';

import { registerIpcHandlers } from './ipc-router';
import { initDatabase, closeDatabase } from './infrastructure/database';

// Register custom media protocol to load local files safely in Electron
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media',
    privileges: {
      bypassCSP: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      standard: true,
    },
  },
]);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'MediaPurge',
    backgroundColor: '#0c0d12', // Background color of HSL(230, 25%, 8%)
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  // Open developer tools in development
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Initialize SQLite schema and SQLite connection
  initDatabase();

  // Register IPC Routing Handlers
  registerIpcHandlers(mainWindow);
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase().slice(1);
  const mimeTypes: Record<string, string> = {
    // Video
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mkv': 'video/x-matroska',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'wmv': 'video/x-ms-wmv',
    'flv': 'video/x-flv',
    // Audio
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'm4a': 'audio/mp4',
    'flac': 'audio/flac',
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'bmp': 'image/bmp',
    'ico': 'image/x-icon',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

app.whenReady().then(() => {
  // Handle media:/// requests by fetching from local file system
  protocol.handle('media', (request) => {
    try {
      const url = new URL(request.url);
      let resolvedPath = decodeURIComponent(url.pathname);
      
      // If Electron normalized the drive letter as host, reconstruct the Windows path
      if (url.host) {
        if (url.host.length === 1 && /^[a-zA-Z]$/.test(url.host)) {
          resolvedPath = url.host + ':' + resolvedPath;
        } else {
          resolvedPath = url.host + resolvedPath;
        }
      }
      
      // Strip leading slash before drive letter on Windows if present (e.g. "/D:/..." -> "D:/...")
      if (resolvedPath.startsWith('/') && resolvedPath.length > 2 && resolvedPath[2] === ':') {
        resolvedPath = resolvedPath.slice(1);
      }

      // Check if file exists
      if (!fs.existsSync(resolvedPath)) {
        return new Response('Not Found', { status: 404 });
      }

      const stats = fs.statSync(resolvedPath);
      const fileSize = stats.size;
      const mimeType = getMimeType(resolvedPath);

      // Support Range request for video seeking
      const range = request.headers.get('range');
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (start >= fileSize || end >= fileSize || start > end) {
          return new Response('Range Not Satisfiable', {
            status: 416,
            headers: {
              'Content-Range': `bytes */${fileSize}`,
            }
          });
        }

        const chunksize = (end - start) + 1;
        const fileStream = fs.createReadStream(resolvedPath, { start, end });
        const webStream = Readable.toWeb(fileStream);

        return new Response(webStream as any, {
          status: 206,
          headers: {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize.toString(),
            'Content-Type': mimeType,
          }
        });
      } else {
        const fileStream = fs.createReadStream(resolvedPath);
        const webStream = Readable.toWeb(fileStream);
        return new Response(webStream as any, {
          status: 200,
          headers: {
            'Content-Length': fileSize.toString(),
            'Content-Type': mimeType,
          }
        });
      }
    } catch (err: any) {
      console.error('Failed to resolve local media resource:', err);
      return new Response('Not Found', { status: 404 });
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  // Close database cleanly
  closeDatabase();
});
