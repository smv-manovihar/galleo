import React from "react"
import type { MediaItem } from "../../../shared/types/media"
import { useSettingsStore } from "../../stores/settings-store"
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card"
import { Zap, Sun, Maximize, Monitor, AlertTriangle, Check } from "lucide-react"

export interface QualityScoreHoverCardProps {
  item: MediaItem
  children: React.ReactNode
  side?: "top" | "bottom" | "left" | "right"
  openDelay?: number
  closeDelay?: number
}

const getQualityGrade = (score: number) => {
  if (score >= 85)
    return {
      label: "Excellent",
      color:
        "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    }
  if (score >= 70)
    return {
      label: "Good",
      color:
        "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
    }
  if (score >= 50)
    return {
      label: "Fair",
      color:
        "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
    }
  return {
    label: "Poor (Flagged)",
    color:
      "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20",
  }
}

export const QualityScoreHoverCard: React.FC<QualityScoreHoverCardProps> = ({
  item,
  children,
  side = "bottom",
  openDelay = 200,
  closeDelay = 150,
}) => {
  const { settings } = useSettingsStore()

  if (!item.quality) {
    return <>{children}</>
  }

  const blurThreshold = settings?.quality?.blurThreshold ?? 30
  const darknessThreshold = settings?.quality?.darknessThreshold ?? 50
  const grade = getQualityGrade(item.quality.compositeScore)

  return (
    <HoverCard openDelay={openDelay} closeDelay={closeDelay}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        side={side}
        className="interactive-badge pointer-events-auto z-50 w-72 space-y-3 rounded-xl border border-border bg-card/95 p-4 font-sans text-xs text-foreground shadow-xl backdrop-blur-md select-none"
      >
        <div className="flex items-center justify-between border-b border-border/60 pb-2 font-sans">
          <span className="font-bold text-foreground">Quality Analytics</span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${grade.color}`}
          >
            {grade.label}
          </span>
        </div>

        <div className="space-y-2 font-sans">
          {/* Focus / Sharpness Metric */}
          <div className="flex items-start justify-between gap-1.5 text-2xs">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <Zap
                className={`h-3.5 w-3.5 ${
                  item.quality.isBlurry ? "text-amber-500" : "text-emerald-500"
                }`}
              />
              <span>Focus & Sharpness</span>
            </div>
            <div className="text-right">
              <div className="font-semibold text-foreground">
                Score: {item.quality.blurScore}
              </div>
              <div className="text-2xs text-muted-foreground">
                Threshold: {blurThreshold}
              </div>
            </div>
          </div>
          <div className="pl-5">
            {item.quality.isBlurry ? (
              <span className="flex items-center gap-1 text-2xs font-medium text-rose-500">
                <AlertTriangle className="h-3 w-3 shrink-0" /> Blurry Photo
                (Flagged Defect)
              </span>
            ) : (
              <span className="flex items-center gap-1 text-2xs font-medium text-emerald-500">
                <Check className="h-3 w-3 shrink-0" /> Sharp & Focused
              </span>
            )}
          </div>

          {/* Lighting / Exposure Metric */}
          <div className="flex items-start justify-between gap-1.5 border-t border-border/30 pt-1 text-2xs">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <Sun
                className={`h-3.5 w-3.5 ${
                  item.quality.isDark ? "text-rose-400" : "text-amber-400"
                }`}
              />
              <span>Lighting & Exposure</span>
            </div>
            <div className="text-right">
              <div className="font-semibold text-foreground">
                Value: {Math.round(item.quality.brightness)}
              </div>
              <div className="text-2xs text-muted-foreground">
                Threshold: {darknessThreshold}
              </div>
            </div>
          </div>
          <div className="pl-5">
            {item.quality.isDark ? (
              <span className="flex items-center gap-1 text-2xs font-medium text-rose-500">
                <AlertTriangle className="h-3 w-3 shrink-0" /> Under-exposed /
                Dark (Flagged Defect)
              </span>
            ) : (
              <span className="flex items-center gap-1 text-2xs font-medium text-emerald-500">
                <Check className="h-3 w-3 shrink-0" /> Well Exposed
              </span>
            )}
          </div>

          {/* Resolution Metric */}
          <div className="flex items-start justify-between gap-1.5 border-t border-border/30 pt-1 text-2xs">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <Maximize
                className={`h-3.5 w-3.5 ${
                  item.quality.isSmall ? "text-rose-500" : "text-blue-500"
                }`}
              />
              <span>Resolution check</span>
            </div>
            <div className="text-right">
              <div className="font-semibold text-foreground">
                {item.width && item.height
                  ? `${item.width} × ${item.height}`
                  : "N/A"}
              </div>
              <div className="text-2xs text-muted-foreground">
                {item.width && item.height
                  ? `${((item.width * item.height) / 1000000).toFixed(1)} MP`
                  : ""}
              </div>
            </div>
          </div>
          <div className="pl-5">
            {item.quality.isSmall ? (
              <span className="flex items-center gap-1 text-2xs font-medium text-rose-500">
                <AlertTriangle className="h-3 w-3 shrink-0" /> Low Resolution /
                Small File
              </span>
            ) : (
              <span className="flex items-center gap-1 text-2xs font-medium text-emerald-500">
                <Check className="h-3 w-3 shrink-0" /> High Resolution Pass
              </span>
            )}
          </div>

          {/* Screenshot / Clutter Check */}
          {item.quality.isScreenshot && (
            <div className="flex flex-col gap-1 border-t border-border/30 pt-1.5 text-2xs">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <Monitor className="h-3.5 w-3.5 text-purple-400" />
                <span>File Type Check</span>
              </div>
              <div className="flex items-center gap-1 pl-5 text-2xs font-medium text-amber-500">
                <AlertTriangle className="h-3 w-3 shrink-0" /> Screenshot
                (Likely Clutter)
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border/60 pt-2 text-[9px] leading-relaxed text-muted-foreground/80 font-sans">
          * Scores below 50 are automatically marked for cleanup. Adjust
          culling standards in Settings.
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
