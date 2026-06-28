import React from "react"
import { Progress } from "@/components/ui/progress"

interface ReviewProgressProps {
  reviewed: number
  total: number
  percentage: number
}

export const ReviewProgress: React.FC<ReviewProgressProps> = ({
  reviewed,
  total,
  percentage,
}) => {
  return (
    <div className="mx-auto w-full max-w-xl shrink-0 px-4 pb-8">
      {/* Progress bar */}
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex justify-between text-2xs font-semibold tracking-wider text-muted-foreground uppercase">
          <span>Progress</span>
          <span>{reviewed} / {total}</span>
        </div>
        <Progress value={percentage} className="h-1 w-full bg-muted" />
      </div>
    </div>
  )
}
