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
  Copy,
  Zap,
  Trash2,
  MousePointerClick,
  Sparkles,
  Keyboard,
  ArrowLeftRight,
  Bookmark,
  ChevronDown,
  Code2,
  BookOpen,
  FolderTree,
  History,
  RotateCcw,
} from "lucide-react"
import { useUIStore } from "../../../stores/ui-store"

export const DuplicatesHelp: React.FC = () => {
  const activeTab = useUIStore((s) => s.activeDuplicatesTab)
  const [isOpenManual, setIsOpenManual] = useState(false)
  const [isOpenAuto, setIsOpenAuto] = useState(false)

  if (activeTab === "manual") {
    return (
      <>
        {/* Header */}
        <DialogHeader className="shrink-0 border-b border-border pb-3">
          <DialogTitle className="flex items-center gap-3 text-base font-bold text-foreground">
            <Copy className="size-5 text-primary" />
            Duplicate Audit: Similar Media
          </DialogTitle>
          <DialogDescription className="mt-1 text-xs leading-normal text-muted-foreground">
            Burst photos, bracketed exposures, and similarity checking.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="min-h-0 flex-1 scrollbar-thin space-y-4 overflow-y-auto pr-1">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Review visually similar photos, burst sequences, and near-identical shots. Compare composite quality scores to keep only the crispest version and stage the rest for deletion.
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
                  Similarity Cluster
                </span>
                <span className="mt-1 text-xs leading-normal text-muted-foreground">
                  Photos grouped by perceptual fingerprint (pHash), capturing burst sequences, angle variations, and edits.
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-muted/10 p-3">
                <span className="text-xs font-bold text-foreground">
                  Best Choice
                </span>
                <span className="mt-1 text-xs leading-normal text-muted-foreground">
                  Automatically elected highest-quality photo based on Laplacian sharpness, resolution, and exposure metrics.
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-muted/10 p-3">
                <span className="text-xs font-bold text-foreground">
                  Focus Mode
                </span>
                <span className="mt-1 text-xs leading-normal text-muted-foreground">
                  Dedicated keyboard mode to navigate individual cards within a cluster using WASD or arrow keys.
                </span>
              </div>
            </div>
          </div>

          {/* 2. Actions & Controls */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-primary">
              Actions & Keyboard Shortcuts
            </h4>
            <div className="divide-y divide-border/40 overflow-hidden rounded-xl border border-border/60 bg-muted/5">
              <div className="flex flex-col items-start gap-1 p-3 text-xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
                <div className="flex shrink-0 items-center gap-2">
                  <Sparkles className="size-4 shrink-0 text-primary" />
                  <span className="font-semibold text-foreground">
                    Auto-Keep Best
                  </span>
                  <div className="flex gap-1">
                    <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-xs font-bold text-muted-foreground">
                      Space
                    </kbd>
                    <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-xs font-bold text-muted-foreground">
                      ↵
                    </kbd>
                  </div>
                </div>
                <span className="text-muted-foreground">
                  Keeps the highest-quality photo in the group, marks all other copies for trash, and advances to the next cluster.
                </span>
              </div>
              <div className="flex flex-col items-start gap-1 p-3 text-xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
                <div className="flex shrink-0 items-center gap-2">
                  <Bookmark className="size-4 shrink-0 text-primary" />
                  <span className="font-semibold text-foreground">
                    Keep All / Delete All
                  </span>
                  <div className="flex gap-1">
                    <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-xs font-bold text-muted-foreground">
                      C
                    </kbd>
                    <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-xs font-bold text-muted-foreground">
                      X
                    </kbd>
                  </div>
                </div>
                <span className="text-muted-foreground">
                  Bulk decision to keep all items (<kbd className="font-mono bg-muted px-1 rounded">C</kbd>) or delete all items (<kbd className="font-mono bg-muted px-1 rounded">X</kbd>) in the current group.
                </span>
              </div>
              <div className="flex flex-col items-start gap-1 p-3 text-xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
                <div className="flex shrink-0 items-center gap-2">
                  <Keyboard className="size-4 shrink-0 text-primary" />
                  <span className="font-semibold text-foreground">
                    Focus Mode
                  </span>
                  <div className="flex gap-1">
                    <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-xs font-bold text-muted-foreground">
                      F
                    </kbd>
                  </div>
                </div>
                <span className="text-muted-foreground">
                  Press <kbd className="font-mono bg-muted px-1 rounded">F</kbd> to enter focus mode. Move between cards with <kbd className="font-mono bg-muted px-1 rounded">WASD</kbd> or arrow keys, toggle Keep/Delete with <kbd className="font-mono bg-muted px-1 rounded">Space</kbd> / <kbd className="font-mono bg-muted px-1 rounded">Enter</kbd>, and exit with <kbd className="font-mono bg-muted px-1 rounded">Esc</kbd> or <kbd className="font-mono bg-muted px-1 rounded">F</kbd>.
                </span>
              </div>
              <div className="flex flex-col items-start gap-1 p-3 text-xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
                <div className="flex shrink-0 items-center gap-2">
                  <RotateCcw className="size-4 shrink-0 text-primary" />
                  <span className="font-semibold text-foreground">
                    Undo Decision
                  </span>
                  <div className="flex gap-1">
                    <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-xs font-bold text-muted-foreground">
                      S
                    </kbd>
                    <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-xs font-bold text-muted-foreground">
                      ↓
                    </kbd>
                    <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-xs font-bold text-muted-foreground">
                      Ctrl+Z
                    </kbd>
                  </div>
                </div>
                <span className="text-muted-foreground">
                  Reverts decisions made on the previous duplicate cluster.
                </span>
              </div>
              <div className="flex flex-col items-start gap-1 p-3 text-xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
                <div className="flex shrink-0 items-center gap-2">
                  <History className="size-4 shrink-0 text-primary" />
                  <span className="font-semibold text-foreground">
                    Decision History
                  </span>
                </div>
                <span className="text-muted-foreground">
                  Click the History button in the top toolbar to review previously audited duplicate groups and change individual decisions.
                </span>
              </div>
            </div>
          </div>

          {/* 3. Collapsible Under the Hood Technical Concepts */}
          <Collapsible open={isOpenManual} onOpenChange={setIsOpenManual} className="space-y-2">
            <CollapsibleTrigger asChild>
              <button className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground">
                <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                  <Code2 className="size-4" />
                  Under the Hood & Technical Concepts
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-normal text-muted-foreground">
                    {isOpenManual ? "Hide details" : "Learn how it works"}
                  </span>
                  <ChevronDown className={`size-4 text-muted-foreground transition-transform duration-200 ${isOpenManual ? "rotate-180" : ""}`} />
                </div>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-1">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-3">
                  <span className="text-xs font-bold text-foreground">
                    Perceptual Hashing (pHash)
                  </span>
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    Converts image frequencies into a 64-bit structural fingerprint to compute visual similarity independent of file format, compression, or resolution.
                  </span>
                </div>
                <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-3">
                  <span className="text-xs font-bold text-foreground">
                    Laplacian Variance Blur Detection
                  </span>
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    Calculates high-frequency edge gradients across the image canvas to detect motion blur and select the sharpest photo in a burst.
                  </span>
                </div>
                <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-3">
                  <span className="text-xs font-bold text-foreground">
                    Luminance Histogram Weighting
                  </span>
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    Analyzes tone distribution to penalize underexposed shadows or blown-out highlights.
                  </span>
                </div>
                <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-3">
                  <span className="text-xs font-bold text-foreground">
                    Resolution & Dimension Tiebreakers
                  </span>
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    Total megapixel resolution and file size act as secondary tiebreakers when sharpness metrics are identical.
                  </span>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Pro Tip Banner */}
        <div className="mt-auto flex shrink-0 flex-row items-start gap-3 border-t border-border pt-4">
          <div className="shrink-0 rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary">
            <Zap className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-xs font-semibold text-primary">
              Pro Tip: Rapid Burst Triage
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
              Press <kbd className="font-mono bg-muted px-1 text-xs rounded">Space</kbd> to accept the auto-selected best shot and advance instantly. If you need manual adjustments, press <kbd className="font-mono bg-muted px-1 text-xs rounded">F</kbd> to enter Focus Mode, navigate with <kbd className="font-mono bg-muted px-1 text-xs rounded">WASD</kbd>, and toggle cards with <kbd className="font-mono bg-muted px-1 text-xs rounded">Space</kbd>.
            </span>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Header */}
      <DialogHeader className="shrink-0 border-b border-border pb-3">
        <DialogTitle className="flex items-center gap-3 text-base font-bold text-foreground">
          <Copy className="size-5 text-primary" />
          Duplicate Audit: Exact Duplicates
        </DialogTitle>
        <DialogDescription className="mt-1 text-xs leading-normal text-muted-foreground">
          Automated exact matching, strategy rules, and bulk resolution.
        </DialogDescription>
      </DialogHeader>

      {/* Scrollable Content */}
      <div className="min-h-0 flex-1 scrollbar-thin space-y-4 overflow-y-auto pr-1">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Locate and delete 100% binary identical files identified by fast content hashing. Choose an auto-keep strategy or customize folder rules to decide which copy to keep.
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
                Content Hash (xxHash64)
              </span>
              <span className="mt-1 text-xs leading-normal text-muted-foreground">
                Deterministic binary checksum. Matching hashes guarantee 100% identical file data with zero false positives.
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-muted/10 p-3">
              <span className="text-xs font-bold text-foreground">
                Canonical Copy
              </span>
              <span className="mt-1 text-xs leading-normal text-muted-foreground">
                The single copy chosen to be kept based on your active strategy, highlighted with a green badge.
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-muted/10 p-3">
              <span className="text-xs font-bold text-foreground">
                Folder Rules
              </span>
              <span className="mt-1 text-xs leading-normal text-muted-foreground">
                Configurable directory priorities (Preferred Keep vs Preferred Delete) that automatically dictate which folder wins.
              </span>
            </div>
          </div>
        </div>

        {/* 2. Actions & Controls */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-primary">
            Auto-Keep Strategies & Controls
          </h4>
          <div className="divide-y divide-border/40 overflow-hidden rounded-xl border border-border/60 bg-muted/5">
            <div className="flex flex-col items-start gap-1 p-3 text-xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <MousePointerClick className="size-4 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Strategy Selection
                </span>
              </div>
              <span className="text-muted-foreground">
                Choose the rule used to elect the kept copy: <strong>Most Grouped</strong> (folder with most sibling photos), <strong>Oldest</strong> (earliest capture date), <strong>Newest</strong>, <strong>Shortest Path</strong>, or <strong>Folder Rules</strong>.
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 p-3 text-xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <ArrowLeftRight className="size-4 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Manual Swap
                </span>
              </div>
              <span className="text-muted-foreground">
                Click any file row in a group card to manually override the strategy and designate that copy to be kept instead.
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 p-3 text-xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <Trash2 className="size-4 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Trash Redundant Copies
                </span>
              </div>
              <span className="text-muted-foreground">
                Stages all redundant duplicate copies for deletion, calculating total space reclaimed before sending them to the OS Recycle Bin in the background.
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 p-3 text-xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <FolderTree className="size-4 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Configure Folder Rules
                </span>
              </div>
              <span className="text-muted-foreground">
                Set Preferred Keep Folders (e.g. Master Library) and Preferred Delete Folders (e.g. Backup / Imports) in Settings to automatically resolve conflicts.
              </span>
            </div>
          </div>
        </div>

        {/* 3. Collapsible Under the Hood Technical Concepts */}
        <Collapsible open={isOpenAuto} onOpenChange={setIsOpenAuto} className="space-y-2">
          <CollapsibleTrigger asChild>
            <button className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <Code2 className="size-4" />
                Under the Hood & Technical Concepts
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-normal text-muted-foreground">
                  {isOpenAuto ? "Hide details" : "Learn how it works"}
                </span>
                <ChevronDown className={`size-4 text-muted-foreground transition-transform duration-200 ${isOpenAuto ? "rotate-180" : ""}`} />
              </div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-1">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-3">
                <span className="text-xs font-bold text-foreground">
                  xxHash64 & Fast Chunk Hashing
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  Computes high-speed 64-bit content signatures of file bytes. Files with identical content match even if renamed or located on different drives.
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-3">
                <span className="text-xs font-bold text-foreground">
                  Folder Sibling Density Heuristic
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  The "Most Grouped" strategy calculates cluster weights by counting sibling files in parent directories to prevent breaking up curated photo albums.
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-3">
                <span className="text-xs font-bold text-foreground">
                  Path Depth Analysis
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  Evaluates folder nesting levels to prefer clean, shallow directory paths over deeply nested backup subfolders.
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-3">
                <span className="text-xs font-bold text-foreground">
                  Background Trashing Pipeline
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  Deletion operations execute in a non-blocking background queue with live progress pills in the TopBar.
                </span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </>
  )
}
