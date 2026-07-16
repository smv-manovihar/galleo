import React from 'react';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Settings, Zap, FolderPlus, SlidersHorizontal, Palette } from 'lucide-react';

export const SettingsHelp: React.FC = () => {
  return (
    <>
      {/* Header */}
      <DialogHeader className="border-b border-border pb-3 shrink-0">
        <DialogTitle className="flex items-center gap-2.5 text-base font-bold text-foreground">
          <Settings className="size-5 text-primary" />
          App Settings
        </DialogTitle>
        <DialogDescription className="text-2xs text-muted-foreground leading-normal font-semibold mt-0.5 uppercase tracking-wider">
          Configure root paths, rules, and triggers.
        </DialogDescription>
      </DialogHeader>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto space-y-5 min-h-0 pr-1 scrollbar-thin">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Customize allowed directory paths, quality evaluation rules, and application triggers.
        </p>

        {/* Core Concepts */}
        <div className="space-y-2">
          <h4 className="text-3xs font-extrabold uppercase text-primary tracking-wider">
            Core Concepts
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 border border-border/60 bg-muted/10 rounded-xl flex flex-col gap-1 transition-all duration-200 hover:border-primary/20">
              <span className="text-xs font-bold text-foreground">Directory Roots</span>
              <span className="text-2xs text-muted-foreground leading-normal mt-0.5">
                Folders that Galleo is permitted to scan. You can enable or disable folders individually.
              </span>
            </div>
            <div className="p-3 border border-border/60 bg-muted/10 rounded-xl flex flex-col gap-1 transition-all duration-200 hover:border-primary/20">
              <span className="text-xs font-bold text-foreground">Defect Sensitivity</span>
              <span className="text-2xs text-muted-foreground leading-normal mt-0.5">
                Numerical thresholds that determine when a photo is flagged as blurry (sharpness score) or dark (brightness level).
              </span>
            </div>
            <div className="p-3 border border-border/60 bg-muted/10 rounded-xl flex flex-col gap-1 transition-all duration-200 hover:border-primary/20">
              <span className="text-xs font-bold text-foreground">Exclusion Patterns</span>
              <span className="text-2xs text-muted-foreground leading-normal mt-0.5">
                File names or directory paths matching these rules (e.g. .git, system files) will be ignored.
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
                <FolderPlus className="size-3.5 text-primary shrink-0" />
                <span className="font-semibold text-foreground">Add Directory</span>
              </div>
              <span className="text-muted-foreground">
                Register a new library folder on your computer that Galleo can scan.
              </span>
            </div>
            <div className="flex flex-col sm:grid sm:grid-cols-[180px_1fr] p-3 gap-1 sm:gap-4 text-2xs hover:bg-muted/10 transition-colors items-start sm:items-center">
              <div className="flex items-center gap-2 shrink-0">
                <SlidersHorizontal className="size-3.5 text-primary shrink-0" />
                <span className="font-semibold text-foreground">Adjust Sensitivity</span>
              </div>
              <span className="text-muted-foreground">
                Drag sharpness and brightness sliders to configure quality checks (higher sensitivity means stricter rules).
              </span>
            </div>
            <div className="flex flex-col sm:grid sm:grid-cols-[180px_1fr] p-3 gap-1 sm:gap-4 text-2xs hover:bg-muted/10 transition-colors items-start sm:items-center">
              <div className="flex items-center gap-2 shrink-0">
                <Palette className="size-3.5 text-primary shrink-0" />
                <span className="font-semibold text-foreground">Switch Themes</span>
              </div>
              <span className="text-muted-foreground">
                Toggle between Light, Dark, or System mode matching your OS preferences.
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
            After adjusting sensitivity thresholds, run a "Force Rescan" from the Scan button dropdown in the Topbar to re-evaluate and update existing media.
          </span>
        </div>
      </div>
    </>
  );
};
