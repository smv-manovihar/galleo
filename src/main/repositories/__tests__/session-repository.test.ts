import { describe, it, expect, beforeEach, vi } from "vitest"
import type {
  SessionCheckpoint,
  UndoableAction,
} from "../../../shared/types/session"

// In-memory data store for mocking better-sqlite3 behavior without native binary dependencies
interface MockSessionRow {
  session_id: string
  folder_path: string
  total_files: number
  current_index: number
  saved_at: string
}

interface MockDecisionRow {
  session_id: string
  media_id: string
  decision: string
}

interface MockUndoRow {
  id: string
  session_id: string
  media_id: string
  type: string
  timestamp: number
  previous_state: string
  new_state: string
}

const mockSessions = new Map<string, MockSessionRow>()
const mockDecisions: MockDecisionRow[] = []
const mockUndoActions: MockUndoRow[] = []

vi.mock("../../infrastructure/database", () => ({
  initDatabase: () => ({
    prepare: (sql: string) => {
      const normalizedSql = sql.trim().replace(/\s+/g, " ")

      if (normalizedSql.includes("SELECT session_id FROM sessions WHERE LOWER(folder_path) = ?")) {
        return {
          get: (folderNorm: string) => {
            for (const s of mockSessions.values()) {
              if (s.folder_path.toLowerCase() === folderNorm.toLowerCase()) {
                return { session_id: s.session_id }
              }
            }
            return undefined
          },
        }
      }

      if (normalizedSql.includes("INSERT INTO sessions")) {
        return {
          run: (params: {
            sessionId: string
            folderPath: string
            totalFiles: number
            currentIndex: number
            savedAt: string
          }) => {
            mockSessions.set(params.folderPath.toLowerCase(), {
              session_id: params.sessionId,
              folder_path: params.folderPath,
              total_files: params.totalFiles,
              current_index: params.currentIndex,
              saved_at: params.savedAt,
            })
          },
        }
      }

      if (normalizedSql.includes("DELETE FROM session_decisions WHERE session_id = ?")) {
        return {
          run: (sessionId: string) => {
            for (let i = mockDecisions.length - 1; i >= 0; i--) {
              if (mockDecisions[i].session_id === sessionId) {
                mockDecisions.splice(i, 1)
              }
            }
          },
        }
      }

      if (normalizedSql.includes("DELETE FROM undo_actions WHERE session_id = ?")) {
        return {
          run: (sessionId: string) => {
            for (let i = mockUndoActions.length - 1; i >= 0; i--) {
              if (mockUndoActions[i].session_id === sessionId) {
                mockUndoActions.splice(i, 1)
              }
            }
          },
        }
      }

      if (normalizedSql.includes("INSERT INTO session_decisions")) {
        return {
          run: (params: {
            sessionId: string
            mediaId: string
            decision: string
          }) => {
            mockDecisions.push({
              session_id: params.sessionId,
              media_id: params.mediaId,
              decision: params.decision,
            })
          },
        }
      }

      if (normalizedSql.includes("INSERT INTO undo_actions")) {
        return {
          run: (params: {
            id: string
            sessionId: string
            mediaId: string
            type: string
            timestamp: number
            previousState: string
            newState: string
          }) => {
            mockUndoActions.push({
              id: params.id,
              session_id: params.sessionId,
              media_id: params.mediaId,
              type: params.type,
              timestamp: params.timestamp,
              previous_state: params.previousState,
              new_state: params.newState,
            })
          },
        }
      }

      if (normalizedSql.includes("SELECT * FROM sessions WHERE LOWER(folder_path) = ?")) {
        return {
          get: (folderNorm: string) => {
            return mockSessions.get(folderNorm.toLowerCase())
          },
        }
      }

      if (normalizedSql.includes("SELECT media_id, decision FROM session_decisions WHERE session_id = ?")) {
        return {
          all: (sessionId: string) => {
            return mockDecisions.filter((d) => d.session_id === sessionId)
          },
        }
      }

      if (normalizedSql.includes("SELECT * FROM undo_actions WHERE session_id = ? ORDER BY timestamp ASC")) {
        return {
          all: (sessionId: string) => {
            return mockUndoActions
              .filter((u) => u.session_id === sessionId)
              .sort((a, b) => a.timestamp - b.timestamp)
          },
        }
      }

      if (normalizedSql.includes("DELETE FROM sessions WHERE session_id = ?")) {
        return {
          run: (sessionId: string) => {
            for (const [key, s] of mockSessions.entries()) {
              if (s.session_id === sessionId) {
                mockSessions.delete(key)
              }
            }
            for (let i = mockDecisions.length - 1; i >= 0; i--) {
              if (mockDecisions[i].session_id === sessionId) {
                mockDecisions.splice(i, 1)
              }
            }
            for (let i = mockUndoActions.length - 1; i >= 0; i--) {
              if (mockUndoActions[i].session_id === sessionId) {
                mockUndoActions.splice(i, 1)
              }
            }
          },
        }
      }

      throw new Error(`Unhandled SQL in mock: ${sql}`)
    },
    transaction: (fn: (...args: unknown[]) => unknown) => (...args: unknown[]) => fn(...args),
  }),
}))

import { SessionRepository } from "../session.repository"

