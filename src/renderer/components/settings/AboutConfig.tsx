import React from 'react';
import { useUIStore } from '../../stores/ui-store';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, AlertCircle, CheckCircle2, ExternalLink, Info } from 'lucide-react';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';

export const AboutConfig: React.FC = () => {
  const { updateInfo, isCheckingUpdate, updateError, checkForUpdates } = useUIStore();

  return (
    <div className="space-y-6 font-sans text-xs select-none">
      <Card className="border-border bg-card/45 shadow-xs">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            About Galleo
          </CardTitle>
          <CardDescription className="text-xs mt-0.5 text-muted-foreground">
            Current version and application updates.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="font-semibold text-sm text-foreground">
                Galleo Desktop App
              </div>
              <div className="text-2xs text-muted-foreground">
                Current Version: <span className="font-mono font-semibold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-md">v{updateInfo?.currentVersion || '0.1.1'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
              {updateInfo?.updateAvailable && (
                <Button
                  variant="default"
                  size="sm"
                  className="h-8 text-xs font-semibold cursor-pointer bg-emerald-600 dark:bg-emerald-500 hover:bg-emerald-700 dark:hover:bg-emerald-600 text-white shadow-sm"
                  onClick={() => window.api.openExternal(updateInfo.downloadUrl)}
                >
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Download Installer
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold cursor-pointer"
                onClick={() => checkForUpdates()}
                disabled={isCheckingUpdate}
              >
                {isCheckingUpdate ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-3.5 w-3.5" />
                    Check for Updates
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="h-px bg-border my-4" />

          {/* Update Status Display */}
          {isCheckingUpdate ? (
            <div className="flex items-center gap-2 text-2xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span>Contacting update servers to check for latest release...</span>
            </div>
          ) : updateError ? (
            <div className="flex items-center gap-2 text-2xs text-destructive bg-destructive/5 border border-destructive/10 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Failed to check for updates: {updateError}</span>
            </div>
          ) : updateInfo ? (
            updateInfo.updateAvailable ? (
              <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 dark:bg-emerald-500/10 p-4 space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-xs text-emerald-800 dark:text-emerald-300">
                    New Update Available (v{updateInfo.latestVersion})
                  </span>
                </div>
                
                {updateInfo.releaseNotes && (
                  <div className="bg-card/60 rounded-md border border-border/40 p-4 select-text text-2xs text-muted-foreground prose prose-sm prose-invert max-w-none">
                    <MarkdownRenderer>{updateInfo.releaseNotes}</MarkdownRenderer>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-2xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/25 rounded-lg p-3">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>You are running the latest version of Galleo!</span>
              </div>
            )
          ) : (
            <div className="flex items-center gap-2 text-2xs text-muted-foreground">
              <span>App updates are checked automatically on startup, but you can check manually.</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
