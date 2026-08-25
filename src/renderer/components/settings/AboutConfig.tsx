import React, { useEffect } from "react"
import { useUIStore } from "../../stores/ui-store"
import { formatBytes } from "../../lib/format"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Download,
  Sparkles,
  Info,
  Trash2,
  RotateCcw,
  Package,
} from "lucide-react"
import { MarkdownRenderer } from "@/components/ui/markdown-renderer"

export const AboutConfig: React.FC = () => {
  const updateInfo = useUIStore((s) => s.updateInfo)
  const installerInfo = useUIStore((s) => s.installerInfo)
  const isCheckingUpdate = useUIStore((s) => s.isCheckingUpdate)
  const isDownloadingUpdate = useUIStore((s) => s.isDownloadingUpdate)
  const isDeletingInstaller = useUIStore((s) => s.isDeletingInstaller)
  const updateDownloadProgress = useUIStore((s) => s.updateDownloadProgress)
  const isUpdateDownloaded = useUIStore((s) => s.isUpdateDownloaded)
  const updateError = useUIStore((s) => s.updateError)
  const checkForUpdates = useUIStore((s) => s.checkForUpdates)
  const fetchInstallerInfo = useUIStore((s) => s.fetchInstallerInfo)
  const startUpdateDownload = useUIStore((s) => s.startUpdateDownload)
  const deleteDownloadedInstaller = useUIStore((s) => s.deleteDownloadedInstaller)
  const startReinstall = useUIStore((s) => s.startReinstall)
  const installUpdate = useUIStore((s) => s.installUpdate)

  useEffect(() => {
    fetchInstallerInfo()
  }, [fetchInstallerInfo])

  const hasInstallerOnDisk = Boolean(installerInfo || isUpdateDownloaded)

  return (
    <div className="space-y-4 font-sans text-xs select-none">
      <Card className="border-border/60 bg-card/50 shadow-xs py-0 gap-0">
        <CardHeader className="border-b border-border/40 px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Info className="size-4 text-primary" />
            About Galleo
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Current version and application updates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-foreground">
                Galleo Desktop App
              </div>
              <div className="text-xs text-muted-foreground">
                Current Version:{" "}
                <span className="rounded-md border border-primary/20 bg-primary/10 px-1.5 py-0.5 font-medium tabular-nums text-primary">
                  v{updateInfo?.currentVersion || "1.1.1"}
                </span>
              </div>
            </div>

            <div className="flex w-full shrink-0 flex-row items-center gap-2 sm:w-auto">
              {updateInfo?.updateAvailable &&
                (isUpdateDownloaded ? (
                  <Button
                    variant="default"
                    size="sm"
                    className="h-8 flex-1 cursor-pointer bg-emerald-600 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 sm:flex-none dark:bg-emerald-500 dark:hover:bg-emerald-600"
                    onClick={() => installUpdate()}
                  >
                    <Sparkles className="size-4 shrink-0" />
                    <span className="sm:hidden">Install</span>
                    <span className="hidden sm:inline">Install & Restart</span>
                  </Button>
                ) : isDownloadingUpdate ? (
                  <Button
                    variant="default"
                    size="sm"
                    disabled
                    className="h-8 flex-1 bg-emerald-600/70 text-xs font-semibold text-white sm:flex-none"
                  >
                    <Loader2 className="size-4 shrink-0 animate-spin" />
                    <span className="sm:hidden">Downloading...</span>
                    <span className="hidden sm:inline">Downloading...</span>
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    className="h-8 flex-1 cursor-pointer bg-emerald-600 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 sm:flex-none dark:bg-emerald-500 dark:hover:bg-emerald-600"
                    onClick={() => startUpdateDownload()}
                  >
                    <Download className="size-4 shrink-0" />
                    <span className="sm:hidden">Download</span>
                    <span className="hidden sm:inline">Download & Install</span>
                  </Button>
                ))}

              <Button
                variant="outline"
                size="sm"
                className="h-8 flex-1 cursor-pointer text-xs font-semibold sm:flex-none"
                onClick={() => checkForUpdates(true)}
                disabled={isCheckingUpdate || isDownloadingUpdate || isDeletingInstaller}
              >
                {isCheckingUpdate ? (
                  <>
                    <Loader2 className="size-4 shrink-0 animate-spin" />
                    <span className="sm:hidden">Checking...</span>
                    <span className="hidden sm:inline">Check for Updates</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="size-4 shrink-0" />
                    <span className="sm:hidden">Check</span>
                    <span className="hidden sm:inline">Check for Updates</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Live Download Progress Bar */}
          {isDownloadingUpdate && (
            <div className="space-y-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 dark:bg-emerald-500/10">
              <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                <span className="flex items-center gap-2 font-medium">
                  <Loader2 className="size-3.5 shrink-0 animate-spin" />
                  Downloading v{updateInfo?.latestVersion} installer...
                </span>
                <span className="font-semibold tabular-nums">
                  {updateDownloadProgress}%
                </span>
              </div>
              <Progress
                value={updateDownloadProgress}
                className="h-1.5 bg-emerald-500/20"
              />
            </div>
          )}

          <div className="my-4 h-px bg-border" />

          {/* Update Status Display */}
          {isCheckingUpdate ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
              <span>
                Contacting update servers to check for latest release...
              </span>
            </div>
          ) : updateError ? (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/10 bg-destructive/5 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Failed to check or download updates: {updateError}</span>
            </div>
          ) : updateInfo ? (
            updateInfo.updateAvailable ? (
              <div className="space-y-3 rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-4 dark:bg-emerald-500/10">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    {isUpdateDownloaded ? (
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                    ) : (
                      <span className="flex h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-500" />
                    )}
                    <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                      {isUpdateDownloaded
                        ? `Update v${updateInfo.latestVersion} Ready to Install`
                        : `New Update Available (v${updateInfo.latestVersion})`}
                    </span>
                  </div>

                  {hasInstallerOnDisk && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 cursor-pointer text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => deleteDownloadedInstaller()}
                        disabled={isDeletingInstaller}
                      >
                        {isDeletingInstaller ? (
                          <Loader2 className="size-3.5 shrink-0 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5 shrink-0" />
                        )}
                        Delete Installer
                      </Button>
                    </div>
                  )}
                </div>

                {updateInfo.releaseNotes && (
                  <div className="prose prose-sm prose-invert max-w-none border-t border-emerald-500/15 pt-3 text-xs text-muted-foreground select-text">
                    <MarkdownRenderer>
                      {updateInfo.releaseNotes}
                    </MarkdownRenderer>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3 text-xs text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>You are running the latest version of Galleo!</span>
                </div>
              </div>
            )
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>
                App updates are checked automatically on startup, but you can
                check manually.
              </span>
            </div>
          )}

          {/* Installer Management & Reinstall Section */}
          <div className="space-y-2 rounded-lg border border-border/50 bg-background/50 p-3.5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Package className="size-3.5 text-primary shrink-0" />
                  <span>Installer & Reinstallation</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {hasInstallerOnDisk && installerInfo ? (
                    <span>
                      Cached installer:{" "}
                      <span className="font-medium text-foreground">
                        {installerInfo.filename}
                      </span>{" "}
                      ({formatBytes(installerInfo.sizeBytes)})
                    </span>
                  ) : hasInstallerOnDisk ? (
                    <span>Installer binary is downloaded on disk.</span>
                  ) : (
                    <span>
                      Reinstall current version or clean up cached installers.
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 cursor-pointer text-xs font-medium"
                  onClick={() => startReinstall()}
                  disabled={isCheckingUpdate || isDownloadingUpdate || isDeletingInstaller}
                >
                  {isDownloadingUpdate ? (
                    <>
                      <Loader2 className="size-3.5 shrink-0 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="size-3.5 shrink-0" />
                      {hasInstallerOnDisk ? "Reinstall Galleo" : "Download & Reinstall"}
                    </>
                  )}
                </Button>

                {hasInstallerOnDisk && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 cursor-pointer text-xs font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => deleteDownloadedInstaller()}
                    disabled={isDeletingInstaller || isDownloadingUpdate}
                  >
                    {isDeletingInstaller ? (
                      <>
                        <Loader2 className="size-3.5 shrink-0 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="size-3.5 shrink-0" />
                        Delete Installer
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

