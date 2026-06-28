import React, { useMemo, useState } from 'react';
import { useSessionStore } from '../../stores/session-store';
import { useMediaStore } from '../../stores/media-store';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { 
  Trash2, 
  RefreshCcw, 
  Trash,
  ShieldCheck, 
  FileImage,
  AlertCircle
} from 'lucide-react';
import { formatBytes } from '../../lib/format';

interface ReviewSummaryProps {
  onBackToQueue: () => void;
}

export const ReviewSummary: React.FC<ReviewSummaryProps> = ({ onBackToQueue }) => {
  const { decisions, commitDeletions, clearSession, isCommitting } = useSessionStore();
  const { items } = useMediaStore();
  const [showConfirm, setShowConfirm] = useState(false);

  const itemMap = useMemo(() => new Map(items.map(i => [i.id, i])), [items]);

  // Compute file details
  const details = useMemo(() => {
    const keepList: string[] = [];
    const deleteList: string[] = [];
    let deleteBytes = 0;

    for (const [mediaId, state] of Object.entries(decisions)) {
      const item = itemMap.get(mediaId);
      if (!item) continue;

      if (state === 'keep') {
        keepList.push(mediaId);
      } else if (state === 'delete') {
        deleteList.push(mediaId);
        deleteBytes += item.size;
      }
    }

    return {
      keepCount: keepList.length,
      deleteCount: deleteList.length,
      reclaimableSize: deleteBytes,
      deleteIds: deleteList
    };
  }, [decisions, itemMap]);

  const handleCommit = async () => {
    try {
      await commitDeletions();
      setShowConfirm(false);
    } catch (e) {
      console.error('Delete commit failed:', e);
    }
  };

  const handleClearSession = async () => {
    if (confirm('Are you sure you want to reset all review statuses in this folder? This will revert decisions to pending.')) {
      await clearSession();
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto font-sans select-none text-xs">
      <Card className="border-border bg-card/60 shadow-lg">
        <CardHeader className="pb-4 border-b border-border">
          <CardTitle className="font-heading font-bold text-lg text-foreground flex items-center gap-2.5">
            <Trash2 className="w-5 h-5 text-primary" />
            Session Review Summary
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Confirm items to move to Recycle Bin and free up storage space.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Summary counts */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="border border-border bg-muted/20 p-4 rounded-xl">
              <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">Marked Keep</span>
              <div className="font-heading font-bold text-lg text-green-500 mt-1">{details.keepCount}</div>
            </div>
            <div className="border border-border bg-muted/20 p-4 rounded-xl">
              <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">Marked Delete</span>
              <div className="font-heading font-bold text-lg text-destructive mt-1">{details.deleteCount}</div>
            </div>
            <div className="border border-border bg-muted/20 p-4 rounded-xl">
              <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">Space Saved</span>
              <div className="font-heading font-bold text-lg text-foreground mt-1">{formatBytes(details.reclaimableSize)}</div>
            </div>
          </div>

          {/* Delete Preview List table */}
          {details.deleteCount > 0 && (
            <div className="space-y-2">
              <h5 className="font-semibold text-[0.6875rem] uppercase tracking-wider text-muted-foreground">Files Scheduled for Deletion</h5>
              <div className="max-h-48 overflow-y-auto border border-border bg-background/30 rounded-xl scrollbar-thin">
                <Table className="text-[0.6875rem]">
                  <TableHeader className="bg-muted/10">
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead>Filename</TableHead>
                      <TableHead>Size</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {details.deleteIds.map((id) => {
                      const item = itemMap.get(id)!;
                      return (
                        <TableRow key={id} className="border-border hover:bg-transparent">
                          <TableCell className="font-medium flex items-center gap-2 truncate max-w-sm">
                            <FileImage className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">{item.name}</span>
                          </TableCell>
                          <TableCell className="tabular-nums text-muted-foreground">
                            {formatBytes(item.size)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* safety prompt alert */}
          <Alert className="border-yellow-500/20 bg-yellow-500/5 text-[0.6875rem] leading-normal flex gap-3 text-muted-foreground">
            <ShieldCheck className="w-5 h-5 text-yellow-500 shrink-0" />
            <div>
              <AlertTitle className="font-bold text-foreground">Recycle Bin Safety Net</AlertTitle>
              <AlertDescription className="mt-0.5">
                Galleo moves deleted files directly to your OS Recycle Bin/Trash, so you can restore them manually if you make a mistake.
              </AlertDescription>
            </div>
          </Alert>

          {/* Action panels */}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" className="border-border text-xs h-9 cursor-pointer" onClick={onBackToQueue} disabled={isCommitting}>
              Go Back to Swiping
            </Button>
            <Button variant="outline" className="border-border text-xs h-9 text-muted-foreground hover:text-foreground cursor-pointer gap-1.5" onClick={handleClearSession} disabled={isCommitting}>
              <RefreshCcw className="w-3.5 h-3.5" />
              Reset Decisions
            </Button>

            {details.deleteCount > 0 ? (
              <Button 
                variant="destructive" 
                className="px-4 py-2 font-medium text-xs h-9 cursor-pointer gap-1.5"
                onClick={() => setShowConfirm(true)}
                disabled={isCommitting}
              >
                <Trash className="w-3.5 h-3.5 fill-current" />
                Trash Marked Files
              </Button>
            ) : (
              <Button variant="default" className="px-4 py-2 font-medium text-xs h-9 cursor-pointer" onClick={handleCommit} disabled={isCommitting}>
                Complete Session
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Commit Deletions Double Confirmation dialog box */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <Card className="w-full max-w-sm border-border bg-card shadow-lg select-none">
            <CardHeader className="text-center pb-4">
              <div className="w-10 h-10 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive mx-auto mb-3">
                <AlertCircle className="w-5 h-5" />
              </div>
              <CardTitle className="font-heading font-bold text-sm text-foreground">Confirm Deletion</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                You are about to trash <strong>{details.deleteCount}</strong> files, recovering <strong>{formatBytes(details.reclaimableSize)}</strong> space.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3 justify-center p-4">
              <Button variant="outline" className="flex-1 h-9 text-xs" onClick={() => setShowConfirm(false)}>
                Cancel
              </Button>
              <Button variant="destructive" className="flex-1 h-9 text-xs" onClick={handleCommit} disabled={isCommitting}>
                {isCommitting ? 'Trashing...' : 'Move to Trash'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
