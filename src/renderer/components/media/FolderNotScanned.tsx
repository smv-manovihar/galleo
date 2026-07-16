import React from 'react';
import { useScanStore } from '../../stores/scan-store';
import { useSettingsStore } from '../../stores/settings-store';
import { Button } from '@/components/ui/button';
import { AlertCircle, Play, Loader2 } from 'lucide-react';

interface FolderNotScannedProps {
  activeRootPath: string;
  featureDescription?: string;
}

export const FolderNotScanned: React.FC<FolderNotScannedProps> = ({
  activeRootPath,
  featureDescription = 'access the catalog',
}) => {
  const isScanning = useScanStore((s) => s.isScanning);
  const startScan = useScanStore((s) => s.startScan);
  const { settings } = useSettingsStore();

  const handleScanClick = () => {
    startScan(
      activeRootPath === 'all'
        ? settings.folders.roots.filter((r) => r.enabled).map((r) => r.path)
        : [activeRootPath]
    );
  };

  return (
    <div className="flex flex-1 min-h-[70vh] h-full flex-col items-center justify-center font-sans text-xs select-none px-8 animate-in fade-in duration-300 w-full">
      <div className="w-full max-w-sm border border-border bg-card rounded-2xl shadow-sm p-8 flex flex-col items-center gap-5 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-amber-500/20 bg-amber-500/10 text-amber-500">
          <AlertCircle className="h-8 w-8" />
        </div>
        <div className="space-y-1.5">
          <h3 className="font-heading text-sm font-bold text-foreground tracking-tight">
            Folder Not Scanned Yet
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This folder has not been scanned yet. Please start a scan to index your media library {featureDescription}.
          </p>
        </div>
        <Button
          className="w-full h-9 text-xs gap-1.5 cursor-pointer font-semibold"
          onClick={handleScanClick}
          disabled={isScanning}
        >
          {isScanning ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 fill-current" />
              Scan Folder Now
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
