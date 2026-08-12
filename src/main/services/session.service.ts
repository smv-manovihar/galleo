import { SessionRepository } from "../repositories/session.repository"
import { MediaRepository } from "../repositories/media.repository"
import type { SessionCheckpoint } from "../../shared/types/session"
import { type Result, ok, fail } from "../../shared/types/results"

export class SessionService {
  private sessionRepo = new SessionRepository()
  private mediaRepo = new MediaRepository()

  public getCheckpoint(folderPath: string): SessionCheckpoint | null {
    try {
      return this.sessionRepo.getCheckpoint(folderPath)
    } catch {
      return null
    }
  }

  public saveCheckpoint(checkpoint: SessionCheckpoint): Result<void> {
    try {
      this.sessionRepo.saveCheckpoint(checkpoint)
      return ok(undefined)
    } catch (e: unknown) {
      const err = e as Error
      return fail({
        code: "UNKNOWN",
        message: err.message || "Saving session checkpoint failed",
      })
    }
  }

  /**
   * Applies card review decisions in bulk and updates target items in SQLite.
   */
  public updateReviews(
    _sessionId: string,
    updates: {
      mediaId: string
      state: "keep" | "delete" | "skipped" | "pending"
    }[]
  ): Result<void> {
    try {
      const timestamp = new Date().toISOString()
      const mappedUpdates = updates.map((u) => ({
        mediaId: u.mediaId,
        state: u.state,
      }))

      // Update states in SQLite
      this.mediaRepo.updateReviewStatesBatch(mappedUpdates, timestamp)

      return ok(undefined)
    } catch (e: unknown) {
      const err = e as Error
      return fail({
        code: "UNKNOWN",
        message: err.message || "Updating review decisions failed",
      })
    }
  }

  /**
   * Clears the review session checkpoint for a folder path.
   */
  public clearSession(folderPath: string): Result<void> {
    try {
      this.sessionRepo.clearCheckpoint(folderPath)
      return ok(undefined)
    } catch (e: unknown) {
      const err = e as Error
      return fail({
        code: "UNKNOWN",
        message: err.message || "Clearing session failed",
      })
    }
  }
}
