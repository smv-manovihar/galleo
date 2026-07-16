import React from 'react';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Search, Zap, Eye, Filter, LayoutGrid, CheckSquare } from 'lucide-react';

export const BrowseHelp: React.FC = () => {
  return (
    <>
      {/* Header */}
      <DialogHeader className="border-b border-border pb-3 shrink-0">
        <DialogTitle className="flex items-center gap-2.5 text-base font-bold text-foreground">
          <Search className="size-5 text-primary" />
          Browse & Filter Media
        </DialogTitle>
        <DialogDescription className="text-2xs text-muted-foreground leading-normal font-semibold mt-0.5 uppercase tracking-wider">
          Search, sorting filters, and layout modes.
        </DialogDescription>
      </DialogHeader>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto space-y-5 min-h-0 pr-1 scrollbar-thin">
        <p className="text-xs text-muted-foreground leading-relaxed">
          The main workspace for exploring and managing your media files. You can filter by quality defects, search filenames, and inspect individual file EXIF details.
        </p>

        {/* Core Concepts */}
        <div className="space-y-2">
          <h4 className="text-3xs font-extrabold uppercase text-primary tracking-wider">
            Core Concepts
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 border border-border/60 bg-muted/10 rounded-xl flex flex-col gap-1 transition-all duration-200 hover:border-primary/20">
              <span className="text-xs font-bold text-foreground">Defect Tags</span>
              <span className="text-2xs text-muted-foreground leading-normal mt-0.5">
                Automated warnings (blurry, dark, duplicate, screenshot) calculated during a scan and displayed on thumbnail badges.
              </span>
            </div>
            <div className="p-3 border border-border/60 bg-muted/10 rounded-xl flex flex-col gap-1 transition-all duration-200 hover:border-primary/20">
              <span className="text-xs font-bold text-foreground">EXIF Metadata</span>
              <span className="text-2xs text-muted-foreground leading-normal mt-0.5">
                Metadata embedded by cameras (aperture, ISO, lens, coordinates, date taken) which Galleo reads for sorting.
              </span>
            </div>
            <div className="p-3 border border-border/60 bg-muted/10 rounded-xl flex flex-col gap-1 transition-all duration-200 hover:border-primary/20">
              <span className="text-xs font-bold text-foreground">Chronological Timeline</span>
              <span className="text-2xs text-muted-foreground leading-normal mt-0.5">
                A layout mode grouping media chronologically by day or month to make navigation easier.
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
                <Eye className="size-3.5 text-primary shrink-0" />
                <span className="font-semibold text-foreground">Inspect Media</span>
              </div>
              <span className="text-muted-foreground">
                Double-click any photo or video card to open a full-screen interactive previewer showing complete EXIF metadata.
              </span>
            </div>
            <div className="flex flex-col sm:grid sm:grid-cols-[180px_1fr] p-3 gap-1 sm:gap-4 text-2xs hover:bg-muted/10 transition-colors items-start sm:items-center">
              <div className="flex items-center gap-2 shrink-0">
                <Filter className="size-3.5 text-primary shrink-0" />
                <span className="font-semibold text-foreground">Filter Selection</span>
              </div>
              <span className="text-muted-foreground">
                Toggle buttons in the toolbar (e.g. Blurry, Duplicates, Screenshots) to isolate files matching specific quality metrics.
              </span>
            </div>
            <div className="flex flex-col sm:grid sm:grid-cols-[180px_1fr] p-3 gap-1 sm:gap-4 text-2xs hover:bg-muted/10 transition-colors items-start sm:items-center">
              <div className="flex items-center gap-2 shrink-0">
                <LayoutGrid className="size-3.5 text-primary shrink-0" />
                <span className="font-semibold text-foreground">Change Layout</span>
              </div>
              <span className="text-muted-foreground">
                Toggle between card grid, chronological timeline, or detailed list summary views.
              </span>
            </div>
            <div className="flex flex-col sm:grid sm:grid-cols-[180px_1fr] p-3 gap-1 sm:gap-4 text-2xs hover:bg-muted/10 transition-colors items-start sm:items-center">
              <div className="flex items-center gap-2 shrink-0">
                <CheckSquare className="size-3.5 text-primary shrink-0" />
                <span className="font-semibold text-foreground">Batch Management</span>
              </div>
              <span className="text-muted-foreground">
                Select multiple files using checkboxes or Shift+Click to execute bulk review decisions (keep or delete).
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
            Clicking any recommendation in the dashboard automatically loads the Browse page with matching filter presets active.
          </span>
        </div>
      </div>
    </>
  );
};
