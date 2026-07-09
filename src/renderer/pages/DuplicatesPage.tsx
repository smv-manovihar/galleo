import React, { useState } from 'react';
import { useMediaStore } from '../stores/media-store';
import { useSessionStore } from '../stores/session-store';
import { BatchReview } from '../components/review/BatchReview';
import { PageContainer } from '@/components/ui/page-layout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Bookmark, CheckCircle2, Loader2 } from 'lucide-react';
import { formatBytes } from '../lib/format';
import { ReviewSummary } from '../components/review/ReviewSummary';
import type { MediaItem } from '../../shared/types/media';
import { getNormalizedFilenameBase } from '../../shared/filename-utils';

export const DuplicatesPage: React.FC = () => {
  const { items, activeRootPath } = useMediaStore();
  const { initSession, submitDecision, commitDeletions } = useSessionStore();

  const [activeTab, setActiveTab] = useState<'auto' | 'manual'>('auto');
  const [showSummary, setShowSummary] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanSuccess, setCleanSuccess] = useState<string | null>(null);
  const [manualGroupIndex, setManualGroupIndex] = useState(0);

  const lastLoadedFolderRef = React.useRef<string | null>(null);

  // Initialize review session when activeRootPath changes or is loaded
  React.useEffect(() => {
    if (activeRootPath && items.length > 0) {
      initSession(activeRootPath, items.length);
    }
  }, [activeRootPath, items.length, initSession]);

  const handleReviewAction = async (mediaId: string, state: 'keep' | 'delete' | 'skipped') => {
    const item = items.find(i => i.id === mediaId);
    if (item) {
      await submitDecision(mediaId, state, item);
      item.reviewState = state;
      useMediaStore.setState({ items: [...items] });
    }
  };

  // Group duplicate items
  const duplicateGroups = React.useMemo(() => {
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

  // Partition duplicates into exact copies vs similar files
  const { exactDupsToDelete, exactDupsToKeep, manualReviewGroups } = React.useMemo(() => {
    const dupsToDelete: MediaItem[] = [];
    const dupsToKeep: MediaItem[] = [];
    const manualGroups: MediaItem[][] = [];

    for (const group of duplicateGroups) {
      const best = group.find(i => i.isBestInDuplicateGroup) || group[0];
      const otherItems = group.filter(i => i.id !== best.id);
      const bestBase = getNormalizedFilenameBase(best.name);
      const isAllExact = otherItems.every(
        i => getNormalizedFilenameBase(i.name) === bestBase && i.size === best.size
      );

      if (isAllExact) {
        dupsToKeep.push(best);
        dupsToDelete.push(...otherItems);
      } else {
        manualGroups.push(group);
      }
    }

    return {
      exactDupsToDelete: dupsToDelete,
      exactDupsToKeep: dupsToKeep,
      manualReviewGroups: manualGroups,
    };
  }, [duplicateGroups]);

  const manualReviewItems = React.useMemo(() => {
    return manualReviewGroups.flat();
  }, [manualReviewGroups]);

  // Restore and initialize local tab/index states when activeRootPath changes or items load
  React.useEffect(() => {
    if (activeRootPath && activeRootPath !== lastLoadedFolderRef.current && items.length > 0) {
      lastLoadedFolderRef.current = activeRootPath;

      // Restore active tab
      const savedTab = localStorage.getItem(`duplicates_active_tab_${activeRootPath}`);
      if (savedTab === 'auto' || savedTab === 'manual') {
        setActiveTab(savedTab as 'auto' | 'manual');
      } else {
        setActiveTab('auto');
      }

      // Restore group index
      const savedIndex = localStorage.getItem(`duplicates_manual_group_index_${activeRootPath}`);
      if (savedIndex !== null) {
        const parsed = parseInt(savedIndex, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed < manualReviewGroups.length) {
          setManualGroupIndex(parsed);
          return;
        }
      }

      // Fallback: find the first group that has at least one pending item to review
      const firstUncompleted = manualReviewGroups.findIndex(group =>
        group.some(item => !item.reviewState || item.reviewState === 'pending')
      );
      if (firstUncompleted !== -1) {
        setManualGroupIndex(firstUncompleted);
      } else {
        setManualGroupIndex(0);
      }
    }
  }, [activeRootPath, items.length, manualReviewGroups]);

  const handleTabChange = (tab: 'auto' | 'manual') => {
    setActiveTab(tab);
    if (activeRootPath) {
      localStorage.setItem(`duplicates_active_tab_${activeRootPath}`, tab);
    }
  };

  const handleGroupIndexChange = (index: number) => {
    setManualGroupIndex(index);
    if (activeRootPath) {
      localStorage.setItem(`duplicates_manual_group_index_${activeRootPath}`, index.toString());
    }
  };

  const handleAutoCleanup = async () => {
    if (exactDupsToDelete.length === 0) return;
    setIsCleaning(true);
    setCleanSuccess(null);
    try {
      const store = useSessionStore.getState();
      const checkpoint = store.checkpoint;
      if (!checkpoint) {
        setIsCleaning(false);
        return;
      }

      const updatedDecisions = { ...store.decisions };
      const reviewsToUpdate: { mediaId: string; state: 'keep' | 'delete' }[] = [];

      for (const item of exactDupsToDelete) {
        updatedDecisions[item.id] = 'delete';
        reviewsToUpdate.push({ mediaId: item.id, state: 'delete' });
      }
      for (const item of exactDupsToKeep) {
        updatedDecisions[item.id] = 'keep';
        reviewsToUpdate.push({ mediaId: item.id, state: 'keep' });
      }

      const updatedCheckpoint = {
        ...checkpoint,
        decisions: updatedDecisions,
        savedAt: new Date().toISOString(),
      };
      useSessionStore.setState({ decisions: updatedDecisions, checkpoint: updatedCheckpoint });
      await window.api.saveSessionCheckpoint(updatedCheckpoint);
      await window.api.updateReviews(checkpoint.sessionId, reviewsToUpdate);

      const totalSize = exactDupsToDelete.reduce((acc, i) => acc + i.size, 0);
      const specificIds = [
        ...exactDupsToDelete.map(i => i.id),
        ...exactDupsToKeep.map(i => i.id)
      ];
      const { successCount } = await commitDeletions(specificIds);

      setCleanSuccess(
        `Successfully trashed ${successCount} exact duplicates, reclaiming ${formatBytes(totalSize)}!`
      );
    } catch (e: any) {
      console.error('Auto cleanup failed:', e);
    } finally {
      setIsCleaning(false);
    }
  };

  if (!activeRootPath) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground font-sans text-xs gap-2 select-none">
        <span>Please select a folder from the sidebar directory listing to begin.</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground font-sans text-xs gap-2 select-none">
        <span>No media items found in directory. Run a folder scan first.</span>
      </div>
    );
  }

  return (
    <PageContainer className="h-full select-none" maxWidth="xl">
      <div className="flex-1 min-h-0 relative flex flex-col gap-4">
        {showSummary ? (
          <ReviewSummary onBackToQueue={() => setShowSummary(false)} />
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={val => handleTabChange(val as any)}
            className="w-full flex-1 flex flex-col min-h-0"
          >
            <div className="flex items-center justify-center border-b border-border pb-3 shrink-0">
              <TabsList className="bg-muted/50 border border-border h-9 p-0.5">
                <TabsTrigger value="auto" className="text-xs h-8 px-4 rounded-md">
                  Exact Duplicates ({exactDupsToDelete.length})
                </TabsTrigger>
                <TabsTrigger value="manual" className="text-xs h-8 px-4 rounded-md">
                  Similar Media ({manualReviewGroups.length} groups)
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 min-h-0 mt-4">
              <TabsContent value="auto" className="h-full m-0 flex flex-col min-h-0">
                {exactDupsToDelete.length > 0 ? (
                  <div className="grid lg:grid-cols-3 gap-6 flex-1 min-h-0 overflow-hidden">
                    {/* Left Panel: Actions and Summary */}
                    <div className="lg:col-span-1 flex flex-col gap-4 shrink-0">
                      <Card className="border-border bg-card/65 shadow-sm">
                        <CardHeader>
                          <CardTitle className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            Auto-Cleanup Summary
                          </CardTitle>
                          <CardDescription className="text-2xs">
                            Identical copies found. Ready to clean up safely.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="border border-border bg-muted/20 p-4 rounded-xl text-center">
                            <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Storage Reclaimable
                            </span>
                            <div className="font-heading font-bold text-2xl text-primary mt-1">
                              {formatBytes(exactDupsToDelete.reduce((acc, i) => acc + i.size, 0))}
                            </div>
                            <span className="text-3xs text-muted-foreground block mt-1">
                              From {exactDupsToDelete.length} redundant duplicate files
                            </span>
                          </div>

                          <div className="text-3xs text-muted-foreground leading-relaxed">
                            <strong>Note:</strong> Galleo will move the duplicate files to the Recycle Bin and
                            keep the best quality copy of each file in your library.
                          </div>
                        </CardContent>
                        <CardFooter>
                          <Button
                            className="w-full h-9 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white cursor-pointer gap-1.5 shadow-sm"
                            onClick={handleAutoCleanup}
                            disabled={isCleaning}
                          >
                            {isCleaning ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Trashing Files...
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-3.5 h-3.5" />
                                Trash {exactDupsToDelete.length} Duplicates
                              </>
                            )}
                          </Button>
                        </CardFooter>
                      </Card>

                      {cleanSuccess && (
                        <div className="p-3 border border-green-500/20 bg-green-500/5 text-green-600 dark:text-green-400 text-2xs rounded-lg flex gap-2 items-center">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>{cleanSuccess}</span>
                        </div>
                      )}
                    </div>

                    {/* Right Panel: List of files to delete */}
                    <Card className="lg:col-span-2 border-border bg-card/65 shadow-sm flex flex-col min-h-0">
                      <CardHeader className="pb-3 border-b border-border shrink-0">
                        <CardTitle className="text-xs font-semibold text-foreground">
                          Exact Copies Scheduled for Deletion
                        </CardTitle>
                        <CardDescription className="text-2xs">
                          Review files before trashing. The best-quality version will be kept.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-0 flex-1 min-h-0 overflow-y-auto scrollbar-thin">
                        <Table className="text-2xs">
                          <TableHeader className="bg-muted/10 shrink-0 sticky top-0 backdrop-blur-md">
                            <TableRow className="border-border hover:bg-transparent">
                              <TableHead>Filename</TableHead>
                              <TableHead>Original File Path</TableHead>
                              <TableHead>Duplicate File Path</TableHead>
                              <TableHead className="text-right">Size</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {exactDupsToDelete.map(item => {
                              const group = duplicateGroups.find(g => g.some(i => i.id === item.id));
                              const best = group?.find(i => i.isBestInDuplicateGroup) || item;
                              return (
                                <TableRow key={item.id} className="border-border hover:bg-transparent">
                                  <TableCell
                                    className="font-semibold text-foreground truncate max-w-[150px]"
                                    title={item.name}
                                  >
                                    {item.name}
                                  </TableCell>
                                  <TableCell
                                    className="text-muted-foreground truncate max-w-[200px] text-2xs"
                                    title={best.path}
                                  >
                                    {best.path}
                                  </TableCell>
                                  <TableCell
                                    className="text-destructive/80 truncate max-w-[200px] text-2xs"
                                    title={item.path}
                                  >
                                    {item.path}
                                  </TableCell>
                                  <TableCell className="tabular-nums text-muted-foreground text-right">
                                    {formatBytes(item.size)}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-border rounded-xl p-8 bg-card/10 h-64">
                    <CheckCircle2 className="w-10 h-10 text-green-500 mb-3" />
                    <h3 className="text-xs font-semibold text-foreground">No Exact Duplicates Found</h3>
                    <p className="text-2xs text-muted-foreground mt-1 text-center max-w-sm">
                      All identical file groups in this directory have been cleaned up! Any remaining duplicates
                      have differences in name or size and should be reviewed manually in the next tab.
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="manual" className="h-full m-0 flex flex-col min-h-0">
                {manualReviewItems.length > 0 ? (
                  <BatchReview
                    items={manualReviewItems}
                    onReviewAction={handleReviewAction}
                    onComplete={() => setShowSummary(true)}
                    activeGroupIndex={manualGroupIndex}
                    onGroupIndexChange={handleGroupIndexChange}
                  />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-border rounded-xl p-8 bg-card/10 h-64">
                    <Bookmark className="w-10 h-10 text-primary mb-3" />
                    <h3 className="text-xs font-semibold text-foreground">All Similar Photos Reviewed</h3>
                    <p className="text-2xs text-muted-foreground mt-1 text-center max-w-sm">
                      No groups of similar files are currently left to review. Great job!
                    </p>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        )}
      </div>
    </PageContainer>
  );
};
