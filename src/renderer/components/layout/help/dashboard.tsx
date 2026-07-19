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
  Zap,
  BookOpen,
  Code2,
  ChevronDown,
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
        <DialogDescription className="mt-0.5 text-2xs leading-normal font-semibold tracking-wider text-muted-foreground uppercase">
          Your local library analytics and storage metrics.
        </DialogDescription>
      </DialogHeader>

      {/* Scrollable Content */}
      <div className="min-h-0 flex-1 scrollbar-thin space-y-4 overflow-y-auto pr-1">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Central hub for library stats, estimated wasted space, and storage suggestions.
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
                Wasted Space
              </span>
              <span className="mt-0.5 text-2xs leading-normal text-muted-foreground">
                Storage used by duplicates, low-quality photos, and screenshots.
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-muted/10 p-2.5">
              <span className="text-xs font-bold text-foreground">
                Library Health
              </span>
              <span className="mt-0.5 text-2xs leading-normal text-muted-foreground">
                Ratio of clean media vs flagged defect candidates.
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-muted/10 p-2.5">
              <span className="text-xs font-bold text-foreground">
                Folder Roots
              </span>
              <span className="mt-0.5 text-2xs leading-normal text-muted-foreground">
                Local directories monitored and indexed by Galleo.
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
                <Play className="size-3.5 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Scan Folders
                </span>
              </div>
              <span className="text-muted-foreground">
                Scans enabled folders for new or modified files.
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 p-3 text-2xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <RefreshCw className="size-3.5 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Force Rescan
                </span>
              </div>
              <span className="text-muted-foreground">
                Wipes metadata cache and rescans all files from scratch.
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 p-3 text-2xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <Sparkles className="size-3.5 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Quick Suggestions
                </span>
              </div>
              <span className="text-muted-foreground">
                Click any metric tile to filter matching files in Browse.
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
                  Incremental mtime Indexing
                </span>
                <span className="text-[11px] leading-relaxed text-muted-foreground">
                  Compares filesystem modification timestamps against SQLite records to skip parsing unchanged files.
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-2.5">
                <span className="text-2xs font-bold text-foreground">
                  SQLite FTS Storage
                </span>
                <span className="text-[11px] leading-relaxed text-muted-foreground">
                  Metadata, EXIF tags, and quality flags store in a local indexed database powering sub-millisecond queries.
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-2.5">
                <span className="text-2xs font-bold text-foreground">
                  Worker Thread Hashing
                </span>
                <span className="text-[11px] leading-relaxed text-muted-foreground">
                  Perceptual hashing and thumbnail extraction execute across multi-threaded Node.js worker pools to keep the UI responsive.
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
            Click any metric tile to open the Browse page filtered to that category.
          </span>
        </div>
      </div>
    </>
  )
}
