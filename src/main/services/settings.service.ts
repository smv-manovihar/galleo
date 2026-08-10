import { SettingsRepository } from "../repositories/settings.repository"
import type { AppSettings } from "../../shared/types/settings"
import { type Result, ok, fail } from "../../shared/types/results"
import { fileExists } from "../infrastructure/file-system"
import fs from "fs/promises"

export class SettingsService {
  private repository = new SettingsRepository()

  public getSettings(): AppSettings {
    return this.repository.getSettings()
  }

  public async saveSettings(settings: AppSettings): Promise<Result<void>> {
    try {
      // 1. Validate root folder paths
      for (const root of settings.folders.roots) {
        const exists = await fileExists(root.path)
        if (!exists) {
          return fail({
            code: "FILE_NOT_FOUND",
            path: root.path,
            message: `Root folder does not exist: ${root.path}`,
          })
        }
      }

      // 2. Validate and prepare destination folder path (if custom)
      if (
        settings.folders.destinationMode === "custom" &&
        settings.folders.destination
      ) {
        const destExists = await fileExists(settings.folders.destination)
        if (!destExists) {
          try {
            // Attempt to create destination folder if missing
            await fs.mkdir(settings.folders.destination, { recursive: true })
          } catch {
            return fail({
              code: "PERMISSION_DENIED",
              path: settings.folders.destination,
              message: `Unable to create destination directory: ${settings.folders.destination}`,
            })
          }
        }
      }

      // 3. Save settings
      this.repository.saveSettings(settings)
      return ok(undefined)
    } catch (e: unknown) {
      const err = e as { message?: string }
      return fail({
        code: "UNKNOWN",
        message: err.message || "Saving settings failed",
      })
    }
  }
}
