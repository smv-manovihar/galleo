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
  LayoutDashboard,
  Play,
  RefreshCw,
  Sparkles,
  BookOpen,
  Code2,
  ChevronDown,
  CheckSquare,
} from "lucide-react"

export const DashboardHelp: React.FC = () => {
  const [isTechOpen, setIsTechOpen] = useState(false)

  return (
    <>
      {/* Header */}
      <DialogHeader className="shrink-0 border-b border-border pb-3">
        <DialogTitle className="flex items-center gap-2.5 text-base font-bold text-foreground">
          <LayoutDashboard className="size-5 text-primary" />
          Dashboard Overview
        </DialogTitle>
        <DialogDescription className="mt-0.5 text-xs leading-normal text-muted-foreground">
          Your local library analytics, review status, and storage metrics.
        </DialogDescription>
      </DialogHeader>

      {/* Scrollable Content */}
      <div className="min-h-0 flex-1 scrollbar-thin space-y-4 overflow-y-auto pr-1">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Central hub for library storage stats, estimated recoverable disk space, review progress, and one-click cleanup shortcuts.
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
                Wasted Space
              </span>
              <span className="mt-0.5 text-xs leading-normal text-muted-foreground">
                Total recoverable disk space calculated from redundant duplicates, blurry photos, and low-res assets.
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-muted/10 p-2.5">
              <span className="text-xs font-bold text-foreground">
                Overall Review Status
              </span>
              <span className="mt-0.5 text-xs leading-normal text-muted-foreground">
                Progress tracking how many files in your library are Kept, Marked for Delete, or Pending Review.
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-muted/10 p-2.5">
              <span className="text-xs font-bold text-foreground">
                Folder Roots
              </span>
              <span className="mt-0.5 text-xs leading-normal text-muted-foreground">
                Local directories registered with Galleo, actively monitored for added or modified media files.
              </span>
            </div>
          </div>
        </div>

        {/* 2. Actions & Controls */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-primary">
            Actions & Shortcuts
          </h4>
          <div className="divide-y divide-border/40 overflow-hidden rounded-xl border border-border/60 bg-muted/5">
            <div className="flex flex-col items-start gap-1 p-3 text-xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <Play className="size-4 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Scan Folders
                </span>
              </div>
              <span className="text-muted-foreground">
                Quickly scans all enabled folders for new or modified media using modification timestamp checks.
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 p-3 text-xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <RefreshCw className="size-4 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Force Rescan
                </span>
              </div>
              <span className="text-muted-foreground">
                Wipes metadata and thumbnail cache, then re-indexes and calculates quality scores from scratch.
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 p-3 text-xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <Sparkles className="size-4 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Browse Shortcuts
                </span>
              </div>
              <span className="text-muted-foreground">
                Click any shortcut card (Duplicates, Blurry, Screenshots, Dark, Low Resolution, Space Hogs) to open Browse filtered to those files.
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 p-3 text-xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <CheckSquare className="size-4 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Start Culling Session
                </span>
              </div>
              <span className="text-muted-foreground">
                Launches the Media Culling Queue pre-filtered to pending unreviewed files for rapid triage.
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
                  Incremental mtime Indexing
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  Compares filesystem modification timestamps and file sizes against SQLite records to skip parsing unchanged media.
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-3">
                <span className="text-xs font-bold text-foreground">
                  Multi-Threaded Worker Pools
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  xxHash64 binary hashing, perceptual pHash extraction, and thumbnail generation execute across parallel CPU worker threads.
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-3">
                <span className="text-xs font-bold text-foreground">
                  Defect Detection Engine
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  Evaluates Laplacian edge variance (sharpness), luminance histograms (lighting), and dimensions to surface defect candidates.
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-3">
                <span className="text-xs font-bold text-foreground">
                  Filesystem Event Watching
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  Monitors root folders with native filesystem watchers to notify you when files are added, modified, or moved outside Galleo.
                </span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </>
  )
}
