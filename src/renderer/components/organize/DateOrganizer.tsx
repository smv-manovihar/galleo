import React, { useState } from 'react';
import { useMediaStore } from '../../stores/media-store';
import { useSettingsStore } from '../../stores/settings-store';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
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
  ChevronRight
} from 'lucide-react';
import type { OrganizePreviewItem, OrganizeProgressPayload } from '../../../shared/types/ipc';
import { cn } from "@/lib/utils";
import { MediaPreview } from '../media/MediaPreview';
import type { MediaItem } from '../../../shared/types/media';

interface FolderNode {
  name: string;
  path: string;
  subfolders: Map<string, FolderNode>;
  files: OrganizePreviewItem[];
}

const buildFolderTree = (items: OrganizePreviewItem[]): FolderNode => {
  const root: FolderNode = {
    name: 'Root',
    path: '',
    subfolders: new Map(),
    files: []
  };

  for (const item of items) {
    const relPath = item.relativePath || '';
    const segments = relPath.split(/[\\/]/).filter(Boolean);
    
    let current = root;
    let currentPath = '';
    // Exclude the last segment (the filename) to prevent making folders out of filenames
    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i];
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      if (!current.subfolders.has(segment)) {
        current.subfolders.set(segment, {
          name: segment,
          path: currentPath,
          subfolders: new Map(),
          files: []
        });
      }
      current = current.subfolders.get(segment)!;
    }
    current.files.push(item);
  }
  return root;
};

const getAllFolderPaths = (node: FolderNode): string[] => {
  const paths: string[] = [];
  if (node.path !== '') {
    paths.push(node.path);
  }
  for (const sub of node.subfolders.values()) {
    paths.push(...getAllFolderPaths(sub));
  }
  return paths;
};

interface CustomTreeFolderProps {
  node: FolderNode;
  depth: number;
  renderFile: (item: OrganizePreviewItem) => React.ReactNode;
}

