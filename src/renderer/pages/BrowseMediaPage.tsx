import React, { useState, useEffect } from 'react';
import { useMediaStore } from '../stores/media-store';
import { useSessionStore } from '../stores/session-store';
import { useScanStore } from '../stores/scan-store';
import { useSettingsStore } from '../stores/settings-store';
import { FolderNotScanned } from '../components/media/FolderNotScanned';
import { MediaGrid } from '../components/media/MediaGrid';
import { MediaTimeline } from '../components/media/MediaTimeline';
import { MediaList } from '../components/media/MediaList';
import { MediaPreview } from '../components/media/MediaPreview';
import { MediaInfoDialog } from '../components/media/MediaInfoDialog';
import type { MediaItem } from '../../shared/types/media';
import { Button } from '@/components/ui/button';
import { PageContainer } from '@/components/ui/page-layout';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Grid, 
  List, 
  CalendarDays,
  CheckCircle2,
  Trash2,
  Layers,
  InboxIcon,
  Clock,
  Bookmark,
  AlertCircle,
} from 'lucide-react';
import { formatBytes } from '../lib/format';

export const BrowseMediaPage: React.FC = () => {
  const items = useMediaStore((s) => s.items);
  const activeRootPath = useMediaStore((s) => s.activeRootPath);
  const isScanning = useScanStore((s) => s.isScanning);
  const filterType = useMediaStore((s) => s.filterType);
  const setFilterType = useMediaStore((s) => s.setFilterType);
  const filterReviewState = useMediaStore((s) => s.filterReviewState);
  const setFilterReviewState = useMediaStore((s) => s.setFilterReviewState);
  const filterQuality = useMediaStore((s) => s.filterQuality);
  const setFilterQuality = useMediaStore((s) => s.setFilterQuality);
  const sortBy = useMediaStore((s) => s.sortBy);
  const setSortBy = useMediaStore((s) => s.setSortBy);
  const searchQuery = useMediaStore((s) => s.searchQuery);
  const getFilteredItems = useMediaStore((s) => s.getFilteredItems);

  const { settings } = useSettingsStore();


  const isScanned = React.useMemo(() => {
    if (!activeRootPath) return false;
    if (activeRootPath === "all") {
      return settings.folders.roots.some((r) => r.scanned);
    }
    return !!settings.folders.roots.find(
      (r) => r.path.toLowerCase() === activeRootPath.toLowerCase()
    )?.scanned;
  }, [activeRootPath, settings.folders.roots]);

  const { initSession, submitDecision, commitDeletions, decisions, isCommitting } = useSessionStore();

  const [layoutMode, setLayoutMode] = useState<'card' | 'list'>('card');
  const [groupMode, setGroupMode] = useState<'normal' | 'date'>('normal');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [infoItem, setInfoItem] = useState<MediaItem | null>(null);
  const [showCommitConfirm, setShowCommitConfirm] = useState(false);

  const deleteDetails = React.useMemo(() => {
    let count = 0;
    let size = 0;
    const itemMap = new Map(items.map(i => [i.id, i]));
    for (const [mediaId, state] of Object.entries(decisions)) {
      if (state === 'delete') {
        count++;
        const item = itemMap.get(mediaId);
        if (item) {
          size += item.size;
        }
      }
    }
    return { count, size };
  }, [decisions, items]);

  // Initialize review session when activeRootPath changes or is loaded
  useEffect(() => {
    if (isScanning) return;
    if (activeRootPath && items.length > 0) {
      initSession(activeRootPath, items.length);
    }
  }, [activeRootPath, items.length, isScanning, initSession]);

  const filteredItems = React.useMemo(() => {
    return getFilteredItems();
  }, [items, searchQuery, filterType, filterReviewState, filterQuality, sortBy]);

  const handleSelectToggle = React.useCallback((id: string, _e: React.MouseEvent) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleReviewAction = React.useCallback(async (mediaId: string, state: 'keep' | 'delete' | 'skipped', batchId?: string) => {
    const item = items.find(i => i.id === mediaId);
    if (item) {
      await submitDecision(mediaId, state, item, 'browse', batchId);
      // Refresh items list local states
      item.reviewState = state;
    }
  }, [items, submitDecision]);

  const handleSelectAll = React.useCallback(() => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(i => i.id)));
    }
  }, [selectedIds.size, filteredItems]);

  const handleBatchReviewAction = React.useCallback(async (state: 'keep' | 'delete' | 'skipped') => {
    const batchId = `batch_browse_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    for (const id of selectedIds) {
      await handleReviewAction(id, state, batchId);
    }
    setSelectedIds(new Set());
  }, [selectedIds, handleReviewAction]);

  const handleSetPreviewItem = React.useCallback((item: MediaItem) => setPreviewItem(item), []);
  const handleSetInfoItem = React.useCallback((item: MediaItem) => setInfoItem(item), []);

  if (!activeRootPath) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground font-sans text-xs gap-2 select-none">
        <span>Please select a folder from the sidebar directory listing to begin.</span>
      </div>
    );
  }

  if (!isScanned) {
    return (
      <PageContainer className="h-full select-none" maxWidth="xl">
        <FolderNotScanned activeRootPath={activeRootPath} featureDescription="and access the catalog" />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="h-full select-none" maxWidth="full">
      {/* Filters & Toolbar Header */}
      <div className="flex flex-wrap items-center justify-between border border-border bg-card/45 backdrop-blur-md px-4 py-2.5 rounded-lg shrink-0 gap-2">
        {/* Left Side: Type and Quality Filters */}
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <Tabs value={filterType} onValueChange={(val: string) => setFilterType(val as any)}>
            <TabsList className="bg-background border border-border h-8 p-0.5 rounded-lg">
              <TabsTrigger value="all" className="h-7 text-xs rounded-md font-medium px-3">All</TabsTrigger>
              <TabsTrigger value="photo" className="h-7 text-xs rounded-md font-medium px-3">Photos</TabsTrigger>
              <TabsTrigger value="video" className="h-7 text-xs rounded-md font-medium px-3">Videos</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Review State Tabs (All, Pending, Kept, To Delete) */}
          <Tabs value={filterReviewState} onValueChange={(val: string) => setFilterReviewState(val as any)}>
            <TabsList className="bg-background border border-border h-8 p-0.5 rounded-lg">
              <TabsTrigger value="all" className="h-7 text-xs rounded-md font-medium px-2.5 flex items-center gap-1.5" title="All Items">
                <InboxIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">All</span>
              </TabsTrigger>
              <TabsTrigger value="pending" className="h-7 text-xs rounded-md font-medium px-2.5 flex items-center gap-1.5" title="Pending Review">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Pending</span>
              </TabsTrigger>
              <TabsTrigger value="kept" className="h-7 text-xs rounded-md font-medium px-2.5 flex items-center gap-1.5" title="Marked to Keep">
                <Bookmark className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Kept</span>
                {items.filter(i => i.reviewState === 'keep').length > 0 && (
                  <Badge variant="outline" className="h-4 min-w-4 px-1 flex items-center justify-center text-xs bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400">
                    {items.filter(i => i.reviewState === 'keep').length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="trash" className="h-7 text-xs rounded-md font-medium px-2.5 flex items-center gap-1.5" title="Marked to Delete">
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">To Delete</span>
                {items.filter(i => i.reviewState === 'delete').length > 0 && (
                  <Badge variant="outline" className="h-4 min-w-4 px-1 flex items-center justify-center text-xs bg-destructive/10 border-destructive/20 text-destructive">
                    {items.filter(i => i.reviewState === 'delete').length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Quality Filters Dropdown Select */}
          <Select value={filterQuality} onValueChange={(val: any) => setFilterQuality(val)}>
            <SelectTrigger className="h-8 w-auto min-w-32 border border-border bg-background hover:bg-accent text-foreground text-xs font-medium rounded-lg px-2.5">
              <SelectValue placeholder="Quality Features" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Quality Features</SelectItem>
              <SelectItem value="duplicates">Duplicates</SelectItem>
              <SelectItem value="blurry">Blurry Photos</SelectItem>
              <SelectItem value="screenshots">Screenshots</SelectItem>
              <SelectItem value="dark">Dark Photos</SelectItem>
              <SelectItem value="small">Small Files</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Right Side: Sorting & Layout Toggles */}
        <div className="flex items-center gap-2 shrink-0">
          <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
            <SelectTrigger className="h-8 w-auto min-w-28 max-w-40 border border-border bg-background hover:bg-accent text-foreground text-xs font-medium rounded-lg px-2.5">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Newest First</SelectItem>
              <SelectItem value="date-asc">Oldest First</SelectItem>
              <SelectItem value="score-desc">Highest Quality</SelectItem>
              <SelectItem value="score-asc">Lowest Quality</SelectItem>
              <SelectItem value="size-desc">Largest Size</SelectItem>
            </SelectContent>
          </Select>

          {/* Layout Mode Toggle: Card vs List */}
          <Tabs value={layoutMode} onValueChange={(val: string) => setLayoutMode(val as any)}>
            <TabsList className="bg-background border border-border h-8 p-0.5 rounded-lg">
              <TabsTrigger value="card" className="h-7 px-2.5 flex items-center justify-center rounded-md gap-1.5 text-xs font-semibold" title="Card Layout">
                <Grid className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Cards</span>
              </TabsTrigger>
              <TabsTrigger value="list" className="h-7 px-2.5 flex items-center justify-center rounded-md gap-1.5 text-xs font-semibold" title="List Layout">
                <List className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">List</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Grouping Mode Toggle: Normal vs Date */}
          <Tabs value={groupMode} onValueChange={(val: string) => setGroupMode(val as any)}>
            <TabsList className="bg-background border border-border h-8 p-0.5 rounded-lg">
              <TabsTrigger value="normal" className="h-7 px-2.5 flex items-center justify-center rounded-md gap-1.5 text-xs font-semibold" title="Normal Sorted View">
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Normal</span>
              </TabsTrigger>
              <TabsTrigger value="date" className="h-7 px-2.5 flex items-center justify-center rounded-md gap-1.5 text-xs font-semibold" title="Date Grouped View">
                <CalendarDays className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Date</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Commit Banner inside To Delete view */}
      {filterReviewState === 'trash' && deleteDetails.count > 0 && (
        <div className="border border-destructive/20 bg-destructive/5 px-4 py-3 rounded-lg shrink-0 flex items-center justify-between gap-4 font-sans text-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 text-destructive dark:text-red-400 font-medium">
            <AlertCircle className="w-4 h-4 animate-pulse" />
            <span>You have <strong>{deleteDetails.count}</strong> files ({formatBytes(deleteDetails.size)}) marked for deletion.</span>
          </div>
          <Button
            variant="destructive"
            size="sm"
            className="h-8 gap-1.5 px-4 cursor-pointer font-semibold"
            onClick={() => setShowCommitConfirm(true)}
            disabled={isCommitting}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Commit Deletions
          </Button>
        </div>
      )}

      {/* Batch Operations Floating Bar (only shown if cards selected) */}
      {selectedIds.size > 0 && (
        <div className="border border-primary/20 bg-primary/5 px-4 py-2.5 rounded-lg shrink-0 flex flex-col sm:flex-row sm:items-center justify-between text-xs font-sans gap-3">
          <div className="flex flex-wrap items-center gap-3 font-medium text-foreground">
            <span>Selected: <strong>{selectedIds.size}</strong> items</span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs rounded text-primary cursor-pointer hover:bg-primary/10" 
              onClick={handleSelectAll}
            >
              {selectedIds.size === filteredItems.length ? 'Deselect All' : 'Select All'}
            </Button>
            <span className="text-muted-foreground/30">|</span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs rounded text-muted-foreground cursor-pointer hover:text-foreground hover:bg-accent" 
              onClick={() => setSelectedIds(new Set())}
            >
              Clear Selection
            </Button>
          </div>
          <div className="flex items-center gap-2 justify-end sm:justify-start w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 border-green-500/20 bg-green-500/10 text-green-600 hover:bg-green-500/20 text-xs flex-1 sm:flex-none justify-center"
              onClick={() => handleBatchReviewAction('keep')}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Mark to Keep
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs flex-1 sm:flex-none justify-center"
              onClick={() => handleBatchReviewAction('delete')}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Mark to Delete
            </Button>
          </div>
        </div>
      )}

      {/* Main browser viewport panels */}
      <div className="flex-1 min-h-0 relative">
        {layoutMode === 'card' && groupMode === 'normal' && (
          <MediaGrid
            items={filteredItems}
            selectedIds={selectedIds}
            onSelectToggle={handleSelectToggle}
            onPreviewOpen={handleSetPreviewItem}
            onInfoOpen={handleSetInfoItem}
            onReviewAction={handleReviewAction}
            columns={4}
          />
        )}
        {layoutMode === 'card' && groupMode === 'date' && (
          <MediaTimeline
            items={filteredItems}
            selectedIds={selectedIds}
            onSelectToggle={handleSelectToggle}
            onPreviewOpen={handleSetPreviewItem}
            onInfoOpen={handleSetInfoItem}
            onReviewAction={handleReviewAction}
          />
        )}
        {layoutMode === 'list' && (
          <MediaList
            items={filteredItems}
            selectedIds={selectedIds}
            onSelectToggle={handleSelectToggle}
            onPreviewOpen={handleSetPreviewItem}
            onReviewAction={handleReviewAction}
            isGrouped={groupMode === 'date'}
          />
        )}
      </div>

      {/* Slide-over Preview dialog modal */}
      <MediaPreview
        item={previewItem}
        onClose={() => setPreviewItem(null)}
        items={filteredItems}
        onItemChange={setPreviewItem}
      />
      <MediaInfoDialog
        item={infoItem}
        onClose={() => setInfoItem(null)}
      />

      {/* Midway Commit Confirmation Dialog */}
      {showCommitConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 text-xs font-sans">
          <div className="w-full max-w-sm border border-border bg-card p-6 rounded-xl shadow-lg select-none text-foreground">
            <div className="text-center pb-4">
              <div className="w-10 h-10 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive mx-auto mb-3">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="font-heading font-bold text-sm text-foreground">Confirm Midway Deletion</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-normal">
                You are about to permanently delete <strong>{deleteDetails.count}</strong> files from this folder, recovering <strong>{formatBytes(deleteDetails.size)}</strong> space.
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <Button 
                variant="outline" 
                className="flex-1 h-9 text-xs" 
                onClick={() => setShowCommitConfirm(false)}
                disabled={isCommitting}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                className="flex-1 h-9 text-xs" 
                onClick={async () => {
                  const deleteIds = Object.entries(decisions)
                    .filter(([_, state]) => state === 'delete')
                    .map(([mediaId]) => mediaId);
                  if (deleteIds.length > 0) {
                    await commitDeletions(deleteIds);
                  }
                  setShowCommitConfirm(false);
                }} 
                disabled={isCommitting}
              >
                {isCommitting ? 'Trashing...' : 'Move to Trash'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
};
