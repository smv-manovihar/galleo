import React, { useState } from "react"
import { useSettingsStore } from "../../stores/settings-store"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Plus, Trash2, Folder } from "lucide-react"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
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
  const { settings, addRootFolder, removeRootFolder, toggleRootFolder } =
    useSettingsStore()
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null)

  const handleAddFolder = async () => {
    try {
      const selected = await window.api.selectFolder()
      if (selected) {
        await addRootFolder(selected)
        const folderName = selected.split(/[\\/]/).pop() || selected
        toast.success("Folder registered successfully", {
          description: `${folderName} added to scan directories.`,
        })
      }
    } catch (e) {
      console.error("Add root folder selection failed:", e)
      toast.error("Failed to register folder")
    }
  }

  return (
    <div className="space-y-6 font-sans text-xs select-none">
      <Card className="border-border bg-card/45">
        <CardHeader className="flex flex-col gap-4 border-b border-border pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-sm font-semibold text-foreground">
              Scanned Roots
            </CardTitle>
            <CardDescription className="text-xs leading-normal text-muted-foreground">
              Manage scanned folders. Disabled folders are skipped during scans.
            </CardDescription>
          </div>
          <Button
            size="sm"
            className="h-8 w-full shrink-0 cursor-pointer gap-1.5 rounded-lg text-xs font-medium sm:w-auto"
            onClick={handleAddFolder}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Root Folder
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 p-3.5 sm:p-4">
          {settings.folders.roots.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-6 text-center text-muted-foreground">
              No root directories added yet. Click "Add Root Folder" to start.
            </div>
          ) : (
            settings.folders.roots.map((root) => (
              <div
                key={root.path}
                className="flex min-w-0 flex-col justify-between gap-3 rounded-lg border border-border bg-muted/10 p-3 transition-colors hover:bg-muted/20 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Folder className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-foreground">
                      {root.label || root.path.split(/[\\/]/).pop()}
                    </span>
                    <span
                      className="block truncate text-xs text-muted-foreground"
                      title={root.path}
                    >
                      {root.path}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center justify-between gap-4 border-t border-border/50 pt-2.5 sm:justify-end sm:border-none sm:pt-0">
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`toggle-${root.path}`}
                      checked={root.enabled}
                      onCheckedChange={async (val: boolean) => {
                        await toggleRootFolder(root.path, val)
                        const folderName =
                          root.path.split(/[\\/]/).pop() || root.path
                        toast.success(
                          val ? "Scan folder enabled" : "Scan folder disabled",
                          {
                            description: `${folderName} will be ${val ? "included" : "ignored"} during scans.`,
                          }
                        )
                      }}
                    />
                    <Label
                      htmlFor={`toggle-${root.path}`}
                      className="cursor-pointer text-xs font-medium text-muted-foreground select-none"
                    >
                      Enabled
                    </Label>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 cursor-pointer text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setFolderToDelete(root.path)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">Remove Folder</TooltipContent>
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
        <AlertDialogContent className="max-w-sm border border-border bg-card/95 p-5 font-sans text-foreground backdrop-blur-md outline-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-foreground">
              Remove Folder from Galleo
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-1.5 text-xs leading-normal text-muted-foreground">
              This removes{" "}
              <span className="font-semibold break-all text-foreground">
                {folderToDelete}
              </span>{" "}
              from Galleo.{" "}
              <span className="font-semibold text-foreground">
                Your actual files are completely safe.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel
              variant="outline"
              size="sm"
              className="h-8 cursor-pointer text-xs font-semibold"
              onClick={() => setFolderToDelete(null)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              size="sm"
              className="h-8 cursor-pointer text-xs font-semibold"
              onClick={async () => {
                if (folderToDelete) {
                  const folderName =
                    folderToDelete.split(/[\\/]/).pop() || folderToDelete
                  await removeRootFolder(folderToDelete)
                  toast.success("Folder removed successfully", {
                    description: `${folderName} removed from scan directories.`,
                  })
                  setFolderToDelete(null)
                }
              }}
            >
              Remove Folder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
