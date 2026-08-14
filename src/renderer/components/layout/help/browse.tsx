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
  BookOpen,
  Code2,
  ChevronDown,
  Sparkles,
  Undo2,
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
        <DialogDescription className="mt-0.5 text-xs leading-normal text-muted-foreground">
          Search, sorting filters, quality scores, and batch management.
        </DialogDescription>
      </DialogHeader>

      {/* Scrollable Content */}
      <div className="min-h-0 flex-1 scrollbar-thin space-y-4 overflow-y-auto pr-1">
        <p className="text-xs leading-relaxed text-muted-foreground">
          The main workspace for exploring and managing your media library. Filter by quality defect tags, perform natural language searches, inspect EXIF details, and execute batch review decisions.
        </p>

        {/* 1. Key Terms */}
        <div className="space-y-2">
          <h4 className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <BookOpen className="size-3" />
            Key Terms
          </h4>
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
            <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-muted/10 p-2.5">
              <span className="text-xs font-bold text-foreground">
                Quality Score (0–100)
              </span>
              <span className="mt-0.5 text-xs leading-normal text-muted-foreground">
                Composite rating calculated from sharpness, exposure histogram, screenshot detection, and resolution. Hover any score badge to inspect breakdown metrics.
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-muted/10 p-2.5">
              <span className="text-xs font-bold text-foreground">
                AI Semantic Search
              </span>
              <span className="mt-0.5 text-xs leading-normal text-muted-foreground">
                On-device visual search engine that lets you find photos using natural language concepts (e.g., "sunset over mountains", "documents").
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-muted/10 p-2.5">
              <span className="text-xs font-bold text-foreground">
                Staged Deletion
              </span>
              <span className="mt-0.5 text-xs leading-normal text-muted-foreground">
                Files marked for deletion are safely held in the "To Delete" queue until you review total reclaimed space and click "Commit Deletions".
              </span>
            </div>
          </div>
        </div>

        {/* 2. Actions & Controls */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-primary">
            Actions & Controls
          </h4>
          <div className="divide-y divide-border/40 overflow-hidden rounded-xl border border-border/60 bg-muted/5">
            <div className="flex flex-col items-start gap-1 p-3 text-xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <Eye className="size-4 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Full Preview & Playback
                </span>
              </div>
              <span className="text-muted-foreground">
                Click any photo or video to open a high-resolution preview with camera EXIF metadata, exposure histograms, and smooth video playback.
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 p-3 text-xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <Filter className="size-4 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Filters & Review States
                </span>
              </div>
              <span className="text-muted-foreground">
                Filter by media type (Photos/Videos), review state (All/Pending/Kept/To Delete), or defect flags (Blurry, Duplicates, Screenshots, Dark, Low Resolution).
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 p-3 text-xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <LayoutGrid className="size-4 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Layout & Timeline Grouping
                </span>
              </div>
              <span className="text-muted-foreground">
                Toggle between Cards and List layouts, and switch to Date grouping to view files structured chronologically by timeline.
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 p-3 text-xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <CheckSquare className="size-4 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Batch Management
                </span>
              </div>
              <span className="text-muted-foreground">
                Select items using <kbd className="rounded border border-border/80 bg-muted px-1 py-0.5 font-mono text-xs font-bold text-muted-foreground">Shift</kbd> + Click to select continuous ranges, then use the floating toolbar to Mark to Keep or Mark to Delete in bulk.
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 p-3 text-xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <Sparkles className="size-4 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Find Visually Similar
                </span>
              </div>
              <span className="text-muted-foreground">
                Click "Find Similar" on any card or list item to query visual embedding vectors and locate matching burst photos or similar compositions.
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 p-3 text-xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <Undo2 className="size-4 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Instant Undo
                </span>
              </div>
              <span className="text-muted-foreground">
                Press <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-xs font-bold text-muted-foreground">Ctrl+Z</kbd> (<kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-xs font-bold text-muted-foreground">⌘Z</kbd>) to immediately revert your previous keep or delete review decision.
              </span>
            </div>
          </div>
        </div>

        {/* 3. Collapsible Under the Hood Technical Concepts */}
        <Collapsible open={isTechOpen} onOpenChange={setIsTechOpen} className="space-y-2">
          <CollapsibleTrigger asChild>
            <button className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <Code2 className="size-4" />
                Under the Hood & Technical Concepts
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-normal text-muted-foreground">
                  {isTechOpen ? "Hide details" : "Learn how it works"}
                </span>
                <ChevronDown className={`size-4 text-muted-foreground transition-transform duration-200 ${isTechOpen ? "rotate-180" : ""}`} />
              </div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-1">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-3">
                <span className="text-xs font-bold text-foreground">
                  Virtual Grid Windowing
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  Recycles DOM nodes with `@tanstack/react-virtual` to ensure scrolling tens of thousands of items uses minimal memory.
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-3">
                <span className="text-xs font-bold text-foreground">
                  Direct IPC Protocol Stream (`media://`)
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  Custom Electron scheme streams thumbnails directly from local disk caches without web server overhead.
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-3">
                <span className="text-xs font-bold text-foreground">
                  Bitmask Compound Filtering
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  Combines quality flags, media types, review states, and text query clauses using bitwise integer operations for zero-latency filtering.
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-3">
                <span className="text-xs font-bold text-foreground">
                  Local Vector Search Embeddings
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  On-device embedding models compute vector cosine similarities for natural language search and visual similarity queries without cloud telemetry.
                </span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </>
  )
}
