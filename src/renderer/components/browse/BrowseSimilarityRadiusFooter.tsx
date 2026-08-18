import React from "react"
import { toast } from "sonner"
import type { MediaItem } from "../../../shared/types/media"
import { Button } from "@/components/ui/button"
import { Sparkles, Plus, Check } from "lucide-react"
import {
  MAX_SIMILARITY_RADIUS,
  SIMILARITY_RADIUS_STEP,
} from "../../lib/similarity"
import { useMediaStore, filterAndSortItems } from "../../stores/media-store"
import { useSessionStore } from "../../stores/session-store"

interface BrowseSimilarityRadiusFooterProps {
  targetItem: MediaItem
  matchCount: number
  totalLibraryCount: number
}

export const BrowseSimilarityRadiusFooter: React.FC<
  BrowseSimilarityRadiusFooterProps
> = ({ targetItem, matchCount, totalLibraryCount }) => {
  const similarRadius = useMediaStore((s) => s.similarRadius)
  const setSimilarRadius = useMediaStore((s) => s.setSimilarRadius)

  const canExpand = similarRadius < MAX_SIMILARITY_RADIUS
  const isAllFound = matchCount >= totalLibraryCount && totalLibraryCount > 0

  const handleExpand = () => {
    const nextRadius = Math.min(
      MAX_SIMILARITY_RADIUS,
      similarRadius + SIMILARITY_RADIUS_STEP
    )

    const state = useMediaStore.getState()
    const decisions = useSessionStore.getState().decisions

    const newResults = filterAndSortItems(state.items, {
      activeRootPath: state.activeRootPath,
      searchQuery: state.searchQuery,
      similarTargetItem: targetItem,
      similarRadius: nextRadius,
      filterType: state.filterType,
      filterReviewState: state.filterReviewState,
      filterQuality: state.filterQuality,
      sortBy: state.sortBy,
      decisions,
    })

    const newCount = newResults.length
    const diff = newCount - matchCount

    setSimilarRadius(nextRadius)

    if (diff > 0) {
      toast.success("Results refreshed", {
        description: `Found ${diff} additional matching ${diff === 1 ? "photo" : "photos"} (Range: ${nextRadius}/${MAX_SIMILARITY_RADIUS}).`,
      })
    } else {
      toast.info("No additional matches found", {
        description: `Expanded search range to ${nextRadius}/${MAX_SIMILARITY_RADIUS}, but found no further similar photos.`,
      })
    }
  }

  // Zero-matches empty state
  if (matchCount === 0) {
    return (
      <div className="mx-auto my-8 flex w-full max-w-md flex-col items-center gap-3 rounded-2xl border border-border/80 bg-card/70 p-6 text-center shadow-xs backdrop-blur-md select-none">
        <div className="flex size-10 items-center justify-center rounded-xl border border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-400">
          <Sparkles className="size-5" />
        </div>
        <div className="space-y-1">
          <h4 className="font-heading text-sm font-bold text-foreground">
            No Close Matches Found
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            No photos matched{" "}
            <span className="inline-block max-w-xs truncate align-bottom font-medium text-foreground">
              {targetItem.name}
            </span>{" "}
            within the current search range.
          </p>
        </div>

        {canExpand && (
          <div className="pt-2">
            <Button
              variant="default"
              size="sm"
              className="h-8 cursor-pointer gap-1.5 bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/95"
              onClick={handleExpand}
            >
              <Plus className="size-3.5" />
              <span>View More Broad Results</span>
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto my-8 flex w-full max-w-md flex-col items-center justify-center gap-2 select-none">
      {canExpand && !isAllFound ? (
        <Button
          variant="outline"
          size="sm"
          className="h-9 cursor-pointer gap-2 rounded-full border-border/80 bg-card/90 px-5 text-xs font-semibold text-foreground shadow-xs backdrop-blur-md transition-all hover:bg-accent hover:text-accent-foreground"
          onClick={handleExpand}
        >
          <Plus className="size-3.5 text-muted-foreground" />
          <span>View More Results</span>
        </Button>
      ) : (
        <div className="flex items-center gap-1.5 rounded-full border border-border/40 bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
          <Check className="size-3 text-muted-foreground" />
          <span>All matches displayed</span>
        </div>
      )}
    </div>
  )
}
