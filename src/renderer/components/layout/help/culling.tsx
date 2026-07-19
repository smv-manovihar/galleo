import React, { useState, useEffect, useRef } from "react"
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"
import {
  Sparkles,
  RotateCcw,
  Trash2,
  Bookmark,
  CheckSquare,
  BookOpen,
  Code2,
  ChevronDown,
  Zap,
  Filter,
  Compass,
  MousePointer2,
  Check,
  AlertTriangle,
} from "lucide-react"

export interface CullingAnimationDemoProps {
  standalone?: boolean
}

export const CullingAnimationDemo: React.FC<CullingAnimationDemoProps> = ({
  standalone = false,
}) => {
  const [animationState, setAnimationState] = useState<
    "idle" | "swiping-left" | "swiping-right"
  >("idle")
  const [isAutoplay, setIsAutoplay] = useState(true)
  const [cardIndex, setCardIndex] = useState(0)
  const autoplayTimerRef = useRef<any>(null)

  // Diverse realistic card dataset with good vs bad quality attributes
  const cardGradients = [
    {
      name: "Out of Focus Portrait.jpg",
      gradient: "from-rose-600 via-red-500 to-amber-700",
      tag: "Blurry Shot",
      score: 28,
      desc: "Failed sharpness threshold",
      isGood: false,
      swipeDirection: "left" as const,
    },
    {
      name: "Golden Hour Mountain.jpg",
      gradient: "from-amber-500 via-orange-500 to-rose-600",
      tag: "Crisp Focus",
      score: 96,
      desc: "High detail & perfect exposure",
      isGood: true,
      swipeDirection: "right" as const,
    },
    {
      name: "Underexposed Forest.png",
      gradient: "from-slate-800 via-zinc-700 to-emerald-950",
      tag: "Too Dark",
      score: 38,
      desc: "Blown-out shadows histogram",
      isGood: false,
      swipeDirection: "left" as const,
    },
    {
      name: "Alpine Lake Summit.jpg",
      gradient: "from-cyan-500 via-blue-600 to-indigo-700",
      tag: "Sharp HDR",
      score: 94,
      desc: "Optimal dynamic range",
      isGood: true,
      swipeDirection: "right" as const,
    },
    {
      name: "Duplicate Backup Copy.jpg",
      gradient: "from-violet-600 via-purple-600 to-fuchsia-700",
      tag: "100% Duplicate",
      score: 92,
      desc: "Redundant hash in backup",
      isGood: false,
      swipeDirection: "left" as const,
    },
    {
      name: "Sunset Beach Panorama.png",
      gradient: "from-pink-500 via-rose-500 to-amber-500",
      tag: "Top Quality",
      score: 98,
      desc: "Best canonical in cluster",
      isGood: true,
      swipeDirection: "right" as const,
    },
  ]

  const currentCard = cardGradients[cardIndex % cardGradients.length]

  const triggerSwipe = (direction: "left" | "right", isManual = false) => {
    if (animationState !== "idle") return
    if (isManual) {
      setIsAutoplay(false)
    }

    setAnimationState(direction === "left" ? "swiping-left" : "swiping-right")

    setTimeout(() => {
      setCardIndex((prev) => (prev + 1) % cardGradients.length)
      setAnimationState("idle")
    }, 420)
  }

  useEffect(() => {
    if (!isAutoplay) return

    const startAutoplayCycle = () => {
      autoplayTimerRef.current = setTimeout(() => {
        triggerSwipe(currentCard.swipeDirection, false)
      }, 2500)
    }

    if (animationState === "idle") {
      startAutoplayCycle()
    }

    return () => {
      if (autoplayTimerRef.current) {
        clearTimeout(autoplayTimerRef.current)
      }
    }
  }, [isAutoplay, cardIndex, animationState, currentCard.swipeDirection])

  // Get 4 visible deck items starting from cardIndex to smoothly animate full stack movement (3 -> 2 -> 1 -> 0)
  const visibleCards = [3, 2, 1, 0].map((offset) => {
    const idx = (cardIndex + offset) % cardGradients.length
    return {
      ...cardGradients[idx],
      offset, // 0 = top active card, 1 = middle card, 2 = back card, 3 = incoming back card
    }
  })

  // Pointer cursor tutor style
  const getCursorStyle = (): React.CSSProperties => {
    if (!isAutoplay) return { display: "none" }

    switch (animationState) {
      case "swiping-left":
        return {
          transform: "translate(-110px, 30px) scale(0.9)",
          opacity: 0,
          transition:
            "transform 420ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 350ms ease",
        }
      case "swiping-right":
        return {
          transform: "translate(110px, 30px) scale(0.9)",
          opacity: 0,
          transition:
            "transform 420ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 350ms ease",
        }
      case "idle":
      default:
        return {
          transform: "translate(0px, 15px) scale(1)",
          opacity: 0.9,
          transition: "transform 350ms ease-out, opacity 300ms ease",
        }
    }
  }

  const wrapperClass = standalone
    ? "flex flex-col items-center justify-between h-full w-full"
    : "flex flex-col items-center gap-4 bg-muted/15 border border-border/60 rounded-xl p-4 my-2"

  return (
    <div className={wrapperClass}>
      {!standalone && (
        <div className="flex w-full items-center justify-between">
          <span className="flex items-center gap-1.5 text-2xs font-semibold tracking-wider text-muted-foreground uppercase">
            <Compass className="size-3.5 text-primary" />
            Interactive Demo
          </span>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`border-primary/20 px-1.5 py-0 text-3xs font-semibold ${
                isAutoplay
                  ? "bg-primary/5 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {isAutoplay ? "Autoplay Demo" : "Manual Control"}
            </Badge>
            {!isAutoplay && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-md text-primary hover:bg-primary/5"
                onClick={() => setIsAutoplay(true)}
                title="Resume Autoplay"
              >
                <RotateCcw className="size-3" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Simulator Deck Viewport */}
      <div className="relative flex min-h-[210px] w-full flex-1 items-center justify-center py-3">
        <div
          className={`relative flex h-full w-full items-center justify-center transition-all ${
            standalone ? "scale-85 md:scale-90 lg:scale-95" : ""
          }`}
        >
          {visibleCards.map((card) => {
            const isTop = card.offset === 0
            const isMiddle = card.offset === 1
            const isBack = card.offset === 2
            const isIncomingBack = card.offset === 3

            let cardStyle: React.CSSProperties = {}

            if (isTop) {
              if (animationState === "swiping-left") {
                cardStyle = {
                  transform: "translate(-150%, 40px) rotate(-25deg)",
                  opacity: 0,
                  transition:
                    "transform 420ms cubic-bezier(0.4, 0, 0.2, 1), opacity 350ms ease",
                  zIndex: 40,
                }
              } else if (animationState === "swiping-right") {
                cardStyle = {
                  transform: "translate(150%, 40px) rotate(25deg)",
                  opacity: 0,
                  transition:
                    "transform 420ms cubic-bezier(0.4, 0, 0.2, 1), opacity 350ms ease",
                  zIndex: 40,
                }
              } else {
                cardStyle = {
                  transform: "translate(0px, 0px) rotate(0deg) scale(1)",
                  opacity: 1,
                  transition: "none",
                  zIndex: 40,
                }
              }
            } else if (isMiddle) {
              if (animationState !== "idle") {
                // Middle card slides to Top slot
                cardStyle = {
                  transform: "translateY(0px) scale(1)",
                  opacity: 1,
                  filter: "none",
                  transition:
                    "transform 420ms cubic-bezier(0.4, 0, 0.2, 1), opacity 420ms cubic-bezier(0.4, 0, 0.2, 1), filter 420ms cubic-bezier(0.4, 0, 0.2, 1)",
                  zIndex: 30,
                }
              } else {
                cardStyle = {
                  transform: "translateY(-14px) scale(0.96)",
                  opacity: 0.75,
                  filter: "brightness(0.45) contrast(0.9) saturate(0.6)",
                  transition: "none",
                  zIndex: 30,
                }
              }
            } else if (isBack) {
              if (animationState !== "idle") {
                // Back card slides to Middle slot
                cardStyle = {
                  transform: "translateY(-14px) scale(0.96)",
                  opacity: 0.75,
                  filter: "brightness(0.45) contrast(0.9) saturate(0.6)",
                  transition:
                    "transform 420ms cubic-bezier(0.4, 0, 0.2, 1), opacity 420ms cubic-bezier(0.4, 0, 0.2, 1), filter 420ms cubic-bezier(0.4, 0, 0.2, 1)",
                  zIndex: 20,
                }
              } else {
                cardStyle = {
                  transform: "translateY(-28px) scale(0.92)",
                  opacity: 0.35,
                  filter: "brightness(0.3) contrast(0.8) saturate(0.4)",
                  transition: "none",
                  zIndex: 20,
                }
              }
            } else if (isIncomingBack) {
              if (animationState !== "idle") {
                // Incoming Back card fades into Back slot
                cardStyle = {
                  transform: "translateY(-28px) scale(0.92)",
                  opacity: 0.35,
                  filter: "brightness(0.3) contrast(0.8) saturate(0.4)",
                  transition:
                    "transform 420ms cubic-bezier(0.4, 0, 0.2, 1), opacity 420ms cubic-bezier(0.4, 0, 0.2, 1), filter 420ms cubic-bezier(0.4, 0, 0.2, 1)",
                  zIndex: 10,
                }
              } else {
                cardStyle = {
                  transform: "translateY(-42px) scale(0.88)",
                  opacity: 0,
                  filter: "brightness(0.2)",
                  transition: "none",
                  zIndex: 10,
                }
              }
            }

            return (
              <div
                key={card.name}
                style={cardStyle}
                className={`pointer-events-none absolute flex aspect-4/5 w-32 flex-col justify-between rounded-xl border bg-card p-2 shadow-xl select-none transition-colors ${
                  isTop && animationState === "swiping-right"
                    ? "border-emerald-500/60 shadow-emerald-500/20"
                    : isTop && animationState === "swiping-left"
                      ? "border-destructive/60 shadow-destructive/20"
                      : "border-border/80"
                }`}
              >
                <div className="relative flex h-18 w-full flex-col justify-end overflow-hidden rounded-lg bg-black">
                  <div
                    className={`absolute inset-0 bg-linear-to-tr ${card.gradient} opacity-90`}
                  />

                  {/* Action Overlays for Top Card */}
                  {isTop && animationState === "swiping-right" && (
                    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden rounded-lg">
                      <div className="absolute inset-0 bg-linear-to-l from-green-500/50 via-green-500/15 to-transparent" />
                      <div className="absolute top-1/2 right-2 flex -translate-y-1/2 flex-col items-center gap-0.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500 shadow-md shadow-green-500/30">
                          <Bookmark className="size-3.5 fill-white text-white" />
                        </div>
                        <span className="text-[0.45rem] font-black tracking-widest text-white uppercase drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                          Keep Good
                        </span>
                      </div>
                    </div>
                  )}
                  {isTop && animationState === "swiping-left" && (
                    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden rounded-lg">
                      <div className="absolute inset-0 bg-linear-to-r from-red-500/50 via-red-500/15 to-transparent" />
                      <div className="absolute top-1/2 left-2 flex -translate-y-1/2 flex-col items-center gap-0.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500 shadow-md shadow-red-500/30">
                          <Trash2 className="size-3.5 fill-white text-white" />
                        </div>
                        <span className="text-[0.45rem] font-black tracking-widest text-white uppercase drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                          Trash Bad
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Unified Glass Pill Badge (Zero overflow, max contrast in light & dark modes) */}
                  <div className="absolute top-1.5 left-1.5 z-10 flex items-center select-none">
                    <div
                      className={`flex max-w-[110px] items-center gap-1.5 rounded-full border px-1.5 py-0.5 text-[0.45rem] font-extrabold shadow-md backdrop-blur-md ${
                        card.isGood
                          ? "border-emerald-400/60 bg-emerald-950/90 text-emerald-300"
                          : "border-rose-400/60 bg-rose-950/90 text-rose-200"
                      }`}
                    >
                      <span className="rounded-full bg-black/60 px-1 py-0.2 text-[0.4rem] font-black text-white">
                        {card.score}
                      </span>
                      {card.isGood ? (
                        <Check className="size-2.5 shrink-0 text-emerald-400 stroke-3" />
                      ) : (
                        <AlertTriangle className="size-2.5 shrink-0 text-rose-400 stroke-3" />
                      )}
                      <span className="truncate">{card.tag}</span>
                    </div>
                  </div>
                </div>

                <div className="min-w-0 space-y-0.5">
                  <span className="block truncate text-[0.55rem] leading-tight font-bold text-foreground">
                    {card.name}
                  </span>
                  <span className="block truncate text-[0.45rem] leading-none text-muted-foreground">
                    {card.desc}
                  </span>
                </div>
              </div>
            )
          })}

          {/* Autoplay Hand/Pointer Cursor Overlay (z-50 floats above top card at z-40) */}
          <div
            style={getCursorStyle()}
            className="pointer-events-none absolute z-50"
          >
            <MousePointer2 className="size-5.5 rotate-22 fill-primary stroke-background text-primary drop-shadow-[0_4px_10px_rgba(0,0,0,0.55)]" />
          </div>
        </div>
      </div>

      {/* Control Actions */}
      <div className="flex w-full items-center justify-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => triggerSwipe("left", true)}
          className="h-7 cursor-pointer gap-1.5 border-destructive/30 bg-destructive/5 text-3xs font-semibold text-destructive hover:bg-destructive/15"
        >
          <Trash2 className="size-3" />
          Trash Bad (D / ←)
        </Button>

        {!isAutoplay && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAutoplay(true)}
            className="h-7 cursor-pointer gap-1 px-2 text-3xs font-medium text-muted-foreground hover:text-foreground"
            title="Resume autoplay animation"
          >
            <RotateCcw className="size-3" />
            Resume
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => triggerSwipe("right", true)}
          className="h-7 cursor-pointer gap-1.5 border-green-500/30 bg-green-500/5 text-3xs font-semibold text-green-600 hover:bg-green-500/15 dark:text-green-400"
        >
          <Bookmark className="size-3 fill-current" />
          Keep Good (K / →)
        </Button>
      </div>
    </div>
  )
}

export const CullingHelp: React.FC = () => {
  const [isTechOpen, setIsTechOpen] = useState(false)

  return (
    <>
      {/* Header */}
      <DialogHeader className="shrink-0 border-b border-border pb-3">
        <DialogTitle className="flex items-center gap-2.5 text-base font-bold text-foreground">
          <Sparkles className="size-5 text-primary" />
          Media Culling Queue
        </DialogTitle>
        <DialogDescription className="mt-0.5 text-2xs leading-normal font-semibold tracking-wider text-muted-foreground uppercase">
          Evaluate files quickly using hotkey decisions.
        </DialogDescription>
      </DialogHeader>

      {/* Scrollable Content */}
      <div className="min-h-0 flex-1 scrollbar-thin space-y-4 overflow-y-auto pr-1">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Review media sequentially using hotkeys to stage keep or delete decisions.
        </p>

        {/* Interactive swipe animation demo */}
        <CullingAnimationDemo />

        {/* 1. Key Terms */}
        <div className="space-y-2">
          <h4 className="flex items-center gap-1.5 text-3xs font-extrabold tracking-wider text-primary uppercase">
            <BookOpen className="size-3" />
            Key Terms
          </h4>
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
            <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-muted/10 p-2.5">
              <span className="text-xs font-bold text-foreground">
                Culling Queue
              </span>
              <span className="mt-0.5 text-2xs leading-normal text-muted-foreground">
                Media deck loaded based on active filters for rapid evaluation.
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-muted/10 p-2.5">
              <span className="text-xs font-bold text-foreground">
                Review State
              </span>
              <span className="mt-0.5 text-2xs leading-normal text-muted-foreground">
                Items marked as Keep or Delete during inspection.
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-muted/10 p-2.5">
              <span className="text-xs font-bold text-foreground">
                Staged Deletion
              </span>
              <span className="mt-0.5 text-2xs leading-normal text-muted-foreground">
                Deleted files are staged for review before committing to trash.
              </span>
            </div>
          </div>
        </div>

        {/* 2. Actions & Controls */}
        <div className="space-y-2">
          <h4 className="text-3xs font-extrabold tracking-wider text-primary uppercase">
            Actions & Controls
          </h4>
          <div className="divide-y divide-border/40 overflow-hidden rounded-xl border border-border/60 bg-muted/5">
            <div className="flex flex-col items-start gap-1 p-3 text-2xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[200px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <Bookmark className="size-3.5 shrink-0 fill-green-500/10 text-green-500" />
                <span className="font-semibold text-foreground">
                  Keep Good
                </span>
                <div className="flex gap-1">
                  <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-3xs font-bold text-muted-foreground shadow-xs select-none">
                    K
                  </kbd>
                  <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-3xs font-bold text-muted-foreground shadow-xs select-none">
                    →
                  </kbd>
                </div>
              </div>
              <span className="text-muted-foreground">
                Marks item as kept and advances to next file.
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 p-3 text-2xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[200px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <Trash2 className="size-3.5 shrink-0 text-destructive" />
                <span className="font-semibold text-foreground">
                  Trash Bad
                </span>
                <div className="flex gap-1">
                  <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-3xs font-bold text-muted-foreground shadow-xs select-none">
                    D
                  </kbd>
                  <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-3xs font-bold text-muted-foreground shadow-xs select-none">
                    ←
                  </kbd>
                </div>
              </div>
              <span className="text-muted-foreground">
                Stages item for trash and advances to next file.
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 p-3 text-2xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[200px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <RotateCcw className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="font-semibold text-foreground">
                  Undo / Go Back
                </span>
                <div className="flex gap-1">
                  <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-3xs font-bold text-muted-foreground shadow-xs select-none">
                    Z
                  </kbd>
                </div>
              </div>
              <span className="text-muted-foreground">
                Reverts previous decision and restores previous card.
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 p-3 text-2xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[200px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <Filter className="size-3.5 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Flagged Only Filter
                </span>
              </div>
              <span className="text-muted-foreground">
                Filters queue to only show items flagged with quality defects.
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 p-3 text-2xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[200px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <CheckSquare className="size-3.5 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Review Summary
                </span>
              </div>
              <span className="text-muted-foreground">
                Opens deletion summary to review files and commit deletions.
              </span>
            </div>
          </div>
        </div>

        {/* 3. Collapsible Under the Hood Technical Concepts */}
        <Collapsible open={isTechOpen} onOpenChange={setIsTechOpen} className="space-y-2">
          <CollapsibleTrigger asChild>
            <button className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-2xs font-semibold text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground">
              <div className="flex items-center gap-2 text-3xs font-extrabold tracking-wider text-primary uppercase">
                <Code2 className="size-3.5" />
                Under the Hood & Technical Concepts
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-normal text-muted-foreground">
                  {isTechOpen ? "Hide details" : "Learn how it works"}
                </span>
                <ChevronDown className={`size-3.5 text-muted-foreground transition-transform duration-200 ${isTechOpen ? "rotate-180" : ""}`} />
              </div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-1">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-2.5">
                <span className="text-2xs font-bold text-foreground">
                  Multi-deck Render Pipeline
                </span>
                <span className="text-[11px] leading-relaxed text-muted-foreground">
                  Pre-renders virtualized cards offscreen to maintain 60fps hardware-accelerated CSS swipe transitions.
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-2.5">
                <span className="text-2xs font-bold text-foreground">
                  Defect Detection Thresholds
                </span>
                <span className="text-[11px] leading-relaxed text-muted-foreground">
                  Laplacian sharpness variance under 50 and underexposed brightness histograms automatically tag files for culling.
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-2.5">
                <span className="text-2xs font-bold text-foreground">
                  Stateful Session Checkpointing
                </span>
                <span className="text-[11px] leading-relaxed text-muted-foreground">
                  All swipe decisions persist in SQLite local storage so you can exit the app mid-cull without losing state.
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-2.5">
                <span className="text-2xs font-bold text-foreground">
                  Safe OS Recycle Bin Integration
                </span>
                <span className="text-[11px] leading-relaxed text-muted-foreground">
                  Deletions invoke native trash APIs (`Electron shell.trashItem`), allowing full recovery via your operating system recycle bin.
                </span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Pro Tip Banner */}
      <div className="mt-auto flex shrink-0 flex-row items-start gap-3 border-t border-border pt-3.5">
        <div className="shrink-0 rounded-lg border border-primary/20 bg-primary/10 p-1.5 text-primary">
          <Zap className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="block text-2xs font-extrabold tracking-wider text-primary uppercase">
            PRO TIP
          </span>
          <span className="mt-0.5 block text-2xs leading-relaxed text-muted-foreground">
            Toggle <strong>"Only Show Flagged"</strong> to focus strictly on photos with defect flags.
          </span>
        </div>
      </div>
    </>
  )
}
