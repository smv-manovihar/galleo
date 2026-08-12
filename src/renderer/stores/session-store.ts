import { create } from "zustand"
import { toast } from "sonner"
import type {
  SessionCheckpoint,
  UndoableAction,
} from "../../shared/types/session"
import type { MediaItem } from "../../shared/types/media"
import { useMediaStore } from "./media-store"

export interface TrashingProgress {
  isActive: boolean
  totalCount: number
  successCount: number
  label: string
  isDone?: boolean
}

interface SessionState {
  checkpoint: SessionCheckpoint | null
  currentIndex: number
  decisions: Record<string, "keep" | "delete" | "skipped">
  undoStack: UndoableAction[]
  isCommitting: boolean
  trashingProgress: TrashingProgress | null

  initSession: (folderPath: string, totalFilesCount: number) => Promise<void>
  submitDecision: (
    mediaId: string,
    state: "keep" | "delete" | "skipped",
    item: MediaItem,
    source: "culling" | "browse" | "duplicates",
    batchId?: string
  ) => Promise<void>
  undo: (sourceFilter?: "culling" | "browse" | "duplicates") => Promise<boolean>
  bulkChangeDecisions: (
    mediaIds: string[],
    newDecision: "keep" | "delete"
  ) => Promise<void>
  commitDeletions: (
    specificMediaIds?: string[]
  ) => Promise<{ successCount: number; failedPaths: string[] | null }>
  startTrashingInBackground: (
    specificMediaIds?: string[],
    label?: string
  ) => Promise<void>
  clearSession: () => Promise<void>
  getProgress: () => { reviewed: number; total: number; percentage: number }
  saveCheckpointDebounced: (checkpoint: SessionCheckpoint) => void
}

const CHECKPOINT_SAVE_DEBOUNCE_MS = 800
const REVIEW_FLUSH_DEBOUNCE_MS = 800

// --- Checkpoint save machinery ---
let checkpointSaveTimer: ReturnType<typeof setTimeout> | null = null
let pendingCheckpoint: SessionCheckpoint | null = null

function scheduleCheckpointSave(checkpoint: SessionCheckpoint): void {
  pendingCheckpoint = checkpoint
  if (checkpointSaveTimer !== null) return
  checkpointSaveTimer = setTimeout(() => {
    checkpointSaveTimer = null
    const checkpointToSave = pendingCheckpoint
    pendingCheckpoint = null
    if (checkpointToSave !== null) {
      void window.api.saveSessionCheckpoint(checkpointToSave)
    }
  }, CHECKPOINT_SAVE_DEBOUNCE_MS)
}

export function cancelPendingCheckpointSave(): void {
  if (checkpointSaveTimer !== null) {
    clearTimeout(checkpointSaveTimer)
    checkpointSaveTimer = null
    pendingCheckpoint = null
  }
}

export function flushPendingCheckpointSave(): void {
  if (checkpointSaveTimer !== null) {
    clearTimeout(checkpointSaveTimer)
    checkpointSaveTimer = null
    if (pendingCheckpoint !== null) {
      void window.api.saveSessionCheckpoint(pendingCheckpoint)
      pendingCheckpoint = null
    }
  }
}

// --- Review write queue (Map: last-write-wins per mediaId) ---
const pendingReviews = new Map<string, "keep" | "delete" | "skipped" | "pending">()
let activeFlushSessionId: string | null = null
let reviewFlushTimer: ReturnType<typeof setTimeout> | null = null

function scheduleReviewFlush(sessionId: string): void {
  activeFlushSessionId = sessionId
  if (reviewFlushTimer !== null) return // timer already running — map will accumulate with latest sessionId
  reviewFlushTimer = setTimeout(() => {
    reviewFlushTimer = null
    const targetSessionId = activeFlushSessionId || sessionId
    const batch = [...pendingReviews.entries()]
    pendingReviews.clear()
    if (batch.length > 0 && targetSessionId) {
      void window.api.updateReviews(
        targetSessionId,
        batch.map(([mediaId, state]) => ({ mediaId, state }))
      )
    }
  }, REVIEW_FLUSH_DEBOUNCE_MS)
}

export function flushPendingReviews(sessionId: string): void {
  if (reviewFlushTimer !== null) {
    clearTimeout(reviewFlushTimer)
    reviewFlushTimer = null
  }
  const batch = [...pendingReviews.entries()]
  pendingReviews.clear()
  if (batch.length > 0) {
    void window.api.updateReviews(
      sessionId,
      batch.map(([mediaId, state]) => ({ mediaId, state }))
    )
  }
}

