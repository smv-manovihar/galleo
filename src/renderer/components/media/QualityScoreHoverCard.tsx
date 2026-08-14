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
    label: "Poor",
    color: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20",
  }
}

// Reusable micro-component for each metric to keep the main JSX clean and consistent
const MetricRow = ({
  icon: Icon,
  label,
  value,
  threshold,
  isWarning,
  warningText,
}: {
  icon: React.ElementType
  label: string
  value?: string | number
  threshold?: number
  isWarning: boolean
  warningText: string
}) => (
  <div className="flex items-center justify-between text-xs">
    <div className="flex items-center gap-2">
      <Icon
        className={`h-4 w-4 ${isWarning ? "text-rose-500" : "text-emerald-500"}`}
      />
      <span className="font-medium text-foreground">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      {value !== undefined && (
        <span className="text-muted-foreground">
          {value}
          {threshold && <span className="opacity-60"> / {threshold}</span>}
        </span>
      )}
      {isWarning ? (
        <span className="flex items-center gap-1 rounded bg-rose-500/10 px-2 py-0.5 font-medium text-rose-500">
          <AlertTriangle className="h-3 w-3" />
          {warningText}
        </span>
      ) : (
        <Check className="h-4 w-4 text-emerald-500" />
      )}
    </div>
  </div>
)

export const QualityScoreHoverCard: React.FC<QualityScoreHoverCardProps> = ({
  item,
  children,
  side = "bottom",
  openDelay = 200,
  closeDelay = 150,
}) => {
  const blurThreshold = useSettingsStore(
    (s) => s.settings.quality?.blurThreshold ?? 30
  )
  const darknessThreshold = useSettingsStore(
    (s) => s.settings.quality?.darknessThreshold ?? 50
  )

  if (!item.quality) {
    return <>{children}</>
  }

  const grade = getQualityGrade(item.quality.compositeScore)

  return (
    <HoverCard openDelay={openDelay} closeDelay={closeDelay}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        side={side}
        className="interactive-badge pointer-events-auto z-50 w-70 rounded-xl border border-border bg-card/95 p-4 font-sans text-foreground shadow-xl backdrop-blur-md select-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <span className="text-sm font-semibold text-foreground">
            Quality Analysis
          </span>
          <span
            className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${grade.color}`}
          >
            {grade.label}
          </span>
        </div>

        {/* Compact Metrics List */}
        <div className="space-y-3 pt-3">
          <MetricRow
            icon={Zap}
            label="Sharpness"
            value={item.quality.blurScore}
            threshold={blurThreshold}
            isWarning={item.quality.isBlurry}
            warningText="Blurry"
          />
          <MetricRow
            icon={Sun}
            label="Exposure"
            value={Math.round(item.quality.brightness)}
            threshold={darknessThreshold}
            isWarning={item.quality.isDark}
            warningText="Dark"
          />
          <MetricRow
            icon={Maximize}
            label="Resolution"
            value={
              item.width && item.height
                ? `${item.width} × ${item.height} (${((item.width * item.height) / 1000000).toFixed(1)} MP)`
                : "N/A"
            }
            isWarning={item.quality.isSmall}
            warningText="Low Res"
          />
          {item.quality.isScreenshot && (
            <MetricRow
              icon={Monitor}
              label="File Type"
              isWarning={true}
              warningText="Screenshot"
            />
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
