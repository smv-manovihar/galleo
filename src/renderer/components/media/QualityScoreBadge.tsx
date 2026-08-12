import React, { useMemo } from "react"
import type { MediaItem } from "@/shared/types/media"
import { AlertTriangle } from "lucide-react"
import { QualityScoreHoverCard } from "./QualityScoreHoverCard"

export interface QualityScoreBadgeProps {
  item: MediaItem
  side?: "top" | "bottom" | "left" | "right"
  className?: string
}

export const QualityScoreBadge: React.FC<QualityScoreBadgeProps> = ({
  item,
  side = "top",
  className = "",
}) => {
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
      return "border-amber-500/40 bg-amber-950/85 text-amber-200"
    }
    if (score >= 85) {
      return "border-emerald-500/40 bg-emerald-950/85 text-emerald-200"
    }
    if (score >= 70) {
      return "border-blue-500/40 bg-blue-950/85 text-blue-200"
    }
    if (score >= 50) {
      return "border-amber-500/40 bg-amber-950/85 text-amber-200"
    }
    return "border-red-500/40 bg-red-950/85 text-red-200"
  }, [isFlagged, score])

  if (!quality) return null

  return (
    <QualityScoreHoverCard item={item} side={side}>
      <div
        className={`flex cursor-help items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold shadow-xs backdrop-blur-md transition-colors ${colorStyles} ${className}`}
      >
        {isFlagged ? (
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
        ) : score < 50 ? (
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400" />
        ) : null}
        <span className="tabular-nums">{score}</span>
      </div>
    </QualityScoreHoverCard>
  )
}
