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
import { SlidersHorizontal, Focus, Moon, Images } from "lucide-react"
import {
  DEFAULT_SIMILARITY_RADIUS,
  MIN_SIMILARITY_RADIUS,
  MAX_SIMILARITY_RADIUS,
} from "../../lib/similarity"

export const QualityConfig: React.FC = () => {
  const { settings, saveSettings } = useSettingsStore()

  const [blurVal, setBlurVal] = useState(settings.quality.blurThreshold)
  const [darkVal, setDarkVal] = useState(settings.quality.darknessThreshold)
  const [simVal, setSimVal] = useState(
    settings.quality.similarityRadius ?? DEFAULT_SIMILARITY_RADIUS
  )

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

  const handleSimCommit = async (val: number[]) => {
    const newVal = val[0]
    setSimVal(newVal)
    await saveSettings({
      ...settings,
      quality: {
        ...settings.quality,
        similarityRadius: newVal,
      },
    })
    toast.success("Default similarity radius updated", {
      description: `Default visual search radius set to ${newVal}.`,
    })
  }

  return (
    <div className="space-y-4 font-sans text-xs select-none">
      <Card className="border-border/60 bg-card/50 shadow-xs py-0 gap-0">
        <CardHeader className="border-b border-border/40 px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <SlidersHorizontal className="size-4 text-primary" />
            Quality & Similarity Thresholds
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Configure sensitivity parameters for automated photo quality flags and visual search.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          {/* Blur Score Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <Focus className="size-4 text-sky-500 dark:text-sky-400" />
                Blurry Threshold
              </Label>
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 tabular-nums">
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
            <p className="text-xs text-muted-foreground leading-relaxed">
              Higher values increase blur detection sensitivity during library scanning.
            </p>
          </div>

          <div className="h-px bg-border/40" />

          {/* Exposure Darkness Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <Moon className="size-4 text-indigo-500 dark:text-indigo-400" />
                Darkness Threshold
              </Label>
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 tabular-nums">
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
            <p className="text-xs text-muted-foreground leading-relaxed">
              Higher values flag more underexposed photos as dark in quality review.
            </p>
          </div>

          <div className="h-px bg-border/40" />

          {/* Default Similarity Search Radius Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <Images className="size-4 text-sky-500 dark:text-sky-400" />
                Default Visual Similarity Radius
              </Label>
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 tabular-nums">
                {simVal} (distance)
              </span>
            </div>
            <Slider
              value={[simVal]}
              onValueChange={(val: number[]) => setSimVal(val[0])}
              onValueCommit={handleSimCommit}
              min={MIN_SIMILARITY_RADIUS}
              max={MAX_SIMILARITY_RADIUS}
              step={2}
              className="py-1"
            />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Default perceptual distance for finding similar photos in Browse Media. Lower values find strict visual matches; higher values discover broader scene compositions.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
