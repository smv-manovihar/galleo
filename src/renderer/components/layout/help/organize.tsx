import React from 'react';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { FolderPlus, Zap, FolderTree, Eye, FolderCheck } from 'lucide-react';

export const OrganizeHelp: React.FC = () => {
  return (
    <>
      {/* Header */}
      <DialogHeader className="border-b border-border pb-3 shrink-0">
        <DialogTitle className="flex items-center gap-2.5 text-base font-bold text-foreground">
          <FolderPlus className="size-5 text-primary" />
          Date Organizer
        </DialogTitle>
        <DialogDescription className="text-2xs text-muted-foreground leading-normal font-semibold mt-0.5 uppercase tracking-wider">
          Arrange your local files by chronology.
        </DialogDescription>
      </DialogHeader>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto space-y-5 min-h-0 pr-1 scrollbar-thin">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Sort scattered media files into an organized folder hierarchy based on creation timestamps. It uses EXIF metadata first, and falls back to file creation/modification times only if EXIF metadata is missing.
        </p>

        {/* Core Concepts */}
        <div className="space-y-2">
          <h4 className="text-3xs font-extrabold uppercase text-primary tracking-wider">
            Core Concepts
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 border border-border/60 bg-muted/10 rounded-xl flex flex-col gap-1 transition-all duration-200 hover:border-primary/20">
              <span className="text-xs font-bold text-foreground">EXIF Timestamp</span>
              <span className="text-2xs text-muted-foreground leading-normal mt-0.5">
                The date and time when the photo/video was originally captured by the camera, extracted from metadata.
              </span>
            </div>
            <div className="p-3 border border-border/60 bg-muted/10 rounded-xl flex flex-col gap-1 transition-all duration-200 hover:border-primary/20">
              <span className="text-xs font-bold text-foreground">Path Simulation</span>
              <span className="text-2xs text-muted-foreground leading-normal mt-0.5">
                A dry-run previewing the destination folders and file moves without making changes to disk.
              </span>
            </div>
            <div className="p-3 border border-border/60 bg-muted/10 rounded-xl flex flex-col gap-1 transition-all duration-200 hover:border-primary/20">
              <span className="text-xs font-bold text-foreground">Collision Guard</span>
              <span className="text-2xs text-muted-foreground leading-normal mt-0.5">
                Detection of filename conflicts in target folders. Conflicting names are auto-renamed to prevent overwriting.
              </span>
            </div>
          </div>
        </div>

        {/* Actions & Controls */}
        <div className="space-y-2">
          <h4 className="text-3xs font-extrabold uppercase text-primary tracking-wider">
            Actions & Controls
          </h4>
          <div className="border border-border/60 rounded-xl overflow-hidden divide-y divide-border/40 bg-muted/5">
            <div className="flex flex-col sm:grid sm:grid-cols-[180px_1fr] p-3 gap-1 sm:gap-4 text-2xs hover:bg-muted/10 transition-colors items-start sm:items-center">
              <div className="flex items-center gap-2 shrink-0">
                <FolderTree className="size-3.5 text-primary shrink-0" />
                <span className="font-semibold text-foreground">Select Structure</span>
              </div>
              <span className="text-muted-foreground">
                Choose how folders should be grouped (e.g. YYYY/MM or YYYY/YYYY-MM-DD).
              </span>
            </div>
            <div className="flex flex-col sm:grid sm:grid-cols-[180px_1fr] p-3 gap-1 sm:gap-4 text-2xs hover:bg-muted/10 transition-colors items-start sm:items-center">
              <div className="flex items-center gap-2 shrink-0">
                <Eye className="size-3.5 text-primary shrink-0" />
                <span className="font-semibold text-foreground">Run Simulation</span>
              </div>
              <span className="text-muted-foreground">
                Generate the file migration report. Lists source files, targets, and any collisions.
              </span>
            </div>
            <div className="flex flex-col sm:grid sm:grid-cols-[180px_1fr] p-3 gap-1 sm:gap-4 text-2xs hover:bg-muted/10 transition-colors items-start sm:items-center">
              <div className="flex items-center gap-2 shrink-0">
                <FolderCheck className="size-3.5 text-primary shrink-0" />
                <span className="font-semibold text-foreground">Apply Reorganization</span>
              </div>
              <span className="text-muted-foreground">
                Perform the actual physical movement of files on your local drive.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tip Banner */}
      <div className="border-t border-border pt-3.5 mt-auto flex flex-row items-start gap-3 shrink-0">
        <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
          <Zap className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-2xs font-extrabold uppercase text-primary tracking-wider block">PRO TIP</span>
          <span className="text-2xs text-muted-foreground leading-relaxed mt-0.5 block">
            Always check the "Path Simulation" results before clicking "Apply Reorganization" to ensure the folders will be organized exactly how you expect.
          </span>
        </div>
      </div>
    </>
  );
};
