import type { MediaItem } from './media';

export interface UndoableAction {
  id: string;
  type: 'mark-delete' | 'mark-keep' | 'skip' | 'move' | 'rename';
  mediaId: string;
  timestamp: number;
  previousState: Partial<MediaItem> & { source?: 'culling' | 'browse' | 'duplicates'; batchId?: string };
  newState: Partial<MediaItem> & { source?: 'culling' | 'browse' | 'duplicates'; batchId?: string };
}

export interface SessionCheckpoint {
  sessionId: string;
  folderPath: string;
  totalFiles: number;
  currentIndex: number;
  decisions: Record<string, 'keep' | 'delete' | 'skipped'>; // mediaId -> decision
  undoStack: UndoableAction[];
  savedAt: string; // ISO string
}
