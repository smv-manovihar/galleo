import React, { useState, useEffect, useMemo, useCallback } from "react"
import { useMediaStore } from "../../stores/media-store"
import { useSettingsStore } from "../../stores/settings-store"
import { useOrganizeStore } from "../../stores/organize-store"
import { useScanStore } from "../../stores/scan-store"
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
import { Checkbox } from "@/components/ui/checkbox"
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
  Tree,
  Folder as TreeFolder,
  File as TreeFile,
  type TreeViewElement,
} from "@/components/ui/file-tree"
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
  SlidersHorizontal,
  Folder,
  Library,
  Search,
  ArrowRight,
  FolderTree as FolderTreeIcon,
  ScanSearch,
  X,
  HardDrive,
  ChevronsUpDown,
} from "lucide-react"
import type { OrganizePreviewItem, LibraryFolderItem } from "../../../shared/types/ipc"
import { cn } from "@/lib/utils"
import { MediaPreview } from "../media/MediaPreview"
import type { MediaItem } from "../../../shared/types/media"
import { formatBytes } from "../../lib/format"

interface FolderNode {
  name: string
  path: string
  subfolders: Map<string, FolderNode>
  files: OrganizePreviewItem[]
  totalSize: number
  totalCount: number
  sourceFolders: Set<string>
}

const getSourceParentName = (sourcePath: string): string => {
  const norm = sourcePath.replace(/\\/g, "/")
  const lastSlash = norm.lastIndexOf("/")
  if (lastSlash === -1) return "Root"
  const parent = norm.substring(0, lastSlash)
  const parentName = parent.substring(parent.lastIndexOf("/") + 1)
  return parentName || parent || "Root"
}

const buildFolderTree = (items: OrganizePreviewItem[]): FolderNode => {
  const root: FolderNode = {
    name: "Root",
    path: "",
    subfolders: new Map(),
    files: [],
    totalSize: 0,
    totalCount: 0,
    sourceFolders: new Set(),
  }

  for (const item of items) {
    const relPath = item.relativePath || ""
    const segments = relPath.split(/[\\/]/).filter(Boolean)
    const itemSize = item.size || 0
    const sourceParent = getSourceParentName(item.sourcePath)

    root.totalSize += itemSize
    root.totalCount += 1
    root.sourceFolders.add(sourceParent)

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
          totalSize: 0,
          totalCount: 0,
          sourceFolders: new Set(),
        })
      }
      current = current.subfolders.get(segment)!
      current.totalSize += itemSize
      current.totalCount += 1
      current.sourceFolders.add(sourceParent)
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

const PRESETS = [
  { label: "Year/Month", value: "YYYY/MM/" },
  { label: "Year/Month Name", value: "YYYY/MM - MMMM/" },
  { label: "Year/Full Date", value: "YYYY/YYYY-MM-DD/" },
  { label: "Year/Month/Day", value: "YYYY/MM/DD/" },
]

const getPatternPreview = (patternStr: string) => {
  if (!patternStr) return ""
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
    return <Image className="size-3.5 shrink-0 text-blue-500/70" />
  }
  if (["mp4", "mov", "avi", "mkv", "webm", "3gp"].includes(ext || "")) {
    return <Video className="size-3.5 shrink-0 text-purple-500/70" />
  }
  return <FileText className="size-3.5 shrink-0 text-muted-foreground/70" />
}


/**
 * Tree View for Organization Preview using @/components/ui/file-tree
 */
interface OrganizeFolderTreeProps {
  folderTree: FolderNode
  itemMap: Map<string, MediaItem>
  onPreview: (item: MediaItem) => void
  allFolderPaths: string[]
}

interface OrganizeFolderBranchProps {
  node: FolderNode
  itemMap: Map<string, MediaItem>
  onPreview: (item: MediaItem) => void
}

interface OrganizeFileRowProps {
  file: OrganizePreviewItem
  mediaItem?: MediaItem
  onPreview: (item: MediaItem) => void
}

const OrganizeFileRow = React.memo<OrganizeFileRowProps>(
  ({ file, mediaItem, onPreview }) => {
    const filename = useMemo(
      () => file.sourcePath.split(/[\\/]/).pop() || "",
      [file.sourcePath]
    )
    const fileIcon = useMemo(() => getFileIcon(filename), [filename])

    const handlePreview = useCallback(
      (e?: React.MouseEvent) => {
        e?.stopPropagation()
        if (mediaItem) onPreview(mediaItem)
      },
      [mediaItem, onPreview]
    )

    return (
      <TreeFile
        value={file.mediaId}
        className="my-0.5"
        fileIcon={fileIcon}
        onClick={handlePreview}
        actions={
          <div className="flex items-center gap-2 pr-2 text-2xs text-muted-foreground">
            <span className="tabular-nums">{formatBytes(file.size || 0)}</span>
            <Button
              variant="ghost"
              size="xs"
              className="h-5 w-5 cursor-pointer p-0 text-muted-foreground hover:text-foreground"
              onClick={handlePreview}
              title="Preview Media"
            >
              <Eye className="size-3.5" />
            </Button>
            {file.conflict && (
              <Badge
                variant="destructive"
                className="bg-destructive/80 px-1.5 py-0 text-2xs"
              >
                File Exists
              </Badge>
            )}
          </div>
        }
      >
        <span
          className="truncate font-medium text-foreground select-text"
          title={filename}
        >
          {filename}
        </span>
      </TreeFile>
    )
  }
)

