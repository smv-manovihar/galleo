import Database from "better-sqlite3"
import path from "path"
import fs from "fs"
import { app } from "electron"

let dbInstance: Database.Database | null = null

export function getDatabasePath(): string {
  try {
    const isDev = !app.isPackaged || process.env.NODE_ENV === "development"
    let targetDir: string
    if (isDev) {
      targetDir = path.join(process.cwd(), ".data")
    } else {
      targetDir = app.getPath("userData")
    }
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }
    return path.join(targetDir, "galleo.db")
  } catch {
    // If app is not ready (e.g. running in unit test runner), fallback to .data/galleo.db
    const fallbackDir = path.join(process.cwd(), ".data")
    if (!fs.existsSync(fallbackDir)) {
      fs.mkdirSync(fallbackDir, { recursive: true })
    }
    return path.join(fallbackDir, "galleo.db")
  }
}

export function initDatabase(): Database.Database {
  if (dbInstance) {
    return dbInstance
  }

  const dbPath = getDatabasePath()
  const db = new Database(dbPath)

  // Enable WAL mode for concurrency, foreign keys, and synchronous safety
  db.pragma("journal_mode = WAL")
  db.pragma("foreign_keys = ON")
  db.pragma("synchronous = NORMAL")

  // Create Schema Tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS media_items (
      id TEXT PRIMARY KEY,
      path TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      size INTEGER NOT NULL,
      extension TEXT NOT NULL,
      media_type TEXT NOT NULL,
      width INTEGER,
      height INTEGER,
      date_added TEXT NOT NULL,
      date_original TEXT,
      date_inferred TEXT,
      date_filesystem TEXT NOT NULL,
      date_target TEXT NOT NULL,
      date_target_source TEXT NOT NULL,
      hash TEXT,
      thumbnail_path TEXT,
      date_modified TEXT,
      
      -- Quality Metrics
      blur_score REAL,
      brightness REAL,
      is_dark INTEGER DEFAULT 0,
      is_blurry INTEGER DEFAULT 0,
      is_screenshot INTEGER DEFAULT 0,
      is_small INTEGER DEFAULT 0,
      composite_score REAL,
      
      -- Duplicate and Review State
      duplicate_group_id TEXT,
      is_duplicate INTEGER DEFAULT 0,
      is_best_in_duplicate_group INTEGER DEFAULT 0,
      similarity_index INTEGER,
      review_state TEXT DEFAULT 'pending',
      reviewed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      session_id TEXT PRIMARY KEY,
      folder_path TEXT UNIQUE NOT NULL,
      total_files INTEGER NOT NULL,
      current_index INTEGER DEFAULT 0,
      saved_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS session_decisions (
      session_id TEXT NOT NULL,
      media_id TEXT NOT NULL,
      decision TEXT NOT NULL,
      PRIMARY KEY (session_id, media_id),
      FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS undo_actions (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      media_id TEXT NOT NULL,
      type TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      previous_state TEXT NOT NULL, -- JSON string
      new_state TEXT NOT NULL,       -- JSON string
      FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
    );

    -- Image embeddings (1 vector per media item)
    CREATE TABLE IF NOT EXISTS media_embeddings (
      media_id TEXT PRIMARY KEY,
      embedding BLOB NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (media_id) REFERENCES media_items(id) ON DELETE CASCADE
    );

    -- Video frame embeddings (multiple vectors per video)
    CREATE TABLE IF NOT EXISTS video_frame_embeddings (
      id TEXT PRIMARY KEY,
      media_id TEXT NOT NULL,
      timestamp_seconds REAL NOT NULL,
      frame_index INTEGER NOT NULL,
      embedding BLOB NOT NULL,
      thumbnail_path TEXT,
      FOREIGN KEY (media_id) REFERENCES media_items(id) ON DELETE CASCADE
    );

    -- Create Indexes to optimize queries
    CREATE INDEX IF NOT EXISTS idx_media_path ON media_items(path);
    CREATE INDEX IF NOT EXISTS idx_media_target_date ON media_items(date_target);
    CREATE INDEX IF NOT EXISTS idx_media_quality ON media_items(composite_score);
    CREATE INDEX IF NOT EXISTS idx_media_duplicate_group ON media_items(duplicate_group_id) WHERE duplicate_group_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_media_review_state ON media_items(review_state);
    CREATE INDEX IF NOT EXISTS idx_session_decisions ON session_decisions(session_id);
    CREATE INDEX IF NOT EXISTS idx_undo_session ON undo_actions(session_id);
    CREATE INDEX IF NOT EXISTS idx_video_frames_media ON video_frame_embeddings(media_id);
  `)

  // Backward-compatible migration: add date_modified column if it does not exist yet
  try {
    db.exec(`ALTER TABLE media_items ADD COLUMN date_modified TEXT;`)
  } catch {
    // Column already exists — safe to ignore
  }

  try {
    db.exec(`ALTER TABLE media_items ADD COLUMN similarity_index INTEGER;`)
  } catch {
    // Column already exists — safe to ignore
  }

  dbInstance = db
  return db
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}
