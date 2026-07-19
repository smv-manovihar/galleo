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
  Zap,
  BookOpen,
  Code2,
  ChevronDown,
  LayoutGrid,
  Search,
  Sliders,
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
        <DialogDescription className="mt-0.5 text-2xs leading-normal font-semibold tracking-wider text-muted-foreground uppercase">
          Learn how to optimize your media library.
        </DialogDescription>
      </DialogHeader>

      <div className="min-h-0 flex-1 scrollbar-thin space-y-4 overflow-y-auto pr-1">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Quick reference for Galleo tools, features, and keyboard shortcuts.
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
                Local-First
              </span>
              <span className="mt-0.5 text-2xs leading-normal text-muted-foreground">
                All image processing and indexing stays on your local device.
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-muted/10 p-2.5">
              <span className="text-xs font-bold text-foreground">
                Quality Defect
              </span>
              <span className="mt-0.5 text-2xs leading-normal text-muted-foreground">
                Automatic detection of blurry, dark, screenshot, or duplicate media.
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-muted/10 p-2.5">
              <span className="text-xs font-bold text-foreground">
                Staged Deletion
              </span>
              <span className="mt-0.5 text-2xs leading-normal text-muted-foreground">
                Flagged items are queued in memory before safely moving to OS Recycle Bin.
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
                <LayoutGrid className="size-3.5 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Navigation Bar
                </span>
              </div>
              <span className="text-muted-foreground">
                Navigate between Dashboard, Browse, Culling, Duplicates, Organizer, and Settings.
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 p-3 text-2xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <Search className="size-3.5 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Global Search
                </span>
              </div>
              <span className="text-muted-foreground">
                Use top bar search to filter media files by filename.
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 p-3 text-2xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <Sliders className="size-3.5 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Context Help
                </span>
              </div>
              <span className="text-muted-foreground">
                Click ? in the top bar to view context help for the current page.
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
                  Local SQLite Engine
                </span>
                <span className="text-[11px] leading-relaxed text-muted-foreground">
                  All image metadata and hashes remain in a local SQLite file database on your device.
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-2.5">
                <span className="text-2xs font-bold text-foreground">
                  Electron IPC Bridge
                </span>
                <span className="text-[11px] leading-relaxed text-muted-foreground">
                  Asynchronous IPC channels isolate UI rendering from native filesystem I/O operations.
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
            Click the Help icon (<code className="bg-muted px-1 rounded text-[10px]">?</code>) in the top bar on any page for guides and keyboard shortcuts.
          </span>
        </div>
      </div>
    </>
  )
}