describe("SessionRepository Checkpoint & Undo Stack Persistence", () => {
  const repo = new SessionRepository()
  const testFolder = "d:/test_photos/vacation"

  beforeEach(() => {
    mockSessions.clear()
    mockDecisions.length = 0
    mockUndoActions.length = 0
  })

  it("persists and retrieves a session checkpoint with full multi-source undoStack", () => {
    const undoStack: UndoableAction[] = [
      {
        id: "action_1",
        type: "mark-delete",
        mediaId: "item_101",
        timestamp: 1000,
        previousState: { reviewState: "pending" },
        newState: { reviewState: "delete", source: "culling" },
      },
      {
        id: "action_2",
        type: "mark-keep",
        mediaId: "item_102",
        timestamp: 2000,
        previousState: { reviewState: "pending" },
        newState: {
          reviewState: "keep",
          source: "duplicates",
          batchId: "batch_dup_1",
        },
      },
      {
        id: "action_3",
        type: "mark-delete",
        mediaId: "item_103",
        timestamp: 3000,
        previousState: { reviewState: "keep" },
        newState: { reviewState: "delete", source: "browse" },
      },
    ]

    const checkpoint: SessionCheckpoint = {
      sessionId: "session_test_123",
      folderPath: testFolder,
      totalFiles: 25,
      currentIndex: 5,
      decisions: {
        item_101: "delete",
        item_102: "keep",
        item_103: "delete",
      },
      undoStack,
      savedAt: new Date().toISOString(),
    }

    repo.saveCheckpoint(checkpoint)

    const loaded = repo.getCheckpoint(testFolder)
    expect(loaded).not.toBeNull()
    expect(loaded?.sessionId).toBe("session_test_123")
    expect(loaded?.totalFiles).toBe(25)
    expect(loaded?.currentIndex).toBe(5)
    expect(loaded?.decisions).toEqual({
      item_101: "delete",
      item_102: "keep",
      item_103: "delete",
    })

    // Verify undoStack restored accurately in chronological order
    expect(loaded?.undoStack.length).toBe(3)
    expect(loaded?.undoStack[0]).toEqual(undoStack[0])
    expect(loaded?.undoStack[1]).toEqual(undoStack[1])
    expect(loaded?.undoStack[2]).toEqual(undoStack[2])
    expect(loaded?.undoStack[1].newState.source).toBe("duplicates")
    expect(loaded?.undoStack[1].newState.batchId).toBe("batch_dup_1")
  })

  it("handles case-insensitive and slash-variant folder paths seamlessly", () => {
    const windowsFolder = "D:\\Test_Photos\\Vacation"
    const unixFolder = "d:/test_photos/vacation/"

    const checkpoint: SessionCheckpoint = {
      sessionId: "session_case_test",
      folderPath: windowsFolder,
      totalFiles: 10,
      currentIndex: 1,
      decisions: { item_1: "keep" },
      undoStack: [
        {
          id: "act_case_1",
          type: "mark-keep",
          mediaId: "item_1",
          timestamp: 1000,
          previousState: { reviewState: "pending" },
          newState: { reviewState: "keep", source: "duplicates" },
        },
      ],
      savedAt: new Date().toISOString(),
    }

    repo.saveCheckpoint(checkpoint)

    // Lookup with lowercased unix variant
    const loaded = repo.getCheckpoint(unixFolder)
    expect(loaded).not.toBeNull()
    expect(loaded?.sessionId).toBe("session_case_test")
    expect(loaded?.decisions.item_1).toBe("keep")
    expect(loaded?.undoStack.length).toBe(1)
    expect(loaded?.undoStack[0].mediaId).toBe("item_1")

    // Clear using unix variant and verify deletion
    repo.clearCheckpoint(unixFolder)
    expect(repo.getCheckpoint(windowsFolder)).toBeNull()
  })

  it("updates existing checkpoints cleanly without leaving orphaned records", () => {
    const checkpoint1: SessionCheckpoint = {
      sessionId: "session_old",
      folderPath: testFolder,
      totalFiles: 10,
      currentIndex: 1,
      decisions: { item_old: "delete" },
      undoStack: [
        {
          id: "act_old",
          type: "mark-delete",
          mediaId: "item_old",
          timestamp: 500,
          previousState: { reviewState: "pending" },
          newState: { reviewState: "delete", source: "culling" },
        },
      ],
      savedAt: new Date().toISOString(),
    }

    repo.saveCheckpoint(checkpoint1)

    // Save updated checkpoint for same folder with new sessionId
    const checkpoint2: SessionCheckpoint = {
      sessionId: "session_new",
      folderPath: testFolder,
      totalFiles: 10,
      currentIndex: 2,
      decisions: { item_new: "keep" },
      undoStack: [
        {
          id: "act_new",
          type: "mark-keep",
          mediaId: "item_new",
          timestamp: 600,
          previousState: { reviewState: "pending" },
          newState: { reviewState: "keep", source: "culling" },
        },
      ],
      savedAt: new Date().toISOString(),
    }

    repo.saveCheckpoint(checkpoint2)

    const loaded = repo.getCheckpoint(testFolder)
    expect(loaded?.sessionId).toBe("session_new")
    expect(loaded?.decisions).toEqual({ item_new: "keep" })
    expect(loaded?.undoStack.length).toBe(1)
    expect(loaded?.undoStack[0].id).toBe("act_new")
    expect(mockDecisions.find((d) => d.session_id === "session_old")).toBeUndefined()
    expect(mockUndoActions.find((u) => u.session_id === "session_old")).toBeUndefined()
  })
})
