import React, { useMemo, useState } from 'react';
import type { MediaItem } from '../../../shared/types/media';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bookmark, Trash2, ShieldAlert, Sparkles, Maximize, History, Undo2, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatBytes } from '../../lib/format';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { MediaPreview } from '../media/MediaPreview';
import { Progress } from '@/components/ui/progress';
import { useSessionStore } from '../../stores/session-store';
import { useMediaStore } from '../../stores/media-store';
import { HistoryDialog, type HistoryDialogItem } from './HistoryDialog';

interface BatchReviewProps {
  items: MediaItem[];
  onReviewAction: (id: string, state: 'keep' | 'delete' | 'skipped') => void;
}

export const BatchReview: React.FC<BatchReviewProps> = ({ items, onReviewAction }) => {
  // Extract and group duplicates
  const duplicateGroups = useMemo(() => {
    const groups: Record<string, MediaItem[]> = {};
    for (const item of items) {
      if (item.isDuplicate && item.duplicateGroupId) {
        if (!groups[item.duplicateGroupId]) {
          groups[item.duplicateGroupId] = [];
        }
        groups[item.duplicateGroupId].push(item);
      }
    }
    return Object.values(groups).filter(g => g.length > 1);
  }, [items]);

  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const currentGroup = activeGroupIndex < duplicateGroups.length ? duplicateGroups[activeGroupIndex] : null;

  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);

  // Local undo stack — isolated from the swipe-review session store stack
  interface LocalUndoEntry {
    mediaId: string;
    name: string;
    previousState: 'keep' | 'delete' | 'pending';
    batchId?: string;
  }
  const [localUndoStack, setLocalUndoStack] = useState<LocalUndoEntry[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Map localUndoStack to standard HistoryDialogItem format
  const historyItems = useMemo<HistoryDialogItem[]>(() => {
    return localUndoStack.map((entry, idx) => {
      const item = items.find(i => i.id === entry.mediaId);
      const currentDecision = useSessionStore.getState().decisions[entry.mediaId] as 'keep' | 'delete' | 'pending';
      return {
        id: `${entry.mediaId}-${idx}`,
        mediaId: entry.mediaId,
        name: entry.name,
        thumbnailPath: item?.thumbnailPath,
        path: item?.path ?? '',
        currentDecision: (currentDecision === 'pending' ? 'pending' : currentDecision) as any
      };
    });
  }, [localUndoStack, items]);

  const handleUndo = async () => {
    if (localUndoStack.length === 0) return;
    
    // Find the last entries to undo (might be a batch)
    const lastEntry = localUndoStack[localUndoStack.length - 1];
    const batchId = lastEntry.batchId;
    
    let entriesToUndo: LocalUndoEntry[] = [];
    if (batchId) {
      // Find all consecutive entries at the end of the stack with the same batchId
      let idx = localUndoStack.length - 1;
      while (idx >= 0 && localUndoStack[idx].batchId === batchId) {
        entriesToUndo.push(localUndoStack[idx]);
        idx--;
      }
    } else {
      entriesToUndo = [lastEntry];
    }

    // Revert the decision in the session store and DB
    const store = useSessionStore.getState();
    const checkpoint = store.checkpoint;
    if (!checkpoint) return;

    const updatedDecisions = { ...store.decisions };
    const reviewsToUpdate: { mediaId: string; state: any }[] = [];

    for (const entry of entriesToUndo) {
      if (entry.previousState === 'pending') {
        delete updatedDecisions[entry.mediaId];
      } else {
        updatedDecisions[entry.mediaId] = entry.previousState;
      }
      reviewsToUpdate.push({ mediaId: entry.mediaId, state: entry.previousState as any });
    }

    const updatedCheckpoint = { ...checkpoint, decisions: updatedDecisions, savedAt: new Date().toISOString() };
    useSessionStore.setState({ decisions: updatedDecisions, checkpoint: updatedCheckpoint });
    await window.api.saveSessionCheckpoint(updatedCheckpoint);
    await window.api.updateReviews(checkpoint.sessionId, reviewsToUpdate);

    // Update media store so cards re-render
    const mediaStore = useMediaStore.getState();
    useMediaStore.setState({
      items: mediaStore.items.map(i => {
        const entry = entriesToUndo.find(e => e.mediaId === i.id);
        if (entry) {
          return { ...i, reviewState: (entry.previousState === 'pending' ? 'pending' : entry.previousState) as any };
        }
        return i;
      }),
    });

    // Navigate back to the group containing the undone item if necessary
    const firstUndoneId = entriesToUndo[0].mediaId;
    const targetGroupIndex = duplicateGroups.findIndex(group => 
      group.some(item => item.id === firstUndoneId)
    );
    if (targetGroupIndex !== -1 && targetGroupIndex !== activeGroupIndex) {
      setActiveGroupIndex(targetGroupIndex);
    }

    setLocalUndoStack(prev => prev.slice(0, -entriesToUndo.length));
  };

  const handleReviewAction = async (id: string, state: 'keep' | 'delete' | 'skipped', batchId?: string) => {
    // Record previous state before the action for local undo
    const store = useSessionStore.getState();
    const currentDecision = (store.decisions[id] ?? 'pending') as 'keep' | 'delete' | 'pending';
    const item = items.find(i => i.id === id);
    setLocalUndoStack(prev => [...prev, { mediaId: id, name: item?.name ?? id, previousState: currentDecision, batchId }]);
    await onReviewAction(id, state);
  };

  const handleBulkChangeDecisions = async (mediaIds: string[], newDecision: 'keep' | 'delete') => {
    const store = useSessionStore.getState();
    const checkpoint = store.checkpoint;
    if (!checkpoint) return;

    const updatedDecisions = { ...store.decisions };
    const newUndoEntries: LocalUndoEntry[] = [];
    const batchId = `batch_${Date.now()}`;

    for (const mediaId of mediaIds) {
      const item = items.find(i => i.id === mediaId);
      if (item) {
        const currentDecision = (store.decisions[mediaId] ?? 'pending') as 'keep' | 'delete' | 'pending';
        newUndoEntries.push({ mediaId, name: item.name, previousState: currentDecision, batchId });
        updatedDecisions[mediaId] = newDecision;
      }
    }

    setLocalUndoStack(prev => [...prev, ...newUndoEntries]);

    const updatedCheckpoint = { ...checkpoint, decisions: updatedDecisions, savedAt: new Date().toISOString() };
    useSessionStore.setState({ decisions: updatedDecisions, checkpoint: updatedCheckpoint });
    await window.api.saveSessionCheckpoint(updatedCheckpoint);

    const reviewsToUpdate = mediaIds.map(mediaId => ({ mediaId, state: newDecision as any }));
    await window.api.updateReviews(checkpoint.sessionId, reviewsToUpdate);

    const mediaStore = useMediaStore.getState();
    const mediaIdSet = new Set(mediaIds);
    useMediaStore.setState({
      items: mediaStore.items.map(i => mediaIdSet.has(i.id) ? { ...i, reviewState: newDecision } : i),
    });
  };

  const handleKeepBest = async () => {
    if (!currentGroup) return;
    const batchId = `batch_${Date.now()}`;

    for (const item of currentGroup) {
      if (item.isBestInDuplicateGroup) {
        await handleReviewAction(item.id, 'keep', batchId);
      } else {
        await handleReviewAction(item.id, 'delete', batchId);
      }
    }
    nextGroup();
  };

  const handleKeepAll = async () => {
    if (!currentGroup) return;
    const batchId = `batch_${Date.now()}`;

    for (const item of currentGroup) {
      await handleReviewAction(item.id, 'keep', batchId);
    }
    nextGroup();
  };

  const nextGroup = () => {
    setActiveGroupIndex(prev => Math.min(duplicateGroups.length, prev + 1));
  };

  const prevGroup = () => {
    setActiveGroupIndex(prev => Math.max(0, prev - 1));
  };

  if (duplicateGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground font-sans select-none text-xs gap-3">
        <ShieldAlert className="w-8 h-8 text-muted-foreground" />
        <span>No duplicate groupings scanned in this directory.</span>
      </div>
    );
  }

  if (!currentGroup) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground font-sans select-none text-xs gap-3">
        <Bookmark className="w-8 h-8 text-green-500" />
        <span>Completed reviewing all duplicate groups!</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans select-none text-xs w-full h-full flex flex-col min-h-0">
      {/* Session Progress & Sizing Info */}
      <div className="w-full shrink-0 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Progress */}
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex justify-between text-2xs font-semibold tracking-wider text-muted-foreground uppercase">
              <span>Duplicate Groups Progress</span>
              <span>
                {activeGroupIndex + 1} / {duplicateGroups.length} groups
              </span>
            </div>
            <Progress
              value={((activeGroupIndex + 1) / duplicateGroups.length) * 100}
              className="h-1.5 w-full bg-muted"
            />
          </div>
        </div>
      </div>

      {/* Side-by-Side Cards View - Fits Container Height */}
      <div className="flex-1 min-h-0 pr-1 py-1 flex flex-col overflow-hidden">
        <div className="grid gap-5 flex-1 min-h-0" style={{ gridTemplateColumns: `repeat(${Math.min(3, currentGroup.length)}, minmax(0, 1fr))` }}>
        {currentGroup.map((item) => {
          const isBest = item.isBestInDuplicateGroup;
          const isMarkedKeep = item.reviewState === 'keep';
          const isMarkedDelete = item.reviewState === 'delete';
          return (
            <Card key={item.id} className={`overflow-hidden border bg-card/50 flex flex-col h-full min-h-0 ${
              isMarkedKeep ? 'border-green-500/50 bg-green-500/5' :
              isMarkedDelete ? 'border-destructive/40 bg-destructive/5 opacity-60' :
              isBest ? 'border-primary/50 bg-primary/5 shadow-md' : 'border-border'
            }`}>
              <CardContent 
                className="p-0 flex flex-col justify-end relative bg-black cursor-pointer group/card flex-1 min-h-0"
                onDoubleClick={() => setPreviewItem(item)}
              >
                {item.thumbnailPath ? (
                  <img
                    src={`media:///${item.thumbnailPath.replace(/\\/g, '/')}`}
                    alt={item.name}
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground uppercase font-bold">{item.extension}</div>
                )}

                {/* Fullscreen Trigger Overlay */}
                <div className="absolute top-2 right-2 z-20 flex gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-black/40 text-white shadow-sm transition-opacity hover:bg-black/60"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewItem(item);
                        }}
                      >
                        <Maximize className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      Fullscreen Preview
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Best quality tag */}
                {isBest && (
                  <div className="absolute top-2 left-2 z-10 pointer-events-none">
                    <Badge className="bg-primary hover:bg-primary text-primary-foreground text-2xs tracking-wider uppercase font-extrabold px-1.5 py-0">
                      Best Quality
                    </Badge>
                  </div>
                )}

                {/* Info Overlay */}
                <div className="absolute bottom-0 inset-x-0 bg-linear-to-t from-black/85 via-black/30 to-transparent p-4 text-white flex flex-col pointer-events-none z-10">
                  <span className="font-semibold truncate">{item.name}</span>
                  <div className="flex items-center justify-between text-[0.5625rem] opacity-75 mt-0.5">
                    <span>{formatBytes(item.size)}</span>
                    {item.width && item.height && (
                      <span>{item.width} x {item.height}</span>
                    )}
                  </div>
                  {item.quality && (
                    <span className="text-[0.5625rem] text-primary-foreground font-semibold mt-1">
                      Composite score: {item.quality.compositeScore}
                    </span>
                  )}
                </div>
              </CardContent>

              {/* Action Toolbar */}
              <div className="p-3 bg-muted/20 border-t border-border flex items-center justify-between gap-2 shrink-0">
                <Button
                  variant="outline"
                  className="flex-1 gap-1.5 h-8 border-green-500/20 bg-green-500/5 text-green-600 dark:text-green-400 hover:bg-green-500/10 rounded-lg text-2xs cursor-pointer"
                  onClick={() => handleReviewAction(item.id, 'keep')}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  Keep
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-1.5 h-8 border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/10 rounded-lg text-2xs cursor-pointer"
                  onClick={() => handleReviewAction(item.id, 'delete')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </Button>
              </div>
            </Card>
          );
        })}
        </div>
      </div>

      {/* Control Buttons Panel */}
      <div className="border border-border bg-card/45 backdrop-blur-md p-4 rounded-lg flex items-center justify-between font-sans gap-4 shrink-0 h-16 py-0">
        {/* Left Side: Undo Controls */}
        <div className="flex items-center gap-2">
          {/* Fast Undo */}
          <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 cursor-pointer border-border bg-card text-foreground shadow-sm hover:bg-accent"
                onClick={handleUndo}
                disabled={localUndoStack.length === 0}
              >
                <Undo2 className="h-4 w-4" />
              </Button>

          {/* History Dialog Trigger */}
          <Button
            variant="outline"
            size="icon"
            title="Decision history"
            className="h-9 w-9 cursor-pointer border-border bg-card text-muted-foreground shadow-sm hover:bg-accent hover:text-foreground"
            onClick={() => setIsHistoryOpen(true)}
            disabled={localUndoStack.length === 0}
          >
            <History className="h-4 w-4" />
          </Button>

          <HistoryDialog
            isOpen={isHistoryOpen}
            onOpenChange={setIsHistoryOpen}
            items={historyItems}
            onBulkAction={handleBulkChangeDecisions}
            onSingleAction={async (mediaId, newDecision) => handleBulkChangeDecisions([mediaId], newDecision)}
          />
        </div>

        {/* Center: Smart Actions */}
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="px-4 h-9 font-medium text-xs border-border hover:bg-accent text-foreground cursor-pointer" 
            onClick={handleKeepAll}
          >
            Keep All
          </Button>
          <Button 
            variant="default"
            size="sm" 
            className="px-4 h-9 font-medium text-xs bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-1.5 cursor-pointer shadow-sm" 
            onClick={handleKeepBest}
          >
            <Sparkles className="w-3.5 h-3.5 fill-current" />
            Auto-Keep Best
          </Button>
        </div>

        {/* Right Side: Navigation */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-9 w-9 border-border bg-card text-foreground shadow-sm hover:bg-accent cursor-pointer" 
                onClick={prevGroup} 
                disabled={activeGroupIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Previous Group</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-9 w-9 border-border bg-card text-foreground shadow-sm hover:bg-accent cursor-pointer" 
                onClick={nextGroup} 
                disabled={activeGroupIndex >= duplicateGroups.length - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Next Group</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <MediaPreview
        item={previewItem}
        onClose={() => setPreviewItem(null)}
        items={currentGroup}
        onItemChange={(item) => setPreviewItem(item)}
      />
    </div>
  );
};
