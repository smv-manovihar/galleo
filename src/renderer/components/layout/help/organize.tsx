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
  FolderPlus,
  FolderTree,
  Eye,
  FolderCheck,
  BookOpen,
  Code2,
  ChevronDown,
  Layers,
} from "lucide-react"

export const OrganizeHelp: React.FC = () => {
  const [isTechOpen, setIsTechOpen] = useState(false)

  return (
    <>
      {/* Header */}
      <DialogHeader className="shrink-0 border-b border-border pb-3">
        <DialogTitle className="flex items-center gap-2.5 text-base font-bold text-foreground">
          <FolderPlus className="size-5 text-primary" />
          Date Organizer
        </DialogTitle>
        <DialogDescription className="mt-0.5 text-xs leading-normal text-muted-foreground">
          Arrange and sort your local media files by capture chronology.
        </DialogDescription>
      </DialogHeader>

      {/* Scrollable Content */}
      <div className="min-h-0 flex-1 scrollbar-thin space-y-4 overflow-y-auto pr-1">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Restructure unorganized photos and videos into structured date-based subfolders using camera EXIF headers, filename timestamps, or system dates.
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
                EXIF Timestamp
              </span>
              <span className="mt-0.5 text-xs leading-normal text-muted-foreground">
                Original capture date extracted from embedded camera metadata headers (`DateTimeOriginal`).
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-muted/10 p-2.5">
              <span className="text-xs font-bold text-foreground">
                Path Simulation
              </span>
              <span className="mt-0.5 text-xs leading-normal text-muted-foreground">
                Dry-run preview displaying proposed target directory paths and collision warnings before modifying files.
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-muted/10 p-2.5">
              <span className="text-xs font-bold text-foreground">
                Collision Guard
              </span>
              <span className="mt-0.5 text-xs leading-normal text-muted-foreground">
                Automatic detection of duplicate target filenames, appending numbered suffixes to prevent data loss.
              </span>
            </div>
          </div>
        </div>

        {/* 2. Actions & Controls */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-primary">
            Actions & Configuration
          </h4>
          <div className="divide-y divide-border/40 overflow-hidden rounded-xl border border-border/60 bg-muted/5">
            <div className="flex flex-col items-start gap-1 p-3 text-xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <FolderTree className="size-4 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Folder Patterns
                </span>
              </div>
              <span className="text-muted-foreground">
                Choose preset folder structures (e.g. <code className="bg-muted px-1 rounded font-mono">YYYY/MM - MMMM</code>, <code className="bg-muted px-1 rounded font-mono">YYYY/YYYY-MM</code>, <code className="bg-muted px-1 rounded font-mono">YYYY/MM/DD</code>) or create custom patterns with format tokens like <code className="bg-muted px-1 rounded font-mono">{"{YYYY}"}</code>, <code className="bg-muted px-1 rounded font-mono">{"{MM}"}</code>, <code className="bg-muted px-1 rounded font-mono">{"{DD}"}</code>.
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 p-3 text-xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <Layers className="size-4 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Move vs Copy Mode
                </span>
              </div>
              <span className="text-muted-foreground">
                Select <strong>Move</strong> to relocate files in-place to the target structure, or <strong>Copy</strong> to keep original files unchanged and create organized duplicates.
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 p-3 text-xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <Eye className="size-4 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Run Simulation
                </span>
              </div>
              <span className="text-muted-foreground">
                Generates a virtualized tree preview showing destination directories, source file counts, and collision checks without making any changes on disk.
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 p-3 text-xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <FolderCheck className="size-4 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Apply Organization
                </span>
              </div>
              <span className="text-muted-foreground">
                Executes file operations in the background with a progress indicator in the TopBar, letting you continue using Galleo while files are moved.
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
                  Hierarchical Date Fallback Chain
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  Resolves dates in sequence: EXIF `DateTimeOriginal` → `CreateDate` → File system `birthtime`/`mtime` → Regex filename parsing.
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-3">
                <span className="text-xs font-bold text-foreground">
                  Collision Resolution Engine
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  Target folder name collisions automatically append clean numerical suffixes (e.g., `photo (1).jpg`) to ensure zero file overwrite risk.
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-3">
                <span className="text-xs font-bold text-foreground">
                  Atomic System Move
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  Same-volume file moves execute via atomic filesystem pointer updates (`fs.rename`), preserving original file creation attributes.
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-3">
                <span className="text-xs font-bold text-foreground">
                  Background Task Queue
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  Batch moves run in a background worker queue with cancelable execution and real-time TopBar task progress.
                </span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </>
  )
}
