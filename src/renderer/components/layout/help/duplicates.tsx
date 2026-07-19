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
          <DialogTitle className="flex items-center gap-2.5 text-base font-bold text-foreground">
            <Copy className="size-5 text-primary" />
            Duplicate Audit: Similar Media
          </DialogTitle>
          <DialogDescription className="mt-0.5 text-2xs leading-normal font-semibold tracking-wider text-muted-foreground uppercase">
            Burst photos, bracketed exposures, and similarity checking.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="min-h-0 flex-1 scrollbar-thin space-y-4 overflow-y-auto pr-1">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Review visually similar photos and bursts to choose which copies to keep or delete.
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
                  Similarity Score
                </span>
                <span className="mt-0.5 text-2xs leading-normal text-muted-foreground">
                  Visual likeness percentage identifying burst shots or near-identical photos.
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-muted/10 p-2.5">
                <span className="text-xs font-bold text-foreground">
                  Best Choice
                </span>
                <span className="mt-0.5 text-2xs leading-normal text-muted-foreground">
                  Highest-scoring photo based on sharpness, resolution, and exposure metrics.
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-muted/10 p-2.5">
                <span className="text-xs font-bold text-foreground">
                  Review State
                </span>
                <span className="mt-0.5 text-2xs leading-normal text-muted-foreground">
                  Decision status assigned to each item ("Keep", "Delete", or "Pending").
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
                  <Sparkles className="size-3.5 shrink-0 text-primary" />
                  <span className="font-semibold text-foreground">
                    Auto-Keep Best
                  </span>
                </div>
                <span className="text-muted-foreground">
                  Keeps the highest quality photo in group and marks remaining copies for trash.
                </span>
              </div>
              <div className="flex flex-col items-start gap-1 p-3 text-2xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
                <div className="flex shrink-0 items-center gap-2">
                  <Bookmark className="size-3.5 shrink-0 text-primary" />
                  <span className="font-semibold text-foreground">
                    Keep All / Delete All
                  </span>
                </div>
                <span className="text-muted-foreground">
                  Bulk action to keep or delete all items in the current group.
                </span>
              </div>
              <div className="flex flex-col items-start gap-1 p-3 text-2xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
                <div className="flex shrink-0 items-center gap-2">
                  <Keyboard className="size-3.5 shrink-0 text-primary" />
                  <span className="font-semibold text-foreground">
                    Keyboard Shortcuts
                  </span>
                </div>
                <span className="text-muted-foreground">
                  <kbd className="font-mono bg-muted px-1 text-[10px] rounded">1</kbd>/<kbd className="font-mono bg-muted px-1 text-[10px] rounded">2</kbd>/<kbd className="font-mono bg-muted px-1 text-[10px] rounded">3</kbd> toggle items, <kbd className="font-mono bg-muted px-1 text-[10px] rounded">B</kbd>/<kbd className="font-mono bg-muted px-1 text-[10px] rounded">Space</kbd>/<kbd className="font-mono bg-muted px-1 text-[10px] rounded">Enter</kbd> auto-keep best, and <kbd className="font-mono bg-muted px-1 text-[10px] rounded">H</kbd>/<kbd className="font-mono bg-muted px-1 text-[10px] rounded">L</kbd> or <kbd className="font-mono bg-muted px-1 text-[10px] rounded">←</kbd>/<kbd className="font-mono bg-muted px-1 text-[10px] rounded">→</kbd> navigate.
                </span>
              </div>
            </div>
          </div>

          {/* 3. Collapsible Under the Hood Technical Concepts */}
          <Collapsible open={isOpenManual} onOpenChange={setIsOpenManual} className="space-y-2">
            <CollapsibleTrigger asChild>
              <button className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-2xs font-semibold text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground">
                <div className="flex items-center gap-2 text-3xs font-extrabold tracking-wider text-primary uppercase">
                  <Code2 className="size-3.5" />
                  Under the Hood & Technical Concepts
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-normal text-muted-foreground">
                    {isOpenManual ? "Hide details" : "Learn how it works"}
                  </span>
                  <ChevronDown className={`size-3.5 text-muted-foreground transition-transform duration-200 ${isOpenManual ? "rotate-180" : ""}`} />
                </div>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-1">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-2.5">
                  <span className="text-2xs font-bold text-foreground">
                    Perceptual Hashing (pHash)
                  </span>
                  <span className="text-[11px] leading-relaxed text-muted-foreground">
                    Converts image frequencies into a 64-bit structural fingerprint to compute visual similarity independent of file format or resolution.
                  </span>
                </div>
                <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-2.5">
                  <span className="text-2xs font-bold text-foreground">
                    Laplacian Variance (Blur Detection)
                  </span>
                  <span className="text-[11px] leading-relaxed text-muted-foreground">
                    Calculates high-frequency edge gradients across the image canvas to detect motion blur and select the sharpest photo in a burst.
                  </span>
                </div>
                <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-2.5">
                  <span className="text-2xs font-bold text-foreground">
                    Luminance Histogram
                  </span>
                  <span className="text-[11px] leading-relaxed text-muted-foreground">
                    Analyzes tone distribution to penalize underexposed or overexposed highlights.
                  </span>
                </div>
                <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-2.5">
                  <span className="text-2xs font-bold text-foreground">
                    Resolution & Megapixel Weighting
                  </span>
                  <span className="text-[11px] leading-relaxed text-muted-foreground">
                    Total pixel resolution and file size act as secondary tiebreakers when sharpness metrics are identical.
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
              Press <kbd className="font-mono bg-muted px-1 text-[10px] rounded">B</kbd> or <kbd className="font-mono bg-muted px-1 text-[10px] rounded">Space</kbd> to auto-keep the best photo, or <kbd className="font-mono bg-muted px-1 text-[10px] rounded">1</kbd>/<kbd className="font-mono bg-muted px-1 text-[10px] rounded">2</kbd>/<kbd className="font-mono bg-muted px-1 text-[10px] rounded">3</kbd> to toggle selections directly.
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
        <DialogTitle className="flex items-center gap-2.5 text-base font-bold text-foreground">
          <Copy className="size-5 text-primary" />
          Duplicate Audit: Exact Duplicates
        </DialogTitle>
        <DialogDescription className="mt-0.5 text-2xs leading-normal font-semibold tracking-wider text-muted-foreground uppercase">
          Automated exact matching and visual comparisons.
        </DialogDescription>
      </DialogHeader>

      {/* Scrollable Content */}
      <div className="min-h-0 flex-1 scrollbar-thin space-y-4 overflow-y-auto pr-1">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Locate and clean exact duplicate files using content hashes.
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
                Content Hash
              </span>
              <span className="mt-0.5 text-2xs leading-normal text-muted-foreground">
                Unique binary signature. Matching hashes indicate 100% identical files.
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-muted/10 p-2.5">
              <span className="text-xs font-bold text-foreground">
                Canonical Copy
              </span>
              <span className="mt-0.5 text-2xs leading-normal text-muted-foreground">
                Single copy selected to keep based on directory rules, marked green.
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-muted/10 p-2.5">
              <span className="text-xs font-bold text-foreground">
                Staged Deletion
              </span>
              <span className="mt-0.5 text-2xs leading-normal text-muted-foreground">
                Flagging redundant copies to safely move to OS Recycle Bin.
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
                <Trash2 className="size-3.5 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Trash All
                </span>
              </div>
              <span className="text-muted-foreground">
                Pre-selects redundant exact copies for deletion, keeping the best copy.
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 p-3 text-2xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <ArrowLeftRight className="size-3.5 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Swap Selection
                </span>
              </div>
              <span className="text-muted-foreground">
                Click any row to swap which copy is kept and which is trashed.
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 p-3 text-2xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <MousePointerClick className="size-3.5 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Auto-keep Strategy
                </span>
              </div>
              <span className="text-muted-foreground">
                Select strategy (Oldest, Newest, Most Grouped, Shortest Path) to pick the default copy to keep.
              </span>
            </div>
          </div>
        </div>

        {/* 3. Collapsible Under the Hood Technical Concepts */}
        <Collapsible open={isOpenAuto} onOpenChange={setIsOpenAuto} className="space-y-2">
          <CollapsibleTrigger asChild>
            <button className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-2xs font-semibold text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground">
              <div className="flex items-center gap-2 text-3xs font-extrabold tracking-wider text-primary uppercase">
                <Code2 className="size-3.5" />
                Under the Hood & Technical Concepts
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-normal text-muted-foreground">
                  {isOpenAuto ? "Hide details" : "Learn how it works"}
                </span>
                <ChevronDown className={`size-3.5 text-muted-foreground transition-transform duration-200 ${isOpenAuto ? "rotate-180" : ""}`} />
              </div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-1">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-2.5">
                <span className="text-2xs font-bold text-foreground">
                  xxHash & SHA-256 Hashing
                </span>
                <span className="text-[11px] leading-relaxed text-muted-foreground">
                  Computes fast, deterministic binary signatures of file content. Guaranteed zero false positives even if files are renamed across drives.
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-2.5">
                <span className="text-2xs font-bold text-foreground">
                  Folder Sibling Density
                </span>
                <span className="text-[11px] leading-relaxed text-muted-foreground">
                  The "Most Grouped" strategy calculates cluster weights by counting sibling files in parent directories to prevent breaking up main photo albums.
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-2.5">
                <span className="text-2xs font-bold text-foreground">
                  Path Depth Heuristic
                </span>
                <span className="text-[11px] leading-relaxed text-muted-foreground">
                  Analyzes folder nesting levels to prefer shallow, clean directory paths over deep nested backup locations.
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-2.5">
                <span className="text-2xs font-bold text-foreground">
                  Session Checkpointing
                </span>
                <span className="text-[11px] leading-relaxed text-muted-foreground">
                  All review decisions persist in a local SQLite transaction log so you can close the app mid-audit without losing progress.
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
            Use the <strong>"Most Grouped"</strong> strategy to keep photos in main parent folders instead of backup copies.
          </span>
        </div>
      </div>
    </>
  )
}
