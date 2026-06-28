import React, { useState } from 'react';
import { useSettingsStore } from '../../stores/settings-store';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { FolderPlus, ShieldCheck, Zap, Layers, AlertCircle } from 'lucide-react';

export const SetupWizard: React.FC = () => {
  const { addRootFolder } = useSettingsStore();
  const [error, setError] = useState<string | null>(null);

  const handleSelectRoot = async () => {
    setError(null);
    try {
      if (typeof window === 'undefined' || !window.api || !window.api.selectFolder) {
        throw new Error(
          'Galleo requires the Electron wrapper to select local directories. If you are previewing in a web browser, please close this tab and run the app via Electron.'
        );
      }
      const selected = await window.api.selectFolder();
      if (selected) {
        const success = await addRootFolder(selected);
        if (!success) {
          throw new Error('Failed to save the selected root folder settings to the database.');
        }
      }
    } catch (e: any) {
      console.error('Wizard folder select failed:', e);
      setError(e.message || 'Folder selection failed');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-full p-6 bg-background">
      <Card className="w-full max-w-lg border-border bg-card/60 backdrop-blur-md shadow-lg select-none">
        <CardHeader className="text-center pb-4">
          <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto mb-4">
            <Layers className="w-6 h-6" />
          </div>
          <CardTitle className="font-heading font-bold text-2xl text-foreground">Welcome to Galleo</CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-1">
            Let's get started by selecting a folder to scan for photos and videos.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 py-4 font-sans text-xs">
          {error && (
            <Alert variant="destructive" className="mb-2">
              <AlertCircle className="w-4 h-4" />
              <AlertTitle>Folder Selection Failed</AlertTitle>
              <AlertDescription className="text-2xs">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="border border-border bg-muted/20 p-4 rounded-lg text-center space-y-2">
              <Zap className="w-5 h-5 text-primary mx-auto" />
              <div className="font-semibold text-foreground">Smart Cleanup</div>
              <div className="text-2xs text-muted-foreground leading-relaxed">Auto-flags blurry, dark, duplicate, and screenshot files.</div>
            </div>
            <div className="border border-border bg-muted/20 p-4 rounded-lg text-center space-y-2">
              <Layers className="w-5 h-5 text-primary mx-auto" />
              <div className="font-semibold text-foreground">Date Organizer</div>
              <div className="text-2xs text-muted-foreground leading-relaxed">Auto-sorts media items into folder hierarchies by EXIF date.</div>
            </div>
            <div className="border border-border bg-muted/20 p-4 rounded-lg text-center space-y-2">
              <ShieldCheck className="w-5 h-5 text-primary mx-auto" />
              <div className="font-semibold text-foreground">Safe & Local</div>
              <div className="text-2xs text-muted-foreground leading-relaxed">All processing is offline. Deletes go to your system Recycle Bin.</div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-2 pt-4">
          <Button 
            className="w-full h-11 gap-2 font-medium text-sm shadow-md cursor-pointer"
            onClick={handleSelectRoot}
          >
            <FolderPlus className="w-4 h-4" />
            Select Folder to Manage
          </Button>
          <p className="text-2xs text-muted-foreground text-center mt-1">
            You can always add more directories or configure auto-cleanup thresholds in Settings later.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};