const OrganizeFolderBranch: React.FC<OrganizeFolderBranchProps> = ({
  node,
  itemMap,
  onPreview,
}) => {
  return (
    <>
      {Array.from(node.subfolders.values()).map((sub) => {
        const hasSubContent = sub.subfolders.size > 0 || sub.files.length > 0

        return (
          <TreeFolder
            key={sub.path}
            value={sub.path}
            element={sub.name}
            className="my-0.5"
            actions={
              <div className="flex items-center gap-2 pr-2 text-2xs text-muted-foreground">
                <Badge
                  variant="secondary"
                  className="px-1.5 py-0 text-2xs font-normal tabular-nums"
                >
                  {sub.totalCount} items
                </Badge>
                <span className="tabular-nums">{formatBytes(sub.totalSize)}</span>
              </div>
            }
          >
            {hasSubContent ? (
              <div className="flex flex-col gap-0.5">
                {/* Nested subfolders */}
                <OrganizeFolderBranch
                  node={sub}
                  itemMap={itemMap}
                  onPreview={onPreview}
                />

                {/* Files inside this folder */}
                {sub.files.map((file, i) => (
                  <OrganizeFileRow
                    key={`${sub.path}_${file.mediaId}_${i}`}
                    file={file}
                    mediaItem={itemMap.get(file.mediaId)}
                    onPreview={onPreview}
                  />
                ))}
              </div>
            ) : null}
          </TreeFolder>
        )
      })}
    </>
  )
}

const OrganizeFolderTreeView: React.FC<OrganizeFolderTreeProps> = ({
  folderTree,
  itemMap,
  onPreview,
  allFolderPaths,
}) => {
  const topLevelPaths = useMemo(
    () => getTopLevelFolderPaths(folderTree),
    [folderTree]
  )

  const initialExpanded = useMemo(() => {
    return allFolderPaths.length <= 40 ? allFolderPaths : topLevelPaths
  }, [allFolderPaths, topLevelPaths])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border/50 px-3 py-2 text-xs text-muted-foreground">
        <span>
          Showing <strong>{allFolderPaths.length}</strong> target folders in tree
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <Tree
          initialExpandedItems={initialExpanded}
          indicator={true}
          className="h-full"
        >
          <OrganizeFolderBranch
            node={folderTree}
            itemMap={itemMap}
            onPreview={onPreview}
          />
        </Tree>
      </div>
    </div>
  )
}


const isPathCoveredByAncestors = (
  folderPath: string,
  selectedSources: string[]
): { isCovered: boolean; coveringParent?: string } => {
  if (selectedSources.includes("all")) {
    return { isCovered: true, coveringParent: "All Scanned Media" }
  }
  const normPath = folderPath.replace(/\\/g, "/").toLowerCase().replace(/\/+$/, "")
  for (const parent of selectedSources) {
    if (parent === "all") continue
    const normParent = parent.replace(/\\/g, "/").toLowerCase().replace(/\/+$/, "")
    if (normPath !== normParent && normPath.startsWith(normParent + "/")) {
      return { isCovered: true, coveringParent: parent }
    }
  }
  return { isCovered: false }
}

interface ComboboxFolderBranchProps {
  node: TreeViewElement
  folderMap: Map<string, LibraryFolderItem>
  selectedSources: string[]
  onToggle: (id: string) => void
}

const ComboboxFolderBranch: React.FC<ComboboxFolderBranchProps> = ({
  node,
  folderMap,
  selectedSources,
  onToggle,
}) => {
  const folderInfo = folderMap.get(node.id.toLowerCase())
  const count = folderInfo ? folderInfo.itemCount : 0

  const normId = node.id.replace(/\\/g, "/").toLowerCase().replace(/\/+$/, "")
  const isDirectlySelected = selectedSources.some(
    (s) => s !== "all" && s.replace(/\\/g, "/").toLowerCase().replace(/\/+$/, "") === normId
  )
  const ancestorCheck = isPathCoveredByAncestors(node.id, selectedSources)
  const isInherited = ancestorCheck.isCovered && !isDirectlySelected
  const isChecked = isDirectlySelected || isInherited
  const isDisabled = isInherited
  const hasChildren = Boolean(node.children && node.children.length > 0)

  return (
    <TreeFolder
      key={node.id}
      value={node.id}
      element={node.name}
      isSelect={isDirectlySelected}
      className={cn(
        "group/folder my-0.5",
        isDirectlySelected && "bg-primary/10 font-semibold text-primary",
        isInherited && "text-muted-foreground"
      )}
      actions={
        <div className="flex items-center gap-2 pr-1.5">
          <Badge variant="secondary" className="px-1.5 py-0 text-2xs font-normal tabular-nums">
            {count} items
          </Badge>
          <Checkbox
            checked={isChecked}
            disabled={isDisabled}
            onCheckedChange={() => {
              if (!isDisabled) {
                onToggle(node.id)
              }
            }}
            onClick={(e) => {
              e.stopPropagation()
            }}
            title={
              isDisabled
                ? `Included in selected parent (${ancestorCheck.coveringParent?.split(/[\\/]/).pop() || ancestorCheck.coveringParent})`
                : isDirectlySelected
                ? `Deselect ${node.name}`
                : `Select ${node.name}`
            }
            className={cn(
              "size-4 cursor-pointer",
              isDisabled && "cursor-not-allowed opacity-60"
            )}
          />
        </div>
      }
    >
      {hasChildren ? (
        <div className="flex flex-col gap-0.5">
          {node.children?.map((child) => (
            <ComboboxFolderBranch
              key={child.id}
              node={child}
              folderMap={folderMap}
              selectedSources={selectedSources}
              onToggle={onToggle}
            />
          ))}
        </div>
      ) : null}
    </TreeFolder>
  )
}

