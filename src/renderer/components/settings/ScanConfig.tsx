import React, { useState } from 'react';
import { useSettingsStore } from '../../stores/settings-store';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export const ScanConfig: React.FC = () => {
  const { settings, saveSettings } = useSettingsStore();

  const [includeSubfolders, setIncludeSubfolders] = useState(settings.scanning.includeSubfolders);
  const [minFileSizeKB, setMinFileSizeKB] = useState(Math.round(settings.scanning.minFileSize / 1024));

  const handleToggleSubfolders = async (val: boolean) => {
    setIncludeSubfolders(val);
    await saveSettings({
      ...settings,
      scanning: {
        ...settings.scanning,
        includeSubfolders: val
      }
    });
  };

  const handleMinSizeChange = async (e: React.FocusEvent<HTMLInputElement>) => {
    const kbVal = parseInt(e.target.value, 10);
    if (isNaN(kbVal) || kbVal < 0) return;
    
    setMinFileSizeKB(kbVal);
    await saveSettings({
      ...settings,
      scanning: {
        ...settings.scanning,
        minFileSize: kbVal * 1024
      }
    });
  };

  return (
    <div className="space-y-6 font-sans text-xs select-none">
      <Card className="border-border bg-card/45">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-sm font-semibold text-foreground">Scan Rules</CardTitle>
          <CardDescription className="text-xs mt-0.5 text-muted-foreground">
            Tune the scanning heuristics and parameters.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {/* Subfolders toggle */}
          <div className="flex items-center justify-between border border-border rounded-lg p-4 bg-muted/10">
            <div className="space-y-0.5">
              <Label htmlFor="include-subfolders" className="font-semibold text-foreground cursor-pointer">Include Subdirectories</Label>
              <p className="text-xs text-muted-foreground">Recursively list all subfolders for files</p>
            </div>
            <Switch
              id="include-subfolders"
              checked={includeSubfolders}
              onCheckedChange={handleToggleSubfolders}
            />
          </div>

          {/* Min file size filter */}
          <div className="flex items-center justify-between border border-border rounded-lg p-4 bg-muted/10 gap-4">
            <div className="space-y-0.5 min-w-0 flex-1">
              <Label htmlFor="min-file-size" className="font-semibold text-foreground cursor-pointer">Minimum File Size Filter</Label>
              <p className="text-xs text-muted-foreground">Ignore files smaller than this threshold (filters junk icons)</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Input
                id="min-file-size"
                type="number"
                value={minFileSizeKB}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMinFileSizeKB(parseInt(e.target.value, 10) || 0)}
                onBlur={handleMinSizeChange}
                className="w-20 h-9 bg-background/50 border-border text-center text-xs"
              />
              <span className="text-muted-foreground font-medium">KB</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
