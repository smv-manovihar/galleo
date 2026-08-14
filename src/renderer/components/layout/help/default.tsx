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
  HelpCircle,
  BookOpen,
  Code2,
  ChevronDown,
  LayoutGrid,
  Search,
  Sliders,
  Activity,
} from "lucide-react"

export const DefaultHelp: React.FC = () => {
  const [isTechOpen, setIsTechOpen] = useState(false)

  return (
    <>
      <DialogHeader className="shrink-0 border-b border-border pb-3">
        <DialogTitle className="flex items-center gap-2.5 text-base font-bold text-foreground">
          <HelpCircle className="size-5 text-primary" />
          Galleo Help Guide
        </DialogTitle>
        <DialogDescription className="mt-0.5 text-xs leading-normal text-muted-foreground">
          Learn how to optimize, clean, and organize your media library.
        </DialogDescription>
      </DialogHeader>

      <div className="min-h-0 flex-1 scrollbar-thin space-y-4 overflow-y-auto pr-1">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Quick overview of Galleo's core tools, background task architecture, search, and navigation.
        </p>

        {/* 1. Key Terms */}
        <div className="space-y-2">
          <h4 className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <BookOpen className="size-3" />
            Key Concepts
          </h4>
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
            <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-muted/10 p-2.5">
              <span className="text-xs font-bold text-foreground">
                Local-First Architecture
              </span>
              <span className="mt-0.5 text-xs leading-normal text-muted-foreground">
                100% offline image processing, metadata indexing, and on-device AI search without cloud dependencies.
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-muted/10 p-2.5">
              <span className="text-xs font-bold text-foreground">
                Quality Defect Engine
              </span>
              <span className="mt-0.5 text-xs leading-normal text-muted-foreground">
                Automated detection of blurry photos, underexposed shots, screenshots, low-res assets, and duplicates.
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-muted/10 p-2.5">
              <span className="text-xs font-bold text-foreground">
                Background Tasks
              </span>
              <span className="mt-0.5 text-xs leading-normal text-muted-foreground">
                Scanning, trashing, and organizing execute in non-blocking background workers with live TopBar indicators.
              </span>
            </div>
          </div>
        </div>

        {/* 2. Actions & Controls */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-primary">
            Navigation & Controls
          </h4>
          <div className="divide-y divide-border/40 overflow-hidden rounded-xl border border-border/60 bg-muted/5">
            <div className="flex flex-col items-start gap-1 p-3 text-xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <LayoutGrid className="size-4 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Feature Views
                </span>
              </div>
              <span className="text-muted-foreground">
                Switch between Dashboard, Browse, Media Culling, Duplicate Audit, Date Organizer, and Settings.
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 p-3 text-xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <Search className="size-4 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Global Search
                </span>
              </div>
              <span className="text-muted-foreground">
                Search files by name or use natural language concepts powered by local AI semantic search.
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 p-3 text-xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <Activity className="size-4 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Task Status Pills
                </span>
              </div>
              <span className="text-muted-foreground">
                Monitor active library scans, background trashing, and file organizing progress directly in the TopBar.
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 p-3 text-xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <Sliders className="size-4 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Context Help
                </span>
              </div>
              <span className="text-muted-foreground">
                Click the Help icon (<code className="bg-muted px-1 rounded font-mono text-xs">?</code>) in the TopBar on any page to open context-specific documentation and keyboard shortcuts.
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
                  Local SQLite Engine
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  All image metadata, EXIF properties, quality metrics, and hashes store in a fast, indexed SQLite database on your device.
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-3">
                <span className="text-xs font-bold text-foreground">
                  Electron IPC Bridge
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  Asynchronous IPC channels isolate UI rendering from native filesystem I/O operations and background workers.
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-3">
                <span className="text-xs font-bold text-foreground">
                  Safe OS Recycle Bin
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  All deletions use native operating system trash facilities, ensuring you can restore any file from your Recycle Bin.
                </span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </>
  )
}
