import React from 'react';
import { useUIStore } from '../../stores/ui-store';
import { useMediaStore } from '../../stores/media-store';
import { useSettingsStore } from '../../stores/settings-store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { 
  Search, 
  Play, 
  Square,
  Moon,
  Sun,
  Laptop,
  ChevronDown,
  RefreshCw
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

export const TopBar: React.FC = () => {
  const { currentView, theme, setTheme } = useUIStore();
  const { searchQuery, setSearchQuery, isScanning, startScan, cancelScan, scanProgress } = useMediaStore();
  const { settings } = useSettingsStore();

  const [showRescanDialog, setShowRescanDialog] = React.useState(false);
  const [selectedPaths, setSelectedPaths] = React.useState<string[]>([]);

  const handleOpenRescanDialog = () => {
    const enabledRoots = settings.folders.roots.filter(r => r.enabled).map(r => r.path);
    setSelectedPaths(enabledRoots);
    setShowRescanDialog(true);
  };

  const handleToggleFolder = (path: string) => {
    setSelectedPaths(prev =>
      prev.includes(path)
        ? prev.filter(p => p !== path)
        : [...prev, path]
    );
  };

  const handleToggleSelectAll = () => {
    const allPaths = settings.folders.roots.map(r => r.path);
    if (selectedPaths.length === allPaths.length) {
      setSelectedPaths([]);
    } else {
      setSelectedPaths(allPaths);
    }
  };

  const handleStartForcedRescan = () => {
    if (selectedPaths.length > 0) {
      startScan(selectedPaths, true);
      setShowRescanDialog(false);
    }
  };

  const getTitle = () => {
    switch (currentView) {
      case 'dashboard': return 'Dashboard';
      case 'browse': return 'Browse Media';
      case 'review': return 'Media Culling';
      case 'duplicates': return 'Duplicate Audit';
      case 'organize': return 'Date Organizer';
      case 'settings': return 'Settings';
      default: return 'MediaPurge';
    }
  };

  const handleScanClick = () => {
    if (isScanning) {
      cancelScan();
    } else {
      const enabledRoots = settings.folders.roots.filter(r => r.enabled).map(r => r.path);
      if (enabledRoots.length > 0) {
        startScan(enabledRoots);
      }
    }
  };

  const cycleTheme = () => {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

  const renderThemeIcon = () => {
    switch (theme) {
      case 'light': return <Sun className="w-4 h-4 text-foreground" />;
      case 'dark': return <Moon className="w-4 h-4 text-foreground" />;
      default: return <Laptop className="w-4 h-4 text-foreground" />;
    }
  };

  return (
    <header className="h-16 border-b border-border bg-card/45 backdrop-blur-md px-6 flex items-center justify-between select-none gap-4">
      {/* Title & Trigger */}
      <div className="flex items-center gap-3">
        <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:text-foreground border border-border rounded-lg bg-background/50" />
        <h2 className="font-heading font-bold text-lg text-foreground leading-none">{getTitle()}</h2>
      </div>

      {/* Global Actions */}
      <div className="flex items-center gap-4">
        {/* Search Bar (Only shown on Browse/Dashboard views) */}
        {(currentView === 'browse' || currentView === 'dashboard') && (
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search files..."
              className="pl-9 h-9 w-full bg-background/50 border-border focus-visible:ring-1 focus-visible:ring-primary rounded-lg text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}

        {/* Scan Button */}
        {settings.folders.roots.some(r => r.enabled) && (
          <div className="flex items-center gap-3">
            {isScanning && (
              <div className="text-right text-2xs text-muted-foreground font-sans max-w-44 truncate">
                <div className="font-semibold text-primary">Scanning...</div>
                <div className="truncate">{scanProgress.currentFile || 'Reading...'}</div>
              </div>
            )}
            {isScanning ? (
              <Button
                variant="destructive"
                size="sm"
                className="gap-2 h-9 rounded-lg font-medium text-xs px-3.5 shadow-sm cursor-pointer"
                onClick={handleScanClick}
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                Stop Scan
              </Button>
            ) : (
              <div className="flex items-center -space-x-px">
                <Button
                  variant="default"
                  size="sm"
                  className="gap-2 h-9 rounded-l-lg font-medium text-xs px-3.5 shadow-sm border-r border-primary-foreground/15 cursor-pointer"
                  onClick={handleScanClick}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Scan Folders
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="default"
                      size="icon"
                      className="h-9 w-7 rounded-r-lg px-0 shadow-sm cursor-pointer"
                    >
                      <ChevronDown className="w-3.5 h-3.5 text-primary-foreground/90" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36 border-border bg-card/95 backdrop-blur-md text-foreground font-sans text-xs">
                    <DropdownMenuItem 
                      onClick={handleScanClick}
                      className="gap-2 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Standard Scan
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={handleOpenRescanDialog}
                      className="gap-2 text-primary focus:text-primary cursor-pointer font-medium"
                    >
                      <Play className="w-3.5 h-3.5 fill-primary/10" />
                      Force Rescan
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        )}

        {/* Theme Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="w-9 h-9 rounded-lg border-border hover:bg-accent"
              onClick={cycleTheme}
            >
              {renderThemeIcon()}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Toggle Theme
          </TooltipContent>
        </Tooltip>
      </div>

      <Dialog open={showRescanDialog} onOpenChange={setShowRescanDialog}>
        <DialogContent className="max-w-md bg-card border border-border text-foreground font-sans outline-none p-6 gap-5">
          <DialogHeader className="space-y-1.5 border-b border-border pb-4">
            <DialogTitle className="flex items-center gap-2.5 text-sm font-bold text-foreground">
              <RefreshCw className="h-4.5 w-4.5 text-primary" />
              Force Rescan Folders
            </DialogTitle>
            <DialogDescription className="text-2xs text-muted-foreground leading-normal">
              Bypass cached metadata and re-analyze all files. This is useful if files were edited outside the app, but scanning will take longer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 min-h-0 flex-1 flex flex-col">
            <div className="flex items-center justify-between">
              <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">Select Folders</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-2xs px-2 text-primary hover:text-primary/80 hover:bg-primary/5 cursor-pointer font-semibold"
                onClick={handleToggleSelectAll}
              >
                {selectedPaths.length === settings.folders.roots.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {settings.folders.roots.map((root) => {
                const isChecked = selectedPaths.includes(root.path);
                return (
                  <div
                    key={root.path}
                    onClick={() => handleToggleFolder(root.path)}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer select-none transition-all duration-150 ${
                      isChecked 
                        ? 'border-primary/45 bg-primary/5 hover:bg-primary/10' 
                        : 'border-border bg-background/40 hover:bg-accent/40'
                    }`}
                  >
                    <Checkbox
                      id={`rescan-folder-${root.path}`}
                      checked={isChecked}
                      onCheckedChange={() => handleToggleFolder(root.path)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="grid gap-0.5 flex-1 min-w-0">
                      <Label
                        htmlFor={`rescan-folder-${root.path}`}
                        className="text-xs font-semibold text-foreground cursor-pointer truncate"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {root.label}
                      </Label>
                      <span className="text-2xs text-muted-foreground truncate leading-normal">
                        {root.path}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="gap-2.5 border-t border-border pt-4 mt-1">
            <DialogClose asChild>
              <Button variant="outline" className="h-9 font-semibold text-xs cursor-pointer px-4">
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="default"
              className="h-9 font-semibold text-xs cursor-pointer px-4 bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm"
              disabled={selectedPaths.length === 0}
              onClick={handleStartForcedRescan}
            >
              Start Rescan ({selectedPaths.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
};
