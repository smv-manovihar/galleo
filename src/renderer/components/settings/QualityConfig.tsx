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
    <div className="space-y-6 font-sans text-xs select-none">
      <Card className="border-border bg-card/45">
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">
            Defect Thresholds
          </CardTitle>
          <CardDescription className="mt-0.5 text-xs text-muted-foreground">
            Adjust sensitivity variables for quality flags.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-4">
          {/* Blur Score Slider */}
          <div className="space-y-2">
            <div className="flex flex-col justify-between gap-1 text-xs font-semibold text-muted-foreground sm:flex-row sm:items-center">
              <Label className="uppercase">Blurry Threshold</Label>
              <span className="font-mono text-primary">
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
              className="py-3 sm:py-4"
            />
            <p className="text-xs leading-normal text-muted-foreground">
              Higher values increase blur detection sensitivity.
            </p>
          </div>

          {/* Exposure Darkness Slider */}
          <div className="space-y-2">
            <div className="flex flex-col justify-between gap-1 text-xs font-semibold text-muted-foreground sm:flex-row sm:items-center">
              <Label className="uppercase">Darkness Threshold</Label>
              <span className="font-mono text-primary">
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
              className="py-3 sm:py-4"
            />
            <p className="text-xs leading-normal text-muted-foreground">
              Higher values flag more underexposed photos as dark.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
