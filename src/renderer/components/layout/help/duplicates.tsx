import React from 'react';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Copy, Zap, Trash2, Columns, MousePointerClick } from 'lucide-react';

export const DuplicatesHelp: React.FC = () => {
  return (
    <>
      {/* Header */}
      <DialogHeader className="border-b border-border pb-3 shrink-0">
        <DialogTitle className="flex items-center gap-2.5 text-base font-bold text-foreground">
          <Copy className="size-5 text-primary" />
          Duplicate Audit
        </DialogTitle>
        <DialogDescription className="text-2xs text-muted-foreground leading-normal font-semibold mt-0.5 uppercase tracking-wider">
          Automated exact matching and visual comparisons.
        </DialogDescription>
      </DialogHeader>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto space-y-5 min-h-0 pr-1 scrollbar-thin">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Locate and resolve duplicate files within your media library. This page helps you safely clean identical duplicates using cryptographic content hashes.
        </p>

        {/* Core Concepts */}
        <div className="space-y-2">
          <h4 className="text-3xs font-extrabold uppercase text-primary tracking-wider">
            Core Concepts
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 border border-border/60 bg-muted/10 rounded-xl flex flex-col gap-1 transition-all duration-200 hover:border-primary/20">
              <span className="text-xs font-bold text-foreground">Content Hash</span>
              <span className="text-2xs text-muted-foreground leading-normal mt-0.5">
                A unique signature generated from binary content. Two files with the same hash are 100% identical, even if named differently.
              </span>
            </div>
            <div className="p-3 border border-border/60 bg-muted/10 rounded-xl flex flex-col gap-1 transition-all duration-200 hover:border-primary/20">
              <span className="text-xs font-bold text-foreground">Duplicate Group</span>
              <span className="text-2xs text-muted-foreground leading-normal mt-0.5">
                A cluster of identical files grouped together.
              </span>
            </div>
            <div className="p-3 border border-border/60 bg-muted/10 rounded-xl flex flex-col gap-1 transition-all duration-200 hover:border-primary/20">
              <span className="text-xs font-bold text-foreground">Best in Group</span>
              <span className="text-2xs text-muted-foreground leading-normal mt-0.5">
                The copy identified as the most optimal to keep (usually has the shortest path or cleanest filename).
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
                <Trash2 className="size-3.5 text-primary shrink-0" />
                <span className="font-semibold text-foreground">Auto Cleanup</span>
              </div>
              <span className="text-muted-foreground">
                Pre-selects all redundant copies in exact-duplicate groups for deletion, preserving only the "Best in Group" copy.
              </span>
            </div>
            <div className="flex flex-col sm:grid sm:grid-cols-[180px_1fr] p-3 gap-1 sm:gap-4 text-2xs hover:bg-muted/10 transition-colors items-start sm:items-center">
              <div className="flex items-center gap-2 shrink-0">
                <Columns className="size-3.5 text-primary shrink-0" />
                <span className="font-semibold text-foreground">Compare Similar</span>
              </div>
              <span className="text-muted-foreground">
                Compare duplicate files side-by-side to review dimensions, file paths, creation dates, and score differences before culling.
              </span>
            </div>
            <div className="flex flex-col sm:grid sm:grid-cols-[180px_1fr] p-3 gap-1 sm:gap-4 text-2xs hover:bg-muted/10 transition-colors items-start sm:items-center">
              <div className="flex items-center gap-2 shrink-0">
                <MousePointerClick className="size-3.5 text-primary shrink-0" />
                <span className="font-semibold text-foreground">Select Copy</span>
              </div>
              <span className="text-muted-foreground">
                Click on individual duplicate files to manually override which copy to keep and which to delete.
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
            Exact duplicate detection is content-based, meaning visual duplicates with completely different file names (e.g. `IMG_102.jpg` vs `Copy of photo.jpg`) will be correctly grouped together.
          </span>
        </div>
      </div>
    </>
  );
};