/**
 * Searchable Folder Selector Dialog using @/components/ui/file-tree
 */
interface SearchableFolderDialogProps {
  selectedSources: string[]
  onSelectSources: (paths: string[]) => void
  libraryFolders: LibraryFolderItem[]
  allMediaCount: number
}

const SearchableFolderDialog: React.FC<SearchableFolderDialogProps> = ({
  selectedSources,
  onSelectSources,
  libraryFolders,
  allMediaCount,
}) => {
  const [open, setOpen] = useState(false)
  const [searchFilter, setSearchFilter] = useState("")

  // Map for fast folder lookup
  const folderMap = useMemo(() => {
    const map = new Map<string, LibraryFolderItem>()
    for (const f of libraryFolders) {
      map.set(f.path.toLowerCase(), f)
    }
    return map
  }, [libraryFolders])

  // Build tree elements hierarchy for file tree
  const treeElements = useMemo(() => {
    const nodeMap = new Map<string, TreeViewElement>()
    const rootNodes: TreeViewElement[] = []

    for (const f of libraryFolders) {
      const node: TreeViewElement = {
        id: f.path,
        name: f.name,
        type: "folder",
        isSelectable: true,
        children: [],
      }
      nodeMap.set(f.path.toLowerCase(), node)
    }

    for (const f of libraryFolders) {
      const node = nodeMap.get(f.path.toLowerCase())!
      if (f.isRoot) {
        rootNodes.push(node)
      } else {
        const norm = f.path.replace(/\\/g, "/")
        const lastSlash = norm.lastIndexOf("/")
        const parentPath = lastSlash !== -1 ? norm.substring(0, lastSlash).replace(/\//g, "\\") : ""
        const parentNode = nodeMap.get(parentPath.toLowerCase())
        if (parentNode && parentNode.children) {
          parentNode.children.push(node)
        } else {
          rootNodes.push(node)
        }
      }
    }

    if (searchFilter.trim().length > 0) {
      const q = searchFilter.toLowerCase().trim()
      const filterNode = (n: TreeViewElement): TreeViewElement | null => {
        const matches = n.name.toLowerCase().includes(q) || n.id.toLowerCase().includes(q)
        const filteredChildren = (n.children || [])
          .map(filterNode)
          .filter((c): c is TreeViewElement => c !== null)

        if (matches || filteredChildren.length > 0) {
          return {
            ...n,
            children: filteredChildren,
          }
        }
        return null
      }

      return rootNodes
        .map(filterNode)
        .filter((n): n is TreeViewElement => n !== null)
    }

    return rootNodes
  }, [libraryFolders, searchFilter])

  const allFolderIds = useMemo(() => {
    return libraryFolders.map((f) => f.path)
  }, [libraryFolders])

  const handleToggleFolder = useCallback(
    (folderPath: string) => {
      const norm = folderPath.replace(/\\/g, "/").toLowerCase().replace(/\/+$/, "")
      const withoutAll = selectedSources.filter((p) => p !== "all")
      const isDirectlySelected = withoutAll.some(
        (p) => p.replace(/\\/g, "/").toLowerCase().replace(/\/+$/, "") === norm
      )

      if (isDirectlySelected) {
        onSelectSources(
          withoutAll.filter(
            (p) => p.replace(/\\/g, "/").toLowerCase().replace(/\/+$/, "") !== norm
          )
        )
      } else {
        // Clean up any descendants of this folder that were individually selected
        const cleaned = withoutAll.filter((p) => {
          const pNorm = p.replace(/\\/g, "/").toLowerCase().replace(/\/+$/, "")
          return !pNorm.startsWith(norm + "/")
        })
        onSelectSources([...cleaned, folderPath])
      }
    },
    [selectedSources, onSelectSources]
  )

  const handleToggleAll = useCallback(() => {
    if (selectedSources.includes("all")) {
      onSelectSources([])
    } else {
      onSelectSources(["all"])
    }
  }, [selectedSources, onSelectSources])

  const handleClearSelection = useCallback(() => {
    onSelectSources([])
  }, [onSelectSources])

  // Summary of active selection for trigger button
  const selectedFolderInfo = useMemo(() => {
    if (selectedSources.length === 0) {
      return {
        name: "No Folder Selected",
        subtitle: "Click to choose folders",
        icon: <FolderOpen className="size-4 text-muted-foreground shrink-0" />,
        itemCount: 0,
      }
    }

    if (selectedSources.includes("all")) {
      return {
        name: "All Scanned Media",
        subtitle: "Entire library across all roots",
        icon: <Library className="size-4 text-primary shrink-0" />,
        itemCount: allMediaCount,
      }
    }

    if (selectedSources.length === 1) {
      const single = selectedSources[0]
      const match = folderMap.get(single.toLowerCase())
      if (match) {
        return {
          name: match.name,
          subtitle: match.isRoot
            ? "Root Directory"
            : `Subfolder in ${match.rootPath.split(/[\\/]/).pop()}`,
          icon: match.isRoot ? (
            <HardDrive className="size-4 text-amber-500 shrink-0" />
          ) : (
            <Folder className="size-4 text-amber-500/80 shrink-0" />
          ),
          itemCount: match.itemCount,
        }
      }
      return {
        name: single.split(/[\\/]/).pop() || single,
        subtitle: single,
        icon: <FolderOpen className="size-4 text-primary shrink-0" />,
        itemCount: 0,
      }
    }

    const totalCount = selectedSources.reduce((acc, s) => {
      const match = folderMap.get(s.toLowerCase())
      return acc + (match ? match.itemCount : 0)
    }, 0)

    const names = selectedSources.map((s) => {
      const match = folderMap.get(s.toLowerCase())
      return match?.name || s.split(/[\\/]/).pop() || s
    })

    return {
      name: `${selectedSources.length} Folders Selected`,
      subtitle: names.slice(0, 2).join(", ") + (names.length > 2 ? ` +${names.length - 2}` : ""),
      icon: <FolderTreeIcon className="size-4 text-primary shrink-0" />,
      itemCount: totalCount,
    }
  }, [selectedSources, folderMap, allMediaCount])

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-11 w-full justify-between gap-2 border-border bg-background/60 p-2 text-left transition-colors hover:bg-accent/40"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {selectedFolderInfo.icon}
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-xs font-semibold text-foreground">
              {selectedFolderInfo.name}
            </span>
            <span className="truncate text-2xs text-muted-foreground">
              {selectedFolderInfo.subtitle}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge variant="secondary" className="px-1.5 py-0 text-xs font-normal tabular-nums">
            {selectedFolderInfo.itemCount} items
          </Badge>
          <ChevronsUpDown className="size-3.5 text-muted-foreground shrink-0" />
        </div>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-6 gap-4 border-border bg-card shadow-2xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <FolderOpen className="size-5 text-primary" />
              Select Source Folders to Organize
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Choose the entire media library or select multiple root folders or nested child subfolders.
            </DialogDescription>
          </DialogHeader>

          {/* Search bar and clear */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search folders or subfolders by name or path..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="h-9 pl-9 pr-8 text-xs border-border bg-background"
              />
              {searchFilter && (
                <Button
                  variant="ghost"
                  size="xs"
                  className="absolute right-1.5 top-1.5 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearchFilter("")}
                >
                  <X className="size-3.5" />
                </Button>
              )}
            </div>
            {selectedSources.length > 0 && (
              <Button
                variant="ghost"
                size="xs"
                className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground shrink-0"
                onClick={handleClearSelection}
              >
                Clear
              </Button>
            )}
          </div>

          {/* Scrollable folder tree area */}
          <div className="min-h-0 flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
            {/* All Scanned Media card */}
            <div
              className={cn(
                "flex items-center justify-between gap-3 rounded-lg border p-3 text-xs transition-colors cursor-pointer select-none",
                selectedSources.includes("all")
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border/70 hover:border-border hover:bg-accent/40"
              )}
              onClick={handleToggleAll}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Library className="size-5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className={cn("text-xs font-semibold", selectedSources.includes("all") ? "text-primary" : "text-foreground")}>
                    All Scanned Media
                  </span>
                  <span className="text-2xs text-muted-foreground">
                    Entire library collection across all configured root folders
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Badge variant="secondary" className="px-2 py-0.5 text-xs font-normal tabular-nums">
                  {allMediaCount} items
                </Badge>
                <Checkbox
                  checked={selectedSources.includes("all")}
                  onCheckedChange={handleToggleAll}
                  onClick={(e) => e.stopPropagation()}
                  title={selectedSources.includes("all") ? "Deselect All Scanned Media" : "Select All Scanned Media"}
                  className="size-4 cursor-pointer"
                />
              </div>
            </div>

            {/* Folder Hierarchy Tree */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between px-1 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Folders & Subfolders</span>
                <span>{libraryFolders.length} total directories</span>
              </div>

              {treeElements.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border py-8 text-center text-xs text-muted-foreground">
                  No matching folders found for &ldquo;{searchFilter}&rdquo;.
                </div>
              ) : (
                <div className="rounded-lg border border-border bg-background/50 p-2 max-h-72 overflow-y-auto">
                  <Tree
                    initialExpandedItems={allFolderIds}
                    indicator={true}
                    className="h-full"
                  >
                    {treeElements.map((rootNode) => (
                      <ComboboxFolderBranch
                        key={rootNode.id}
                        node={rootNode}
                        folderMap={folderMap}
                        selectedSources={selectedSources}
                        onToggle={handleToggleFolder}
                      />
                    ))}
                  </Tree>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end border-t border-border/70 pt-3">
            <Button
              variant="default"
              size="sm"
              className="text-xs"
              onClick={() => setOpen(false)}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export const DateOrganizer: React.FC = () => {
  const activeRootPath = useMediaStore((s) => s.activeRootPath)
  const items = useMediaStore((s) => s.items)
  const fetchMediaItems = useMediaStore((s) => s.fetchMediaItems)
  const setActiveRootPath = useMediaStore((s) => s.setActiveRootPath)
  const { settings, saveSettings } = useSettingsStore()
  const isExecuting = useOrganizeStore((s) => s.isExecuting)
  const progress = useOrganizeStore((s) => s.progress)
  const startOrganization = useOrganizeStore((s) => s.startOrganization)
  const startScan = useScanStore((s) => s.startScan)
  const isScanning = useScanStore((s) => s.isScanning)

  // Source Folder Scope (Multi-selection)
  const [selectedSources, setSelectedSources] = useState<string[]>(() => {
    if (activeRootPath && activeRootPath.trim().length > 0) {
      return [activeRootPath]
    }
    const firstScanned = settings.folders.roots.find(
      (r) => r.enabled && r.scanned
    )
    if (firstScanned) return [firstScanned.path]
    if (settings.folders.roots.length > 0) {
      return [settings.folders.roots[0].path]
    }
    return ["all"]
  })

  const [prevActiveRootPath, setPrevActiveRootPath] = useState(activeRootPath)
  if (activeRootPath !== prevActiveRootPath) {
    setPrevActiveRootPath(activeRootPath)
    if (activeRootPath && activeRootPath.trim().length > 0) {
      setSelectedSources([activeRootPath])
    }
  }

  // Library folder hierarchy (roots and subfolders)
  const [libraryFolders, setLibraryFolders] = useState<LibraryFolderItem[]>([])

  useEffect(() => {
    let isMounted = true
    window.api
      .getLibraryFolders()
      .then((folders) => {
        if (isMounted) {
          setLibraryFolders(folders)
        }
      })
      .catch((e) => {
        console.error("Failed to load library folder tree:", e)
      })

    return () => {
      isMounted = false
    }
  }, [isScanning])

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

  // Search & Filter state for preview
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<
    "all" | "conflicts" | "photos" | "videos"
  >("all")

  // Source selection handler
  const handleSourcesChange = async (newSources: string[]) => {
    setSelectedSources(newSources)
    setPreviewItems([])
    if (newSources.length === 1 && newSources[0] !== "all") {
      setActiveRootPath(newSources[0])
      await fetchMediaItems(newSources[0])
    } else if (newSources.includes("all") || newSources.length === 0) {
      setActiveRootPath("all")
      await fetchMediaItems("all")
    } else {
      setActiveRootPath(newSources[0])
    }
  }

  const handleSelectDest = async () => {
    try {
      const selected = await window.api.selectFolder()
      if (selected) {
        setDestination(selected)
        await saveSettings({
          ...settings,
          folders: {
            ...settings.folders,
            destination: selected,
          },
        })
      }
    } catch (e) {
      console.error("Destination folder picker failed:", e)
    }
  }

  const handlePreview = async () => {
    if (selectedSources.length === 0 || !destination || !pattern) return
    setIsPlanning(true)
    setPreviewItems([])
    setSearchQuery("")
    setTypeFilter("all")
    try {
      const res = await window.api.previewOrganization(
        selectedSources.length === 1 ? selectedSources[0] : selectedSources,
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
    if (previewItems.length === 0 || selectedSources.length === 0) return
    startOrganization(
      selectedSources.length === 1 ? selectedSources[0] : selectedSources,
      previewItems,
      preserveOriginals
    )
    setPreviewItems([])
  }

  const handleScanCurrentSource = () => {
    if (selectedSources.includes("all")) {
      const roots = settings.folders.roots
        .filter((r) => r.enabled)
        .map((r) => r.path)
      if (roots.length > 0) startScan(roots)
    } else if (selectedSources.length > 0) {
      startScan(selectedSources)
    }
  }

  // Filtered preview items based on user search and filter tabs
  const filteredPreviewItems = useMemo(() => {
    return previewItems.filter((item) => {
      // Type / Status filter
      if (typeFilter === "conflicts" && !item.conflict) return false
      if (typeFilter === "photos" && item.mediaType !== "photo") return false
      if (typeFilter === "videos" && item.mediaType !== "video") return false

      // Text search query
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase().trim()
        const filename = item.sourcePath.split(/[\\/]/).pop()?.toLowerCase() || ""
        const sourcePath = item.sourcePath.toLowerCase()
        const targetPath = item.targetPath.toLowerCase()
        const relPath = item.relativePath.toLowerCase()
        if (
          !filename.includes(q) &&
          !sourcePath.includes(q) &&
          !targetPath.includes(q) &&
          !relPath.includes(q)
        ) {
          return false
        }
      }
      return true
    })
  }, [previewItems, typeFilter, searchQuery])

  const conflictCount = useMemo(() => {
    return previewItems.filter((p) => p.conflict).length
  }, [previewItems])

  const photosCount = useMemo(() => {
    return previewItems.filter((p) => p.mediaType === "photo").length
  }, [previewItems])

  const videosCount = useMemo(() => {
    return previewItems.filter((p) => p.mediaType === "video").length
  }, [previewItems])

  const totalBytesPlanned = useMemo(() => {
    return previewItems.reduce((acc, i) => acc + (i.size || 0), 0)
  }, [previewItems])

  const folderTree = useMemo(() => {
    return buildFolderTree(filteredPreviewItems)
  }, [filteredPreviewItems])

  const allFolderPaths = useMemo(() => {
    return getAllFolderPaths(folderTree)
  }, [folderTree])

  const itemMap = useMemo(() => {
    return new Map(items.map((i) => [i.id, i]))
  }, [items])

  // Get current source information and root status
  const currentSourceInfo = useMemo(() => {
    if (selectedSources.includes("all")) {
      const anyRootScanned = settings.folders.roots.some(
        (r) => r.enabled && r.scanned
      )
      return {
        label: "All Library Media",
        subtitle: "All configured library roots",
        isScanned: anyRootScanned || items.length > 0,
        itemCount: items.length,
      }
    }

    if (selectedSources.length === 0) {
      return {
        label: "No Folder Selected",
        subtitle: "Please select at least one folder",
        isScanned: false,
        itemCount: 0,
      }
    }

    if (selectedSources.length === 1) {
      const single = selectedSources[0]
      const normSource = single
        .replace(/\\/g, "/")
        .toLowerCase()
        .replace(/\/+$/, "")
      const matchedFolder = libraryFolders.find(
        (f) =>
          f.path.replace(/\\/g, "/").toLowerCase().replace(/\/+$/, "") ===
          normSource
      )
      const isInsideScannedRoot = settings.folders.roots.some((r) => {
        if (!r.enabled || !r.scanned) return false
        const normRoot = r.path
          .replace(/\\/g, "/")
          .toLowerCase()
          .replace(/\/+$/, "")
        return normSource === normRoot || normSource.startsWith(normRoot + "/")
      })

      const count = matchedFolder
        ? matchedFolder.itemCount
        : items.filter((item) => {
            const normItem = item.path.replace(/\\/g, "/").toLowerCase()
            return (
              normItem === normSource || normItem.startsWith(normSource + "/")
            )
          }).length

      const isScanned =
        isInsideScannedRoot || Boolean(matchedFolder) || count > 0

      return {
        label:
          matchedFolder?.name ||
          settings.folders.roots.find(
            (r) => r.path.replace(/\\/g, "/").toLowerCase() === normSource
          )?.label ||
          single.split(/[\\/]/).pop() ||
          single,
        subtitle: single,
        isScanned,
        itemCount: count,
      }
    }

    // Multiple folders
    let totalCount = 0
    let allScanned = true

    for (const src of selectedSources) {
      const normSource = src
        .replace(/\\/g, "/")
        .toLowerCase()
        .replace(/\/+$/, "")
      const matchedFolder = libraryFolders.find(
        (f) =>
          f.path.replace(/\\/g, "/").toLowerCase().replace(/\/+$/, "") ===
          normSource
      )
      const isInsideScannedRoot = settings.folders.roots.some((r) => {
        if (!r.enabled || !r.scanned) return false
        const normRoot = r.path
          .replace(/\\/g, "/")
          .toLowerCase()
          .replace(/\/+$/, "")
        return normSource === normRoot || normSource.startsWith(normRoot + "/")
      })

      const count = matchedFolder
        ? matchedFolder.itemCount
        : items.filter((item) => {
            const normItem = item.path.replace(/\\/g, "/").toLowerCase()
            return (
              normItem === normSource || normItem.startsWith(normSource + "/")
            )
          }).length

      totalCount += count
      if (!isInsideScannedRoot && !matchedFolder && count === 0) {
        allScanned = false
      }
    }

    const names = selectedSources.map((s) => {
      const match = libraryFolders.find(
        (f) =>
          f.path.replace(/\\/g, "/").toLowerCase().replace(/\/+$/, "") ===
          s.replace(/\\/g, "/").toLowerCase().replace(/\/+$/, "")
      )
      return match?.name || s.split(/[\\/]/).pop() || s
    })

    return {
      label: `${selectedSources.length} Folders Selected`,
      subtitle:
        names.slice(0, 3).join(", ") +
        (names.length > 3 ? ` +${names.length - 3}` : ""),
      isScanned: allScanned,
      itemCount: totalCount,
    }
  }, [selectedSources, libraryFolders, settings.folders.roots, items])


  return (
    <>
      <div className="flex h-full min-h-125 max-h-[calc(100vh-8rem)] w-full min-w-0 flex-1 flex-col items-stretch gap-4 font-sans text-xs select-none md:flex-row">
        {/* Left Column: Organization Configuration Panel */}
        <div className="flex h-full max-h-full w-full shrink-0 flex-col md:w-80">
          <Card className="flex h-full max-h-full min-h-0 shrink-0 flex-col border-border bg-card/65 shadow-sm py-0 gap-0">
            <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              {/* Top Helper Header with Dialog Link */}
              <div className="mb-2 flex items-center justify-between border-b border-border pb-2">
                <span className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <SlidersHorizontal className="size-4 text-primary" />
                  Organization Settings
                </span>
                <Button
                  variant="ghost"
                  size="xs"
                  className="h-6 cursor-pointer gap-1 rounded-md px-2 text-xs text-muted-foreground hover:text-primary"
                  onClick={() => setShowHelpDialog(true)}
                >
                  <Info className="size-4" />
                  How it works
                </Button>
              </div>

              {/* Source Directory / Scope Selector with Searchable Dialog */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">
                  Source Folder to Organize
                </Label>

                <SearchableFolderDialog
                  selectedSources={selectedSources}
                  onSelectSources={handleSourcesChange}
                  libraryFolders={libraryFolders}
                  allMediaCount={items.length}
                />

                {!currentSourceInfo.isScanned && selectedSources.length > 0 && (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs">
                    <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                      <ShieldAlert className="size-3.5 shrink-0" />
                      <span className="font-medium">Folder not indexed</span>
                    </div>
                    <Button
                      variant="outline"
                      size="xs"
                      className="h-6 gap-1 border-amber-500/30 bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-500/30"
                      onClick={handleScanCurrentSource}
                      disabled={isScanning}
                    >
                      {isScanning ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <ScanSearch className="size-3" />
                      )}
                      Scan Now
                    </Button>
                  </div>
                )}
              </div>

              {/* Destination Path Selector */}
              <div className="space-y-2">
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
                    size="sm"
                    className="shrink-0 h-8"
                    onClick={handleSelectDest}
                  >
                    <FolderPlus className="mr-1 size-3.5" />
                    Browse
                  </Button>
                </div>
              </div>

              {/* Pattern Input and Presets */}
              <div className="space-y-2">
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
                        size="xs"
                        className={cn(
                          "rounded-md text-xs",
                          pattern === preset.value
                            ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                            : "bg-background hover:bg-accent"
                        )}
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
              <div className="space-y-2">
                <Label className="flex items-center gap-1 text-xs font-semibold text-foreground">
                  <Info className="size-3.5 text-muted-foreground" />
                  Target Path Example
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
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/10 p-3">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="preserve-switch"
                    className="cursor-pointer text-xs font-semibold text-foreground"
                  >
                    Copy instead of Move
                  </Label>
                  <p className="text-xs leading-snug text-muted-foreground">
                    Keep original files in source folder
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
                disabled={
                  isPlanning ||
                  isExecuting ||
                  !destination ||
                  selectedSources.length === 0
                }
              >
                {isPlanning ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
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
        <div className="flex h-full max-h-full min-h-0 min-w-0 flex-1 flex-col">
          {/* State 1: Executing Progress */}
          {isExecuting && progress && (
            <Card className="flex h-full min-h-0 flex-1 flex-col justify-center border-border bg-card/65 p-8 shadow-sm">
              <div className="mx-auto w-full max-w-md space-y-6 text-center">
                <div className="mx-auto flex h-14 w-14 animate-pulse items-center justify-center rounded-full bg-primary/10 p-4 text-primary">
                  <Loader2 className="h-7 w-7 animate-spin" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    Executing File Organization
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Moving or copying files to their designated date structures.
                    Please do not close the application.
                  </p>
                </div>
                <div className="space-y-3 rounded-lg border border-border bg-background/50 p-4 shadow-inner">
                  <div className="flex justify-between text-xs font-semibold">
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
                    className="truncate text-left text-xs text-muted-foreground"
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
            <Card className="flex h-full min-h-0 flex-1 flex-col items-center justify-center border-border bg-card/65 p-8 shadow-sm">
              <div className="mx-auto w-full max-w-md space-y-4 text-center">
                <div className="mx-auto flex h-14 w-14 animate-spin items-center justify-center rounded-full bg-muted p-4 text-muted-foreground">
                  <Loader2 className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-foreground">
                    Analyzing Exif Metadata & Planning
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Reading media dates, resolving filename collisions, and mapping target folders...
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* State 3: Empty state when no preview generated */}
          {!isExecuting && !isPlanning && previewItems.length === 0 && (
            <Card className="flex h-full min-h-0 flex-1 flex-col items-center justify-center border-border bg-card/65 p-8 shadow-sm">
              <div className="mx-auto w-full max-w-md space-y-4 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted p-4 text-muted-foreground">
                  <FolderOpen className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-foreground">
                    No Preview Generated
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Choose your <strong>Source Folder</strong> and <strong>Destination Directory</strong> on the left, then click <strong>Preview Organization</strong> to generate a complete visual plan.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* State 4: Preview items loaded */}
          {!isExecuting && !isPlanning && previewItems.length > 0 && (
            <Card className="flex h-full max-h-full min-h-0 min-w-0 flex-1 flex-col border-border bg-card/65 shadow-sm py-0 gap-0">
              {/* Header with Stats and Metrics */}
              <CardHeader className="flex shrink-0 flex-col gap-3 border-b border-border px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xs font-semibold text-foreground">
                      <Play className="size-4 fill-current text-primary" />
                      Organization Preview Plan
                    </CardTitle>
                    <CardDescription className="mt-0.5 text-xs text-muted-foreground">
                      Review proposed file migrations from source to destination.
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    {conflictCount > 0 ? (
                      <Badge
                        variant="destructive"
                        className="flex shrink-0 items-center gap-1 px-2 py-0.5 text-xs"
                      >
                        <ShieldAlert className="h-3 w-3" />
                        {conflictCount} conflicts
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="flex shrink-0 items-center gap-1 border-green-500/20 bg-green-500/5 px-2 py-0.5 text-xs text-green-500"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        All ready
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Summary Info Strip */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border/70 bg-background/50 px-3 py-2 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-muted-foreground">Source:</span>
                    <span className="font-semibold text-foreground truncate max-w-48" title={currentSourceInfo.subtitle}>
                      {currentSourceInfo.label}
                    </span>
                  </div>
                  <ArrowRight className="size-3 text-muted-foreground/60 shrink-0" />
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-muted-foreground">Destination:</span>
                    <span className="font-semibold text-foreground truncate max-w-48" title={destination}>
                      {destination.split(/[\\/]/).pop() || destination}
                    </span>
                  </div>
                  <div className="ml-auto flex items-center gap-3 text-muted-foreground">
                    <span>
                      <strong>{allFolderPaths.length}</strong> folders
                    </span>
                    <span>•</span>
                    <span>
                      <strong>{previewItems.length}</strong> files (
                      <span className="tabular-nums">{formatBytes(totalBytesPlanned)}</span>)
                    </span>
                  </div>
                </div>

                {/* Toolbar: Search & Filters */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  {/* Left: Search input */}
                  <div className="relative min-w-48 flex-1 max-w-xs">
                    <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search files or folders..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 pl-8 pr-8 text-xs border-border bg-background/50"
                    />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="xs"
                        className="absolute right-1 top-1 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => setSearchQuery("")}
                      >
                        <X className="size-3" />
                      </Button>
                    )}
                  </div>

                  {/* Right: Filter Pills */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant={typeFilter === "all" ? "secondary" : "ghost"}
                      size="xs"
                      className="h-7 text-xs"
                      onClick={() => setTypeFilter("all")}
                    >
                      All ({previewItems.length})
                    </Button>
                    {conflictCount > 0 && (
                      <Button
                        variant={typeFilter === "conflicts" ? "destructive" : "ghost"}
                        size="xs"
                        className="h-7 text-xs"
                        onClick={() => setTypeFilter("conflicts")}
                      >
                        Conflicts ({conflictCount})
                      </Button>
                    )}
                    <Button
                      variant={typeFilter === "photos" ? "secondary" : "ghost"}
                      size="xs"
                      className="h-7 text-xs"
                      onClick={() => setTypeFilter("photos")}
                    >
                      Photos ({photosCount})
                    </Button>
                    <Button
                      variant={typeFilter === "videos" ? "secondary" : "ghost"}
                      size="xs"
                      className="h-7 text-xs"
                      onClick={() => setTypeFilter("videos")}
                    >
                      Videos ({videosCount})
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Main Content: Tree View */}
              <CardContent className="min-h-0 flex-1 border-b border-border bg-muted/5 p-0 overflow-hidden">
                {filteredPreviewItems.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
                    <Search className="size-6 text-muted-foreground/60" />
                    <span className="font-semibold text-foreground">No matching files</span>
                    <span className="text-xs">No files match your current filter or search query.</span>
                    <Button
                      variant="outline"
                      size="xs"
                      className="mt-2"
                      onClick={() => {
                        setSearchQuery("")
                        setTypeFilter("all")
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                ) : (
                  <OrganizeFolderTreeView
                    folderTree={folderTree}
                    itemMap={itemMap}
                    onPreview={(item) => setPreviewItem(item)}
                    allFolderPaths={allFolderPaths}
                  />
                )}
              </CardContent>

              {/* Footer Actions */}
              <CardFooter className="flex shrink-0 justify-between gap-3 bg-muted/10 p-4">
                <div className="text-xs text-muted-foreground">
                  {preserveOriginals ? "Mode: Copying files" : "Mode: Moving files"} into date subfolders
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => setPreviewItems([])}
                  >
                    Cancel Plan
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="h-8 gap-2 bg-primary hover:bg-primary/95"
                    onClick={handleExecute}
                  >
                    <Play className="size-3.5 fill-current" />
                    Apply Organization Changes
                  </Button>
                </div>
              </CardFooter>
            </Card>
          )}
        </div>
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
              Learn how Galleo accurately detects media dates and organizes your folders.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs leading-relaxed">
            <div className="space-y-1">
              <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs">EXIF</Badge>
                1. Exif Date Extraction
              </h4>
              <p className="text-muted-foreground">
                Galleo extracts the exact capture timestamp embedded inside photo/video EXIF metadata written by cameras, phones, and drones.
              </p>
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                <Badge variant="outline" className="border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs">Name</Badge>
                2. Filename Date Parsing
              </h4>
              <p className="text-muted-foreground">
                If EXIF is absent, Galleo scans the filename for structured date formats (e.g. YYYYMMDD, WhatsApp dates, or Unix timestamps).
              </p>
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs">File</Badge>
                3. System File Dates (Fallback)
              </h4>
              <p className="text-muted-foreground">
                As a fallback, Galleo uses the file system creation or last modification timestamp.
              </p>
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-foreground">
                4. Custom Folder Patterns
              </h4>
              <p className="text-muted-foreground">
                Files are neatly filed into your chosen subfolder pattern (e.g.{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-primary">
                  YYYY/MM - MMMM/
                </code>{" "}
                creates folders like{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-primary">
                  2026/06 - June/
                </code>
                ).
              </p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="default" size="sm">
                Got it
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
