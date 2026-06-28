import type { Database } from 'better-sqlite3';
import type { SessionCheckpoint, UndoableAction } from '../../shared/types/session';
import { initDatabase } from '../infrastructure/database';

export class SessionRepository {
  private getDb(): Database {
    return initDatabase();
  }

  /**
   * Saves a full review session checkpoint including decisions and undo history.
   */
  public saveCheckpoint(checkpoint: SessionCheckpoint): void {
    const db = this.getDb();

    const insertSession = db.prepare(`
      INSERT INTO sessions (session_id, folder_path, total_files, current_index, saved_at)
      VALUES ($sessionId, $folderPath, $totalFiles, $currentIndex, $savedAt)
      ON CONFLICT(session_id) DO UPDATE SET
        current_index = excluded.current_index,
        saved_at = excluded.saved_at
      ON CONFLICT(folder_path) DO UPDATE SET
        session_id = excluded.session_id,
        total_files = excluded.total_files,
        current_index = excluded.current_index,
        saved_at = excluded.saved_at
    `);

    const insertDecision = db.prepare(`
      INSERT INTO session_decisions (session_id, media_id, decision)
      VALUES ($sessionId, $mediaId, $decision)
      ON CONFLICT(session_id, media_id) DO UPDATE SET decision = excluded.decision
    `);

    const insertUndo = db.prepare(`
      INSERT INTO undo_actions (id, session_id, media_id, type, timestamp, previous_state, new_state)
      VALUES ($id, $sessionId, $mediaId, $type, $timestamp, $previousState, $newState)
      ON CONFLICT(id) DO UPDATE SET
        previous_state = excluded.previous_state,
        new_state = excluded.new_state
    `);

    const transaction = db.transaction((cp: SessionCheckpoint) => {
      // 1. Upsert core session record
      insertSession.run({
        sessionId: cp.sessionId,
        folderPath: cp.folderPath,
        totalFiles: cp.totalFiles,
        currentIndex: cp.currentIndex,
        savedAt: cp.savedAt
      });

      // 2. Clear old decisions and insert updated map
      // (Easier to just write all current ones as transactional sync)
      for (const [mediaId, decision] of Object.entries(cp.decisions)) {
        insertDecision.run({
          sessionId: cp.sessionId,
          mediaId,
          decision
        });
      }

      // 3. Clear old undo stack for this session and write new one
      const deleteUndo = db.prepare('DELETE FROM undo_actions WHERE session_id = ?');
      deleteUndo.run(cp.sessionId);

      for (const undo of cp.undoStack) {
        insertUndo.run({
          id: undo.id,
          sessionId: cp.sessionId,
          mediaId: undo.mediaId,
          type: undo.type,
          timestamp: undo.timestamp,
          previousState: JSON.stringify(undo.previousState),
          newState: JSON.stringify(undo.newState)
        });
      }
    });

    transaction(checkpoint);
  }

  /**
   * Retrieves a review session checkpoint if one exists for the target folder path.
   */
  public getCheckpoint(folderPath: string): SessionCheckpoint | null {
    const db = this.getDb();
    const folderLower = folderPath.toLowerCase();

    const sessionStmt = db.prepare('SELECT * FROM sessions WHERE LOWER(folder_path) = ?');
    const sessionRow = sessionStmt.get(folderLower) as any;

    if (!sessionRow) {
      return null;
    }

    const sessionId = sessionRow.session_id;

    // Retrieve Decisions
    const decisionsStmt = db.prepare('SELECT media_id, decision FROM session_decisions WHERE session_id = ?');
    const decisionRows = decisionsStmt.all(sessionId) as { media_id: string; decision: string }[];
    const decisions: Record<string, 'keep' | 'delete' | 'skipped'> = {};
    for (const row of decisionRows) {
      decisions[row.media_id] = row.decision as 'keep' | 'delete' | 'skipped';
    }

    // Retrieve Undo Stack (ordered by timestamp asc)
    const undoStmt = db.prepare('SELECT * FROM undo_actions WHERE session_id = ? ORDER BY timestamp ASC');
    const undoRows = undoStmt.all(sessionId) as any[];
    const undoStack: UndoableAction[] = undoRows.map(row => ({
      id: row.id,
      type: row.type as any,
      mediaId: row.media_id,
      timestamp: row.timestamp,
      previousState: JSON.parse(row.previous_state),
      newState: JSON.parse(row.new_state)
    }));

    return {
      sessionId,
      folderPath: sessionRow.folder_path,
      totalFiles: sessionRow.total_files,
      currentIndex: sessionRow.current_index,
      decisions,
      undoStack,
      savedAt: sessionRow.saved_at
    };
  }

  /**
   * Deletes session checkpoint metadata when review is committed or cleared.
   */
  public clearCheckpoint(folderPath: string): void {
    const db = this.getDb();
    const folderLower = folderPath.toLowerCase();
    
    // Find session_id first to let foreign keys cascade delete decisions & undo actions
    const sessionStmt = db.prepare('SELECT session_id FROM sessions WHERE LOWER(folder_path) = ?');
    const sessionRow = sessionStmt.get(folderLower) as { session_id: string } | undefined;
    
    if (sessionRow) {
      const deleteSession = db.prepare('DELETE FROM sessions WHERE session_id = ?');
      deleteSession.run(sessionRow.session_id);
    }
  }
}
