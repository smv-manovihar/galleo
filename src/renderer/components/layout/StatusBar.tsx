import React from 'react';
import { useMediaStore } from '../../stores/media-store';
import { useSessionStore } from '../../stores/session-store';
import { Badge } from '@/components/ui/badge';
import { HardDrive, CheckCircle2 } from 'lucide-react';
import { formatBytes } from '../../lib/format';

export const StatusBar: React.FC = () => {
  const { items } = useMediaStore();
  const { checkpoint, getProgress } = useSessionStore();

  const totalBytes = items.reduce((sum, item) => sum + item.size, 0);
  const reviewedStats = getProgress();

  return (
    <footer className="h-10 border-t border-border bg-card/60 backdrop-blur-md px-6 flex items-center justify-between text-xs text-muted-foreground select-none font-sans">
      {/* Loading Progress State */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="flex items-center gap-2 truncate">
          <HardDrive className="w-3.5 h-3.5" />
          <span>Library Size: <strong>{items.length}</strong> items (<strong>{formatBytes(totalBytes)}</strong>)</span>
        </div>
      </div>

      {/* Review Queue Progress */}
      {checkpoint && (
        <div className="flex items-center gap-3 shrink-0">
          <Badge variant="outline" className="text-2xs gap-1 px-2 py-0.5 border-border bg-background/40">
            <CheckCircle2 className="w-3 h-3 text-green-500" />
            Review Session: {reviewedStats.reviewed} / {reviewedStats.total} ({reviewedStats.percentage}%)
          </Badge>
        </div>
      )}
    </footer>
  );
};
