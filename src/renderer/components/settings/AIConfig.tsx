import React, { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  Sparkles,
  Download,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  Cpu,
  Layers,
  Video,
  Image as ImageIcon,
  AlertTriangle,
  Info,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogMedia,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { ENABLE_AI_FEATURES } from "../../../shared/constants"

export const AIConfig: React.FC = () => {
  const [status, setStatus] = useState<{
    isDownloaded: boolean
    stats: { mediaEmbeddingCount: number; videoFrameEmbeddingCount: number }
  } | null>(null)

  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [showPurgeDialog, setShowPurgeDialog] = useState(false)
  const [isPurging, setIsPurging] = useState(false)
  const [deleteModel, setDeleteModel] = useState(false)

  const fetchStatus = async () => {
    if (typeof window !== "undefined" && window.api?.ai) {
      try {
        const res = await window.api.ai.getStatus()
        setStatus(res)
      } catch {
        setStatus(null)
      }
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStatus()
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined" && window.api?.ai) {
      const cleanup = window.api.ai.onDownloadProgress((progress) => {
        setDownloadProgress(progress)
      })
      return cleanup
    }
  }, [])

  const handleDownload = async () => {
    setIsDownloading(true)
    setDownloadProgress(0)
    try {
      await window.api.ai.downloadModel()
      await fetchStatus()
    } catch (e) {
      console.error("AI model download failed", e)
    } finally {
      setIsDownloading(false)
    }
  }

  const handlePurgeCache = async () => {
    setIsPurging(true)
    try {
      await window.api.ai.purgeCache({ deleteModel })
      await fetchStatus()
      setShowPurgeDialog(false)
      setDeleteModel(false)
    } catch (e) {
      console.error("AI cache purge failed", e)
    } finally {
      setIsPurging(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    setShowPurgeDialog(open)
    if (!open) {
      setDeleteModel(false)
    }
  }

  if (!ENABLE_AI_FEATURES) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <Card className="border-border/60 bg-card/80 backdrop-blur-md py-4 gap-3">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="size-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-foreground">
                  Native Vision AI & Semantic Search
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Search images and video frames by visual content using local SigLIP ONNX AI
                </p>
              </div>
            </div>
            {!ENABLE_AI_FEATURES ? (
              <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 gap-2 py-1">
                <AlertTriangle className="size-4" />
                Disabled (Feature Flag Off)
              </Badge>
            ) : status?.isDownloaded ? (
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 gap-2 py-1">
                <CheckCircle2 className="size-4" />
                AI Model Active
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-2 py-1">
                <Download className="size-4" />
                Opt-in Required (~200MB)
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/50 p-3">
              <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium">100% Private</p>
                <p className="text-xs text-muted-foreground truncate">Zero cloud or remote API calls</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/50 p-3">
              <Cpu className="h-5 w-5 text-blue-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium">Hardware Accelerated</p>
                <p className="text-xs text-muted-foreground truncate">Local ONNX Runtime CPU execution</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/50 p-3">
              <Video className="h-5 w-5 text-purple-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium">Multimodal Video Search</p>
                <p className="text-xs text-muted-foreground truncate">Exact timestamp frame matching</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Download / Management Card */}
      <Card className="border-border/60 bg-card/80 backdrop-blur-md py-0 gap-0">
        <CardHeader className="border-b border-border/40 px-4 py-3">
          <CardTitle className="text-sm font-semibold text-foreground">Model Status & Indexing Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!status?.isDownloaded ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Download className="h-6 w-6" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="text-sm font-semibold">Enable Visual Semantic Search</h4>
                <p className="text-xs text-muted-foreground">
                  Download the lightweight SigLIP ONNX vision model (~200MB) to index and search your local photo and video library visually.
                </p>
              </div>

              {isDownloading ? (
                <div className="max-w-xs mx-auto space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Downloading model weights...</span>
                    <span>{downloadProgress}%</span>
                  </div>
                  <Progress value={downloadProgress} className="h-2" />
                </div>
              ) : (
                <Button onClick={handleDownload} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download & Enable Semantic Search
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 p-4">
                  <div className="flex items-center gap-3">
                    <ImageIcon className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Indexed Photo Vectors</p>
                      <p className="text-lg font-semibold">{status.stats.mediaEmbeddingCount}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">SigLIP 768d</Badge>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 p-4">
                  <div className="flex items-center gap-3">
                    <Video className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Indexed Video Keyframe Vectors</p>
                      <p className="text-lg font-semibold">{status.stats.videoFrameEmbeddingCount}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">Keyframes</Badge>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Layers className="h-4 w-4 text-emerald-500" />
                  <span>Model files and vector indices stored in app data.</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPurgeDialog(true)}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive gap-2"
                >
                  <Trash2 className="size-4" />
                  Reset AI Index
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog for Purging Index */}
      <AlertDialog open={showPurgeDialog} onOpenChange={handleOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <AlertTriangle className="h-4 w-4" />
            </AlertDialogMedia>
            <AlertDialogTitle>
              {deleteModel ? "Reset AI Model & Search Index" : "Reset AI Search Index"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteModel ? (
                <>
                  Deletes the downloaded <strong className="font-semibold text-foreground">AI search model (~200MB)</strong> and clears all <strong className="font-semibold text-foreground">indexed visual search data</strong> from Galleo.
                </>
              ) : (
                <>
                  Clears all <strong className="font-semibold text-foreground">indexed visual search data</strong> from Galleo. This keeps the downloaded model files so you do not need to re-download them.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/40 p-3">
            <Checkbox
              id="delete-model"
              checked={deleteModel}
              onCheckedChange={(checked) => setDeleteModel(!!checked)}
              disabled={isPurging}
            />
            <label
              htmlFor="delete-model"
              className="text-xs font-medium leading-none select-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground"
            >
              Also delete downloaded AI model weights (~200MB)
            </label>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
            <Info className="size-4 shrink-0 text-blue-500" />
            <span>
              {deleteModel 
                ? "You will need to download the model weights again before you can index your library."
                : "You can re-index your library from the Folders page or by starting a scan."
              }
            </span>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPurging}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handlePurgeCache}
              disabled={isPurging}
            >
              {isPurging ? "Resetting..." : deleteModel ? "Reset Model & Index" : "Reset AI Index"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
