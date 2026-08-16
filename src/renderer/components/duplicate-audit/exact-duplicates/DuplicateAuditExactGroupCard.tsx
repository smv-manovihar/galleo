import React, { useCallback } from "react"
import type { MediaItem } from "../../../../shared/types/media"
import type { ExactDuplicateGroup } from "./types"
import { DuplicateAuditExactRow } from "./DuplicateAuditExactRow"
import { formatBytes } from "../../../lib/format"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { X, Sparkles } from "lucide-react"

export interface DuplicateAuditExactGroupCardProps {
  group: ExactDuplicateGroup
  hasOverride: boolean
  onSwapKeep: (groupIdx: number, newKeepId: string) => void
  onResetOverride: (groupIdx: number) => void
  onPreviewItem: (item: MediaItem, groupItems: MediaItem[]) => void
  onContextMenu?: (item: MediaItem, e: React.MouseEvent) => void
  style?: React.CSSProperties
  index?: number
}

const areEqual = (
  prevProps: DuplicateAuditExactGroupCardProps,
  nextProps: DuplicateAuditExactGroupCardProps
) => {
  return (
    prevProps.index === nextProps.index &&
    prevProps.hasOverride === nextProps.hasOverride &&
    prevProps.group.groupIdx === nextProps.group.groupIdx &&
    prevProps.group.keep.id === nextProps.group.keep.id &&
    prevProps.group.deletes.length === nextProps.group.deletes.length &&
    prevProps.group.deletes.every(
      (item, i) => item.id === nextProps.group.deletes[i]?.id
    ) &&
    prevProps.style?.transform === nextProps.style?.transform &&
    prevProps.style?.height === nextProps.style?.height
  )
}

export const DuplicateAuditExactGroupCard = React.memo<DuplicateAuditExactGroupCardProps>(
  ({
    group,
    hasOverride,
    onSwapKeep,
    onResetOverride,
    onPreviewItem,
    onContextMenu,
    style,
    index,
  }) => {
    let reclaimSize = 0
    for (let i = 0; i < group.deletes.length; i++) {
      reclaimSize += group.deletes[i].size || 0
    }

    const handlePreviewSingle = useCallback(
      (item: MediaItem) => {
        onPreviewItem(item, [group.keep, ...group.deletes])
      },
      [onPreviewItem, group.keep, group.deletes]
    )

    return (
      <div data-index={index} style={style} className="w-full">
        <div
          style={{ contain: "layout paint" }}
          className="overflow-hidden rounded-lg border border-border/80 bg-card text-xs shadow-2xs transition-shadow hover:shadow-xs"
        >
          {/* Group Header */}
          <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-3.5 py-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-foreground">
                Exact Set #{group.groupIdx + 1}
              </span>
              <span className="text-2xs text-muted-foreground">
                ({1 + group.deletes.length} copies)
              </span>
              {hasOverride && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onResetOverride(group.groupIdx)}
                      className="group/override flex cursor-pointer items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 pl-2 pr-1.5 py-0.5 text-2xs font-semibold text-amber-700 transition-colors hover:border-amber-500/50 hover:bg-amber-500/20 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200"
                    >
                      <Sparkles className="size-3 text-amber-500" />
                      <span>Manual override</span>
                      <X className="size-3 text-amber-600/70 transition-colors group-hover/override:text-amber-800 dark:text-amber-400/80 dark:group-hover/override:text-amber-200 ml-0.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Reset to automatic strategy</TooltipContent>
                </Tooltip>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-destructive">
                Reclaiming {formatBytes(reclaimSize)}
              </span>
            </div>
          </div>

          {/* Group Rows (Keep first, then Deletes) */}
          <div className="flex flex-col divide-y divide-border/40">
            <DuplicateAuditExactRow
              key={group.keep.id}
              item={group.keep}
              isKeep={true}
              groupIdx={group.groupIdx}
              onPreview={handlePreviewSingle}
              onContextMenu={onContextMenu}
            />

            {group.deletes.map((deleteItem: MediaItem) => (
              <DuplicateAuditExactRow
                key={deleteItem.id}
                item={deleteItem}
                isKeep={false}
                groupIdx={group.groupIdx}
                onSwapKeep={onSwapKeep}
                onPreview={handlePreviewSingle}
                onContextMenu={onContextMenu}
              />
            ))}
          </div>
        </div>
      </div>
    )
  },
  areEqual
)

DuplicateAuditExactGroupCard.displayName = "DuplicateAuditExactGroupCard"
