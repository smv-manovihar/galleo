import React, { useRef, useMemo } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import type { MediaItem } from "../../../shared/types/media"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import {
  MoreVertical,
  Play,
  FileImage,
  Trash2,
  Check,
  Eye,
  ExternalLink,
  FolderOpen,
} from "lucide-react"
import { formatBytes } from "../../lib/format"
import { getFileManagerName } from "../../lib/os"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface MediaCompactListProps {
  items: MediaItem[]
  selectedIds: Set<string>
  onSelectToggle: (id: string, e: React.MouseEvent) => void
  onPreviewOpen: (item: MediaItem) => void
  onReviewAction: (id: string, state: "keep" | "delete" | "skipped") => void
}

export const MediaCompactList: React.FC<MediaCompactListProps> = ({
  items,
  selectedIds,
  onSelectToggle,
  onPreviewOpen,
  onReviewAction,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const columns = 5

  // Group items into rows based on the number of columns
  const rows = useMemo(() => {
    const r: MediaItem[][] = []
    for (let i = 0; i < items.length; i += columns) {
      r.push(items.slice(i, i + columns))
    }
    return r
  }, [items, columns])

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 40, // Height of card row including gap
    overscan: 10,
  })

  const handleOpenFile = async (path: string) => {
    await window.api.openFile(path)
  }

  const handleOpenFolder = async (path: string) => {
    await window.api.showFile(path)
  }

  return (
    <div
      ref={containerRef}
      className="h-full w-full scrollbar-thin overflow-y-auto rounded-lg border border-border bg-card/45 p-4 backdrop-blur-md select-none"
    >
      <div
        className="relative w-full"
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const rowItems = rows[virtualRow.index]
          return (
            <div
              key={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              data-index={virtualRow.index}
              className="absolute top-0 left-0 grid w-full gap-2 py-1"
              style={{
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {rowItems.map((item) => {
                const isSelected = selectedIds.has(item.id)
                const isVideo = item.mediaType === "video"

                const getBgColor = () => {
                  if (isSelected) return "bg-primary/10 border-primary/30"
                  if (item.reviewState === "keep")
                    return "bg-green-500/10 border-green-500/30"
                  if (item.reviewState === "delete")
                    return "bg-destructive/10 border-destructive/30 opacity-60"
                  return "bg-background/40 border-border hover:bg-accent/40"
                }

                return (
                  <div
                    key={item.id}
                    className={`group flex cursor-pointer items-center justify-between rounded-lg border p-1.5 text-[0.6875rem] transition-all duration-150 ${getBgColor()}`}
                    onClick={(e) => onSelectToggle(item.id, e)}
                    onDoubleClick={() => onPreviewOpen(item)}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      {/* Checkbox */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center justify-center pl-0.5"
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() =>
                            onSelectToggle(item.id, { shiftKey: false } as any)
                          }
                          className="h-3.5 w-3.5 cursor-pointer border-border focus-visible:ring-1"
                        />
                      </div>

                      {/* Media Icon/Thumbnail */}
                      <div className="pointer-events-none relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded bg-muted/40 select-none">
                        {item.thumbnailPath ? (
                          <img
                            src={`media:///${item.thumbnailPath.replace(/\\/g, "/")}`}
                            alt=""
                            className="h-full w-full object-cover"
                            decoding="async"
                          />
                        ) : isVideo ? (
                          <Play className="h-3.5 w-3.5 fill-current text-primary" />
                        ) : (
                          <FileImage className="h-3.5 w-3.5 text-muted-foreground" />
                        )}

                        {/* Small play overlay on thumbnail */}
                        {isVideo && item.thumbnailPath && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                            <Play className="h-2.5 w-2.5 fill-current text-white" />
                          </div>
                        )}
                      </div>

                      {/* Filename & size info */}
                      <div className="flex min-w-0 flex-col leading-tight">
                        <span
                          className="truncate text-2xs font-semibold text-foreground"
                          title={item.name}
                        >
                          {item.name}
                        </span>
                        <span className="font-mono text-2xs text-muted-foreground">
                          {formatBytes(item.size)}
                        </span>
                      </div>
                    </div>

                    {/* Status Dot & Menu Controls */}
                    <div
                      className="flex shrink-0 items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Review status indicator dot */}
                      {item.reviewState === "keep" && (
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-green-500"
                          title="Marked to keep"
                        />
                      )}
                      {item.reviewState === "delete" && (
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-destructive"
                          title="Marked to delete"
                        />
                      )}

                      {/* Dropdown Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 cursor-pointer rounded text-muted-foreground opacity-60 group-hover:opacity-100 hover:bg-accent hover:text-foreground focus:opacity-100"
                          >
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-44 border-border bg-card/95 font-sans text-xs text-foreground backdrop-blur-md"
                        >
                          <DropdownMenuItem
                            onClick={() => onPreviewOpen(item)}
                            className="cursor-pointer gap-2.5"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Preview File
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onReviewAction(item.id, "keep")}
                            className="cursor-pointer gap-2.5 text-green-500 focus:text-green-500"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Mark to Keep
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onReviewAction(item.id, "delete")}
                            className="cursor-pointer gap-2.5 text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Mark to Delete
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleOpenFile(item.path)}
                            className="cursor-pointer gap-2.5"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Open in default app
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleOpenFolder(item.path)}
                            className="cursor-pointer gap-2.5"
                          >
                            <FolderOpen className="h-3.5 w-3.5" />
                            Show in {getFileManagerName()}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}

        {items.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            No items match current filters
          </div>
        )}
      </div>
    </div>
  )
}
