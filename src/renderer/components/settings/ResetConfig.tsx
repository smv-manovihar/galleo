import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, RefreshCcw, Database, Settings, Trash2, CalendarDays } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useSettingsStore } from '../../stores/settings-store';
import { useMediaStore } from '../../stores/media-store';

export const ResetConfig: React.FC = () => {
  const [options, setOptions] = useState({
    settings: false,
    database: false,
    sessions: false,
    cache: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [confirmType, setConfirmType] = useState<'granular' | 'factory'>('granular');

  const { fetchMediaItems, activeRootPath } = useMediaStore();
  const { fetchSettings } = useSettingsStore();

  const handleToggle = (key: keyof typeof options) => {
    setOptions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleResetExecute = async (mode: 'granular' | 'factory') => {
    setIsLoading(true);
    setIsAlertOpen(false);

    const resetPayload = mode === 'factory' 
      ? { settings: true, database: true, sessions: true, cache: true }
      : options;

    try {
      const res = await window.api.resetApp(resetPayload);
      if (res.ok) {
        // Refresh stores depending on reset choices
        if (resetPayload.settings) {
          await fetchSettings();
        }
        if (resetPayload.database && activeRootPath) {
          await fetchMediaItems(activeRootPath);
        }
        
        // Reset selections
        setOptions({
          settings: false,
          database: false,
          sessions: false,
          cache: false,
        });

        alert("Application reset executed successfully.");
      } else {
        const errMsg = res.error.code === 'UNKNOWN' ? (res.error as any).message : `Error: ${res.error.code}`;
        alert(`Reset failed: ${errMsg}`);
      }
    } catch (e: any) {
      alert(`Reset failed: ${e.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const hasSelection = Object.values(options).some(Boolean);

  return (
    <div className="space-y-6 font-sans text-xs select-none">
      <Card className="border-border bg-card/45">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <RefreshCcw className="w-4 h-4 text-primary" />
            Reset Application Data
          </CardTitle>
          <CardDescription className="text-xs mt-0.5 text-muted-foreground">
            Clear locally cached index databases, review sessions checkpoint logs, or restore defaults.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          <Alert variant="destructive" className="bg-destructive/5 border-destructive/20">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
            <div>
              <AlertTitle className="text-xs font-semibold text-destructive">Cautionary Warning</AlertTitle>
              <AlertDescription className="text-xs mt-0.5 text-muted-foreground leading-relaxed">
                These operations are destructive but safe: they only clear cache and metadata database entries. <strong>Your original media files (photos/videos) will not be renamed, moved, or deleted.</strong>
              </AlertDescription>
            </div>
          </Alert>

          <div className="space-y-4">
            <Label className="font-semibold text-muted-foreground text-xs uppercase">Granular Reset Options</Label>
            
            <div className="grid gap-4 sm:grid-cols-2 mt-1.5">
              {/* Reset settings */}
              <div 
                className="flex items-start gap-3 p-3 border border-border/60 hover:bg-accent/30 rounded-lg transition-all cursor-pointer"
                onClick={() => handleToggle('settings')}
              >
                <Checkbox 
                  checked={options.settings} 
                  onCheckedChange={() => handleToggle('settings')}
                  className="mt-0.5 border-border focus-visible:ring-1"
                />
                <div className="space-y-0.5">
                  <div className="font-medium text-foreground flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                    App Configurations
                  </div>
                  <p className="text-xs text-muted-foreground leading-normal">
                    Reset allowed roots, scanning rules, defect thresholds, and layout themes to factory defaults.
                  </p>
                </div>
              </div>

              {/* Reset Media Index Database */}
              <div 
                className="flex items-start gap-3 p-3 border border-border/60 hover:bg-accent/30 rounded-lg transition-all cursor-pointer"
                onClick={() => handleToggle('database')}
              >
                <Checkbox 
                  checked={options.database} 
                  onCheckedChange={() => handleToggle('database')}
                  className="mt-0.5 border-border focus-visible:ring-1"
                />
                <div className="space-y-0.5">
                  <div className="font-medium text-foreground flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-muted-foreground" />
                    Scanned Media Index
                  </div>
                  <p className="text-xs text-muted-foreground leading-normal">
                    Wipe local database collections. Folder structure, quality metrics, and files inventory index will be deleted.
                  </p>
                </div>
              </div>

              {/* Reset Sessions */}
              <div 
                className="flex items-start gap-3 p-3 border border-border/60 hover:bg-accent/30 rounded-lg transition-all cursor-pointer"
                onClick={() => handleToggle('sessions')}
              >
                <Checkbox 
                  checked={options.sessions} 
                  onCheckedChange={() => handleToggle('sessions')}
                  className="mt-0.5 border-border focus-visible:ring-1"
                />
                <div className="space-y-0.5">
                  <div className="font-medium text-foreground flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                    Review Session Logs
                  </div>
                  <p className="text-xs text-muted-foreground leading-normal">
                    Delete saved session states, queue history decisions, undo records, and folders checkpoint data.
                  </p>
                </div>
              </div>

              {/* Reset cache */}
              <div 
                className="flex items-start gap-3 p-3 border border-border/60 hover:bg-accent/30 rounded-lg transition-all cursor-pointer"
                onClick={() => handleToggle('cache')}
              >
                <Checkbox 
                  checked={options.cache} 
                  onCheckedChange={() => handleToggle('cache')}
                  className="mt-0.5 border-border focus-visible:ring-1"
                />
                <div className="space-y-0.5">
                  <div className="font-medium text-foreground flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                    Thumbnails Image Cache
                  </div>
                  <p className="text-xs text-muted-foreground leading-normal">
                    Clear stored preview thumbnail caches from disk storage to reclaim local file system capacity.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="p-6 pt-0 border-t border-border/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mt-6">
          <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={isLoading || !hasSelection}
                onClick={() => setConfirmType('granular')}
                className="h-9 px-4 text-xs font-semibold cursor-pointer border border-destructive/20 hover:bg-destructive/90"
              >
                Reset Selected Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-sm font-semibold">Confirm Granular Reset</AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-muted-foreground leading-normal mt-2">
                  You are about to delete selected categories of data. This action is irreversible. Are you sure you want to proceed?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-4">
                <AlertDialogCancel className="h-9 text-xs font-medium cursor-pointer">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleResetExecute(confirmType)}
                  className="h-9 text-xs font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
                >
                  Proceed Reset
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                disabled={isLoading}
                onClick={() => setConfirmType('factory')}
                className="h-9 px-4 text-xs font-semibold cursor-pointer hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20"
              >
                Full Factory Reset (Clear All)
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-sm font-semibold text-destructive flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  Perform Complete Factory Reset?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-muted-foreground leading-normal mt-2">
                  This will wipe all app settings, library database tables, checkpoints, active review session decisions, and disk thumbnail caches. Galleo will return to a clean install state. Original media files will remain untouched.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-4">
                <AlertDialogCancel className="h-9 text-xs font-medium cursor-pointer">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleResetExecute('factory')}
                  className="h-9 text-xs font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
                >
                  Factory Reset App
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    </div>
  );
};
