import React from 'react';
import { useMediaStore } from '../../stores/media-store';
import { useSessionStore } from '../../stores/session-store';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { HardDrive, CheckCircle2 } from 'lucide-react';
import { formatBytes } from '../../lib/format';

export const StatusBar: React.FC = () => {
  const { items, isScanning, scanProgress } = useMediaStore();
  const { checkpoint, getProgress } = useSessionStore();

  const totalBytes = items.reduce((sum, item) => sum + item.size, 0);
  const reviewedStats = getProgress();

  return (
    <footer className="h-10 border-t border-border bg-card/60 backdrop-blur-md px-6 flex items-center justify-between text-xs text-muted-foreground select-none font-sans">
      {/* Loading Progress State */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {isScanning ? (
          <div className="flex items-center gap-3 w-1/3 min-w-44">
            <span className="shrink-0 font-medium text-primary text-[0.6875rem] animate-pulse">Scanning...</span>
            <Progress 
              value={scanProgress.totalCount > 0 ? (scanProgress.scannedCount / scanProgress.totalCount) * 100 : 0} 
              className="h-1.5 flex-1 bg-muted"
            />
            <span className="shrink-0 text-2xs tabular-nums">
              {scanProgress.scannedCount} / {scanProgress.totalCount}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 truncate">
            <HardDrive className="w-3.5 h-3.5" />
            <span>Library Size: <strong>{items.length}</strong> items (<strong>{formatBytes(totalBytes)}</strong>)</span>
          </div>
        )}
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
