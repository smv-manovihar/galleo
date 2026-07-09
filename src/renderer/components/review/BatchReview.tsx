import React, { useMemo, useState, useCallback } from 'react';
import type { MediaItem } from '../../../shared/types/media';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bookmark, Trash2, ShieldAlert, Sparkles, Maximize, History, Undo2, ChevronLeft, ChevronRight, Play } from 'lucide-react';
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
  onComplete?: () => void;
  activeGroupIndex: number;
  onGroupIndexChange: (index: number) => void;
}

export const BatchReview: React.FC<BatchReviewProps> = ({ items, onReviewAction, onComplete, activeGroupIndex, onGroupIndexChange }) => {
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

  const currentGroup = activeGroupIndex < duplicateGroups.length ? duplicateGroups[activeGroupIndex] : null;

  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);

  const openPreview = (item: MediaItem, withAutoPlay = false) => {
    setAutoPlay(withAutoPlay);
    setPreviewItem(item);
  };

  // Local undo stack — isolated from the swipe-review session store stack
  interface LocalUndoEntry {
    mediaId: string;
    name: string;
    previousState: 'keep' | 'delete' | 'pending';
    batchId?: string;
  }
  const [localUndoStack, setLocalUndoStack] = useState<LocalUndoEntry[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [skippedAutoRecommendGroups, setSkippedAutoRecommendGroups] = useState<Set<string>>(new Set());

  const checkpoint = useSessionStore(state => state.checkpoint);
  const isInitializedRef = React.useRef(false);
  const lastFolderPathRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!checkpoint) return;

    // Reset if folder path changes
    if (checkpoint.folderPath !== lastFolderPathRef.current) {
      isInitializedRef.current = false;
      lastFolderPathRef.current = checkpoint.folderPath;
      setLocalUndoStack([]);
    }

    if (!isInitializedRef.current && items.length > 0) {
      const decisionKeys = Object.keys(checkpoint.decisions);
      if (decisionKeys.length > 0) {
        const initialStack: LocalUndoEntry[] = [];
        for (const mediaId of decisionKeys) {
          const item = items.find(i => i.id === mediaId);
          if (item) {
            initialStack.push({
              mediaId,
              name: item.name,
              previousState: 'pending',
            });
          }
        }
        setLocalUndoStack(initialStack);
      }
      isInitializedRef.current = true;
    }
  }, [checkpoint, items]);

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

    let currentStack = [...localUndoStack];
    let entriesToRevert: LocalUndoEntry[] = [];
    let targetIndex = -1;

    // Loop to discard auto-recommendations of the current group if they are at the top of the stack
    while (currentStack.length > 0) {
      const lastEntry = currentStack[currentStack.length - 1];
      const batchId = lastEntry.batchId;
      
      let currentBatch: LocalUndoEntry[] = [];
      if (batchId) {
        let idx = currentStack.length - 1;
        while (idx >= 0 && currentStack[idx].batchId === batchId) {
          currentBatch.push(currentStack[idx]);
          idx--;
        }
      } else {
        currentBatch = [lastEntry];
      }

      // Check if this batch belongs to the current active group and is an auto-recommendation
      const firstId = currentBatch[0].mediaId;
      const groupIndex = duplicateGroups.findIndex(group => 
        group.some(item => item.id === firstId)
      );

      const isCurrentGroupAutoRecommend = 
        groupIndex === activeGroupIndex && 
        batchId?.startsWith('auto_recommend_');

      if (isCurrentGroupAutoRecommend) {
        // Yes, it is the current group's auto-recommendation.
        // We revert it to pending, pop it from stack, and continue to find the previous user decision.
        entriesToRevert.push(...currentBatch);
        currentStack = currentStack.slice(0, -currentBatch.length);
        
        // Also skip auto-recommendation for this group in the future
        const groupId = currentGroup?.[0]?.duplicateGroupId;
        if (groupId) {
          setSkippedAutoRecommendGroups(prev => {
            const next = new Set(prev);
            next.add(groupId);
            return next;
          });
        }
      } else {
        // This is the actual decision we want to undo!
        entriesToRevert.push(...currentBatch);
        currentStack = currentStack.slice(0, -currentBatch.length);
        targetIndex = groupIndex;
        break; // Stop loop, we found the user action to undo
      }
    }

    if (entriesToRevert.length === 0) return;

    // Revert the decisions in session store and DB
    const store = useSessionStore.getState();
    const checkpoint = store.checkpoint;
    if (!checkpoint) return;

    const updatedDecisions = { ...store.decisions };
    const reviewsToUpdate: { mediaId: string; state: any }[] = [];

    for (const entry of entriesToRevert) {
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
        const entry = entriesToRevert.find(e => e.mediaId === i.id);
        if (entry) {
          return { ...i, reviewState: (entry.previousState === 'pending' ? 'pending' : entry.previousState) as any };
        }
        return i;
      }),
    });

    // Also mark the target group as skipped for auto-recommendation
    if (targetIndex !== -1) {
      const targetGroup = duplicateGroups[targetIndex];
      const targetGroupId = targetGroup?.[0]?.duplicateGroupId;
      if (targetGroupId) {
        setSkippedAutoRecommendGroups(prev => {
          const next = new Set(prev);
          next.add(targetGroupId);
          return next;
        });
      }
      // Navigate to the target group
      if (targetIndex !== activeGroupIndex) {
        onGroupIndexChange(targetIndex);
      }
    }

    setLocalUndoStack(currentStack);
  };

  const handleReviewAction = async (id: string, state: 'keep' | 'delete' | 'skipped', batchId?: string) => {
    // Record previous state before the action for local undo
    const store = useSessionStore.getState();
    const currentDecision = (store.decisions[id] ?? 'pending') as 'keep' | 'delete' | 'pending';
    const item = items.find(i => i.id === id);
    setLocalUndoStack(prev => [...prev, { mediaId: id, name: item?.name ?? id, previousState: currentDecision, batchId }]);
    await onReviewAction(id, state);
  };

  const handleBulkChangeDecisions = useCallback(async (mediaIds: string[], newDecision: 'keep' | 'delete') => {
    const store = useSessionStore.getState();
    const checkpoint = store.checkpoint;
    if (!checkpoint) return;

    const updatedDecisions = { ...store.decisions };
    const newUndoEntries: LocalUndoEntry[] = [];
    const batchId = `batch_${Date.now()}`;
    const updatedGroups = new Set<string>();

    for (const mediaId of mediaIds) {
      const item = items.find(i => i.id === mediaId);
      if (item) {
        const currentDecision = (store.decisions[mediaId] ?? 'pending') as 'keep' | 'delete' | 'pending';
        newUndoEntries.push({ mediaId, name: item.name, previousState: currentDecision, batchId });
        updatedDecisions[mediaId] = newDecision;
        if (item.duplicateGroupId) {
          updatedGroups.add(item.duplicateGroupId);
        }
      }
    }

    if (updatedGroups.size > 0) {
      setSkippedAutoRecommendGroups(prev => {
        const next = new Set(prev);
        updatedGroups.forEach(gId => next.add(gId));
        return next;
      });
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
  }, [items]);

  const handleSingleAction = useCallback(async (mediaId: string, newDecision: 'keep' | 'delete') => {
    await handleBulkChangeDecisions([mediaId], newDecision);
  }, [handleBulkChangeDecisions]);

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

  const handleDeleteAll = async () => {
    if (!currentGroup) return;
    const batchId = `batch_${Date.now()}`;

    for (const item of currentGroup) {
      await handleReviewAction(item.id, 'delete', batchId);
    }
    nextGroup();
  };

  const nextGroup = () => {
    onGroupIndexChange(Math.min(duplicateGroups.length, activeGroupIndex + 1));
  };

  const prevGroup = () => {
    onGroupIndexChange(Math.max(0, activeGroupIndex - 1));
  };

  const handleApplyRecommendedDecisions = async (group: MediaItem[]) => {
    const store = useSessionStore.getState();
    const checkpoint = store.checkpoint;
    if (!checkpoint) return;

    const updatedDecisions = { ...store.decisions };
    const newUndoEntries: LocalUndoEntry[] = [];
    const batchId = `auto_recommend_${Date.now()}`;

    const bestItem = group.find(i => i.isBestInDuplicateGroup) || group[0];
    const reviewsToUpdate: { mediaId: string; state: 'keep' | 'delete' }[] = [];

    for (const item of group) {
      const decision = item.id === bestItem.id ? 'keep' : 'delete';
      const currentDecision = (store.decisions[item.id] ?? 'pending') as 'keep' | 'delete' | 'pending';
      newUndoEntries.push({ mediaId: item.id, name: item.name, previousState: currentDecision, batchId });
      updatedDecisions[item.id] = decision;
      reviewsToUpdate.push({ mediaId: item.id, state: decision });
    }

    setLocalUndoStack(prev => [...prev, ...newUndoEntries]);

    const updatedCheckpoint = { ...checkpoint, decisions: updatedDecisions, savedAt: new Date().toISOString() };
    useSessionStore.setState({ decisions: updatedDecisions, checkpoint: updatedCheckpoint });
    await window.api.saveSessionCheckpoint(updatedCheckpoint);
    await window.api.updateReviews(checkpoint.sessionId, reviewsToUpdate);

    const mediaStore = useMediaStore.getState();
    useMediaStore.setState({
      items: mediaStore.items.map(i => {
        const match = group.find(g => g.id === i.id);
        if (match) {
          return { ...i, reviewState: match.id === bestItem.id ? 'keep' : 'delete' };
        }
        return i;
      }),
    });
  };

  const handleToggleKeep = async (itemId: string) => {
    if (!currentGroup) return;
    const store = useSessionStore.getState();
    const checkpoint = store.checkpoint;
    if (!checkpoint) return;

    const currentDecision = (store.decisions[itemId] ?? 'pending') as 'keep' | 'delete' | 'pending';
    // Toggle: if already keep → delete; otherwise → keep
    const newDecision: 'keep' | 'delete' = currentDecision === 'keep' ? 'delete' : 'keep';

    const item = items.find(i => i.id === itemId);
    setLocalUndoStack(prev => [...prev, { mediaId: itemId, name: item?.name ?? itemId, previousState: currentDecision }]);

    const groupId = currentGroup[0]?.duplicateGroupId;
    if (groupId) {
      setSkippedAutoRecommendGroups(prev => {
        const next = new Set(prev);
        next.add(groupId);
        return next;
      });
    }

    const updatedDecisions = { ...store.decisions, [itemId]: newDecision };
    const updatedCheckpoint = { ...checkpoint, decisions: updatedDecisions, savedAt: new Date().toISOString() };
    useSessionStore.setState({ decisions: updatedDecisions, checkpoint: updatedCheckpoint });
    await window.api.saveSessionCheckpoint(updatedCheckpoint);
    await window.api.updateReviews(checkpoint.sessionId, [{ mediaId: itemId, state: newDecision }]);

    const mediaStore = useMediaStore.getState();
    useMediaStore.setState({
      items: mediaStore.items.map(i => i.id === itemId ? { ...i, reviewState: newDecision } : i),
    });
  };

  // Pre-mark default recommendations for the current group
  React.useEffect(() => {
    if (!currentGroup) return;

    const groupId = currentGroup[0]?.duplicateGroupId;
    if (groupId && skippedAutoRecommendGroups.has(groupId)) {
      return;
    }

    // Check if any item in the group is still pending
    const hasPending = currentGroup.some(item => !item.reviewState || item.reviewState === 'pending');
    if (hasPending) {
      handleApplyRecommendedDecisions(currentGroup);
    }
  }, [currentGroup, skippedAutoRecommendGroups]);

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
        <span className="font-semibold text-foreground text-sm">Completed reviewing all duplicate groups!</span>
        {onComplete && (
          <Button 
            variant="default" 
            size="sm" 
            className="mt-2 px-4 h-9 font-medium text-xs bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-1.5 cursor-pointer shadow-sm animate-pulse"
            onClick={onComplete}
          >
            Go to Summary & Commit
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full h-full min-h-0 font-sans select-none text-xs">
      {/* Progress */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          Group <span className="font-semibold text-foreground">{activeGroupIndex + 1}</span> of {duplicateGroups.length}
        </span>
        <Progress
          value={((activeGroupIndex + 1) / duplicateGroups.length) * 100}
          className="flex-1 h-1 bg-muted"
        />
      </div>

      {/* Cards Grid */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div
          className="grid gap-3 flex-1 min-h-0"
          style={{ gridTemplateColumns: `repeat(${Math.min(3, currentGroup.length)}, minmax(0, 1fr))` }}
        >
          {currentGroup.map((item) => {
            const isBest = item.isBestInDuplicateGroup;
            const isMarkedKeep = item.reviewState === 'keep';
            const isMarkedDelete = item.reviewState === 'delete';
            return (
              <div
                key={item.id}
                onClick={() => handleToggleKeep(item.id)}
                className={`relative rounded-lg overflow-hidden flex flex-col h-full min-h-0 cursor-pointer border transition-all duration-150 ${
                  isMarkedKeep
                    ? 'border-green-500/70 shadow-sm shadow-green-500/20'
                    : isMarkedDelete
                    ? 'border-destructive/30 opacity-50 hover:opacity-70'
                    : isBest
                    ? 'border-primary/40'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                {/* Thumbnail area */}
                <div className="relative bg-neutral-950 flex-1 min-h-0">
                  {item.thumbnailPath ? (
                    <img
                      src={`media:///${item.thumbnailPath.replace(/\\/g, '/')}`}
                      alt={item.name}
                      className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground uppercase font-bold text-lg">
                      {item.extension}
                    </div>
                  )}

                  {/* Top-left: Best badge */}
                  {isBest && (
                    <div className="absolute top-2 left-2 z-20 pointer-events-none">
                      <Badge className="bg-primary/90 hover:bg-primary text-primary-foreground text-[0.6rem] tracking-wider uppercase font-bold px-1.5 py-0 h-4">
                        Best
                      </Badge>
                    </div>
                  )}

                  {/* Center play overlay for videos */}
                  {item.mediaType === 'video' && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          openPreview(item, true);
                        }}
                        className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/50 backdrop-blur-sm transition-transform hover:scale-110 cursor-pointer pointer-events-auto"
                      >
                        <Play className="ml-0.5 h-5 w-5 fill-white text-white" />
                      </div>
                    </div>
                  )}

                  {/* Top-right: Maximize */}
                  <div className="absolute top-2 right-2 z-30">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-md border border-white/10 bg-black/40 text-white hover:bg-black/60"
                          onClick={(e) => {
                            e.stopPropagation();
                            openPreview(item, false);
                          }}
                        >
                          <Maximize className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">Preview</TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Bottom info gradient */}
                  <div className="absolute bottom-0 inset-x-0 bg-linear-to-t from-black/75 via-black/20 to-transparent pt-6 pb-2 px-2.5 text-white pointer-events-none z-10">
                    <p className="font-medium text-[0.65rem] truncate leading-none">{item.name}</p>
                    <div className="flex items-center justify-between text-[0.55rem] opacity-55 mt-1">
                      <span>{formatBytes(item.size)}</span>
                      {item.width && item.height && (
                        <span>{item.width} x {item.height}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status bar */}
                <div className={`h-7 border-t flex items-center justify-center gap-1.5 text-xs font-medium shrink-0 transition-colors ${
                  isMarkedKeep
                    ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400'
                    : isMarkedDelete
                    ? 'bg-destructive/10 border-destructive/20 text-destructive'
                    : 'bg-muted/20 border-border text-muted-foreground'
                }`}>
                  {isMarkedKeep ? (
                    <><Bookmark className="w-3 h-3 fill-current" /> Keep</>
                  ) : isMarkedDelete ? (
                    <><Trash2 className="w-3 h-3" /> Delete</>
                  ) : (
                    <span className="opacity-60">Pending</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="border border-border bg-card/60 backdrop-blur-sm rounded-lg flex items-center justify-between gap-4 shrink-0 px-3 h-12">
        {/* Left: Undo Controls */}
        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-lg"
                className="text-muted-foreground hover:text-foreground"
                onClick={handleUndo}
                disabled={localUndoStack.length === 0}
              >
                <Undo2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Undo</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-lg"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setIsHistoryOpen(true)}
                disabled={localUndoStack.length === 0}
              >
                <History />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">History</TooltipContent>
          </Tooltip>
          <HistoryDialog
            isOpen={isHistoryOpen}
            onOpenChange={setIsHistoryOpen}
            items={historyItems}
            onBulkAction={handleBulkChangeDecisions}
            onSingleAction={handleSingleAction}
          />
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-border" />

        {/* Center: Smart Actions */}
        <div className="flex items-center gap-2 flex-1 justify-center">
          <Button
            variant="destructive"
            size="lg"
            onClick={handleDeleteAll}
          >
            Delete All
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={handleKeepAll}
          >
            Keep All
          </Button>
          <Button
            variant="default"
            size="lg"
            className="gap-1.5"
            onClick={handleKeepBest}
          >
            <Sparkles />
            Auto-Keep Best
          </Button>
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-border" />

        {/* Right: Navigation */}
        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-lg"
                className="text-muted-foreground hover:text-foreground"
                onClick={prevGroup}
                disabled={activeGroupIndex === 0}
              >
                <ChevronLeft />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Previous Group</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-lg"
                className="text-muted-foreground hover:text-foreground"
                onClick={nextGroup}
                disabled={activeGroupIndex >= duplicateGroups.length - 1}
              >
                <ChevronRight />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Next Group</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <MediaPreview
        item={previewItem}
        onClose={() => { setPreviewItem(null); setAutoPlay(false); }}
        items={currentGroup}
        onItemChange={(item) => setPreviewItem(item)}
        autoPlay={autoPlay}
      />
    </div>
  );
};
