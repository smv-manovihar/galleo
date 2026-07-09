import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../../stores/settings-store';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { FolderPlus, ShieldCheck, Zap, Layers, AlertCircle, Folder, FileImage, Trash2, Loader2, Aperture } from 'lucide-react';

const OnboardingVisualizer: React.FC = () => {
  const [step, setStep] = useState<number>(0); // 0: Messy, 1: Scanning, 2: Organized

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => (prev + 1) % 3);
    }, 4500); // cycle every 4.5 seconds
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full h-full flex flex-col justify-center py-2 font-sans select-none text-xs">
      <div className="border border-border/80 bg-card/60 rounded-xl p-5 shadow-sm space-y-4 min-h-[300px] flex flex-col justify-between">
        {step === 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Folder className="w-4 h-4 text-muted-foreground" />
                Unorganized Source
              </span>
              <span className="text-[10px] text-muted-foreground">4 items</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded bg-muted/20 border border-border/40">
                <span className="flex items-center gap-2">
                  <FileImage className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-foreground/90 font-medium">DSC_0981.jpg</span>
                </span>
                <span className="text-[10px] text-muted-foreground">2.4 MB</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-amber-500/5 border border-amber-500/10">
                <span className="flex items-center gap-2">
                  <FileImage className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-foreground/90 font-medium">screenshot_22.png</span>
                </span>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-medium">
                  Screenshot
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-rose-500/5 border border-rose-500/10">
                <span className="flex items-center gap-2">
                  <FileImage className="w-3.5 h-3.5 text-rose-500" />
                  <span className="text-foreground/90 font-medium">DSC_0981_copy.jpg</span>
                </span>
                <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[9px] font-medium">
                  Duplicate
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-orange-500/5 border border-orange-500/10">
                <span className="flex items-center gap-2">
                  <FileImage className="w-3.5 h-3.5 text-orange-500" />
                  <span className="text-foreground/90 font-medium">IMG_4330.jpg</span>
                </span>
                <span className="px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[9px] font-medium">
                  Blurry
                </span>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 flex flex-col justify-center items-center py-6">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
            <div className="text-center space-y-1">
              <div className="font-semibold text-foreground text-sm">Scanning & Analyzing...</div>
              <div className="text-2xs text-muted-foreground">Evaluating media quality, duplicates, and metadata</div>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 max-w-[200px] overflow-hidden">
              <div className="bg-primary h-1.5 rounded-full" style={{ width: '65%' }}></div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Folder className="w-4 h-4 text-emerald-500" />
                Organized Target
              </span>
              <span className="text-[10px] text-emerald-500 font-medium">Processing Complete</span>
            </div>
            <div className="space-y-2">
              <div className="p-2.5 rounded bg-emerald-500/5 border border-emerald-500/10 space-y-2">
                <div className="flex items-center gap-1.5 text-foreground font-medium">
                  <Folder className="w-3.5 h-3.5 text-emerald-500" />
                  <span>2026 / 07-July</span>
                </div>
                <div className="pl-5 flex items-center justify-between text-muted-foreground text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <FileImage className="w-3 h-3 text-muted-foreground" />
                    <span>DSC_0981.jpg</span>
                  </span>
                  <span>2.4 MB</span>
                </div>
              </div>
              <div className="p-2 rounded bg-muted/40 border border-border/50 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Moved to Recycle Bin</span>
                </span>
                <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-medium">
                  3 clutter items
                </span>
              </div>
              <div className="pt-2 flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">Saved Space: <span className="font-semibold text-foreground">4.6 MB</span></span>
                <span className="text-emerald-500 flex items-center gap-0.5 font-medium">Organized Successfully</span>
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-border/60 pt-3 flex items-center justify-between text-3xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${step === 0 ? 'bg-primary' : 'bg-border'}`} />
            <span className={`w-1.5 h-1.5 rounded-full ${step === 1 ? 'bg-primary' : 'bg-border'}`} />
            <span className={`w-1.5 h-1.5 rounded-full ${step === 2 ? 'bg-primary' : 'bg-border'}`} />
          </div>
          <span>Galleo Pipeline Simulator</span>
        </div>
      </div>
    </div>
  );
};

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
    <div className="flex items-center justify-center min-h-full p-6 md:p-12 bg-background font-sans">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-0 border border-border/80 bg-card/40 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
        
        {/* Left Column: Branding and Actions */}
        <div className="lg:col-span-7 p-8 md:p-10 flex flex-col justify-between space-y-8">
          
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-linear-to-br from-primary to-destructive text-primary-foreground shrink-0">
                <Aperture className="w-5 h-5" />
              </div>
              <span className="font-heading font-extrabold text-2xl text-foreground tracking-tight">Galleo</span>
            </div>
            
            <div className="space-y-2">
              <h1 className="font-heading font-black text-3xl md:text-4xl text-foreground tracking-tight leading-tight">
                Your media,<br />beautifully structured.
              </h1>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
                Galleo is a local-first, privacy-respecting media manager. Select a folder to instantly start organizing your photography, cleaning up clutter, and sorting files by date.
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-5">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
                <Zap className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-xs text-foreground">Smart Cleanup</h3>
                <p className="text-2xs text-muted-foreground leading-relaxed">
                  Auto-flags blurry, dark, duplicate, and screenshot files. Reclaim gigabytes of space in seconds.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
                <Layers className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-xs text-foreground">Date Organizer</h3>
                <p className="text-2xs text-muted-foreground leading-relaxed">
                  Sorts your raw photos and videos into structured folder hierarchies based on EXIF date metadata.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 rounded bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-xs text-foreground">100% Offline & Private</h3>
                <p className="text-2xs text-muted-foreground leading-relaxed">
                  All processing happens locally on your computer. Your files stay exactly where they belong.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {error && (
              <Alert variant="destructive" className="py-2.5 px-3">
                <AlertCircle className="w-4 h-4" />
                <AlertTitle className="text-xs font-semibold">Folder Selection Failed</AlertTitle>
                <AlertDescription className="text-2xs">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <Button 
              className="w-full h-11 gap-2 font-medium text-sm shadow-md cursor-pointer bg-primary text-primary-foreground hover:bg-primary/95 transition-colors"
              onClick={handleSelectRoot}
            >
              <FolderPlus className="w-4 h-4" />
              Select Folder to Manage
            </Button>
            
            <p className="text-3xs text-muted-foreground text-center">
              You can configure additional folders, customize image quality filters, and change hotkeys in Settings later.
            </p>
          </div>
        </div>

        {/* Right Column: Interactive Mockup Simulation */}
        <div className="lg:col-span-5 bg-muted/10 border-t lg:border-t-0 lg:border-l border-border/40 p-8 flex flex-col justify-center items-center relative overflow-hidden select-none">
          <div className="absolute inset-0 bg-radial-gradient from-transparent to-background/5 opacity-50" />
          <div className="w-full max-w-sm relative z-10">
            <div className="mb-4 text-center">
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-semibold uppercase tracking-wider">
                How it works
              </span>
            </div>
            <OnboardingVisualizer />
          </div>
        </div>

      </div>
    </div>
  );
};

