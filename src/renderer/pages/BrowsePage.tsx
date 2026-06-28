import React, { useState, useEffect } from 'react';
import { useMediaStore } from '../stores/media-store';
import { useSessionStore } from '../stores/session-store';
import { MediaGrid } from '../components/media/MediaGrid';
import { MediaTimeline } from '../components/media/MediaTimeline';
import { MediaList } from '../components/media/MediaList';
import { MediaPreview } from '../components/media/MediaPreview';
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
  Trash2
} from 'lucide-react';

export const BrowsePage: React.FC = () => {
  const { 
    items, 
    activeRootPath, 
    filterType, 
    setFilterType, 
    filterQuality, 
    setFilterQuality,
    sortBy,
    setSortBy,
    getFilteredItems 
  } = useMediaStore();

  const { initSession, submitDecision } = useSessionStore();

  const [layoutMode, setLayoutMode] = useState<'card' | 'list'>('card');
  const [groupMode, setGroupMode] = useState<'normal' | 'date'>('normal');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);

  // Initialize review session when activeRootPath changes or is loaded
  useEffect(() => {
    if (activeRootPath && items.length > 0) {
      initSession(activeRootPath, items.length);
    }
  }, [activeRootPath, items.length, initSession]);

  const filteredItems = getFilteredItems();

  const handleSelectToggle = (id: string, _e: React.MouseEvent) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleReviewAction = async (mediaId: string, state: 'keep' | 'delete' | 'skipped') => {
    const item = items.find(i => i.id === mediaId);
    if (item) {
      await submitDecision(mediaId, state, item);
      // Refresh items list local states
      item.reviewState = state;
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(i => i.id)));
    }
  };

  const handleBatchReviewAction = async (state: 'keep' | 'delete' | 'skipped') => {
    for (const id of selectedIds) {
      await handleReviewAction(id, state);
    }
    setSelectedIds(new Set());
  };

  return (
    <PageContainer className="h-full select-none" maxWidth="full">
      {/* Filters & Toolbar Header */}
      <div className="flex items-center justify-between border border-border bg-card/45 backdrop-blur-md px-5 py-3 rounded-lg shrink-0 gap-4">
        {/* Left Side: Type and Quality Filters */}
        <div className="flex items-center gap-3">
          <Tabs value={filterType} onValueChange={(val: string) => setFilterType(val as any)}>
            <TabsList className="bg-background border border-border h-8 p-0.5 rounded-lg">
              <TabsTrigger value="all" className="h-7 text-xs rounded-md font-medium px-3.5">All</TabsTrigger>
              <TabsTrigger value="photo" className="h-7 text-xs rounded-md font-medium px-3.5">Photos</TabsTrigger>
              <TabsTrigger value="video" className="h-7 text-xs rounded-md font-medium px-3.5">Videos</TabsTrigger>
            </TabsList>
          </Tabs>

          <Tabs value={filterQuality} onValueChange={(val: string) => setFilterQuality(val as any)}>
            <TabsList className="bg-background border border-border h-8 p-0.5 rounded-lg">
              <TabsTrigger value="all" className="h-7 text-xs rounded-md font-medium px-3">All Items</TabsTrigger>
              <TabsTrigger value="pending" className="h-7 text-xs rounded-md font-medium px-3">Pending</TabsTrigger>
              <TabsTrigger value="duplicates" className="h-7 text-xs rounded-md font-medium px-3 flex items-center gap-1">
                Duplicates
                {items.filter(i => i.isDuplicate).length > 0 && (
                  <Badge variant="outline" className="h-4 min-w-4 px-1 flex items-center justify-center text-xs bg-primary/10 border-primary/20 text-primary">
                    {items.filter(i => i.isDuplicate && !i.isBestInDuplicateGroup).length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="blurry" className="h-7 text-xs rounded-md font-medium px-3">Blurry</TabsTrigger>
              <TabsTrigger value="screenshots" className="h-7 text-xs rounded-md font-medium px-3">Screenshots</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Right Side: Sorting & Layout Toggles */}
        <div className="flex items-center gap-3 shrink-0">
          <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
            <SelectTrigger className="h-8 border border-border bg-background hover:bg-accent text-foreground text-xs font-medium rounded-lg px-2.5">
              <SelectValue placeholder="Sort order" />
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
                Cards
              </TabsTrigger>
              <TabsTrigger value="list" className="h-7 px-2.5 flex items-center justify-center rounded-md gap-1.5 text-xs font-semibold" title="List Layout">
                <List className="w-3.5 h-3.5" />
                List
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Grouping Mode Toggle: Normal vs Date */}
          <Tabs value={groupMode} onValueChange={(val: string) => setGroupMode(val as any)}>
            <TabsList className="bg-background border border-border h-8 p-0.5 rounded-lg">
              <TabsTrigger value="normal" className="h-7 px-3 flex items-center justify-center rounded-md text-xs font-semibold" title="Normal Sorted View">
                Normal
              </TabsTrigger>
              <TabsTrigger value="date" className="h-7 px-3 flex items-center justify-center rounded-md gap-1.5 text-xs font-semibold" title="Date Grouped View">
                <CalendarDays className="w-3.5 h-3.5" />
                Date
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Batch Operations Floating Bar (only shown if cards selected) */}
      {selectedIds.size > 0 && (
        <div className="border border-primary/20 bg-primary/5 px-4 py-2.5 rounded-lg shrink-0 flex items-center justify-between text-xs font-sans">
          <div className="flex items-center gap-3 font-medium text-foreground">
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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 border-green-500/20 bg-green-500/10 text-green-600 hover:bg-green-500/20 text-xs"
              onClick={() => handleBatchReviewAction('keep')}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Mark to Keep
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs"
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
            onPreviewOpen={setPreviewItem}
            onReviewAction={handleReviewAction}
            columns={4}
          />
        )}
        {layoutMode === 'card' && groupMode === 'date' && (
          <MediaTimeline
            items={filteredItems}
            selectedIds={selectedIds}
            onSelectToggle={handleSelectToggle}
            onPreviewOpen={setPreviewItem}
            onReviewAction={handleReviewAction}
          />
        )}
        {layoutMode === 'list' && (
          <MediaList
            items={filteredItems}
            selectedIds={selectedIds}
            onSelectToggle={handleSelectToggle}
            onPreviewOpen={setPreviewItem}
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
    </PageContainer>
  );
};
