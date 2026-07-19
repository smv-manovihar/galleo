import { SessionRepository } from "../repositories/session.repository"
import { MediaRepository } from "../repositories/media.repository"
import type {
  SessionCheckpoint,
  UndoableAction,
} from "../../shared/types/session"
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
    } catch (e: any) {
      return fail({
        code: "UNKNOWN",
        message: e.message || "Saving session checkpoint failed",
      })
    }
  }

  /**
   * Applies card review decisions in bulk and updates target items in SQLite.
   */
  public updateReviews(
    _sessionId: string,
    updates: { mediaId: string; state: "keep" | "delete" | "skipped" }[],
    _undoAction?: UndoableAction
  ): Result<void> {
    try {
      const timestamp = new Date().toISOString()
      const mappedUpdates = updates.map((u) => ({
        mediaId: u.mediaId,
        state: u.state,
      }))

      // Update states in SQLite
      this.mediaRepo.updateReviewStatesBatch(mappedUpdates, timestamp)

      // If we got an undoable action to register in the session checkpoint
      // the caller is expected to pass it, and saveCheckpoint will store it.

      return ok(undefined)
    } catch (e: any) {
      return fail({
        code: "UNKNOWN",
        message: e.message || "Updating review decisions failed",
      })
    }
  }

  /**
   * Clears the review session checkpoint for a folder path.
   */
  public clearSession(folderPath: string): Result<void> {
    try {
      this.sessionRepo.clearCheckpoint(folderPath)
      this.mediaRepo.resetReviewStatesByFolder(folderPath)
      return ok(undefined)
    } catch (e: any) {
      return fail({
        code: "UNKNOWN",
        message: e.message || "Clearing session failed",
      })
    }
  }
}
