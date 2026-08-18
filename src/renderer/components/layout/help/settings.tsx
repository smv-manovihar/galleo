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
  Settings,
  FolderOpen,
  SlidersHorizontal,
  Palette,
  BookOpen,
  Code2,
  ChevronDown,
  Sparkles,
  Settings2,
  RefreshCcw,
  Info,
} from "lucide-react"

export const SettingsHelp: React.FC = () => {
  const [isTechOpen, setIsTechOpen] = useState(false)

  return (
    <>
      {/* Header */}
      <DialogHeader className="shrink-0 border-b border-border pb-3">
        <DialogTitle className="flex items-center gap-3 text-base font-bold text-foreground">
          <Settings className="size-5 text-primary" />
          App Settings
        </DialogTitle>
        <DialogDescription className="mt-1 text-xs leading-normal text-muted-foreground">
          Configure root paths, scan rules, defect thresholds, and themes.
        </DialogDescription>
      </DialogHeader>

      {/* Scrollable Content */}
      <div className="min-h-0 flex-1 scrollbar-thin space-y-4 overflow-y-auto pr-1">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Customize Galleo's scanning behavior, quality detection sensitivity, duplicate resolution rules, visual theme, and AI search indexing.
        </p>

        {/* 1. Key Terms */}
        <div className="space-y-2">
          <h4 className="flex items-center gap-2 text-xs font-semibold text-primary">
            <BookOpen className="size-3" />
            Key Terms
          </h4>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-muted/10 p-3">
              <span className="text-xs font-bold text-foreground">
                Allowed Roots & Folder Rules
              </span>
              <span className="mt-1 text-xs leading-normal text-muted-foreground">
                Folders Galleo is authorized to scan, including optional rules defining preferred keep and delete directories.
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-muted/10 p-3">
              <span className="text-xs font-bold text-foreground">
                Quality Thresholds
              </span>
              <span className="mt-1 text-xs leading-normal text-muted-foreground">
                Sensitivity cutoffs for blurriness (Laplacian variance), darkness (luminance histogram), and visual similarity radius.
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-muted/10 p-3">
              <span className="text-xs font-bold text-foreground">
                Scan Rules & Exclusions
              </span>
              <span className="mt-1 text-xs leading-normal text-muted-foreground">
                Parallelism limits, minimum file size cutoff, and glob exclusion patterns (e.g. `**/node_modules/**`, `**/.git/**`).
              </span>
            </div>
          </div>
        </div>

        {/* 2. Actions & Controls */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-primary">
            Settings Sections
          </h4>
          <div className="divide-y divide-border/40 overflow-hidden rounded-xl border border-border/60 bg-muted/5">
            <div className="flex flex-col items-start gap-1 p-3 text-xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <FolderOpen className="size-4 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Allowed Roots
                </span>
              </div>
              <span className="text-muted-foreground">
                Add or remove monitored folders, toggle active indexing, view scan timestamps, and configure duplicate folder rules.
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 p-3 text-xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <Settings2 className="size-4 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Scan Rules
                </span>
              </div>
              <span className="text-muted-foreground">
                Configure subdirectory traversal, worker thread parallelism, minimum file size filter, and glob patterns to ignore unwanted directories.
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 p-3 text-xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <SlidersHorizontal className="size-4 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Quality Thresholds
                </span>
              </div>
              <span className="text-muted-foreground">
                Fine-tune blur sensitivity, darkness exposure cutoff, and default visual similarity radius.
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 p-3 text-xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <Palette className="size-4 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Theme & Interface
                </span>
              </div>
              <span className="text-muted-foreground">
                Switch between Light, Dark, or System mode, and toggle view transition animations.
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 p-3 text-xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <Sparkles className="size-4 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  AI Visual Search
                </span>
              </div>
              <span className="text-muted-foreground">
                Configure on-device embedding models, monitor semantic indexing progress, and enable natural language visual searches.
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 p-3 text-xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <RefreshCcw className="size-4 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Reset App Data
                </span>
              </div>
              <span className="text-muted-foreground">
                Selectively clear thumbnail caches, purge indexed metadata, or execute a complete factory reset.
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 p-3 text-xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <Info className="size-4 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  About & Updates
                </span>
              </div>
              <span className="text-muted-foreground">
                View installed app version, check for software updates, and review release changelogs.
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
                  Local JSON Store
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  User configuration options serialize locally to `settings.json` in the Electron `userData` directory.
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-3">
                <span className="text-xs font-bold text-foreground">
                  IPC Security Boundaries
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  All file read and write operations are strictly restricted to paths present in the registered directory root list.
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-3">
                <span className="text-xs font-bold text-foreground">
                  Rescan Signal Propagation
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  Adjusting defect sensitivity thresholds marks database quality scores dirty, prompting a targeted rescan banner.
                </span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </>
  )
}
