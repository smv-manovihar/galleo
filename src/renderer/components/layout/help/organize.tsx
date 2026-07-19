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
  Zap,
  BookOpen,
  Code2,
  ChevronDown,
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
        <DialogDescription className="mt-0.5 text-2xs leading-normal font-semibold tracking-wider text-muted-foreground uppercase">
          Arrange your local files by chronology.
        </DialogDescription>
      </DialogHeader>

      {/* Scrollable Content */}
      <div className="min-h-0 flex-1 scrollbar-thin space-y-4 overflow-y-auto pr-1">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Organize media files into date-based subfolders using EXIF headers and system dates.
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
                EXIF Timestamp
              </span>
              <span className="mt-0.5 text-2xs leading-normal text-muted-foreground">
                Original capture date extracted from camera metadata headers.
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-muted/10 p-2.5">
              <span className="text-xs font-bold text-foreground">
                Path Simulation
              </span>
              <span className="mt-0.5 text-2xs leading-normal text-muted-foreground">
                Dry-run preview showing target destination paths before moving files.
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-muted/10 p-2.5">
              <span className="text-xs font-bold text-foreground">
                Collision Guard
              </span>
              <span className="mt-0.5 text-2xs leading-normal text-muted-foreground">
                Detection of filename conflicts to prevent overwriting existing files.
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
                <FolderTree className="size-3.5 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Select Structure
                </span>
              </div>
              <span className="text-muted-foreground">
                Choose folder pattern preset (e.g. YYYY/MM or YYYY/MM - MMMM).
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 p-3 text-2xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <Eye className="size-3.5 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Run Simulation
                </span>
              </div>
              <span className="text-muted-foreground">
                Preview proposed subfolders, file paths, and collision checks before moving.
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 p-3 text-2xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <FolderCheck className="size-3.5 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Apply Organization
                </span>
              </div>
              <span className="text-muted-foreground">
                Executes the organization move or copy changes to disk.
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
                  EXIF & Timestamp Fallback Chain
                </span>
                <span className="text-[11px] leading-relaxed text-muted-foreground">
                  Resolves dates in sequence: EXIF `DateTimeOriginal` → `CreateDate` → File `birthtime`/`mtime` → Regex filename parsing.
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-2.5">
                <span className="text-2xs font-bold text-foreground">
                  Collision Resolution Engine
                </span>
                <span className="text-[11px] leading-relaxed text-muted-foreground">
                  Target folder name collisions append clean numerical suffixes (e.g., `photo(1).jpg`) to prevent data loss.
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-2.5">
                <span className="text-2xs font-bold text-foreground">
                  Atomic System Move
                </span>
                <span className="text-[11px] leading-relaxed text-muted-foreground">
                  Same-volume file moves execute via atomic filesystem pointer updates (`fs.rename`), preserving file creation attributes.
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
            Run <strong>"Preview Organization"</strong> to inspect target folder paths and collision checks before applying changes on disk.
          </span>
        </div>
      </div>
    </>
  )
}