const CustomTreeFolder: React.FC<CustomTreeFolderProps> = ({ 
  node, 
  depth, 
  renderFile 
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(prev => !prev);
  };

  const subfolders = Array.from(node.subfolders.values());

  return (
    <div className="flex flex-col gap-0.5">
      {/* Folder Row */}
      <div 
        onClick={handleToggle}
        className="flex items-center gap-1.5 py-1 px-2 hover:bg-accent/40 rounded-md cursor-pointer select-none text-xs text-foreground font-medium min-w-0 transition-colors"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <ChevronRight className={cn(
          "size-3 text-muted-foreground/75 transition-transform duration-150 shrink-0",
          isExpanded && "rotate-90"
        )} />
        {isExpanded ? (
          <FolderOpen className="size-3.5 text-amber-500 fill-amber-500/10 shrink-0" />
        ) : (
          <FolderOpen className="size-3.5 text-amber-500 fill-amber-500/5 shrink-0" />
        )}
        <span className="truncate">{node.name}</span>
      </div>

      {/* Sub-items Container (Lazy-rendered) */}
      {isExpanded && (
        <div className="flex flex-col gap-0.5">
          {subfolders.map(sub => (
            <CustomTreeFolder 
              key={sub.path} 
              node={sub} 
              depth={depth + 1} 
              renderFile={renderFile} 
            />
          ))}
          {node.files.map(renderFile).map((fileEl, idx) => (
            <div key={idx} style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}>
              {fileEl}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const PRESETS = [
  { label: 'Year/Month', value: 'YYYY/MM/' },
  { label: 'Year/Month Name', value: 'YYYY/MM - MMMM/' },
  { label: 'Year/Full Date', value: 'YYYY/YYYY-MM-DD/' },
  { label: 'Year/Month/Day', value: 'YYYY/MM/DD/' }
];

const getPatternPreview = (patternStr: string) => {
  if (!patternStr) return '';
  // Basic replacements using a static date of June 28, 2026
  let preview = patternStr;
  preview = preview.replace(/YYYY/g, '2026');
  preview = preview.replace(/MMMM/g, 'June');
  preview = preview.replace(/MM/g, '06');
  preview = preview.replace(/DD/g, '28');
  
  return preview + (preview.endsWith('/') ? '' : '/') + 'example_media.jpg';
};

const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'tiff'].includes(ext || '')) {
    return <Image className="w-3.5 h-3.5 text-blue-500/70" />;
  }
  if (['mp4', 'mov', 'avi', 'mkv', 'webm', '3gp'].includes(ext || '')) {
    return <Video className="w-3.5 h-3.5 text-purple-500/70" />;
  }
  return <FileText className="w-3.5 h-3.5 text-muted-foreground/70" />;
};

export const DateOrganizer: React.FC = () => {
  const { activeRootPath, items } = useMediaStore();
  const { settings, saveSettings } = useSettingsStore();

  const [destination, setDestination] = useState(settings.folders.destination || '');
  const [pattern, setPattern] = useState(settings.organization.folderPattern || 'YYYY/MM - MMMM/');
  const [preserveOriginals, setPreserveOriginals] = useState(settings.organization.preserveOriginals || false);
  
  const [previewItems, setPreviewItems] = useState<OrganizePreviewItem[]>([]);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [progress, setProgress] = useState<OrganizeProgressPayload | null>(null);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [showHelpDialog, setShowHelpDialog] = useState(false);

  const handleSelectDest = async () => {
    try {
      const selected = await window.api.selectFolder();
      if (selected) {
        setDestination(selected);
        // Persist destination settings
        await saveSettings({
          ...settings,
          folders: {
            ...settings.folders,
            destination: selected
          }
        });
      }
    } catch (e) {
      console.error('Folder picker select failed:', e);
    }
  };

  const handlePreview = async () => {
    if (!activeRootPath || !destination || !pattern) return;
    setIsPlanning(true);
    setPreviewItems([]);
    try {
      const res = await window.api.previewOrganization(activeRootPath, destination, pattern);
      if (res.ok) {
        setPreviewItems(res.data);
      }
    } catch (e) {
      console.error('Organization planning failed:', e);
    } finally {
      setIsPlanning(false);
    }
  };

  const handleExecute = async () => {
    if (previewItems.length === 0) return;
    setIsExecuting(true);
    setProgress({ processedCount: 0, totalCount: previewItems.length, currentFile: '', success: true });

    const cleanupProgress = window.api.onOrganizeProgress((p) => {
      setProgress(p);
    });

    try {
      await window.api.executeOrganization(activeRootPath!, previewItems, preserveOriginals);
    } catch (e) {
      console.error('Execution failed:', e);
    } finally {
      cleanupProgress();
      setIsExecuting(false);
      setPreviewItems([]); // Reset preview items
    }
  };

  const conflictCount = React.useMemo(() => {
    return previewItems.filter(p => p.conflict).length;
  }, [previewItems]);

  const folderTree = React.useMemo(() => {
    return buildFolderTree(previewItems);
  }, [previewItems]);

  const renderFile = React.useCallback((item: OrganizePreviewItem): React.ReactNode => {
    const filename = item.sourcePath.split(/[\\/]/).pop() || '';
    return (
      <div 
        className="flex items-center justify-between py-1 px-2 hover:bg-accent/40 rounded-md select-none text-xs min-w-0 group/file cursor-pointer transition-colors"
        onClick={() => {
          const mediaItem = items.find(i => i.id === item.mediaId);
          if (mediaItem) setPreviewItem(mediaItem);
        }}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {getFileIcon(filename)}
          <span className="font-medium text-foreground truncate select-text flex-1 min-w-0" title={filename}>
            {filename}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 pl-2">
          <Button
            variant="ghost"
            size="xs"
            className="h-5 w-5 p-0 opacity-0 group-hover/file:opacity-100 transition-opacity text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              const mediaItem = items.find(i => i.id === item.mediaId);
              if (mediaItem) setPreviewItem(mediaItem);
            }}
          >
            <Eye className="w-3 h-3" />
          </Button>
          {item.conflict && (
            item.conflictReason === 'duplicate_source' ? (
              preserveOriginals ? (
                <Badge variant="secondary" className="text-3xs uppercase tracking-wider px-1.5 py-0 bg-muted text-muted-foreground border border-border">
                  Duplicate (Skipped)
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-3xs uppercase tracking-wider px-1.5 py-0 bg-amber-500 hover:bg-amber-600 border border-amber-600/30 text-white">
                  Duplicate (Trashed)
                </Badge>
              )
            ) : (
              <Badge variant="destructive" className="text-3xs uppercase tracking-wider px-1.5 py-0 bg-destructive/80">
                File Exists
              </Badge>
            )
          )}
        </div>
      </div>
    );
  }, [items]);

  return (
    <>
      {/* Left Column: Configuration Form */}
      <div className="w-full lg:w-80 shrink-0 flex flex-col gap-4 pr-1">
        <Card className="border-border bg-card/65 shadow-sm flex flex-col shrink-0">
          <CardContent className="p-4 space-y-4 pt-5">
            {/* Top Helper Header with Dialog Link */}
            <div className="flex justify-between items-center border-b border-border pb-2 mb-2">
              <span className="font-semibold text-foreground text-xs uppercase tracking-wider">Settings</span>
              <Button
                variant="ghost"
                size="xs"
                className="h-6 gap-1 text-xs text-muted-foreground hover:text-primary px-1.5 cursor-pointer rounded-md"
                onClick={() => setShowHelpDialog(true)}
              >
                <Info className="w-3.5 h-3.5" />
                How it works
              </Button>
            </div>

            {/* Destination Path Selector */}
            <div className="space-y-1.5">
              <Label className="font-semibold text-foreground text-xs">Destination Directory</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  readOnly
                  placeholder="Select output folder..."
                  value={destination}
                  className="flex-1 h-8 bg-background/50 border-border text-xs truncate"
                />
                <Button variant="outline" size="lg" className="shrink-0" onClick={handleSelectDest}>
                  <FolderPlus className="w-3.5 h-3.5 mr-1" />
                  Browse
                </Button>
              </div>
            </div>

            {/* Pattern Input and Presets */}
            <div className="space-y-1.5">
              <Label className="font-semibold text-foreground text-xs">Subfolder Naming Pattern</Label>
              <Input
                type="text"
                value={pattern}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPattern(e.target.value)}
                placeholder="e.g. YYYY/MM/"
                className="h-8 bg-background/50 border-border text-xs font-mono"
              />
              
              {/* Pattern Presets list */}
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Quick Presets:</span>
                <div className="flex flex-wrap gap-1">
                  {PRESETS.map((preset) => (
                    <Button
                      key={preset.value}
                      type="button"
                      variant="outline"
                      size="sm"
                      className={`rounded-md ${pattern === preset.value ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20' : 'bg-background hover:bg-accent'}`}
                      onClick={() => setPattern(preset.value)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Tokens: <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-primary">YYYY</code>, <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-primary">MM</code>, <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-primary">MMMM</code>, <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-primary">DD</code>
              </p>
            </div>

            {/* Dynamic Preview path */}
            <div className="space-y-1.5">
              <Label className="font-semibold text-foreground text-xs flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-muted-foreground" />
                Example Destination Path
              </Label>
              <div className="bg-background/80 p-2.5 rounded-lg border border-border font-mono text-xs overflow-x-auto whitespace-nowrap shadow-inner">
                <span className="text-muted-foreground">{destination ? (destination.split(/[\\/]/).pop() || destination) : 'Destination'}</span>
                <span className="text-muted-foreground/40">/</span>
                <span className="text-primary font-semibold">{getPatternPreview(pattern)}</span>
              </div>
            </div>

            {/* Preserves originals copy vs move */}
            <div className="flex items-center justify-between border border-border rounded-lg p-2.5 bg-muted/10">
              <div className="space-y-0.5">
                <Label htmlFor="preserve-switch" className="font-semibold text-foreground text-xs cursor-pointer">Copy instead of Move</Label>
                <p className="text-xs text-muted-foreground leading-snug mt-0.5">Keep original files in current folder</p>
              </div>
              <Switch
                id="preserve-switch"
                checked={preserveOriginals}
                onCheckedChange={(val: boolean) => {
                  setPreserveOriginals(val);
                  saveSettings({
                    ...settings,
                    organization: {
                      ...settings.organization,
                      preserveOriginals: val
                    }
                  });
                }}
              />
            </div>
          </CardContent>

          <CardFooter className="p-4 border-t border-border bg-muted/10 flex justify-end shrink-0">
            <Button
              className="w-full px-4 py-2 font-medium h-8 text-xs cursor-pointer bg-primary text-primary-foreground hover:bg-primary/95 transition-colors"
              onClick={handlePreview}
              disabled={isPlanning || isExecuting || !destination}
            >
              {isPlanning ? (
                <span className="flex items-center gap-1.5 justify-center">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Analyzing Target Paths...
                </span>
              ) : 'Preview Organization'}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Right Column: Dynamic Preview / State Container */}
      <div className="flex-1 min-h-0 flex flex-col min-w-0">
        {/* State 1: Executing Progress */}
        {isExecuting && progress && (
          <Card className="flex-1 min-h-0 flex flex-col border-border bg-card/65 shadow-sm justify-center p-8">
            <div className="max-w-md mx-auto w-full space-y-6 text-center">
              <div className="p-4 bg-primary/10 rounded-full w-14 h-14 flex items-center justify-center mx-auto text-primary animate-pulse">
                <Loader2 className="w-7 h-7 animate-spin" />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Executing File Transitions</h3>
                <p className="text-xs text-muted-foreground">
                  Moving or copying files to their designated structures. Please do not close the application.
                </p>
              </div>
              <div className="space-y-3 bg-background/50 border border-border p-4 rounded-lg shadow-inner">
                <div className="flex justify-between font-semibold text-[0.6875rem]">
                  <span className="text-primary">Processed Files</span>
                  <span>{progress.processedCount} / {progress.totalCount} ({Math.round((progress.processedCount / progress.totalCount) * 100)}%)</span>
                </div>
                <Progress value={(progress.processedCount / progress.totalCount) * 100} className="h-2 bg-muted rounded-full" />
                <div className="text-2xs text-muted-foreground truncate text-left" title={progress.currentFile}>
                  {progress.currentFile || 'Initializing first file...'}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* State 2: Planning (Loading Preview) */}
        {!isExecuting && isPlanning && (
          <Card className="flex-1 min-h-0 flex flex-col border-border bg-card/65 shadow-sm justify-center items-center p-8">
            <div className="max-w-md mx-auto w-full space-y-4 text-center">
              <div className="p-4 bg-muted rounded-full w-14 h-14 flex items-center justify-center mx-auto text-muted-foreground animate-spin">
                <Loader2 className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">Analyzing Folders & Exif</h3>
                <p className="text-xs text-muted-foreground">
                  Scanning your folder to construct the organization plan...
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* State 3: Empty state when no preview generated */}
        {!isExecuting && !isPlanning && previewItems.length === 0 && (
          <Card className="flex-1 min-h-0 flex flex-col border-border bg-card/65 shadow-sm justify-center items-center p-8">
            <div className="max-w-md mx-auto w-full space-y-4 text-center">
              <div className="p-4 bg-muted rounded-full w-14 h-14 flex items-center justify-center mx-auto text-muted-foreground">
                <FolderOpen className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">No Preview Generated</h3>
                <p className="text-xs text-muted-foreground">
                  Select a destination directory and naming pattern on the left, then click <strong>Preview Organization</strong> to generate a plan of action.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* State 4: Preview items loaded */}
        {!isExecuting && !isPlanning && previewItems.length > 0 && (
          <Card className="flex-1 min-h-0 flex flex-col border-border bg-card/65 shadow-sm min-w-0">
            <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between shrink-0">
              <div>
                <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-primary fill-current" />
                  Organize Preview Plan
                </CardTitle>
                <CardDescription className="text-2xs text-muted-foreground mt-0.5">
                  Review proposed file modifications. <strong>{previewItems.length}</strong> items scheduled.
                </CardDescription>
              </div>
              {conflictCount > 0 ? (
                <Badge variant="destructive" className="px-2 py-0.5 text-[0.5625rem] gap-1 flex items-center shrink-0 animate-pulse">
                  <ShieldAlert className="w-3 h-3" />
                  {conflictCount} conflicts
                </Badge>
              ) : (
                <Badge variant="outline" className="px-2 py-0.5 text-[0.5625rem] gap-1 flex items-center shrink-0 bg-green-500/5 text-green-500 border-green-500/20">
                  <CheckCircle2 className="w-3 h-3" />
                  All ready
                </Badge>
              )}
            </CardHeader>

            {/* Table Content is Scrollable Internally */}
            <CardContent className="flex-1 min-h-0 p-2 border-b border-border bg-muted/5 overflow-y-auto scrollbar-thin">
              <div className="w-full flex flex-col gap-0.5">
                {Array.from(folderTree.subfolders.values()).map(sub => (
                  <CustomTreeFolder 
                    key={sub.path} 
                    node={sub} 
                    depth={0} 
                    renderFile={renderFile} 
                  />
                ))}
                {folderTree.files.map(renderFile)}
              </div>
            </CardContent>

            <CardFooter className="flex justify-end p-4 gap-3 bg-muted/10 shrink-0">
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
                <Play className="w-3.5 h-3.5 fill-current" />
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
        <DialogContent className="max-w-md bg-card/95 border-border backdrop-blur-md text-foreground font-sans text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              How Date Organization Works
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Learn how Galleo automatically structures and names your folders.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 py-2 leading-relaxed text-xs">
            <div className="space-y-1">
              <h4 className="font-semibold text-foreground">1. Exif Date Extraction</h4>
              <p className="text-muted-foreground">
                Galleo first attempts to read the precise capture date from the file's embedded EXIF metadata (metadata written by cameras and phones when the photo or video was taken).
              </p>
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-foreground">2. Filename Date Parsing</h4>
              <p className="text-muted-foreground">
                If the EXIF metadata is missing, Galleo scans the filename for structured date formats (such as YYYY-MM-DD or Unix timestamps).
              </p>
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-foreground">3. System File Dates (Fallback)</h4>
              <p className="text-muted-foreground">
                As a final fallback, Galleo uses the file's system creation date or last modification date as the target organization date.
              </p>
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-foreground">4. Pattern Subfolders</h4>
              <p className="text-muted-foreground">
                Once the date is determined, the file is moved or copied to a folder matching your naming pattern (e.g. <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-primary">YYYY/MM - MMMM/</code> will organize files into folders like <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-primary">2026/06 - June/</code>).
              </p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button
                variant="default"
                size="lg"
              >
                Got it
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
