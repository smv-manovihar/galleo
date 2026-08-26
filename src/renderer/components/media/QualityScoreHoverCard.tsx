import React from "react"
import type { MediaItem } from "../../../shared/types/media"
import { useSettingsStore } from "../../stores/settings-store"
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card"
import { Zap, Sun, Maximize, Monitor, AlertTriangle, Check } from "lucide-react"

import { cn } from "@/lib/utils"

export interface QualityScoreHoverCardProps {
  item: MediaItem
  children: React.ReactNode
  side?: "top" | "bottom" | "left" | "right"
  align?: "start" | "center" | "end"
  sideOffset?: number
  alignOffset?: number
  collisionPadding?:
    | number
    | Partial<Record<"top" | "right" | "bottom" | "left", number>>
  collisionBoundary?: Element | null | Array<Element | null>
  avoidCollisions?: boolean
  openDelay?: number
  closeDelay?: number
  className?: string
}

const getQualityGrade = (score: number) => {
  if (score >= 85)
    return {
      label: "Excellent",
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/25",
    }
  if (score >= 70)
    return {
      label: "Good",
      color: "text-blue-500 bg-blue-500/10 border-blue-500/25",
    }
  if (score >= 50)
    return {
      label: "Fair",
      color: "text-amber-500 bg-amber-500/10 border-amber-500/25",
    }
  return {
    label: "Poor",
    color: "text-rose-500 bg-rose-500/10 border-rose-500/25",
  }
}

// Reusable micro-component for each metric with clean tabular alignment
const MetricRow = ({
  icon: Icon,
  label,
  value,
  threshold,
  isWarning,
  warningText,
  warningVariant = "destructive",
}: {
  icon: React.ElementType
  label: string
  value?: React.ReactNode
  threshold?: number
  isWarning: boolean
  warningText: string
  warningVariant?: "destructive" | "warning"
}) => (
  <div className="flex items-center justify-between gap-3 text-xs">
    <div className="flex items-center gap-2 shrink-0">
      <Icon
        className={cn(
          "size-3.5 shrink-0",
          isWarning
            ? warningVariant === "warning"
              ? "text-amber-500"
              : "text-rose-500"
            : "text-emerald-500"
        )}
      />
      <span className="font-medium text-foreground">{label}</span>
    </div>
    <div className="flex items-center gap-2 justify-end min-w-0">
      {value !== undefined && (
        <span className="text-muted-foreground tabular-nums whitespace-nowrap text-xs">
          {value}
          {threshold !== undefined && (
            <span className="text-muted-foreground/60"> / {threshold}</span>
          )}
        </span>
      )}
      {isWarning ? (
        <span
          className={cn(
            "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-2xs font-semibold whitespace-nowrap shrink-0 border",
            warningVariant === "warning"
              ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
              : "bg-rose-500/10 text-rose-500 border-rose-500/20"
          )}
        >
          <AlertTriangle className="size-3 shrink-0" />
          {warningText}
        </span>
      ) : (
        <div className="flex size-4 items-center justify-center shrink-0">
          <Check className="size-3.5 text-emerald-500" />
        </div>
      )}
    </div>
  </div>
)

export const QualityScoreHoverCard: React.FC<QualityScoreHoverCardProps> = ({
  item,
  children,
  side = "bottom",
  align = "start",
  sideOffset = 6,
  alignOffset = 0,
  collisionPadding = 12,
  collisionBoundary,
  avoidCollisions = true,
  openDelay = 200,
  closeDelay = 150,
  className,
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
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        collisionPadding={collisionPadding}
        collisionBoundary={collisionBoundary}
        avoidCollisions={avoidCollisions}
        className={cn(
          "interactive-badge pointer-events-auto z-50 w-84 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card/95 p-3.5 font-sans text-foreground shadow-xl backdrop-blur-md select-none",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-foreground">
              Quality Analysis
            </span>
          </div>
          <span
            className={cn(
              "rounded-md border px-2 py-0.5 text-2xs font-semibold tabular-nums",
              grade.color
            )}
          >
            {grade.label}
          </span>
        </div>

        {/* Compact Metrics List */}
        <div className="flex flex-col gap-2.5 pt-2.5">
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
              item.width && item.height ? (
                <span className="flex flex-col items-end leading-tight">
                  <span>{item.width}×{item.height}</span>
                  <span className="text-2xs text-muted-foreground/60">{((item.width * item.height) / 1000000).toFixed(1)} MP</span>
                </span>
              ) : "N/A"
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
              warningVariant="warning"
            />
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
