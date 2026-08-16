import React, { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import type { MediaItem } from "../../../shared/types/media"
import {
  Eye,
  Info,
  Images,
  Sparkles,
  Bookmark,
  Trash2,
  ExternalLink,
  FolderOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { getFileManagerName } from "../../lib/os"
import { ENABLE_AI_FEATURES } from "../../../shared/constants"
import { useMediaStore } from "../../stores/media-store"

export interface MediaContextMenuState {
  item: MediaItem
  x: number
  y: number
}

interface MediaContextMenuProps {
  contextMenu: MediaContextMenuState | null
  onClose: () => void
  onPreviewOpen: (item: MediaItem) => void
  onInfoOpen?: (item: MediaItem) => void
  onReviewAction: (id: string, state: "keep" | "delete") => void | Promise<void>
  onFindSimilar?: (mediaId: string) => void
  onFindSimilarVisual?: (item: MediaItem) => void
}

export const MediaContextMenu: React.FC<MediaContextMenuProps> = ({
  contextMenu,
  onClose,
  onPreviewOpen,
  onInfoOpen,
  onReviewAction,
  onFindSimilar,
  onFindSimilarVisual,
}) => {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!contextMenu) return

    const handlePointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    const handleScroll = () => {
      onClose()
    }

    window.addEventListener("pointerdown", handlePointerDown)
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("scroll", handleScroll, true)

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown)
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("scroll", handleScroll, true)
    }
  }, [contextMenu, onClose])

  if (!contextMenu) return null

  const { item, x, y } = contextMenu

  // Clamp positioning within window viewport boundaries
  const menuWidth = 192
  const menuHeight = 270
  const posX = Math.min(Math.max(8, x), window.innerWidth - menuWidth - 8)
  const posY = Math.min(Math.max(8, y), window.innerHeight - menuHeight - 8)

  const handleOpenFolder = async () => {
    onClose()
    await window.api.showFile(item.path)
  }

  const handleOpenFile = async () => {
    onClose()
    await window.api.openFile(item.path)
  }

  const handleFindSimilarVisual = () => {
    onClose()
    if (onFindSimilarVisual) {
      onFindSimilarVisual(item)
    } else {
      useMediaStore.getState().findSimilarVisual(item)
    }
  }

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: posY,
        left: posX,
        zIndex: 9999,
      }}
      className="relative z-50 w-48 animate-in fade-in-0 zoom-in-95 rounded-lg border border-border/80 bg-popover/70 p-1 font-sans text-xs text-popover-foreground shadow-2xl ring-1 ring-foreground/10 duration-100 select-none backdrop-blur-2xl backdrop-saturate-150 before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:rounded-[inherit] before:backdrop-blur-2xl before:backdrop-saturate-150"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Button
        variant="ghost"
        className="h-7.5 w-full justify-start gap-2.5 rounded-md px-2 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-foreground/12! hover:text-foreground! focus:bg-foreground/12! focus:text-foreground! active:bg-foreground/18! focus-visible:ring-1 focus-visible:ring-ring"
        onClick={() => {
          onClose()
          onPreviewOpen(item)
        }}
      >
        <Eye className="size-3.5 text-muted-foreground shrink-0" />
        <span>Preview File</span>
      </Button>

      {onInfoOpen && (
        <Button
          variant="ghost"
          className="h-7.5 w-full justify-start gap-2.5 rounded-md px-2 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-foreground/12! hover:text-foreground! focus:bg-foreground/12! focus:text-foreground! active:bg-foreground/18! focus-visible:ring-1 focus-visible:ring-ring"
          onClick={() => {
            onClose()
            onInfoOpen(item)
          }}
        >
          <Info className="size-3.5 text-muted-foreground shrink-0" />
          <span>File Info</span>
        </Button>
      )}

      <Button
        variant="ghost"
        className="h-7.5 w-full justify-start gap-2.5 rounded-md px-2 py-1.5 text-xs font-medium text-sky-600 dark:text-sky-400 transition-colors hover:bg-sky-500/15! hover:text-sky-700! dark:hover:text-sky-300! focus:bg-sky-500/15! focus:text-sky-700! dark:focus:text-sky-300! active:bg-sky-500/25! focus-visible:ring-1 focus-visible:ring-sky-500/40"
        onClick={handleFindSimilarVisual}
      >
        <Images className="size-3.5 shrink-0 text-sky-600 dark:text-sky-400" />
        <span>Find Visually Similar</span>
      </Button>

      {onFindSimilar && ENABLE_AI_FEATURES && (
        <Button
          variant="ghost"
          className="h-7.5 w-full justify-start gap-2.5 rounded-md px-2 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20! hover:text-primary! focus:bg-primary/20! focus:text-primary! focus-visible:ring-1 focus-visible:ring-primary/40"
          onClick={() => {
            onClose()
            onFindSimilar(item.id)
          }}
        >
          <Sparkles className="size-3.5 shrink-0" />
          <span>AI Semantic Search</span>
        </Button>
      )}

      <div className="-mx-1 my-1 h-px bg-border/50" />

      <Button
        variant="ghost"
        className="h-7.5 w-full justify-start gap-2.5 rounded-md px-2 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 transition-colors hover:bg-green-500/20! hover:text-green-600! dark:hover:text-green-300! focus:bg-green-500/20! focus:text-green-600! dark:focus:text-green-300! focus-visible:ring-1 focus-visible:ring-green-500/40"
        onClick={() => {
          onClose()
          onReviewAction(item.id, "keep")
        }}
      >
        <Bookmark className="size-3.5 fill-current shrink-0" />
        <span>Mark to Keep</span>
      </Button>

      <Button
        variant="ghost"
        className="h-7.5 w-full justify-start gap-2.5 rounded-md px-2 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20! hover:text-destructive! focus:bg-destructive/20! focus:text-destructive! focus-visible:ring-1 focus-visible:ring-destructive/40"
        onClick={() => {
          onClose()
          onReviewAction(item.id, "delete")
        }}
      >
        <Trash2 className="size-3.5 shrink-0" />
        <span>Mark to Delete</span>
      </Button>

      <div className="-mx-1 my-1 h-px bg-border/50" />

      <Button
        variant="ghost"
        className="h-7.5 w-full justify-start gap-2.5 rounded-md px-2 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-foreground/12! hover:text-foreground! focus:bg-foreground/12! focus:text-foreground! active:bg-foreground/18! focus-visible:ring-1 focus-visible:ring-ring"
        onClick={handleOpenFile}
      >
        <ExternalLink className="size-3.5 text-muted-foreground shrink-0" />
        <span>Open in default app</span>
      </Button>

      <Button
        variant="ghost"
        className="h-7.5 w-full justify-start gap-2.5 rounded-md px-2 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-foreground/12! hover:text-foreground! focus:bg-foreground/12! focus:text-foreground! active:bg-foreground/18! focus-visible:ring-1 focus-visible:ring-ring"
        onClick={handleOpenFolder}
      >
        <FolderOpen className="size-3.5 text-muted-foreground shrink-0" />
        <span>Show in {getFileManagerName()}</span>
      </Button>
    </div>,
    document.body
  )
}
