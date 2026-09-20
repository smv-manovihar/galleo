import { describe, it, expect, beforeEach, vi } from "vitest"
import { useSessionStore } from "../session-store"
import { useMediaStore } from "../media-store"
import type { MediaItem } from "../../../shared/types/media"
import type { SessionCheckpoint } from "../../../shared/types/session"

const createMockItem = (id: string, overrides: Partial<MediaItem> = {}): MediaItem => ({
  id,
  path: `C:/Photos/${id}.jpg`,
  name: `${id}.jpg`,
  size: 1_000_000,
  extension: "jpg",
  mediaType: "photo",
  dateAdded: "2026-08-01T10:00:00.000Z",
  dateFileSystem: "2026-08-01T10:00:00.000Z",
  dateTarget: "2026-08-01T10:00:00.000Z",
  dateTargetSource: "filesystem",
  isDuplicate: false,
  isBestInDuplicateGroup: false,
  reviewState: "pending",
  orientation: 0,
  ...overrides,
})

describe("useSessionStore", () => {
  beforeEach(() => {
    // Mock global window and electron api
    const mockApi = {
      getSessionCheckpoint: vi.fn().mockResolvedValue(null),
      saveSessionCheckpoint: vi.fn().mockResolvedValue(undefined),
      updateReviews: vi.fn().mockResolvedValue(undefined),
      updateMediaOrientation: vi.fn().mockResolvedValue(undefined),
      getMediaItems: vi.fn().mockResolvedValue([]),
      clearSession: vi.fn().mockResolvedValue(undefined),
      trashFiles: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    }

    if (typeof globalThis.window === "undefined") {
      (globalThis as unknown as { window: unknown }).window = {
        api: mockApi,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }
    } else {
      globalThis.window.api = mockApi as unknown as typeof window.api
    }

    useSessionStore.setState({
      checkpoint: null,
      currentIndex: 0,
      decisions: {},
      undoStack: [],
      isCommitting: false,
      trashingProgress: null,
    })

    useMediaStore.setState({
      items: [],
      activeRootPath: null,
    })
  })

  it("submits a culling decision and adds to undoStack", async () => {
    const item1 = createMockItem("item1")
    useMediaStore.setState({ items: [item1] })

    await useSessionStore.getState().initSession("C:/Photos", 1)
    expect(useSessionStore.getState().checkpoint).not.toBeNull()

    await useSessionStore.getState().submitDecision("item1", "keep", item1, "culling")

    const state = useSessionStore.getState()
    expect(state.decisions["item1"]).toBe("keep")
    expect(state.undoStack).toHaveLength(1)
    expect(state.undoStack[0].mediaId).toBe("item1")
    expect(state.undoStack[0].newState.source).toBe("culling")
    expect(state.undoStack[0].type).toBe("mark-keep")
  })

  it("correctly pops the undone action from undoStack on undo", async () => {
    const item1 = createMockItem("item1")
    const item2 = createMockItem("item2")
    useMediaStore.setState({ items: [item1, item2] })

    await useSessionStore.getState().initSession("C:/Photos", 2)

    await useSessionStore.getState().submitDecision("item1", "keep", item1, "culling")
    await useSessionStore.getState().submitDecision("item2", "delete", item2, "culling")

    expect(useSessionStore.getState().undoStack).toHaveLength(2)
    expect(useSessionStore.getState().decisions["item2"]).toBe("delete")

    // Undo item2
    const success = await useSessionStore.getState().undo("culling")
    expect(success).toBe(true)

    const stateAfterUndo = useSessionStore.getState()
    // undoStack in store MUST have exactly 1 item left (item1)
    expect(stateAfterUndo.undoStack).toHaveLength(1)
    expect(stateAfterUndo.undoStack[0].mediaId).toBe("item1")
    expect(stateAfterUndo.decisions["item2"]).toBeUndefined()
    expect(stateAfterUndo.decisions["item1"]).toBe("keep")

    // Undo item1
    const secondSuccess = await useSessionStore.getState().undo("culling")
    expect(secondSuccess).toBe(true)

    const stateAfterSecondUndo = useSessionStore.getState()
    expect(stateAfterSecondUndo.undoStack).toHaveLength(0)
    expect(stateAfterSecondUndo.decisions["item1"]).toBeUndefined()
  })

  it("syncs checkpoint decisions into media store review states on initSession without breaking store integrity", async () => {
    const item1 = createMockItem("item1", { reviewState: "pending" })
    useMediaStore.setState({ items: [item1] })

    const existingCheckpoint: SessionCheckpoint = {
      sessionId: "sess_123",
      folderPath: "C:/Photos",
      totalFiles: 1,
      currentIndex: 1,
      decisions: { item1: "keep" },
      undoStack: [
        {
          id: "act_1",
          type: "mark-keep",
          mediaId: "item1",
          timestamp: Date.now(),
          previousState: { reviewState: "pending" },
          newState: { reviewState: "keep", source: "culling" },
        },
      ],
      savedAt: new Date().toISOString(),
    }

    vi.mocked(window.api.getSessionCheckpoint).mockResolvedValueOnce(existingCheckpoint)

    await useSessionStore.getState().initSession("C:/Photos", 1)

    const state = useSessionStore.getState()
    expect(state.decisions["item1"]).toBe("keep")
    expect(state.undoStack).toHaveLength(1)
    expect(useMediaStore.getState().items[0].reviewState).toBe("keep")
  })

  it("correctly undos duplicate batch decisions atomically", async () => {
    const item1 = createMockItem("d1")
    const item2 = createMockItem("d2")
    useMediaStore.setState({ items: [item1, item2] })

    await useSessionStore.getState().initSession("C:/Photos", 2)

    // Submit batch decision for duplicate group (e.g. Keep Best)
    const batchId = "batch_dup_123"
    await useSessionStore.getState().submitBatchDecisions(
      [
        { mediaId: "d1", state: "keep", prevState: "pending" },
        { mediaId: "d2", state: "delete", prevState: "pending" },
      ],
      "duplicates",
      batchId
    )

    const stateAfterBatch = useSessionStore.getState()
    expect(stateAfterBatch.decisions["d1"]).toBe("keep")
    expect(stateAfterBatch.decisions["d2"]).toBe("delete")
    expect(stateAfterBatch.undoStack).toHaveLength(2)

    // Undo duplicate session
    const success = await useSessionStore.getState().undo("duplicates")
    expect(success).toBe(true)

    const stateAfterUndo = useSessionStore.getState()
    // Entire batch is reverted atomically
    expect(stateAfterUndo.undoStack).toHaveLength(0)
    expect(stateAfterUndo.decisions["d1"]).toBeUndefined()
    expect(stateAfterUndo.decisions["d2"]).toBeUndefined()
    expect(useMediaStore.getState().items[0].reviewState).toBe("pending")
    expect(useMediaStore.getState().items[1].reviewState).toBe("pending")
  })

  it("successfully commits deletions and purges items even when checkpoint is null", async () => {
    const item1 = createMockItem("item1", { reviewState: "delete" })
    const item2 = createMockItem("item2", { reviewState: "keep" })
    useMediaStore.setState({ items: [item1, item2] })

    const mockTrashFiles = vi.fn().mockResolvedValue({ ok: true, value: undefined })
    window.api.trashFiles = mockTrashFiles

    expect(useSessionStore.getState().checkpoint).toBeNull()

    const result = await useSessionStore.getState().commitDeletions()

    expect(mockTrashFiles).toHaveBeenCalledWith([item1.path])
    expect(result.successCount).toBe(1)
    expect(result.failedPaths).toBeNull()

    // item1 should be synchronously removed from mediaStore
    const remainingItems = useMediaStore.getState().items
    expect(remainingItems).toHaveLength(1)
    expect(remainingItems[0].id).toBe("item2")
  })

  it("discovers target deletions from media items when decisions map is empty", async () => {
    const item1 = createMockItem("item1", { reviewState: "delete" })
    const item2 = createMockItem("item2", { reviewState: "delete" })
    useMediaStore.setState({ items: [item1, item2] })

    const mockTrashFiles = vi.fn().mockResolvedValue({ ok: true, value: undefined })
    window.api.trashFiles = mockTrashFiles

    await useSessionStore.getState().initSession("C:/Photos", 2)
    // Clear in-memory decisions to simulate DB flush / restart
    useSessionStore.setState({ decisions: {} })

    const result = await useSessionStore.getState().commitDeletions()

    expect(mockTrashFiles).toHaveBeenCalledWith([item1.path, item2.path])
    expect(result.successCount).toBe(2)
    expect(useMediaStore.getState().items).toHaveLength(0)
  })
})
