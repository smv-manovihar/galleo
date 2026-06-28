import React from 'react';
import { useMediaStore } from '../stores/media-store';
import { useUIStore } from '../stores/ui-store';
import { useSettingsStore } from '../stores/settings-store';
import { Card as ShadcnCard, CardHeader as ShadcnCardHeader, CardTitle as ShadcnCardTitle, CardDescription as ShadcnCardDescription, CardContent as ShadcnCardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageContainer } from '@/components/ui/page-layout';
import { 
  Sparkles, 
  Layers, 
  FolderOpen, 
  ArrowRight,
  TrendingDown,
  AlertCircle
} from 'lucide-react';
import { formatBytes } from '../lib/format';

export const DashboardPage: React.FC = () => {
  const { items, setFilterQuality, startScan } = useMediaStore();
  const { setCurrentView } = useUIStore();
  const { settings } = useSettingsStore();

  const totalFiles = items.length;
  const totalSize = items.reduce((sum, i) => sum + i.size, 0);

  // Filter specific defects
  const blurryItems = items.filter(i => i.quality?.isBlurry);
  const darkItems = items.filter(i => i.quality?.isDark);
  const duplicateItems = items.filter(i => i.isDuplicate && !i.isBestInDuplicateGroup);
  const screenshotItems = items.filter(i => i.quality?.isScreenshot);
  
  const duplicateSavedBytes = duplicateItems.reduce((sum, i) => sum + i.size, 0);
  const blurrySavedBytes = blurryItems.reduce((sum, i) => sum + i.size, 0);
  const totalWastedBytes = duplicateSavedBytes + blurrySavedBytes;

  const navigateToFiltered = (filter: 'blurry' | 'duplicates' | 'screenshots' | 'dark') => {
    setFilterQuality(filter);
    setCurrentView('browse');
  };

  const handleQuickScan = () => {
    const enabledRoots = settings.folders.roots.filter(r => r.enabled).map(r => r.path);
    if (enabledRoots.length > 0) {
      startScan(enabledRoots);
    }
  };

  return (
    <PageContainer className="select-none font-sans text-xs" maxWidth="xl">
      {/* Top Banner */}
      <div className="flex items-center justify-between border border-border bg-card/45 backdrop-blur-md p-6 rounded-lg">
        <div className="space-y-1">
          <h3 className="font-heading font-bold text-lg text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Media Storage Health
          </h3>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Review scanning insights to find duplicate photos, blurry screenshot captures, and recover wasted space.
          </p>
        </div>
        
        {settings.folders.roots.length > 0 && totalFiles === 0 && (
          <Button onClick={handleQuickScan} size="sm" className="px-4 py-2 font-medium">
            Run Initial Scan
          </Button>
        )}
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-4 gap-4">
        <ShadcnCard className="border-border bg-card/65">
          <ShadcnCardHeader className="pb-2">
            <ShadcnCardDescription className="text-2xs uppercase font-semibold text-muted-foreground">Total Files</ShadcnCardDescription>
            <ShadcnCardTitle className="font-heading font-bold text-xl text-foreground mt-0.5">{totalFiles}</ShadcnCardTitle>
          </ShadcnCardHeader>
          <ShadcnCardContent className="text-2xs text-muted-foreground">
            Scanned photos and videos
          </ShadcnCardContent>
        </ShadcnCard>

        <ShadcnCard className="border-border bg-card/65">
          <ShadcnCardHeader className="pb-2">
            <ShadcnCardDescription className="text-2xs uppercase font-semibold text-muted-foreground">Library Size</ShadcnCardDescription>
            <ShadcnCardTitle className="font-heading font-bold text-xl text-foreground mt-0.5">{formatBytes(totalSize)}</ShadcnCardTitle>
          </ShadcnCardHeader>
          <ShadcnCardContent className="text-2xs text-muted-foreground">
            Total disk space utilized
          </ShadcnCardContent>
        </ShadcnCard>

        <ShadcnCard className="bg-card/65 border-primary/20">
          <ShadcnCardHeader className="pb-2">
            <ShadcnCardDescription className="text-2xs uppercase font-semibold text-primary flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5" />
              Wasted Space
            </ShadcnCardDescription>
            <ShadcnCardTitle className="font-heading font-bold text-xl text-foreground mt-0.5">{formatBytes(totalWastedBytes)}</ShadcnCardTitle>
          </ShadcnCardHeader>
          <ShadcnCardContent className="text-2xs text-muted-foreground">
            From duplicates and blurry photos
          </ShadcnCardContent>
        </ShadcnCard>

        <ShadcnCard className="border-border bg-card/65">
          <ShadcnCardHeader className="pb-2">
            <ShadcnCardDescription className="text-2xs uppercase font-semibold text-muted-foreground">Duplicates</ShadcnCardDescription>
            <ShadcnCardTitle className="font-heading font-bold text-xl text-foreground mt-0.5">{duplicateItems.length}</ShadcnCardTitle>
          </ShadcnCardHeader>
          <ShadcnCardContent className="text-2xs text-muted-foreground">
            Redundant files to delete
          </ShadcnCardContent>
        </ShadcnCard>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-3 gap-6">
        {/* Cleanup Suggestions Panel */}
        <div className="col-span-2 space-y-4">
          <h4 className="font-heading font-bold text-sm text-foreground">Smart Cleanup Suggestions</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <ShadcnCard className="border-border bg-card/50 hover:bg-card/75 transition-colors cursor-pointer" onClick={() => navigateToFiltered('duplicates')}>
              <ShadcnCardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <ShadcnCardTitle className="text-sm font-semibold text-foreground">Duplicate Photos</ShadcnCardTitle>
                  <ShadcnCardDescription className="text-2xs mt-0.5 text-muted-foreground">
                    {duplicateItems.length} redundant copies detected
                  </ShadcnCardDescription>
                </div>
                <Badge variant="secondary" className="px-2 py-0.5 text-[0.5625rem] bg-primary/10 text-primary border border-primary/20">
                  Save {formatBytes(duplicateSavedBytes)}
                </Badge>
              </ShadcnCardHeader>
              <ShadcnCardContent className="flex items-center justify-between pt-2 text-2xs text-muted-foreground">
                <span>View and select best versions</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </ShadcnCardContent>
            </ShadcnCard>

            <ShadcnCard className="border-border bg-card/50 hover:bg-card/75 transition-colors cursor-pointer" onClick={() => navigateToFiltered('blurry')}>
              <ShadcnCardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <ShadcnCardTitle className="text-sm font-semibold text-foreground">Blurry Photos</ShadcnCardTitle>
                  <ShadcnCardDescription className="text-2xs mt-0.5 text-muted-foreground">
                    {blurryItems.length} images failed sharpness threshold
                  </ShadcnCardDescription>
                </div>
                <Badge variant="secondary" className="px-2 py-0.5 text-[0.5625rem] bg-destructive/10 text-destructive border border-destructive/20">
                  Save {formatBytes(blurrySavedBytes)}
                </Badge>
              </ShadcnCardHeader>
              <ShadcnCardContent className="flex items-center justify-between pt-2 text-2xs text-muted-foreground">
                <span>Review blurry images</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </ShadcnCardContent>
            </ShadcnCard>

            <ShadcnCard className="border-border bg-card/50 hover:bg-card/75 transition-colors cursor-pointer" onClick={() => navigateToFiltered('screenshots')}>
              <ShadcnCardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <ShadcnCardTitle className="text-sm font-semibold text-foreground">Screenshots</ShadcnCardTitle>
                  <ShadcnCardDescription className="text-2xs mt-0.5 text-muted-foreground">
                    {screenshotItems.length} screen captures flagged
                  </ShadcnCardDescription>
                </div>
                <span className="text-2xs text-muted-foreground">Total: {screenshotItems.length}</span>
              </ShadcnCardHeader>
              <ShadcnCardContent className="flex items-center justify-between pt-2 text-2xs text-muted-foreground">
                <span>Cleanup screenshots</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </ShadcnCardContent>
            </ShadcnCard>

            <ShadcnCard className="border-border bg-card/50 hover:bg-card/75 transition-colors cursor-pointer" onClick={() => navigateToFiltered('dark')}>
              <ShadcnCardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <ShadcnCardTitle className="text-sm font-semibold text-foreground">Dark Photos</ShadcnCardTitle>
                  <ShadcnCardDescription className="text-2xs mt-0.5 text-muted-foreground">
                    {darkItems.length} underexposed photos flagged
                  </ShadcnCardDescription>
                </div>
                <span className="text-2xs text-muted-foreground">Total: {darkItems.length}</span>
              </ShadcnCardHeader>
              <ShadcnCardContent className="flex items-center justify-between pt-2 text-2xs text-muted-foreground">
                <span>Review dark photos</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </ShadcnCardContent>
            </ShadcnCard>
          </div>
        </div>

        {/* Quick Operations Sidebar */}
        <div className="space-y-4">
          <h4 className="font-heading font-bold text-sm text-foreground">Quick Actions</h4>
          <ShadcnCard className="border-border bg-card/50">
            <ShadcnCardContent className="p-4 space-y-3 flex flex-col">
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3 h-10 text-left border-border bg-background/40 hover:bg-accent text-xs font-medium cursor-pointer"
                onClick={() => {
                  setFilterQuality('pending');
                  setCurrentView('review');
                }}
                disabled={totalFiles === 0}
              >
                <Sparkles className="w-4 h-4 text-primary" />
                Start Review Session
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3 h-10 text-left border-border bg-background/40 hover:bg-accent text-xs font-medium cursor-pointer"
                onClick={() => setCurrentView('organize')}
                disabled={totalFiles === 0}
              >
                <Layers className="w-4 h-4 text-primary" />
                Organize Files by Date
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3 h-10 text-left border-border bg-background/40 hover:bg-accent text-xs font-medium cursor-pointer"
                onClick={() => setCurrentView('settings')}
              >
                <FolderOpen className="w-4 h-4 text-primary" />
                Manage Source Roots
              </Button>
            </ShadcnCardContent>
          </ShadcnCard>

          {/* Quick instructions / Help */}
          {totalFiles === 0 && (
            <div className="border border-yellow-500/20 bg-yellow-500/5 rounded-lg p-4 flex gap-3 text-[0.6875rem] text-muted-foreground leading-normal">
              <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0" />
              <div>
                <strong className="text-foreground font-semibold">No media scanned yet!</strong>
                <p className="mt-1">
                  Ensure you configure allowed folders under Roots sidebar, then click the "Scan Folders" button in the header bar.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
};

// Helper badge component
interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}
const Badge: React.FC<BadgeProps> = ({ children, className, variant = 'default', ...props }) => {
  const base = "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
  const variants = {
    default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
    secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
    outline: "text-foreground border-border"
  };
  return (
    <div className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
};
