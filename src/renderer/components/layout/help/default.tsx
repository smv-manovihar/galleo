import React from 'react';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { HelpCircle, Zap } from 'lucide-react';

export const DefaultHelp: React.FC = () => {
  return (
    <>
      <DialogHeader className="border-b border-border pb-3 shrink-0">
        <DialogTitle className="flex items-center gap-2.5 text-base font-bold text-foreground">
          <HelpCircle className="size-5 text-primary" />
          Galleo Help Guide
        </DialogTitle>
        <DialogDescription className="text-2xs text-muted-foreground leading-normal font-semibold mt-0.5 uppercase tracking-wider">
          Learn how to optimize your media library.
        </DialogDescription>
      </DialogHeader>

      <div className="flex-1 overflow-y-auto space-y-4 min-h-0 pr-1 scrollbar-thin">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Explore tools to audit duplicates, structure folders, clear disk space, and manage your local media files.
        </p>
      </div>

      <div className="border-t border-border pt-3.5 mt-auto flex flex-row items-start gap-3 shrink-0">
        <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
          <Zap className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-2xs font-extrabold uppercase text-primary tracking-wider block">PRO TIP</span>
          <span className="text-2xs text-muted-foreground leading-relaxed mt-0.5 block">
            Visit the different sections in the sidebar (Dashboard, Browse, Media Culling, Duplicate Audit, Date Organizer, Settings) to access specialized tools.
          </span>
        </div>
      </div>
    </>
  );
};
