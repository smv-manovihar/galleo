import React, { useState, useEffect } from 'react';
import { useUIStore } from '../stores/ui-store';
import { FolderConfig } from '../components/settings/FolderConfig';
import { ScanConfig } from '../components/settings/ScanConfig';
import { QualityConfig } from '../components/settings/QualityConfig';
import { AppearanceConfig } from '../components/settings/AppearanceConfig';
import { ResetConfig } from '../components/settings/ResetConfig';
import { AboutConfig } from '../components/settings/AboutConfig';
import { PageContainer } from '@/components/ui/page-layout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  FolderSync, 
  Settings2, 
  LineChart, 
  Eye,
  RefreshCcw,
  Info
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { activeSettingsTab, setActiveSettingsTab, updateInfo, dismissedVersion } = useUIStore();
  const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('vertical');

  useEffect(() => {
    const handleResize = () => {
      setOrientation(window.innerWidth < 768 ? 'horizontal' : 'vertical');
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <PageContainer maxWidth="xl">
      <Tabs
        value={activeSettingsTab}
        onValueChange={(val: string) => setActiveSettingsTab(val as 'folders' | 'scan' | 'quality' | 'appearance' | 'reset' | 'about')}
        orientation={orientation}
        className="flex flex-col md:flex-row gap-6 md:gap-8 items-stretch flex-1 min-h-0"
      >
        {/* Settings Navigation Tabs Sidebar */}
        <TabsList className="bg-card/45 border border-border flex flex-row md:flex-col h-auto p-1.5 w-full md:w-48 gap-1.5 shrink-0 select-none overflow-x-auto scrollbar-none md:overflow-x-visible md:sticky md:top-6">
          <TabsTrigger value="folders" className="flex-1 md:flex-none w-auto md:w-full justify-start h-8 text-sm font-medium gap-2 px-3">
            <FolderSync className="w-4 h-4" />
            Allowed Roots
          </TabsTrigger>
          <TabsTrigger value="scan" className="flex-1 md:flex-none w-auto md:w-full justify-start h-8 text-sm font-medium gap-2 px-3">
            <Settings2 className="w-4 h-4" />
            Scan Rules
          </TabsTrigger>
          <TabsTrigger value="quality" className="flex-1 md:flex-none w-auto md:w-full justify-start h-8 text-sm font-medium gap-2 px-3">
            <LineChart className="w-4 h-4" />
            Defect Sensitivity
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex-1 md:flex-none w-auto md:w-full justify-start h-8 text-sm font-medium gap-2 px-3">
            <Eye className="w-4 h-4" />
            Theme & Interface
          </TabsTrigger>
          <TabsTrigger value="reset" className="flex-1 md:flex-none w-auto md:w-full justify-start h-8 text-sm font-medium gap-2 px-3">
            <RefreshCcw className="w-4 h-4" />
            Reset App Data
          </TabsTrigger>
          <TabsTrigger value="about" className="flex-1 md:flex-none w-auto md:w-full justify-start h-8 text-sm font-medium gap-2 px-3">
            <Info className="w-4 h-4" />
            About & Updates
            {updateInfo?.updateAvailable && updateInfo.latestVersion !== dismissedVersion && (
              <span className="ml-auto flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            )}
          </TabsTrigger>
        </TabsList>

        {/* Configurations Views Panels */}
        <div className="flex-1 min-w-0">
          <TabsContent value="folders" className="m-0 focus-visible:outline-none">
            <FolderConfig />
          </TabsContent>
          <TabsContent value="scan" className="m-0 focus-visible:outline-none">
            <ScanConfig />
          </TabsContent>
          <TabsContent value="quality" className="m-0 focus-visible:outline-none">
            <QualityConfig />
          </TabsContent>
          <TabsContent value="appearance" className="m-0 focus-visible:outline-none">
            <AppearanceConfig />
          </TabsContent>
          <TabsContent value="reset" className="m-0 focus-visible:outline-none">
            <ResetConfig />
          </TabsContent>
          <TabsContent value="about" className="m-0 focus-visible:outline-none">
            <AboutConfig />
          </TabsContent>
        </div>
      </Tabs>
    </PageContainer>
  );
};
