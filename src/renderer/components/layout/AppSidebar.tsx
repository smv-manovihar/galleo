import React from 'react';
import { useUIStore } from '../../stores/ui-store';
import { useSettingsStore } from '../../stores/settings-store';
import { useMediaStore } from '../../stores/media-store';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  FolderOpen,
  CheckSquare,
  Copy,
  CalendarDays,
  Settings,
  Folder,
  Plus,
  Trash2,
  Aperture
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarSeparator,
  SidebarRail,
  SidebarMenuAction,
} from '@/components/ui/sidebar';

export const AppSidebar: React.FC = () => {
  const { currentView, setCurrentView } = useUIStore();
  const { settings, addRootFolder, removeRootFolder } = useSettingsStore();
  const { activeRootPath, fetchMediaItems } = useMediaStore();

  const navItems = [
    { view: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { view: 'browse' as const, label: 'Browse Media', icon: FolderOpen },
    { view: 'review' as const, label: 'Media Culling', icon: CheckSquare },
    { view: 'duplicates' as const, label: 'Duplicate Audit', icon: Copy },
    { view: 'organize' as const, label: 'Organize Files', icon: CalendarDays },
    { view: 'settings' as const, label: 'Settings', icon: Settings },
  ];

  const handleAddFolder = async () => {
    try {
      const selected = await window.api.selectFolder();
      if (selected) {
        await addRootFolder(selected);
      }
    } catch (e) {
      console.error('Folder selection failed:', e);
    }
  };

  const handleFolderClick = async (path: string) => {
    setCurrentView('browse');
    await fetchMediaItems(path);
  };

  return (
    <Sidebar className="border-r border-border bg-card/60 backdrop-blur-md">
      <SidebarHeader className="p-6 border-b border-border flex flex-row items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-linear-to-br from-primary to-destructive text-primary-foreground shrink-0">
          <Aperture className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-base tracking-wider text-foreground">MediaPurge</h1>
          <p className="text-xs text-muted-foreground font-sans">Smart Cleanup & Organizer</p>
        </div>
      </SidebarHeader>

      {/* Main Navigation */}
      <SidebarContent className="p-4 flex flex-col gap-4">
        <SidebarGroup className="p-0">
          <SidebarMenu className="gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.view;
              return (
                <SidebarMenuItem key={item.view}>
                  <SidebarMenuButton
                    isActive={isActive}
                    onClick={() => setCurrentView(item.view)}
                    className="w-full justify-start gap-3 px-3 py-2 text-sm font-medium transition-colors"
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator className="bg-border opacity-50" />

        {/* Source Directories */}
        <SidebarGroup className="p-0 flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between px-2 mb-2">
            <SidebarGroupLabel className="text-[0.6875rem] font-semibold text-muted-foreground uppercase tracking-wider p-0">
              Root Directories
            </SidebarGroupLabel>
            <Button
              variant="ghost"
              size="icon"
              className="w-5 h-5 text-muted-foreground hover:text-foreground hover:bg-accent rounded"
              onClick={handleAddFolder}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>

          <SidebarGroupContent className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1">
            {settings.folders.roots.length === 0 ? (
              <div className="text-xs text-muted-foreground px-3 py-4 text-center border border-dashed border-border rounded-lg bg-muted/20">
                No folders added yet
              </div>
            ) : (
              <SidebarMenu className="gap-1">
                {settings.folders.roots.map((root) => {
                  const isSelected = activeRootPath === root.path;
                  return (
                    <SidebarMenuItem key={root.path}>
                      <SidebarMenuButton
                        isActive={isSelected}
                        onClick={() => handleFolderClick(root.path)}
                        className="w-full justify-start gap-2.5 px-3 py-1.5"
                      >
                        <Folder className={`w-4 h-4 shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className="truncate">{root.label || root.path}</span>
                      </SidebarMenuButton>
                      <SidebarMenuAction
                        showOnHover
                        className="w-5 h-5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-opacity"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          removeRootFolder(root.path);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </SidebarMenuAction>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
};
