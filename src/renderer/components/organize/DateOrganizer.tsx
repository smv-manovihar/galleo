import React, { useState, useEffect } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { useMediaStore } from "../../stores/media-store"
import { useSettingsStore } from "../../stores/settings-store"
import { useOrganizeStore } from "../../stores/organize-store"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  FolderPlus,
  Play,
  ShieldAlert,
  FolderOpen,
  Info,
  Loader2,
  CheckCircle2,
  Image,
  Video,
  FileText,
  Eye,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react"
import type { OrganizePreviewItem } from "../../../shared/types/ipc"
import { cn } from "@/lib/utils"
import { MediaPreview } from "../media/MediaPreview"
import type { MediaItem } from "../../../shared/types/media"

interface FolderNode {
  name: string
  path: string
  subfolders: Map<string, FolderNode>
  files: OrganizePreviewItem[]
}

const buildFolderTree = (items: OrganizePreviewItem[]): FolderNode => {
  const root: FolderNode = {
    name: "Root",
    path: "",
    subfolders: new Map(),
    files: [],
  }

  for (const item of items) {
    const relPath = item.relativePath || ""
    const segments = relPath.split(/[\\/]/).filter(Boolean)

    let current = root
    let currentPath = ""
    // Exclude the last segment (the filename) to prevent making folders out of filenames
    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i]
      currentPath = currentPath ? `${currentPath}/${segment}` : segment
      if (!current.subfolders.has(segment)) {
        current.subfolders.set(segment, {
          name: segment,
          path: currentPath,
          subfolders: new Map(),
          files: [],
        })
      }
      current = current.subfolders.get(segment)!
    }
    current.files.push(item)
  }
  return root
}

const getAllFolderPaths = (node: FolderNode): string[] => {
  const paths: string[] = []
  if (node.path !== "") {
    paths.push(node.path)
  }
  for (const sub of node.subfolders.values()) {
    paths.push(...getAllFolderPaths(sub))
  }
  return paths
}

const getTopLevelFolderPaths = (node: FolderNode): string[] => {
  return Array.from(node.subfolders.values()).map((sub) => sub.path)
}

interface FlatFolderNode {
  type: "folder"
  id: string
  name: string
  path: string
  depth: number
  isExpanded: boolean
}

interface FlatFileNode {
  type: "file"
  id: string
  item: OrganizePreviewItem
  depth: number
}

type FlatNode = FlatFolderNode | FlatFileNode

function flattenFolderTree(
  root: FolderNode,
  expandedPaths: Set<string>
): FlatNode[] {
  const result: FlatNode[] = []

  function traverse(node: FolderNode, depth: number) {
    for (const sub of node.subfolders.values()) {
      const isExpanded = expandedPaths.has(sub.path)
      result.push({
        type: "folder",
        id: sub.path,
        name: sub.name,
        path: sub.path,
        depth,
        isExpanded,
      })

      if (isExpanded) {
        traverse(sub, depth + 1)
      }
    }

    for (let i = 0; i < node.files.length; i++) {
      const file = node.files[i]
      result.push({
        type: "file",
        id: `${node.path || "root"}_${file.mediaId}_${i}`,
        item: file,
        depth: node.path === "" ? depth : depth + 1,
      })
    }
  }

  traverse(root, 0)
  return result
}

interface VirtualizedFolderTreeProps {
  folderTree: FolderNode
  renderFile: (item: OrganizePreviewItem) => React.ReactNode
  allFolderPaths: string[]
}

