import React, { useState } from 'react';
import { useSettingsStore } from '../../stores/settings-store';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

export const QualityConfig: React.FC = () => {
  const { settings, saveSettings } = useSettingsStore();

  const [blurVal, setBlurVal] = useState(settings.quality.blurThreshold);
  const [darkVal, setDarkVal] = useState(settings.quality.darknessThreshold);

  const handleBlurCommit = async (val: number[]) => {
    const newVal = val[0];
    setBlurVal(newVal);
    await saveSettings({
      ...settings,
      quality: {
        ...settings.quality,
        blurThreshold: newVal
      }
    });
  };

  const handleDarkCommit = async (val: number[]) => {
    const newVal = val[0];
    setDarkVal(newVal);
    await saveSettings({
      ...settings,
      quality: {
        ...settings.quality,
        darknessThreshold: newVal
      }
    });
  };

  return (
    <div className="space-y-6 font-sans text-xs select-none">
      <Card className="border-border bg-card/45">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-sm font-semibold text-foreground">Defect Thresholds</CardTitle>
          <CardDescription className="text-xs mt-0.5 text-muted-foreground">
            Adjust sensitivity variables for quality flags.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Blur Score Slider */}
          <div className="space-y-2">
            <div className="flex justify-between font-semibold text-xs uppercase text-muted-foreground">
              <Label>Blurry Threshold</Label>
              <span>{blurVal} (below = blurry)</span>
            </div>
            <Slider
              value={[blurVal]}
              onValueChange={(val: number[]) => setBlurVal(val[0])}
              onValueCommit={handleBlurCommit}
              min={10}
              max={80}
              step={1}
              className="py-4"
            />
            <p className="text-xs text-muted-foreground mt-1 leading-normal">
              Higher value makes the blur detector more sensitive, flagging more photos as blurry.
            </p>
          </div>

          {/* Exposure Darkness Slider */}
          <div className="space-y-2">
            <div className="flex justify-between font-semibold text-xs uppercase text-muted-foreground">
              <Label>Darkness Threshold</Label>
              <span>{darkVal} (0-255, below = dark)</span>
            </div>
            <Slider
              value={[darkVal]}
              onValueChange={(val: number[]) => setDarkVal(val[0])}
              onValueCommit={handleDarkCommit}
              min={10}
              max={100}
              step={1}
              className="py-4"
            />
            <p className="text-xs text-muted-foreground mt-1 leading-normal">
              Higher value flags more underexposed/dark photos as low quality.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
