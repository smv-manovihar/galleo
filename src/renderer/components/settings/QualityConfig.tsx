import React, { useState } from "react"
import { useSettingsStore } from "../../stores/settings-store"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { SlidersHorizontal, Focus, Moon } from "lucide-react"

export const QualityConfig: React.FC = () => {
  const { settings, saveSettings } = useSettingsStore()

  const [blurVal, setBlurVal] = useState(settings.quality.blurThreshold)
  const [darkVal, setDarkVal] = useState(settings.quality.darknessThreshold)

  const handleBlurCommit = async (val: number[]) => {
    const newVal = val[0]
    setBlurVal(newVal)
    await saveSettings({
      ...settings,
      quality: {
        ...settings.quality,
        blurThreshold: newVal,
      },
    })
    toast.success("Quality thresholds updated successfully", {
      description: `Blurry sensitivity set to ${newVal}.`,
    })
  }

  const handleDarkCommit = async (val: number[]) => {
    const newVal = val[0]
    setDarkVal(newVal)
    await saveSettings({
      ...settings,
      quality: {
        ...settings.quality,
        darknessThreshold: newVal,
      },
    })
    toast.success("Quality thresholds updated successfully", {
      description: `Darkness exposure set to ${newVal}.`,
    })
  }

  return (
    <div className="space-y-4 font-sans text-xs select-none">
      <Card className="border-border/60 bg-card/50 shadow-xs">
        <CardHeader className="border-b border-border/40 px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wide">
            <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
            Defect Thresholds
          </CardTitle>
          <CardDescription className="text-2xs text-muted-foreground">
            Configure sensitivity parameters for automated photo quality flags.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          {/* Blur Score Slider */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <Label className="flex items-center gap-1.5 text-2xs font-bold text-muted-foreground uppercase tracking-wider">
                <Focus className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" />
                Blurry Threshold
              </Label>
              <span className="font-mono text-2xs font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                {blurVal} (below = blurry)
              </span>
            </div>
            <Slider
              value={[blurVal]}
              onValueChange={(val: number[]) => setBlurVal(val[0])}
              onValueCommit={handleBlurCommit}
              min={10}
              max={80}
              step={1}
              className="py-1"
            />
            <p className="text-2xs text-muted-foreground leading-relaxed">
              Higher values increase blur detection sensitivity during library scanning.
            </p>
          </div>

          <div className="h-px bg-border/40" />

          {/* Exposure Darkness Slider */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <Label className="flex items-center gap-1.5 text-2xs font-bold text-muted-foreground uppercase tracking-wider">
                <Moon className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                Darkness Threshold
              </Label>
              <span className="font-mono text-2xs font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                {darkVal} (0-255, below = dark)
              </span>
            </div>
            <Slider
              value={[darkVal]}
              onValueChange={(val: number[]) => setDarkVal(val[0])}
              onValueCommit={handleDarkCommit}
              min={10}
              max={100}
              step={1}
              className="py-1"
            />
            <p className="text-2xs text-muted-foreground leading-relaxed">
              Higher values flag more underexposed photos as dark in quality review.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
