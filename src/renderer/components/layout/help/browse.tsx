import React, { useState } from "react"
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"
import {
  Search,
  Eye,
  Filter,
  LayoutGrid,
  CheckSquare,
  Zap,
  BookOpen,
  Code2,
  ChevronDown,
} from "lucide-react"

export const BrowseHelp: React.FC = () => {
  const [isTechOpen, setIsTechOpen] = useState(false)

  return (
    <>
      {/* Header */}
      <DialogHeader className="shrink-0 border-b border-border pb-3">
        <DialogTitle className="flex items-center gap-2.5 text-base font-bold text-foreground">
          <Search className="size-5 text-primary" />
          Browse & Filter Media
        </DialogTitle>
        <DialogDescription className="mt-0.5 text-2xs leading-normal font-semibold tracking-wider text-muted-foreground uppercase">
          Search, sorting filters, and layout modes.
        </DialogDescription>
      </DialogHeader>

      {/* Scrollable Content */}
      <div className="min-h-0 flex-1 scrollbar-thin space-y-4 overflow-y-auto pr-1">
        <p className="text-xs leading-relaxed text-muted-foreground">
          The main workspace for exploring and managing your media files. Filter by quality defect tags, search filenames, and inspect EXIF details.
        </p>

        {/* 1. Key Terms */}
        <div className="space-y-2">
          <h4 className="flex items-center gap-1.5 text-3xs font-extrabold tracking-wider text-primary uppercase">
            <BookOpen className="size-3" />
            Key Terms
          </h4>
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
            <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-muted/10 p-2.5">
              <span className="text-xs font-bold text-foreground">
                Defect Tags
              </span>
              <span className="mt-0.5 text-2xs leading-normal text-muted-foreground">
                Automated badges (blurry, dark, duplicate, screenshot) calculated during library scans.
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-muted/10 p-2.5">
              <span className="text-xs font-bold text-foreground">
                EXIF Metadata
              </span>
              <span className="mt-0.5 text-2xs leading-normal text-muted-foreground">
                Embedded camera data (shutter speed, ISO, aperture, GPS, date) used for sorting.
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-muted/10 p-2.5">
              <span className="text-xs font-bold text-foreground">
                Timeline View
              </span>
              <span className="mt-0.5 text-2xs leading-normal text-muted-foreground">
                Layout mode grouping media chronologically by year, month, or day.
              </span>
            </div>
          </div>
        </div>

        {/* 2. Actions & Controls */}
        <div className="space-y-2">
          <h4 className="text-3xs font-extrabold tracking-wider text-primary uppercase">
            Actions & Controls
          </h4>
          <div className="divide-y divide-border/40 overflow-hidden rounded-xl border border-border/60 bg-muted/5">
            <div className="flex flex-col items-start gap-1 p-3 text-2xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <Eye className="size-3.5 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Inspect Media
                </span>
              </div>
              <span className="text-muted-foreground">
                Click any photo or video card to open a full-screen previewer with EXIF metadata, histogram, and playback controls.
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 p-3 text-2xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <Filter className="size-3.5 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Filter Selection
                </span>
              </div>
              <span className="text-muted-foreground">
                Filter by media type (Photos/Videos), review state (Pending/Kept/Delete), or defect categories (Blurry, Duplicates, Screenshots, Dark, Small, Large files).
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 p-3 text-2xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <LayoutGrid className="size-3.5 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Change Layout
                </span>
              </div>
              <span className="text-muted-foreground">
                Switch between Cards or List layout, and toggle Date grouping to view files by timeline.
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 p-3 text-2xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <CheckSquare className="size-3.5 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Batch Management
                </span>
              </div>
              <span className="text-muted-foreground">
                Select items using checkboxes or Shift+Click to perform batch decisions (Keep or Move to Trash).
              </span>
            </div>
          </div>
        </div>

        {/* 3. Collapsible Under the Hood Technical Concepts */}
        <Collapsible open={isTechOpen} onOpenChange={setIsTechOpen} className="space-y-2">
          <CollapsibleTrigger asChild>
            <button className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-2xs font-semibold text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground">
              <div className="flex items-center gap-2 text-3xs font-extrabold tracking-wider text-primary uppercase">
                <Code2 className="size-3.5" />
                Under the Hood & Technical Concepts
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-normal text-muted-foreground">
                  {isTechOpen ? "Hide details" : "Learn how it works"}
                </span>
                <ChevronDown className={`size-3.5 text-muted-foreground transition-transform duration-200 ${isTechOpen ? "rotate-180" : ""}`} />
              </div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-1">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-2.5">
                <span className="text-2xs font-bold text-foreground">
                  Virtual Grid Windowing
                </span>
                <span className="text-[11px] leading-relaxed text-muted-foreground">
                  Recycles DOM nodes with `@tanstack/react-virtual` to ensure scrolling tens of thousands of items uses zero idle memory.
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-2.5">
                <span className="text-2xs font-bold text-foreground">
                  IPC Protocol Stream (`media://`)
                </span>
                <span className="text-[11px] leading-relaxed text-muted-foreground">
                  Custom Electron scheme streams thumbnails directly from local disk caches without web server overhead.
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-2.5">
                <span className="text-2xs font-bold text-foreground">
                  Bitmask Filter Engine
                </span>
                <span className="text-[11px] leading-relaxed text-muted-foreground">
                  Combines quality flags, file extensions, and text query clauses using bitwise integer operations for zero latency filtering.
                </span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Pro Tip Banner */}
      <div className="mt-auto flex shrink-0 flex-row items-start gap-3 border-t border-border pt-3.5">
        <div className="shrink-0 rounded-lg border border-primary/20 bg-primary/10 p-1.5 text-primary">
          <Zap className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="block text-2xs font-extrabold tracking-wider text-primary uppercase">
            PRO TIP
          </span>
          <span className="mt-0.5 block text-2xs leading-relaxed text-muted-foreground">
            Hold <kbd className="font-mono bg-muted px-1 text-[10px] rounded">Shift</kbd> while clicking cards in the grid to select a continuous range of items for instant bulk tagging or deletion.
          </span>
        </div>
      </div>
    </>
  )
}