export const useSessionStore = create<SessionState>((set, get) => ({
  checkpoint: null,
  currentIndex: 0,
  decisions: {},
  undoStack: [],
  isCommitting: false,
  trashingProgress: null,

  initSession: async (folderPath: string, totalFilesCount: number) => {
    try {
      const existing = await window.api.getSessionCheckpoint(folderPath)

      if (existing) {
        let checkpoint = existing
        if (existing.totalFiles !== totalFilesCount) {
          checkpoint = { ...existing, totalFiles: totalFilesCount }
          await window.api.saveSessionCheckpoint(checkpoint)
        }

        // Sync checkpoint decisions back to media store
        const mediaStore = useMediaStore.getState()
        if (mediaStore.items.length > 0) {
          const updatedItems = mediaStore.items.map((item) => {
            if (checkpoint.decisions[item.id]) {
              return { ...item, reviewState: checkpoint.decisions[item.id] }
            }
            return { ...item, reviewState: "pending" as const }
          })
          useMediaStore.getState().setItems(updatedItems)
        }

        set({
          checkpoint,
          currentIndex: checkpoint.currentIndex,
          decisions: checkpoint.decisions,
          undoStack: checkpoint.undoStack,
        })
      } else {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const freshCheckpoint: SessionCheckpoint = {
          sessionId,
          folderPath,
          totalFiles: totalFilesCount,
          currentIndex: 0,
          decisions: {},
          undoStack: [],
          savedAt: new Date().toISOString(),
        }
        await window.api.saveSessionCheckpoint(freshCheckpoint)

        // For a fresh session, reset reviewState in mediaStore to pending
        const mediaStore = useMediaStore.getState()
        if (mediaStore.items.length > 0) {
          const updatedItems = mediaStore.items.map((item) => ({
            ...item,
            reviewState: "pending" as const,
          }))
          useMediaStore.getState().setItems(updatedItems)
        }

        set({
          checkpoint: freshCheckpoint,
          currentIndex: 0,
          decisions: {},
          undoStack: [],
        })
      }
    } catch {
      // Fallback
      set({ checkpoint: null, currentIndex: 0, decisions: {}, undoStack: [] })
    }
  },

  submitDecision: async (
    mediaId: string,
    state: "keep" | "delete" | "skipped",
    item: MediaItem,
    source: "culling" | "browse" | "duplicates",
    batchId?: string
  ) => {
    const { checkpoint, currentIndex, decisions, undoStack } = get()
    if (!checkpoint) return

    // Create Undoable Action
    const actionId = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const previousState = { reviewState: item.reviewState }
    const newState = { reviewState: state, source, batchId }

    const undoAction: UndoableAction = {
      id: actionId,
      type:
        state === "keep"
          ? "mark-keep"
          : state === "delete"
            ? "mark-delete"
            : "skip",
      mediaId,
      timestamp: Date.now(),
      previousState,
      newState,
    }

    const nextIndex = currentIndex + 1
    const updatedDecisions = { ...decisions, [mediaId]: state }
    const updatedUndoStack = [...undoStack, undoAction]

    const updatedCheckpoint: SessionCheckpoint = {
      ...checkpoint,
      currentIndex: nextIndex,
      decisions: updatedDecisions,
      undoStack: updatedUndoStack,
      savedAt: new Date().toISOString(),
    }

    // Update state locally synchronously
    set({
      checkpoint: updatedCheckpoint,
      currentIndex: nextIndex,
      decisions: updatedDecisions,
      undoStack: updatedUndoStack,
    })

    // Update media store review state synchronously
    const mediaStore = useMediaStore.getState()
    useMediaStore.getState().setItems(
      mediaStore.items.map((i) =>
        i.id === mediaId ? { ...i, reviewState: state } : i
      )
    )
    // Schedule debounced checkpoint save in background (non-blocking)
    scheduleCheckpointSave(updatedCheckpoint)

    // Queue review write — flushed as a batch on trailing-edge throttle
    pendingReviews.set(mediaId, state)
    scheduleReviewFlush(checkpoint.sessionId)
  },

  undo: async (sourceFilter?: "culling" | "browse" | "duplicates") => {
    const { checkpoint, undoStack, decisions } = get()
    if (!checkpoint || undoStack.length === 0) return false

    const poppedStack = [...undoStack]
    let targetIndex = -1

    if (sourceFilter) {
      for (let i = poppedStack.length - 1; i >= 0; i--) {
        if (poppedStack[i].newState.source === sourceFilter) {
          targetIndex = i
          break
        }
      }
    } else {
      targetIndex = poppedStack.length - 1
    }

    if (targetIndex === -1) return false

    const actionToUndo = poppedStack[targetIndex]
    const batchId = actionToUndo.newState.batchId

    const actionsToRevert: UndoableAction[] = []
    if (batchId) {
      for (let i = poppedStack.length - 1; i >= 0; i--) {
        if (poppedStack[i].newState.batchId === batchId) {
          actionsToRevert.push(poppedStack[i])
          poppedStack.splice(i, 1)
        }
      }
    } else {
      actionsToRevert.push(actionToUndo)
      poppedStack.splice(targetIndex, 1)
    }

    // Revert decisions
    const updatedDecisions = { ...decisions }
    const reviewsToUpdate: {
      mediaId: string
      state: "keep" | "delete" | "skipped" | "pending"
    }[] = []

    for (const action of actionsToRevert) {
      const prevReviewState = (action.previousState.reviewState ||
        "pending") as "keep" | "delete" | "skipped" | "pending"
      if (prevReviewState === "pending") {
        delete updatedDecisions[action.mediaId]
      } else {
        updatedDecisions[action.mediaId] = prevReviewState
      }
      reviewsToUpdate.push({
        mediaId: action.mediaId,
        state: prevReviewState,
      })
    }

    const prevIndex = Math.max(
      0,
      checkpoint.currentIndex - actionsToRevert.length
    )

    const updatedCheckpoint: SessionCheckpoint = {
      ...checkpoint,
      currentIndex: prevIndex,
      decisions: updatedDecisions,
      undoStack: poppedStack,
      savedAt: new Date().toISOString(),
    }

    // Revert media store review states synchronously before setting state
    const mediaStore = useMediaStore.getState()
    const actionMap = new Map<
      string,
      "keep" | "delete" | "skipped" | "pending"
    >(
      actionsToRevert.map((a) => [
        a.mediaId,
        (a.previousState.reviewState || "pending") as
          | "keep"
          | "delete"
          | "skipped"
          | "pending",
      ])
    )

    useMediaStore.getState().setItems(
      mediaStore.items.map((i) => {
        const prevState = actionMap.get(i.id)
        if (prevState) {
          return { ...i, reviewState: prevState }
        }
        return i
      })
    )

    set({
      checkpoint: updatedCheckpoint,
      currentIndex: prevIndex,
      decisions: updatedDecisions,
      undoStack: poppedStack,
    })

    // Schedule debounced checkpoint save in background (non-blocking)
    scheduleCheckpointSave(updatedCheckpoint)

    // Queue reverted review states — Map overwrites any previous pending writes
    for (const { mediaId, state } of reviewsToUpdate) {
      pendingReviews.set(mediaId, state)
    }
    scheduleReviewFlush(checkpoint.sessionId)

    return true
  },

  bulkChangeDecisions: async (
    mediaIds: string[],
    newDecision: "keep" | "delete"
  ) => {
    const { checkpoint, decisions, undoStack } = get()
    if (!checkpoint) return

    const mediaIdSet = new Set(mediaIds)
    const updatedDecisions = { ...decisions }

    const updatedUndoStack = undoStack.map((a) => {
      if (mediaIdSet.has(a.mediaId)) {
        updatedDecisions[a.mediaId] = newDecision
        return {
          ...a,
          type:
            newDecision === "keep"
              ? ("mark-keep" as const)
              : ("mark-delete" as const),
          newState: { ...a.newState, reviewState: newDecision },
        }
      }
      return a
    })

    const updatedCheckpoint: SessionCheckpoint = {
      ...checkpoint,
      decisions: updatedDecisions,
      undoStack: updatedUndoStack,
      savedAt: new Date().toISOString(),
    }

    // Sync media store review states
    const mediaStore = useMediaStore.getState()
    useMediaStore.getState().setItems(
      mediaStore.items.map((i) =>
        mediaIdSet.has(i.id) ? { ...i, reviewState: newDecision } : i
      )
    )

    set({
      decisions: updatedDecisions,
      undoStack: updatedUndoStack,
      checkpoint: updatedCheckpoint,
    })

    // Schedule debounced checkpoint save
    scheduleCheckpointSave(updatedCheckpoint)

    // Queue all changed reviews
    for (const mediaId of mediaIds) {
      pendingReviews.set(mediaId, newDecision)
    }
    scheduleReviewFlush(checkpoint.sessionId)
  },

  commitDeletions: async (specificMediaIds?: string[]) => {
    const { checkpoint, decisions } = get()
    if (!checkpoint) return { successCount: 0, failedPaths: null }

    set({ isCommitting: true })

    // Retrieve full media objects from browser store to locate file paths
    const mediaStoreItems = useMediaStore.getState().items
    const itemMap = new Map(mediaStoreItems.map((i) => [i.id, i]))

    const pathsToDelete: string[] = []
    const idsToTrash: string[] = []

    const targets = specificMediaIds || Object.keys(decisions)

    for (const mediaId of targets) {
      const item = itemMap.get(mediaId)
      if (!item) continue
      const isDeleteTarget =
        specificMediaIds !== undefined ||
        decisions[mediaId] === "delete" ||
        item.reviewState === "delete"
      if (isDeleteTarget) {
        pathsToDelete.push(item.path)
        idsToTrash.push(mediaId)
      }
    }

    let successCount = 0
    let failedPaths: string[] | null = null

    if (pathsToDelete.length > 0) {
      const res = await window.api.trashFiles(pathsToDelete)
      if (res.ok) {
        successCount = pathsToDelete.length
      } else {
        // Handle partial deletes if we have failed paths
        failedPaths = pathsToDelete
      }
    }

    if (specificMediaIds) {
      // Flush queued reviews before committing so DB is consistent
      flushPendingReviews(checkpoint.sessionId)
      // Partial commit (e.g. for exact duplicates)
      const updatedDecisions = { ...decisions }
      for (const mediaId of specificMediaIds) {
        delete updatedDecisions[mediaId]
      }

      const targetSet = new Set(specificMediaIds)
      const updatedUndoStack = checkpoint.undoStack.filter(
        (action) => !targetSet.has(action.mediaId)
      )

      const newIndex = Math.max(0, checkpoint.currentIndex - idsToTrash.length)

      const updatedCheckpoint: SessionCheckpoint = {
        ...checkpoint,
        currentIndex: newIndex,
        decisions: updatedDecisions,
        undoStack: updatedUndoStack,
        savedAt: new Date().toISOString(),
      }

      cancelPendingCheckpointSave()
      await window.api.saveSessionCheckpoint(updatedCheckpoint)
      await useMediaStore.getState().fetchMediaItems(checkpoint.folderPath)

      set({
        checkpoint: updatedCheckpoint,
        currentIndex: newIndex,
        decisions: updatedDecisions,
        undoStack: updatedUndoStack,
        isCommitting: false,
      })
    } else {
      // Full commit: Flush queued reviews then clear session.
      // Cancel any queued debounced save first so a stale timer cannot
      // re-create the session row after it was deleted.
      flushPendingReviews(checkpoint.sessionId)
      cancelPendingCheckpointSave()
      await window.api.clearSession(checkpoint.folderPath)

      // Clear localStorage active tab and group index for this folder
      localStorage.removeItem(`duplicates_active_tab_${checkpoint.folderPath}`)
      localStorage.removeItem(
        `duplicates_manual_group_index_${checkpoint.folderPath}`
      )

      // Re-fetch folders data to sync UI
      await useMediaStore.getState().fetchMediaItems(checkpoint.folderPath)

      // Reset store states
      set({
        checkpoint: null,
        currentIndex: 0,
        decisions: {},
        undoStack: [],
        isCommitting: false,
      })
    }

    return { successCount, failedPaths }
  },

  startTrashingInBackground: async (
    specificMediaIds?: string[],
    label = "Trashing files..."
  ) => {
    const mediaStoreItems = useMediaStore.getState().items
    const itemMap = new Map(mediaStoreItems.map((i) => [i.id, i]))
    const decisions = get().decisions
    const targets = specificMediaIds || Object.keys(decisions)

    let totalCount = 0
    for (const id of targets) {
      const state = decisions[id] ?? itemMap.get(id)?.reviewState
      if (state === "delete" || specificMediaIds) {
        totalCount++
      }
    }
    if (totalCount === 0 && targets.length > 0) {
      totalCount = targets.length
    }

    set({
      trashingProgress: {
        isActive: true,
        totalCount,
        successCount: 0,
        label,
      },
    })

    const toastId = "trashing-status-toast"
    if (totalCount > 0) {
      toast.success("Trashing started", {
        id: toastId,
        description: `Moving ${totalCount} file${totalCount !== 1 ? "s" : ""} to trash in background.`,
      })
    }

    try {
      const { successCount, failedPaths } = await get().commitDeletions(specificMediaIds)
      set((state) => ({
        trashingProgress: state.trashingProgress
          ? {
              ...state.trashingProgress,
              isActive: false,
              successCount,
              isDone: true,
            }
          : null,
      }))

      if (failedPaths && failedPaths.length > 0) {
        toast.error("Trashing complete with issues", {
          id: toastId,
          description: `Moved ${successCount} file${successCount !== 1 ? "s" : ""} to trash, ${failedPaths.length} failed.`,
        })
      } else {
        toast.success("Trashing complete", {
          id: toastId,
          description: `Successfully moved ${successCount} file${successCount !== 1 ? "s" : ""} to trash.`,
        })
      }
    } catch (err) {
      console.error("Trashing background operation failed:", err)
      toast.error("Trashing failed", {
        id: toastId,
        description: "An error occurred while moving files to trash.",
      })
      set({ trashingProgress: null })
    } finally {
      setTimeout(() => {
        set((state) => {
          if (state.trashingProgress && !state.trashingProgress.isActive) {
            return { trashingProgress: null }
          }
          return {}
        })
      }, 3000)
    }
  },

  clearSession: async () => {
    const { checkpoint } = get()
    if (!checkpoint) return

    flushPendingReviews(checkpoint.sessionId)
    cancelPendingCheckpointSave()
    await window.api.clearSession(checkpoint.folderPath)

    // Clear localStorage active tab and group index for this folder
    localStorage.removeItem(`duplicates_active_tab_${checkpoint.folderPath}`)
    localStorage.removeItem(
      `duplicates_manual_group_index_${checkpoint.folderPath}`
    )

    await useMediaStore.getState().fetchMediaItems(checkpoint.folderPath)

    set({
      checkpoint: null,
      currentIndex: 0,
      decisions: {},
      undoStack: [],
    })
  },

  getProgress: () => {
    const { checkpoint, decisions } = get()
    if (!checkpoint) return { reviewed: 0, total: 0, percentage: 0 }

    const reviewed = Object.keys(decisions).length
    const total = checkpoint.totalFiles
    const percentage = total > 0 ? Math.round((reviewed / total) * 100) : 0

    return { reviewed, total, percentage }
  },

  saveCheckpointDebounced: (checkpoint) => scheduleCheckpointSave(checkpoint),
}))

