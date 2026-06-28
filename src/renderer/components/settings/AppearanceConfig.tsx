import React from 'react';
import { useSettingsStore } from '../../stores/settings-store';
import { useUIStore } from '../../stores/ui-store';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

export const AppearanceConfig: React.FC = () => {
  const { settings, saveSettings } = useSettingsStore();
  const { setTheme } = useUIStore();

  const handleThemeChange = async (val: string) => {
    const nextTheme = val as 'dark' | 'light' | 'system';
    
    // Update local React UI shell theme class list
    setTheme(nextTheme);
    
    // Save to settings db
    await saveSettings({
      ...settings,
      ui: {
        ...settings.ui,
        theme: nextTheme
      }
    });
  };

  const handleFontSizeChange = async (val: string) => {
    const nextSize = val as 'sm' | 'md' | 'lg' | 'xl';
    
    await saveSettings({
      ...settings,
      ui: {
        ...settings.ui,
        fontSize: nextSize
      }
    });
  };

  return (
    <div className="space-y-6 font-sans text-xs select-none">
      <Card className="border-border bg-card/45">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-sm font-semibold text-foreground">Theme & Interface</CardTitle>
          <CardDescription className="text-xs mt-0.5 text-muted-foreground">
            Configure application visual styles and appearance preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-3">
            <Label className="font-semibold text-muted-foreground text-xs uppercase">Color Theme</Label>
            
            <RadioGroup
              value={settings.ui.theme || 'system'}
              onValueChange={handleThemeChange}
              className="flex flex-col sm:flex-row gap-4 sm:gap-6 mt-1"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="light" id="theme-light" className="border-border focus-visible:ring-1" />
                <Label htmlFor="theme-light" className="font-medium cursor-pointer">Light Theme</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="dark" id="theme-dark" className="border-border focus-visible:ring-1" />
                <Label htmlFor="theme-dark" className="font-medium cursor-pointer">Dark Theme</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="system" id="theme-system" className="border-border focus-visible:ring-1" />
                <Label htmlFor="theme-system" className="font-medium cursor-pointer">System Sync</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="h-px bg-border my-6" />

          <div className="space-y-3">
            <Label className="font-semibold text-muted-foreground text-xs uppercase">Font Size Scale</Label>
            
            <RadioGroup
              value={settings.ui.fontSize || 'md'}
              onValueChange={handleFontSizeChange}
              className="flex flex-col sm:flex-row gap-4 sm:gap-6 mt-1"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="sm" id="font-sm" className="border-border focus-visible:ring-1" />
                <Label htmlFor="font-sm" className="font-medium cursor-pointer">Small (85%)</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="md" id="font-md" className="border-border focus-visible:ring-1" />
                <Label htmlFor="font-md" className="font-medium cursor-pointer">Normal (100%)</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="lg" id="font-lg" className="border-border focus-visible:ring-1" />
                <Label htmlFor="font-lg" className="font-medium cursor-pointer">Large (115%)</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="xl" id="font-xl" className="border-border focus-visible:ring-1" />
                <Label htmlFor="font-xl" className="font-medium cursor-pointer">Extra Large (130%)</Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
