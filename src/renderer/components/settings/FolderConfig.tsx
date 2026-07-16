import React, { useState } from 'react';
import { useSettingsStore } from '../../stores/settings-store';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Folder } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"

export const FolderConfig: React.FC = () => {
  const { settings, addRootFolder, removeRootFolder, toggleRootFolder } = useSettingsStore();
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);

  const handleAddFolder = async () => {
    try {
      const selected = await window.api.selectFolder();
      if (selected) {
        await addRootFolder(selected);
      }
    } catch (e) {
      console.error('Add root folder selection failed:', e);
    }
  };

  return (
    <div className="space-y-6 font-sans text-xs select-none">
      <Card className="border-border bg-card/45">
        <CardHeader className="pb-3 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-sm font-semibold text-foreground">Scanned Roots</CardTitle>
            <CardDescription className="text-xs text-muted-foreground leading-normal">
              Manage directories that Galleo is allowed to scan. Disabled roots are ignored.
            </CardDescription>
          </div>
          <Button size="sm" className="w-full sm:w-auto rounded-lg gap-1.5 h-8 text-xs font-medium cursor-pointer shrink-0" onClick={handleAddFolder}>
            <Plus className="w-3.5 h-3.5" />
            Add Root Folder
          </Button>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {settings.folders.roots.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-border rounded-lg text-muted-foreground">
              No root directories added yet. Click "Add Root Folder" to start.
            </div>
          ) : (
            settings.folders.roots.map((root) => (
              <div
                key={root.path}
                className="flex flex-col sm:flex-row sm:items-center justify-between border border-border rounded-lg p-3 bg-muted/10 hover:bg-muted/20 transition-colors gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Folder className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-foreground truncate block">
                      {root.label || root.path.split(/[\\/]/).pop()}
                    </span>
                    <span className="text-xs text-muted-foreground truncate block" title={root.path}>{root.path}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t border-border/50 sm:border-none pt-2.5 sm:pt-0">
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`toggle-${root.path}`}
                      checked={root.enabled}
                      onCheckedChange={(val: boolean) => toggleRootFolder(root.path, val)}
                    />
                    <Label htmlFor={`toggle-${root.path}`} className="text-xs text-muted-foreground font-medium cursor-pointer">
                      Enabled
                    </Label>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                        onClick={() => setFolderToDelete(root.path)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      Remove Folder
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Confirmation Alert Dialog */}
      <AlertDialog
        open={!!folderToDelete}
        onOpenChange={(open) => !open && setFolderToDelete(null)}
      >
        <AlertDialogContent className="bg-card/95 border border-border text-foreground font-sans outline-none p-5 max-w-sm backdrop-blur-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-foreground">
              Remove Folder from Galleo
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-normal mt-1.5">
              This removes <span className="font-semibold text-foreground break-all">{folderToDelete}</span> from Galleo. <span className="font-semibold text-foreground">Your actual files are completely safe.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel
              variant="outline"
              size="sm"
              className="h-8 text-xs font-semibold cursor-pointer"
              onClick={() => setFolderToDelete(null)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              size="sm"
              className="h-8 text-xs font-semibold cursor-pointer"
              onClick={async () => {
                if (folderToDelete) {
                  await removeRootFolder(folderToDelete);
                  setFolderToDelete(null);
                }
              }}
            >
              Remove Folder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
