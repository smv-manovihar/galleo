import React from "react"
import { useScanStore } from "../../stores/scan-store"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Sparkles, ShieldCheck, ZapOff, Search, XCircle } from "lucide-react"
import { ENABLE_AI_FEATURES } from "../../../shared/constants"

export const ScanAIConsentDialog: React.FC = () => {
  const {
    showAIConsentDialog,
    isDownloadingAI,
    aiDownloadProgress,
    confirmScanWithAIDownload,
    confirmScanWithoutAI,
    dismissAIConsentDialog,
  } = useScanStore()

  if (!ENABLE_AI_FEATURES) {
    return null
  }

  return (
    <AlertDialog
      open={showAIConsentDialog}
      onOpenChange={(open) => {
        if (!open && !isDownloadingAI) {
          dismissAIConsentDialog()
        }
      }}
    >
      <AlertDialogContent className="gap-4">
        <AlertDialogHeader className="flex flex-row items-center gap-3 text-left">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <AlertDialogTitle className="text-sm font-bold tracking-tight">
              Enable Visual AI Search?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-normal">
              Optional 200MB local model download for visual concept search.
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>

        <div className="grid gap-2 text-xs">
          <div className="flex items-center gap-2.5 rounded-lg bg-card/60 p-2.5 border border-border">
            <Search className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <span className="font-medium text-foreground text-xs block">Concept Search</span>
              <span className="text-muted-foreground text-xs block">Find photos by query like &quot;sunset&quot; or &quot;documents&quot;.</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-lg bg-card/60 p-2.5 border border-border">
            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
            <div className="min-w-0">
              <span className="font-medium text-foreground text-xs block">100% Private &amp; Offline</span>
              <span className="text-muted-foreground text-xs block">Runs locally on device with zero data uploads.</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-lg bg-destructive/10 p-2.5 text-destructive">
            <XCircle className="h-4 w-4 text-destructive shrink-0" />
            <div className="min-w-0">
              <span className="font-semibold text-xs block">No File Organizing or Deduplication</span>
              <span className="text-xs opacity-90 block">Visual AI only powers search; not cleanup, culling, or sorting.</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-lg bg-amber-500/10 p-2.5 text-amber-900 dark:text-amber-200">
            <ZapOff className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="min-w-0">
              <span className="font-semibold text-xs block">Slower Scanning</span>
              <span className="text-amber-800/80 dark:text-amber-300/80 text-xs block">Indexing takes more CPU/GPU time per folder.</span>
            </div>
          </div>
        </div>

        {isDownloadingAI && (
          <div className="space-y-1 rounded-lg bg-muted/40 p-2.5 text-xs">
            <div className="flex justify-between font-medium">
              <span>Downloading AI model...</span>
              <span className="font-mono">{aiDownloadProgress}%</span>
            </div>
            <Progress value={aiDownloadProgress} className="h-1" />
          </div>
        )}

        <AlertDialogFooter className="gap-1.5 sm:gap-2">
          <AlertDialogCancel
            onClick={dismissAIConsentDialog}
            disabled={isDownloadingAI}
            className="text-xs"
          >
            Cancel
          </AlertDialogCancel>
          <Button
            variant="outline"
            onClick={confirmScanWithoutAI}
            disabled={isDownloadingAI}
            className="text-xs"
          >
            {"Skip & Fast Scan"}
          </Button>
          <AlertDialogAction
            onClick={confirmScanWithAIDownload}
            disabled={isDownloadingAI}
            className="text-xs"
          >
            {isDownloadingAI ? "Downloading..." : "Enable AI Scan"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

