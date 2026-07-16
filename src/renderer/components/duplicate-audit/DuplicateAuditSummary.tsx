import React, { useMemo } from 'react';
import { useSessionStore } from '../../stores/session-store';
import { useMediaStore } from '../../stores/media-store';
import { useUIStore } from '../../stores/ui-store';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ShieldCheck, FileImage, HardDriveDownload, Bookmark,
  Trash2, CheckCircle2, ListX
} from 'lucide-react';
import { formatBytes } from '../../lib/format';
import { toast } from 'sonner';

interface DuplicateAuditSummaryProps {
  onBackToQueue: () => void;
}

export const DuplicateAuditSummary: React.FC<DuplicateAuditSummaryProps> = ({ onBackToQueue }) => {
  const { decisions, commitDeletions, isCommitting } = useSessionStore();
  const items = useMediaStore((s) => s.items);
  const setCurrentView = useUIStore((s) => s.setCurrentView);

  const itemMap = useMemo(() => new Map(items.map(i => [i.id, i])), [items]);

  const details = useMemo(() => {
    const keepList: string[] = [];
    const deleteList: string[] = [];
    let deleteBytes = 0;
    for (const [mediaId, state] of Object.entries(decisions)) {
      const item = itemMap.get(mediaId);
      if (!item) continue;
      if (state === 'keep') keepList.push(mediaId);
      else if (state === 'delete') { deleteList.push(mediaId); deleteBytes += item.size; }
    }
    return { keepCount: keepList.length, deleteCount: deleteList.length, reclaimableSize: deleteBytes, deleteIds: deleteList };
  }, [decisions, itemMap]);

  const handleCommit = async () => {
    const deleteIds = Object.entries(decisions).filter(([_, s]) => s === 'delete').map(([id]) => id);
    const size = details.reclaimableSize;
    const count = deleteIds.length;
    if (count > 0) {
      await commitDeletions(deleteIds);
      toast.success("Files moved to trash successfully", {
        description: `${count} file${count !== 1 ? 's' : ''} deleted, reclaiming ${formatBytes(size)}.`
      });
    }
    setCurrentView('dashboard');
  };

  // --- Summary state ---
  return (
    <div className="flex h-full flex-col items-center justify-center font-sans select-none px-8 animate-in fade-in duration-300">
      <div className="w-full max-w-lg space-y-4">
        {/* Header card */}
        <div className="border border-border bg-card rounded-2xl shadow-sm p-6 flex flex-col items-center gap-5 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-green-500/30 bg-green-500/10">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
          <div className="space-y-1">
            <h2 className="font-heading font-bold text-sm text-foreground tracking-tight">Duplicate audit complete</h2>
            <p className="text-xs text-muted-foreground">
              {details.deleteCount > 0
                ? <>Ready to reclaim <strong className="text-foreground">{formatBytes(details.reclaimableSize)}</strong></>
                : 'All groups reviewed — no deletions pending.'}
            </p>
          </div>
          {/* Stat tiles */}
          <div className="grid grid-cols-3 gap-2 w-full text-xs">
            <div className="border border-green-500/15 bg-green-500/5 p-3 rounded-xl">
              <div className="flex items-center justify-center gap-1 text-2xs font-semibold text-green-600/70 dark:text-green-400/70 uppercase tracking-wider mb-1">
                <Bookmark className="w-2.5 h-2.5" /> Kept
              </div>
              <div className="font-heading font-bold text-xl text-green-600 dark:text-green-400 tabular-nums">{details.keepCount}</div>
            </div>
            <div className="border border-destructive/15 bg-destructive/5 p-3 rounded-xl">
              <div className="flex items-center justify-center gap-1 text-2xs font-semibold text-destructive/70 uppercase tracking-wider mb-1">
                <Trash2 className="w-2.5 h-2.5" /> Delete
              </div>
              <div className="font-heading font-bold text-xl text-destructive tabular-nums">{details.deleteCount}</div>
            </div>
            <div className="border border-border bg-muted/20 p-3 rounded-xl">
              <div className="flex items-center justify-center gap-1 text-2xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                <HardDriveDownload className="w-2.5 h-2.5" /> Freed
              </div>
              <div className="font-heading font-bold text-xl text-foreground">{formatBytes(details.reclaimableSize)}</div>
            </div>
          </div>
        </div>

        {/* File list card */}
        {details.deleteCount > 0 && (
          <div className="border border-border bg-card rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h5 className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Files scheduled for deletion</h5>
            </div>
            <div className="max-h-48 overflow-y-auto">
              <Table className="text-[0.6875rem]">
                <TableHeader className="bg-muted/10">
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>Filename</TableHead>
                    <TableHead className="text-right">Size</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {details.deleteIds.map((id) => {
                    const item = itemMap.get(id)!;
                    return (
                      <TableRow key={id} className="border-border hover:bg-transparent">
                        <TableCell className="font-medium flex items-center gap-2 truncate max-w-xs">
                          <FileImage className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="truncate">{item.name}</span>
                        </TableCell>
                        <TableCell className="tabular-nums text-muted-foreground text-right">{formatBytes(item.size)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="px-4 py-3 border-t border-border bg-muted/5 flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-[0.6875rem] text-muted-foreground">Files go to your OS Recycle Bin — recoverable if needed.</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="ghost" className="text-xs h-9 text-muted-foreground hover:text-foreground cursor-pointer flex-1" onClick={onBackToQueue} disabled={isCommitting}>
            Back to Similar Media
          </Button>
          {details.deleteCount > 0 && (
            <Button variant="destructive" className="text-xs h-9 cursor-pointer gap-1.5 flex-1" onClick={handleCommit} disabled={isCommitting}>
              <ListX className="w-3.5 h-3.5" />
              {isCommitting ? 'Moving to Trash...' : `Commit ${details.deleteCount} deletion${details.deleteCount !== 1 ? 's' : ''}`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
