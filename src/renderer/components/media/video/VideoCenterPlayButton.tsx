import React from "react"
import { Play, Pause } from "lucide-react"

interface VideoCenterPlayButtonProps {
  isPlaying: boolean
  showControls: boolean
  onClick: (e: React.MouseEvent) => void
}

export const VideoCenterPlayButton: React.FC<VideoCenterPlayButtonProps> = React.memo(
  ({ isPlaying, showControls, onClick }) => {
    return (
      <div
        className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 hidden"
        }`}
        style={{ touchAction: "manipulation" }}
      >
        <button
          type="button"
          className="pointer-events-auto flex h-16 w-16 cursor-pointer items-center justify-center rounded-full border border-white/25 bg-black/60 shadow-2xl backdrop-blur-md transition-transform hover:scale-110 active:scale-95"
          onClick={(e) => {
            e.stopPropagation()
            onClick(e)
          }}
        >
          {isPlaying ? (
            <Pause className="h-7 w-7 fill-white text-white" />
          ) : (
            <Play className="ml-1 h-7 w-7 fill-white text-white" />
          )}
        </button>
      </div>
    )
  }
)

VideoCenterPlayButton.displayName = "VideoCenterPlayButton"
