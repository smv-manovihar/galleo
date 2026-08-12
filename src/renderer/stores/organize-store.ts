import { create } from "zustand"
import { toast } from "sonner"
import type {
  OrganizePreviewItem,
  OrganizeProgressPayload,
} from "../../shared/types/ipc"
import { useMediaStore } from "./media-store"

interface OrganizeState {
  isExecuting: boolean
  progress: OrganizeProgressPayload | null
  startOrganization: (
    activeRootPath: string,
    previewItems: OrganizePreviewItem[],
    preserveOriginals: boolean
  ) => Promise<void>
}

let cleanupProgressListener: (() => void) | null = null

export const useOrganizeStore = create<OrganizeState>((set) => ({
  isExecuting: false,
  progress: null,

  startOrganization: async (
    activeRootPath: string,
    previewItems: OrganizePreviewItem[],
    preserveOriginals: boolean
  ) => {
    if (previewItems.length === 0) return
    const count = previewItems.length

    if (cleanupProgressListener) {
      cleanupProgressListener()
      cleanupProgressListener = null
    }

    set({
      isExecuting: true,
      progress: {
        processedCount: 0,
        totalCount: count,
        currentFile: "",
        success: true,
      },
    })

    cleanupProgressListener = window.api.onOrganizeProgress((p) => {
      set({ progress: p })
    })

    toast.info("Organization started", {
      description: `Organizing ${count} media items in background.`,
    })

    try {
      await window.api.executeOrganization(
        activeRootPath,
        previewItems,
        preserveOriginals
      )
      toast.success("Files organized", {
        description: `Relocated ${count} media items to destination.`,
      })
      if (activeRootPath) {
        await useMediaStore.getState().fetchMediaItems(activeRootPath)
      }
    } catch (e: unknown) {
      const err = e as Error
      console.error("Execution failed:", err)
      toast.error("File organization failed", {
        description:
          err.message || "An unexpected error occurred during execution.",
      })
    } finally {
      if (cleanupProgressListener) {
        cleanupProgressListener()
        cleanupProgressListener = null
      }
      set({ isExecuting: false, progress: null })
    }
  },
}))
