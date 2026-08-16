import React, { useMemo } from "react"
import type { MediaItem } from "@/shared/types/media"
import { AlertTriangle } from "lucide-react"
import { QualityScoreHoverCard } from "./QualityScoreHoverCard"

export interface QualityScoreBadgeProps {
  item: MediaItem
  side?: "top" | "bottom" | "left" | "right"
  align?: "start" | "center" | "end"
  sideOffset?: number
  alignOffset?: number
  collisionPadding?:
    | number
    | Partial<Record<"top" | "right" | "bottom" | "left", number>>
  className?: string
}

export const QualityScoreBadge: React.FC<QualityScoreBadgeProps> = ({
  item,
  side = "bottom",
  align = "start",
  sideOffset = 4,
  alignOffset,
  collisionPadding = 12,
  className = "",
}) => {
  const [isInteractive, setIsInteractive] = React.useState(false)
  const quality = item.quality

  const qualityFlags = useMemo(() => {
    if (!quality) return []
    const reasons: string[] = []
    if (quality.isBlurry) reasons.push("Blurry")
    if (quality.isDark) reasons.push("Underexposed")
    if (quality.isScreenshot) reasons.push("Screenshot")
    if (quality.isSmall) reasons.push("Low Resolution")
    if (quality.compositeScore < 50 && reasons.length === 0)
      reasons.push("Low Quality Score")
    return reasons
  }, [quality])

  const isFlagged =
    quality !== undefined && qualityFlags.length > 0 && item.reviewState === "pending"

  const score = quality?.compositeScore ?? 0

  const colorStyles = useMemo(() => {
    if (isFlagged) {
      return "border-amber-500/40 bg-amber-950/90 text-amber-200"
    }
    if (score >= 85) {
      return "border-emerald-500/40 bg-emerald-950/90 text-emerald-200"
    }
    if (score >= 70) {
      return "border-blue-500/40 bg-blue-950/90 text-blue-200"
    }
    if (score >= 50) {
      return "border-amber-500/40 bg-amber-950/90 text-amber-200"
    }
    return "border-red-500/40 bg-red-950/90 text-red-200"
  }, [isFlagged, score])

  if (!quality) return null

  const badgeContent = (
    <div
      className={`flex cursor-help items-center gap-2 rounded-md border px-2 py-0.5 text-xs font-semibold shadow-xs transition-colors ${colorStyles} ${className}`}
      onMouseEnter={() => setIsInteractive(true)}
      onFocus={() => setIsInteractive(true)}
    >
      {isFlagged ? (
        <AlertTriangle className="size-4 shrink-0 text-amber-400" />
      ) : score < 50 ? (
        <AlertTriangle className="size-4 shrink-0 text-red-400" />
      ) : null}
      <span className="tabular-nums">{score}</span>
    </div>
  )

  if (!isInteractive) {
    return badgeContent
  }

  return (
    <QualityScoreHoverCard
      item={item}
      side={side}
      align={align}
      sideOffset={sideOffset}
      alignOffset={alignOffset}
      collisionPadding={collisionPadding}
    >
      {badgeContent}
    </QualityScoreHoverCard>
  )
}
