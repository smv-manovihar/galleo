import React from "react"
import { Play } from "lucide-react"

interface VideoCenterPlayButtonProps {
  isPlaying: boolean
  showControls: boolean
  onClick: (e: React.MouseEvent) => void
}

export const VideoCenterPlayButton: React.FC<VideoCenterPlayButtonProps> = React.memo(
  ({ isPlaying, showControls, onClick }) => {
    if (isPlaying) return null

    return (
      <div
        className={`absolute inset-0 z-10 flex cursor-pointer items-center justify-center transition-opacity duration-300 ${
          showControls ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={{ touchAction: "manipulation" }}
        onClick={onClick}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-black/50 backdrop-blur-sm transition-transform hover:scale-110">
          <Play className="ml-1 h-7 w-7 fill-white text-white" />
        </div>
      </div>
    )
  }
)

VideoCenterPlayButton.displayName = "VideoCenterPlayButton"
