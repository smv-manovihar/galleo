import type { Database } from "better-sqlite3"
import type { AppSettings } from "../../shared/types/settings"
import { DEFAULT_SETTINGS } from "../../shared/constants"
import { initDatabase } from "../infrastructure/database"

export class SettingsRepository {
  private getDb(): Database {
    return initDatabase()
  }

  public getSettings(): AppSettings {
    const db = this.getDb()
    try {
      const stmt = db.prepare("SELECT value FROM settings WHERE key = ?")
      const row = stmt.get("app_settings") as { value: string } | undefined

      if (!row) {
        // Persist default settings on first access
        this.saveSettings(DEFAULT_SETTINGS)
        return DEFAULT_SETTINGS
      }

      const parsed = JSON.parse(row.value) as AppSettings
      // Merge with defaults to ensure fallback fields exist (schema safety for versioning)
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        folders: { ...DEFAULT_SETTINGS.folders, ...parsed.folders },
        scanning: { ...DEFAULT_SETTINGS.scanning, ...parsed.scanning },
        quality: { ...DEFAULT_SETTINGS.quality, ...parsed.quality },
        organization: {
          ...DEFAULT_SETTINGS.organization,
          ...parsed.organization,
        },
        ui: { ...DEFAULT_SETTINGS.ui, ...parsed.ui },
        performance: { ...DEFAULT_SETTINGS.performance, ...parsed.performance },
      }
    } catch (e) {
      console.error("Failed to retrieve settings, returning defaults:", e)
      return DEFAULT_SETTINGS
    }
  }

  public saveSettings(settings: AppSettings): void {
    const db = this.getDb()
    const serialized = JSON.stringify(settings)
    const stmt = db.prepare(`
      INSERT INTO settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `)
    stmt.run("app_settings", serialized)
  }
}