const VirtualizedFolderTree: React.FC<VirtualizedFolderTreeProps> = ({
  folderTree,
  renderFile,
  allFolderPaths,
}) => {
  const topLevelPaths = React.useMemo(
    () => getTopLevelFolderPaths(folderTree),
    [folderTree]
  )

  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => {
    return allFolderPaths.length <= 30
      ? new Set(allFolderPaths)
      : new Set(topLevelPaths)
  })

  useEffect(() => {
    setExpandedPaths(
      allFolderPaths.length <= 30
        ? new Set(allFolderPaths)
        : new Set(topLevelPaths)
    )
  }, [allFolderPaths, topLevelPaths])

  const toggleFolder = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  const toggleAll = () => {
    if (expandedPaths.size === allFolderPaths.length) {
      setExpandedPaths(new Set())
    } else {
      setExpandedPaths(new Set(allFolderPaths))
    }
  }

  const flatNodes = React.useMemo(() => {
    return flattenFolderTree(folderTree, expandedPaths)
  }, [folderTree, expandedPaths])

  const parentRef = React.useRef<HTMLDivElement>(null)

  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: flatNodes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28,
    overscan: 12,
  })

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border/50 px-3 py-1.5 text-xs text-muted-foreground">
        <span>
          Showing <strong>{flatNodes.length}</strong> items in tree
        </span>
        <Button
          variant="ghost"
          size="xs"
          className="h-6 cursor-pointer text-xs hover:text-foreground"
          onClick={toggleAll}
        >
          {expandedPaths.size === allFolderPaths.length
            ? "Collapse All"
            : "Expand All"}
        </Button>
      </div>
      <div
        ref={parentRef}
        className="min-h-0 flex-1 overflow-y-auto scrollbar-thin p-2"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const node = flatNodes[virtualRow.index]
            if (!node) return null

            return (
              <div
                key={virtualRow.key}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {node.type === "folder" ? (
                  <div
                    onClick={() => toggleFolder(node.path)}
                    className="flex min-w-0 cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-foreground transition-colors select-none hover:bg-accent/40"
                    style={{ paddingLeft: `${node.depth * 16 + 8}px` }}
                  >
                    <ChevronRight
                      className={cn(
                        "size-3 shrink-0 text-muted-foreground/75 transition-transform duration-150",
                        node.isExpanded && "rotate-90"
                      )}
                    />
                    {node.isExpanded ? (
                      <FolderOpen className="size-3.5 shrink-0 fill-amber-500/10 text-amber-500" />
                    ) : (
                      <FolderOpen className="size-3.5 shrink-0 fill-amber-500/5 text-amber-500" />
                    )}
                    <span className="truncate">{node.name}</span>
                  </div>
                ) : (
                  <div style={{ paddingLeft: `${node.depth * 16 + 8}px` }}>
                    {renderFile(node.item)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const PRESETS = [
  { label: "Year/Month", value: "YYYY/MM/" },
  { label: "Year/Month Name", value: "YYYY/MM - MMMM/" },
  { label: "Year/Full Date", value: "YYYY/YYYY-MM-DD/" },
  { label: "Year/Month/Day", value: "YYYY/MM/DD/" },
]

const getPatternPreview = (patternStr: string) => {
  if (!patternStr) return ""
  // Basic replacements using a static date of June 28, 2026
  let preview = patternStr
  preview = preview.replace(/YYYY/g, "2026")
  preview = preview.replace(/MMMM/g, "June")
  preview = preview.replace(/MM/g, "06")
  preview = preview.replace(/DD/g, "28")

  return preview + (preview.endsWith("/") ? "" : "/") + "example_media.jpg"
}

const getFileIcon = (filename: string) => {
  const ext = filename.split(".").pop()?.toLowerCase()
  if (
    ["jpg", "jpeg", "png", "gif", "webp", "heic", "tiff"].includes(ext || "")
  ) {
    return <Image className="h-3.5 w-3.5 text-blue-500/70" />
  }
  if (["mp4", "mov", "avi", "mkv", "webm", "3gp"].includes(ext || "")) {
    return <Video className="h-3.5 w-3.5 text-purple-500/70" />
  }
  return <FileText className="h-3.5 w-3.5 text-muted-foreground/70" />
}

export const DateOrganizer: React.FC = () => {
  const activeRootPath = useMediaStore((s) => s.activeRootPath)
  const items = useMediaStore((s) => s.items)
  const { settings, saveSettings } = useSettingsStore()
  const isExecuting = useOrganizeStore((s) => s.isExecuting)
  const progress = useOrganizeStore((s) => s.progress)
  const startOrganization = useOrganizeStore((s) => s.startOrganization)

  const [destination, setDestination] = useState(
    settings.folders.destination || ""
  )
  const [pattern, setPattern] = useState(
    settings.organization.folderPattern || "YYYY/MM - MMMM/"
  )
  const [preserveOriginals, setPreserveOriginals] = useState(
    settings.organization.preserveOriginals || false
  )

  const [previewItems, setPreviewItems] = useState<OrganizePreviewItem[]>([])
  const [isPlanning, setIsPlanning] = useState(false)
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null)
  const [showHelpDialog, setShowHelpDialog] = useState(false)

  const handleSelectDest = async () => {
    try {
      const selected = await window.api.selectFolder()
      if (selected) {
        setDestination(selected)
        // Persist destination settings
        await saveSettings({
          ...settings,
          folders: {
            ...settings.folders,
            destination: selected,
          },
        })
      }
    } catch (e) {
      console.error("Folder picker select failed:", e)
    }
  }

  const handlePreview = async () => {
    if (!activeRootPath || !destination || !pattern) return
    setIsPlanning(true)
    setPreviewItems([])
    try {
      const res = await window.api.previewOrganization(
        activeRootPath,
        destination,
        pattern
      )
      if (res.ok) {
        setPreviewItems(res.data)
      }
    } catch (e) {
      console.error("Organization planning failed:", e)
    } finally {
      setIsPlanning(false)
    }
  }

  const handleExecute = () => {
    if (previewItems.length === 0 || !activeRootPath) return
    startOrganization(activeRootPath, previewItems, preserveOriginals)
    setPreviewItems([])
  }

  const conflictCount = React.useMemo(() => {
    return previewItems.filter((p) => p.conflict).length
  }, [previewItems])

  const folderTree = React.useMemo(() => {
    return buildFolderTree(previewItems)
  }, [previewItems])

  const allFolderPaths = React.useMemo(() => {
    return getAllFolderPaths(folderTree)
  }, [folderTree])

  const itemMap = React.useMemo(
    () => new Map(items.map((i) => [i.id, i])),
    [items]
  )

  const renderFile = React.useCallback(
    (item: OrganizePreviewItem): React.ReactNode => {
      const filename = item.sourcePath.split(/[\\/]/).pop() || ""
      return (
        <div
          className="group/file flex min-w-0 cursor-pointer items-center justify-between rounded-md px-2 py-1 text-xs transition-colors select-none hover:bg-accent/40"
          onClick={() => {
            const mediaItem = itemMap.get(item.mediaId)
            if (mediaItem) setPreviewItem(mediaItem)
          }}
        >
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            {getFileIcon(filename)}
            <span
              className="min-w-0 flex-1 truncate font-medium text-foreground select-text"
              title={filename}
            >
              {filename}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2 pl-2">
            <Button
              variant="ghost"
              size="xs"
              className="h-5 w-5 cursor-pointer p-0 text-muted-foreground opacity-0 transition-opacity group-hover/file:opacity-100 hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation()
                const mediaItem = itemMap.get(item.mediaId)
                if (mediaItem) setPreviewItem(mediaItem)
              }}
            >
              <Eye className="h-3 w-3" />
            </Button>
            {item.conflict && (
              <Badge
                variant="destructive"
                className="bg-destructive/80 px-1.5 py-0 text-3xs tracking-wider uppercase"
              >
                File Exists
              </Badge>
            )}
          </div>
        </div>
      )
    },
    [itemMap]
  )

  return (
    <>
      {/* Left Column: Configuration Form */}
      <div className="flex w-full shrink-0 flex-col gap-4 pr-1 lg:w-80">
        <Card className="flex shrink-0 flex-col border-border bg-card/65 shadow-sm">
          <CardContent className="space-y-4 p-4">
            {/* Top Helper Header with Dialog Link */}
            <div className="mb-2 flex items-center justify-between border-b border-border pb-2">
              <span className="flex items-center gap-2 text-xs font-bold text-foreground">
                <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                Settings
              </span>
              <Button
                variant="ghost"
                size="xs"
                className="h-6 cursor-pointer gap-1 rounded-md px-1.5 text-xs text-muted-foreground hover:text-primary"
                onClick={() => setShowHelpDialog(true)}
              >
                <Info className="h-3.5 w-3.5" />
                How it works
              </Button>
            </div>

            {/* Destination Path Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Destination Directory
              </Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  readOnly
                  placeholder="Select output folder..."
                  value={destination}
                  className="h-8 flex-1 truncate border-border bg-background/50 text-xs"
                />
                <Button
                  variant="outline"
                  size="lg"
                  className="shrink-0"
                  onClick={handleSelectDest}
                >
                  <FolderPlus className="mr-1 h-3.5 w-3.5" />
                  Browse
                </Button>
              </div>
            </div>

            {/* Pattern Input and Presets */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Subfolder Naming Pattern
              </Label>
              <Input
                type="text"
                value={pattern}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPattern(e.target.value)
                }
                placeholder="e.g. YYYY/MM/"
                className="h-8 border-border bg-background/50 font-mono text-xs"
              />

              {/* Pattern Presets list */}
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">
                  Quick Presets:
                </span>
                <div className="flex flex-wrap gap-1">
                  {PRESETS.map((preset) => (
                    <Button
                      key={preset.value}
                      type="button"
                      variant="outline"
                      size="sm"
                      className={`rounded-md ${pattern === preset.value ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20" : "bg-background hover:bg-accent"}`}
                      onClick={() => setPattern(preset.value)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>

              <p className="text-xs leading-relaxed text-muted-foreground">
                Tokens:{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-primary">
                  YYYY
                </code>
                ,{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-primary">
                  MM
                </code>
                ,{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-primary">
                  MMMM
                </code>
                ,{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-primary">
                  DD
                </code>
              </p>
            </div>

            {/* Dynamic Preview path */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1 text-xs font-semibold text-foreground">
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                Example Destination Path
              </Label>
              <div className="overflow-x-auto rounded-lg border border-border bg-background/80 p-2.5 font-mono text-xs whitespace-nowrap shadow-inner">
                <span className="text-muted-foreground">
                  {destination
                    ? destination.split(/[\\/]/).pop() || destination
                    : "Destination"}
                </span>
                <span className="text-muted-foreground/40">/</span>
                <span className="font-semibold text-primary">
                  {getPatternPreview(pattern)}
                </span>
              </div>
            </div>

            {/* Preserves originals copy vs move */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/10 p-2.5">
              <div className="space-y-0.5">
                <Label
                  htmlFor="preserve-switch"
                  className="cursor-pointer text-xs font-semibold text-foreground"
                >
                  Copy instead of Move
                </Label>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                  Keep original files in current folder
                </p>
              </div>
              <Switch
                id="preserve-switch"
                checked={preserveOriginals}
                onCheckedChange={(val: boolean) => {
                  setPreserveOriginals(val)
                  saveSettings({
                    ...settings,
                    organization: {
                      ...settings.organization,
                      preserveOriginals: val,
                    },
                  })
                }}
              />
            </div>
          </CardContent>

          <CardFooter className="flex shrink-0 justify-end border-t border-border bg-muted/10 p-4">
            <Button
              className="h-8 w-full cursor-pointer bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/95"
              onClick={handlePreview}
              disabled={isPlanning || isExecuting || !destination}
            >
              {isPlanning ? (
                <span className="flex items-center justify-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Analyzing Target Paths...
                </span>
              ) : (
                "Preview Organization"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Right Column: Dynamic Preview / State Container */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* State 1: Executing Progress */}
        {isExecuting && progress && (
          <Card className="flex min-h-0 flex-1 flex-col justify-center border-border bg-card/65 p-8 shadow-sm">
            <div className="mx-auto w-full max-w-md space-y-6 text-center">
              <div className="mx-auto flex h-14 w-14 animate-pulse items-center justify-center rounded-full bg-primary/10 p-4 text-primary">
                <Loader2 className="h-7 w-7 animate-spin" />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Executing File Transitions
                </h3>
                <p className="text-xs text-muted-foreground">
                  Moving or copying files to their designated structures. Please
                  do not close the application.
                </p>
              </div>
              <div className="space-y-3 rounded-lg border border-border bg-background/50 p-4 shadow-inner">
                <div className="flex justify-between text-[0.6875rem] font-semibold">
                  <span className="text-primary">Processed Files</span>
                  <span>
                    {progress.processedCount} / {progress.totalCount} (
                    {Math.round(
                      (progress.processedCount / progress.totalCount) * 100
                    )}
                    %)
                  </span>
                </div>
                <Progress
                  value={(progress.processedCount / progress.totalCount) * 100}
                  className="h-2 rounded-full bg-muted"
                />
                <div
                  className="truncate text-left text-2xs text-muted-foreground"
                  title={progress.currentFile}
                >
                  {progress.currentFile || "Initializing first file..."}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* State 2: Planning (Loading Preview) */}
        {!isExecuting && isPlanning && (
          <Card className="flex min-h-0 flex-1 flex-col items-center justify-center border-border bg-card/65 p-8 shadow-sm">
            <div className="mx-auto w-full max-w-md space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 animate-spin items-center justify-center rounded-full bg-muted p-4 text-muted-foreground">
                <Loader2 className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">
                  Analyzing Folders & Exif
                </h3>
                <p className="text-xs text-muted-foreground">
                  Scanning your folder to construct the organization plan...
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* State 3: Empty state when no preview generated */}
        {!isExecuting && !isPlanning && previewItems.length === 0 && (
          <Card className="flex min-h-0 flex-1 flex-col items-center justify-center border-border bg-card/65 p-8 shadow-sm">
            <div className="mx-auto w-full max-w-md space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted p-4 text-muted-foreground">
                <FolderOpen className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">
                  No Preview Generated
                </h3>
                <p className="text-xs text-muted-foreground">
                  Select a destination directory and naming pattern on the left,
                  then click <strong>Preview Organization</strong> to generate a
                  plan of action.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* State 4: Preview items loaded */}
        {!isExecuting && !isPlanning && previewItems.length > 0 && (
          <Card className="flex min-h-0 min-w-0 flex-1 flex-col border-border bg-card/65 shadow-sm">
            <CardHeader className="flex shrink-0 flex-row items-center justify-between border-b border-border pb-3">
              <div>
                <CardTitle className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Play className="h-3.5 w-3.5 fill-current text-primary" />
                  Organize Preview Plan
                </CardTitle>
                <CardDescription className="mt-0.5 text-2xs text-muted-foreground">
                  Review proposed file modifications.{" "}
                  <strong>{previewItems.length}</strong> items scheduled.
                </CardDescription>
              </div>
              {conflictCount > 0 ? (
                <Badge
                  variant="destructive"
                  className="flex shrink-0 animate-pulse items-center gap-1 px-2 py-0.5 text-[0.5625rem]"
                >
                  <ShieldAlert className="h-3 w-3" />
                  {conflictCount} conflicts
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="flex shrink-0 items-center gap-1 border-green-500/20 bg-green-500/5 px-2 py-0.5 text-[0.5625rem] text-green-500"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  All ready
                </Badge>
              )}
            </CardHeader>

            {/* Table Content with Virtualized Tree View */}
            <CardContent className="min-h-0 flex-1 border-b border-border bg-muted/5 p-0">
              <VirtualizedFolderTree
                folderTree={folderTree}
                renderFile={renderFile}
                allFolderPaths={allFolderPaths}
              />
            </CardContent>

            <CardFooter className="flex shrink-0 justify-end gap-3 bg-muted/10 p-4">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setPreviewItems([])}
              >
                Cancel Plan
              </Button>
              <Button
                variant="default"
                size="lg"
                className="gap-1.5"
                onClick={handleExecute}
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                Apply Organization Changes
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>

      <MediaPreview
        item={previewItem}
        onClose={() => setPreviewItem(null)}
        items={items}
        onItemChange={setPreviewItem}
      />

      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="max-w-md border-border bg-card/95 font-sans text-xs text-foreground backdrop-blur-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold">
              <Info className="h-4 w-4 text-primary" />
              How Date Organization Works
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Learn how Galleo automatically structures and names your folders.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 py-2 text-xs leading-relaxed">
            <div className="space-y-1">
              <h4 className="font-semibold text-foreground">
                1. Exif Date Extraction
              </h4>
              <p className="text-muted-foreground">
                Galleo first attempts to read the precise capture date from the
                file's embedded EXIF metadata (metadata written by cameras and
                phones when the photo or video was taken).
              </p>
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-foreground">
                2. Filename Date Parsing
              </h4>
              <p className="text-muted-foreground">
                If the EXIF metadata is missing, Galleo scans the filename for
                structured date formats (such as YYYY-MM-DD or Unix timestamps).
              </p>
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-foreground">
                3. System File Dates (Fallback)
              </h4>
              <p className="text-muted-foreground">
                As a final fallback, Galleo uses the file's system creation date
                or last modification date as the target organization date.
              </p>
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-foreground">
                4. Pattern Subfolders
              </h4>
              <p className="text-muted-foreground">
                Once the date is determined, the file is moved or copied to a
                folder matching your naming pattern (e.g.{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-primary">
                  YYYY/MM - MMMM/
                </code>{" "}
                will organize files into folders like{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-primary">
                  2026/06 - June/
                </code>
                ).
              </p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="default" size="lg">
                Got it
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