if (typeof window !== "undefined" && window.api?.getTrashStatus) {
  window.api
    .getTrashStatus()
    .then((status) => {
      if (status.isTrashing && status.progress) {
        useSessionStore.setState({
          trashingProgress: {
            isActive: true,
            totalCount: status.progress.totalCount,
            successCount: status.progress.processedCount,
            label: "Trashing files...",
          },
        })
      }
    })
    .catch(() => {})
}

if (typeof window !== "undefined" && window.api?.onTrashProgress) {
  window.api.onTrashProgress((payload) => {
    useSessionStore.setState((state) => {
      if (!state.trashingProgress) {
        return {
          trashingProgress: {
            isActive: true,
            totalCount: payload.totalCount,
            successCount: payload.processedCount,
            label: "Trashing files...",
          },
        }
      }
      return {
        trashingProgress: {
          ...state.trashingProgress,
          successCount: payload.processedCount,
          totalCount: Math.max(
            state.trashingProgress.totalCount,
            payload.totalCount
          ),
        },
      }
    })
  })
}

if (typeof window !== "undefined" && window.api?.onTrashComplete) {
  window.api.onTrashComplete((payload) => {
    useSessionStore.setState((state) => {
      if (!state.trashingProgress) return state
      return {
        trashingProgress: {
          ...state.trashingProgress,
          isActive: false,
          successCount: payload.successCount,
          isDone: true,
        },
      }
    })
    setTimeout(() => {
      useSessionStore.setState((state) => {
        if (state.trashingProgress && !state.trashingProgress.isActive) {
          return { trashingProgress: null }
        }
        return state
      })
    }, 3000)
  })
}

