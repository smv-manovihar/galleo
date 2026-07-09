import { create } from 'zustand';
import type { SessionCheckpoint, UndoableAction } from '../../shared/types/session';
import type { MediaItem } from '../../shared/types/media';
import { useMediaStore } from './media-store';

interface SessionState {
  checkpoint: SessionCheckpoint | null;
  currentIndex: number;
  decisions: Record<string, 'keep' | 'delete' | 'skipped'>;
  undoStack: UndoableAction[];
  isCommitting: boolean;

  initSession: (folderPath: string, totalFilesCount: number) => Promise<void>;
  submitDecision: (mediaId: string, state: 'keep' | 'delete' | 'skipped', item: MediaItem) => Promise<void>;
  undo: () => Promise<boolean>;
  commitDeletions: (specificMediaIds?: string[]) => Promise<{ successCount: number; failedPaths: string[] | null }>;
  clearSession: () => Promise<void>;
  getProgress: () => { reviewed: number; total: number; percentage: number };
}

export const useSessionStore = create<SessionState>((set, get) => ({
  checkpoint: null,
  currentIndex: 0,
  decisions: {},
  undoStack: [],
  isCommitting: false,

  initSession: async (folderPath: string, totalFilesCount: number) => {
    try {
      const existing = await window.api.getSessionCheckpoint(folderPath);
      
      if (existing) {
        let checkpoint = existing;
        if (existing.totalFiles !== totalFilesCount) {
          checkpoint = { ...existing, totalFiles: totalFilesCount };
          await window.api.saveSessionCheckpoint(checkpoint);
        }

        // Sync checkpoint decisions back to media store
        const mediaStore = useMediaStore.getState();
        if (mediaStore.items.length > 0) {
          const updatedItems = mediaStore.items.map(item => {
            if (checkpoint.decisions[item.id]) {
              return { ...item, reviewState: checkpoint.decisions[item.id] };
            }
            return item;
          });
          useMediaStore.setState({ items: updatedItems });
        }

        set({
          checkpoint,
          currentIndex: checkpoint.currentIndex,
          decisions: checkpoint.decisions,
          undoStack: checkpoint.undoStack,
        });
      } else {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const freshCheckpoint: SessionCheckpoint = {
          sessionId,
          folderPath,
          totalFiles: totalFilesCount,
          currentIndex: 0,
          decisions: {},
          undoStack: [],
          savedAt: new Date().toISOString(),
        };
        await window.api.saveSessionCheckpoint(freshCheckpoint);
        set({
          checkpoint: freshCheckpoint,
          currentIndex: 0,
          decisions: {},
          undoStack: [],
        });
      }
    } catch {
      // Fallback
      set({ checkpoint: null, currentIndex: 0, decisions: {}, undoStack: [] });
    }
  },

  submitDecision: async (mediaId: string, state: 'keep' | 'delete' | 'skipped', item: MediaItem) => {
    const { checkpoint, currentIndex, decisions, undoStack } = get();
    if (!checkpoint) return;

    // Create Undoable Action
    const actionId = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const previousState = { reviewState: item.reviewState };
    const newState = { reviewState: state };

    const undoAction: UndoableAction = {
      id: actionId,
      type: state === 'keep' ? 'mark-keep' : state === 'delete' ? 'mark-delete' : 'skip',
      mediaId,
      timestamp: Date.now(),
      previousState,
      newState
    };

    const nextIndex = currentIndex + 1;
    const updatedDecisions = { ...decisions, [mediaId]: state };
    const updatedUndoStack = [...undoStack, undoAction];

    const updatedCheckpoint: SessionCheckpoint = {
      ...checkpoint,
      currentIndex: nextIndex,
      decisions: updatedDecisions,
      undoStack: updatedUndoStack,
      savedAt: new Date().toISOString()
    };

    // Update state locally
    set({
      checkpoint: updatedCheckpoint,
      currentIndex: nextIndex,
      decisions: updatedDecisions,
      undoStack: updatedUndoStack
    });

    // Update media store review state synchronously
    const mediaStore = useMediaStore.getState();
    useMediaStore.setState({
      items: mediaStore.items.map(i => i.id === mediaId ? { ...i, reviewState: state } : i)
    });

    // Save checkpoint in database
    await window.api.saveSessionCheckpoint(updatedCheckpoint);
    
    // Save decision directly on media_items table in SQLite
    await window.api.updateReviews(checkpoint.sessionId, [{ mediaId, state }], undoAction);
  },

  undo: async () => {
    const { checkpoint, undoStack, decisions } = get();
    if (!checkpoint || undoStack.length === 0) return false;

    // Pop the last action
    const poppedStack = [...undoStack];
    const lastAction = poppedStack.pop()!;

    // Revert decisions
    const updatedDecisions = { ...decisions };
    if (lastAction.previousState.reviewState === 'pending') {
      delete updatedDecisions[lastAction.mediaId];
    } else {
      updatedDecisions[lastAction.mediaId] = lastAction.previousState.reviewState as any;
    }

    const prevIndex = Math.max(0, checkpoint.currentIndex - 1);

    const updatedCheckpoint: SessionCheckpoint = {
      ...checkpoint,
      currentIndex: prevIndex,
      decisions: updatedDecisions,
      undoStack: poppedStack,
      savedAt: new Date().toISOString()
    };

    // Update media store review state synchronously before setting state
    const prevReviewState = lastAction.previousState.reviewState || 'pending';
    const mediaStore = useMediaStore.getState();
    useMediaStore.setState({
      items: mediaStore.items.map(i =>
        i.id === lastAction.mediaId ? { ...i, reviewState: prevReviewState as any } : i
      ),
    });

    set({
      checkpoint: updatedCheckpoint,
      currentIndex: prevIndex,
      decisions: updatedDecisions,
      undoStack: poppedStack
    });

    // Save checkpoint
    await window.api.saveSessionCheckpoint(updatedCheckpoint);

    // Revert database reviews
    await window.api.updateReviews(
      checkpoint.sessionId, 
      [{ mediaId: lastAction.mediaId, state: (lastAction.previousState.reviewState as any) || 'pending' }]
    );

    return true;
  },

  commitDeletions: async (specificMediaIds?: string[]) => {
    const { checkpoint, decisions } = get();
    if (!checkpoint) return { successCount: 0, failedPaths: null };

    set({ isCommitting: true });

    // Retrieve full media objects from browser store to locate file paths
    const mediaStoreItems = useMediaStore.getState().items;
    const itemMap = new Map(mediaStoreItems.map(i => [i.id, i]));

    const pathsToDelete: string[] = [];
    const idsToTrash: string[] = [];
    
    const targets = specificMediaIds || Object.keys(decisions);

    for (const mediaId of targets) {
      if (decisions[mediaId] === 'delete') {
        const item = itemMap.get(mediaId);
        if (item) {
          pathsToDelete.push(item.path);
          idsToTrash.push(mediaId);
        }
      }
    }

    let successCount = 0;
    let failedPaths: string[] | null = null;

    if (pathsToDelete.length > 0) {
      const res = await window.api.trashFiles(pathsToDelete);
      if (res.ok) {
        successCount = pathsToDelete.length;
      } else {
        // Handle partial deletes if we have failed paths
        failedPaths = pathsToDelete;
      }
    }

    if (specificMediaIds) {
      // Partial commit (e.g. for exact duplicates)
      const updatedDecisions = { ...decisions };
      for (const mediaId of specificMediaIds) {
        delete updatedDecisions[mediaId];
      }

      const targetSet = new Set(specificMediaIds);
      const updatedUndoStack = checkpoint.undoStack.filter(
        action => !targetSet.has(action.mediaId)
      );

      const newIndex = Math.max(0, checkpoint.currentIndex - idsToTrash.length);

      const updatedCheckpoint: SessionCheckpoint = {
        ...checkpoint,
        currentIndex: newIndex,
        decisions: updatedDecisions,
        undoStack: updatedUndoStack,
        savedAt: new Date().toISOString()
      };

      await window.api.saveSessionCheckpoint(updatedCheckpoint);
      await useMediaStore.getState().fetchMediaItems(checkpoint.folderPath);

      set({
        checkpoint: updatedCheckpoint,
        currentIndex: newIndex,
        decisions: updatedDecisions,
        undoStack: updatedUndoStack,
        isCommitting: false
      });
    } else {
      // Full commit: Clear session checkpoint since reviews are committed
      await window.api.clearSession(checkpoint.folderPath);

      // Clear localStorage active tab and group index for this folder
      localStorage.removeItem(`duplicates_active_tab_${checkpoint.folderPath}`);
      localStorage.removeItem(`duplicates_manual_group_index_${checkpoint.folderPath}`);

      // Re-fetch folders data to sync UI
      await useMediaStore.getState().fetchMediaItems(checkpoint.folderPath);

      // Reset store states
      set({
        checkpoint: null,
        currentIndex: 0,
        decisions: {},
        undoStack: [],
        isCommitting: false
      });
    }

    return { successCount, failedPaths };
  },

  clearSession: async () => {
    const { checkpoint } = get();
    if (!checkpoint) return;

    await window.api.clearSession(checkpoint.folderPath);
    
    // Clear localStorage active tab and group index for this folder
    localStorage.removeItem(`duplicates_active_tab_${checkpoint.folderPath}`);
    localStorage.removeItem(`duplicates_manual_group_index_${checkpoint.folderPath}`);
    
    await useMediaStore.getState().fetchMediaItems(checkpoint.folderPath);

    set({
      checkpoint: null,
      currentIndex: 0,
      decisions: {},
      undoStack: []
    });
  },

  getProgress: () => {
    const { checkpoint, currentIndex } = get();
    if (!checkpoint) return { reviewed: 0, total: 0, percentage: 0 };
    
    const reviewed = currentIndex;
    const total = checkpoint.totalFiles;
    const percentage = total > 0 ? Math.round((reviewed / total) * 100) : 0;
    
    return { reviewed, total, percentage };
  }
}));
