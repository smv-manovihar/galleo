import React from 'react';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { LayoutDashboard, Zap, Play, RefreshCw, Sparkles } from 'lucide-react';

export const DashboardHelp: React.FC = () => {
  return (
    <>
      {/* Header */}
      <DialogHeader className="border-b border-border pb-3 shrink-0">
        <DialogTitle className="flex items-center gap-2.5 text-base font-bold text-foreground">
          <LayoutDashboard className="size-5 text-primary" />
          Dashboard Overview
        </DialogTitle>
        <DialogDescription className="text-2xs text-muted-foreground leading-normal font-semibold mt-0.5 uppercase tracking-wider">
          Your local library analytics and storage metrics.
        </DialogDescription>
      </DialogHeader>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto space-y-5 min-h-0 pr-1 scrollbar-thin">
        <p className="text-xs text-muted-foreground leading-relaxed">
          The dashboard is the central hub for monitoring your media library. It compiles scan statistics, estimates potentially wasted storage space, and offers suggestions to help you manage local disk space.
        </p>

        {/* Core Concepts */}
        <div className="space-y-2">
          <h4 className="text-3xs font-extrabold uppercase text-primary tracking-wider">
            Core Concepts
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 border border-border/60 bg-muted/10 rounded-xl flex flex-col gap-1 transition-all duration-200 hover:border-primary/20">
              <span className="text-xs font-bold text-foreground">Wasted Space</span>
              <span className="text-2xs text-muted-foreground leading-normal mt-0.5">
                Storage occupied by duplicate files, screenshots, and low-quality photos (blurry, dark) that can be safely deleted.
              </span>
            </div>
            <div className="p-3 border border-border/60 bg-muted/10 rounded-xl flex flex-col gap-1 transition-all duration-200 hover:border-primary/20">
              <span className="text-xs font-bold text-foreground">Library Health</span>
              <span className="text-2xs text-muted-foreground leading-normal mt-0.5">
                A visual summary representing the ratio of high-quality assets to flagged candidates for deletion.
              </span>
            </div>
            <div className="p-3 border border-border/60 bg-muted/10 rounded-xl flex flex-col gap-1 transition-all duration-200 hover:border-primary/20">
              <span className="text-xs font-bold text-foreground">Folder Roots</span>
              <span className="text-2xs text-muted-foreground leading-normal mt-0.5">
                Directory paths registered in Settings that Galleo is permitted to scan and organize.
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
                <Play className="size-3.5 text-primary shrink-0" />
                <span className="font-semibold text-foreground">Scan Folders</span>
              </div>
              <span className="text-muted-foreground">
                Runs an incremental scan on all enabled root folders, scanning only for new or modified files.
              </span>
            </div>
            <div className="flex flex-col sm:grid sm:grid-cols-[180px_1fr] p-3 gap-1 sm:gap-4 text-2xs hover:bg-muted/10 transition-colors items-start sm:items-center">
              <div className="flex items-center gap-2 shrink-0">
                <RefreshCw className="size-3.5 text-primary shrink-0" />
                <span className="font-semibold text-foreground">Force Rescan</span>
              </div>
              <span className="text-muted-foreground">
                Accessed from the dropdown next to the Scan button. Wipes metadata cache and re-analyzes every file from scratch.
              </span>
            </div>
            <div className="flex flex-col sm:grid sm:grid-cols-[180px_1fr] p-3 gap-1 sm:gap-4 text-2xs hover:bg-muted/10 transition-colors items-start sm:items-center">
              <div className="flex items-center gap-2 shrink-0">
                <Sparkles className="size-3.5 text-primary shrink-0" />
                <span className="font-semibold text-foreground">Quick Suggestions</span>
              </div>
              <span className="text-muted-foreground">
                Clicking any warning card or cleanup suggestion card redirects you to the Browse page with those specific defect filters pre-applied.
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
            Incremental scans are standard. If you adjust defect sensitivity thresholds in settings, perform a "Force Rescan" from the scan dropdown to re-evaluate all existing files on disk.
          </span>
        </div>
      </div>
    </>
  );
};
