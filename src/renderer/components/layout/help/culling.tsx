import React, { useState, useEffect, useRef, useCallback } from "react"
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
  BookOpen,
  Code2,
  ChevronDown,
  Zap,
  Filter,
  Compass,
  MousePointer2,
  Check,
  AlertTriangle,
  History,
  Eye,
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
  const autoplayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const triggerSwipe = useCallback((direction: "left" | "right", isManual = false) => {
    if (animationState !== "idle") return
    if (isManual) {
      setIsAutoplay(false)
    }

    setAnimationState(direction === "left" ? "swiping-left" : "swiping-right")

    setTimeout(() => {
      setCardIndex((prev) => (prev + 1) % cardGradients.length)
      setAnimationState("idle")
    }, 420)
  }, [animationState, cardGradients.length])

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
  }, [isAutoplay, cardIndex, animationState, currentCard.swipeDirection, triggerSwipe])

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
          <span className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Compass className="size-4 text-primary" />
            Interactive Demo
          </span>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`border-primary/20 px-1.5 py-0 text-xs font-semibold ${
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
      <div className="relative flex min-h-52.5 w-full flex-1 items-center justify-center py-3">
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
                        <span className="text-2xs font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
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
                        <span className="text-2xs font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                          Trash Bad
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Unified Glass Pill Badge */}
                  <div className="absolute top-1.5 left-1.5 z-10 flex items-center select-none">
                    <div
                      className={`flex max-w-27.5 items-center gap-1 rounded-full border px-1.5 py-0.5 text-2xs font-extrabold shadow-md backdrop-blur-md ${
                        card.isGood
                          ? "border-emerald-400/60 bg-emerald-950/90 text-emerald-300"
                          : "border-rose-400/60 bg-rose-950/90 text-rose-200"
                      }`}
                    >
                      <span className="rounded-full bg-black/60 px-1 py-0 text-2xs font-black text-white">
                        {card.score}
                      </span>
                      {card.isGood ? (
                        <Check className="size-2.5 shrink-0 text-emerald-400 stroke-3" />
                      ) : (
                        <AlertTriangle className="size-2.5 shrink-0 text-rose-400 stroke-3" />
                      )}
                      <span className="truncate text-2xs">{card.tag}</span>
                    </div>
                  </div>
                </div>

                <div className="min-w-0 space-y-0.5">
                  <span className="block truncate text-xs leading-tight font-bold text-foreground">
                    {card.name}
                  </span>
                  <span className="block truncate text-2xs leading-none text-muted-foreground">
                    {card.desc}
                  </span>
                </div>
              </div>
            )
          })}

          {/* Autoplay Hand/Pointer Cursor Overlay */}
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
          className="h-7 cursor-pointer gap-1.5 border-destructive/30 bg-destructive/5 text-xs font-semibold text-destructive hover:bg-destructive/15 hover:text-destructive dark:text-rose-400 dark:hover:text-rose-400"
        >
          <Trash2 className="size-3" />
          Trash Bad (A / ←)
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => triggerSwipe("right", true)}
          className="h-7 cursor-pointer gap-1.5 border-green-500/30 bg-green-500/5 text-xs font-semibold text-green-600 hover:bg-green-500/15 hover:text-green-600 dark:text-green-400 dark:hover:text-green-400"
        >
          <Bookmark className="size-3 fill-current" />
          Keep Good (D / →)
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
        <DialogDescription className="mt-0.5 text-xs leading-normal text-muted-foreground">
          Rapid sequential triage using keyboard shortcuts and similarity grouping.
        </DialogDescription>
      </DialogHeader>

      {/* Scrollable Content */}
      <div className="min-h-0 flex-1 scrollbar-thin space-y-4 overflow-y-auto pr-1">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Review media files one by one with rapid hotkeys. Burst photos and similar shots are automatically grouped together so you can quickly decide which copies to keep or delete.
        </p>

        {/* Interactive swipe animation demo */}
        <CullingAnimationDemo />

        {/* 1. Key Terms */}
        <div className="space-y-2">
          <h4 className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <BookOpen className="size-3" />
            Key Terms
          </h4>
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
            <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-muted/10 p-2.5">
              <span className="text-xs font-bold text-foreground">
                Culling Queue
              </span>
              <span className="mt-0.5 text-xs leading-normal text-muted-foreground">
                Interactive deck of pending photos ordered by visual similarity for seamless sequential comparison.
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-muted/10 p-2.5">
              <span className="text-xs font-bold text-foreground">
                Review Decision
              </span>
              <span className="mt-0.5 text-xs leading-normal text-muted-foreground">
                Each swipe tags the media as "Keep" or "Delete" in local storage without touching files on disk immediately.
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-border/60 bg-muted/10 p-2.5">
              <span className="text-xs font-bold text-foreground">
                Safe Staging
              </span>
              <span className="mt-0.5 text-xs leading-normal text-muted-foreground">
                Deleted files are reviewed in the summary screen before committing them safely to your OS Recycle Bin.
              </span>
            </div>
          </div>
        </div>

        {/* 2. Actions & Controls */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-primary">
            Actions & Keyboard Shortcuts
          </h4>
          <div className="divide-y divide-border/40 overflow-hidden rounded-xl border border-border/60 bg-muted/5">
            <div className="flex flex-col items-start gap-1 p-3 text-xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[200px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <Bookmark className="size-4 shrink-0 fill-green-500/10 text-green-500" />
                <span className="font-semibold text-foreground">
                  Keep Good
                </span>
                <div className="flex gap-1">
                  <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-xs font-bold text-muted-foreground shadow-xs select-none">
                    D
                  </kbd>
                  <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-xs font-bold text-muted-foreground shadow-xs select-none">
                    →
                  </kbd>
                  <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-xs font-bold text-muted-foreground shadow-xs select-none">
                    ↵
                  </kbd>
                </div>
              </div>
              <span className="text-muted-foreground">
                Marks item as kept and immediately advances to the next photo in the deck.
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 p-3 text-xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[200px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <Trash2 className="size-4 shrink-0 text-destructive" />
                <span className="font-semibold text-foreground">
                  Trash Bad
                </span>
                <div className="flex gap-1">
                  <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-xs font-bold text-muted-foreground shadow-xs select-none">
                    A
                  </kbd>
                  <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-xs font-bold text-muted-foreground shadow-xs select-none">
                    ←
                  </kbd>
                  <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-xs font-bold text-muted-foreground shadow-xs select-none">
                    Del
                  </kbd>
                </div>
              </div>
              <span className="text-muted-foreground">
                Stages the current file for deletion and advances to the next card.
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 p-3 text-xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[200px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <RotateCcw className="size-4 shrink-0 text-muted-foreground" />
                <span className="font-semibold text-foreground">
                  Undo Decision
                </span>
                <div className="flex gap-1">
                  <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-xs font-bold text-muted-foreground shadow-xs select-none">
                    S
                  </kbd>
                  <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-xs font-bold text-muted-foreground shadow-xs select-none">
                    ↓
                  </kbd>
                  <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-xs font-bold text-muted-foreground shadow-xs select-none">
                    Ctrl+Z
                  </kbd>
                </div>
              </div>
              <span className="text-muted-foreground">
                Reverts your previous decision and pulls the previous card back into the deck.
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 p-3 text-xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[200px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <Eye className="size-4 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Full Preview
                </span>
                <div className="flex gap-1">
                  <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-xs font-bold text-muted-foreground shadow-xs select-none">
                    W
                  </kbd>
                  <kbd className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-xs font-bold text-muted-foreground shadow-xs select-none">
                    ↑
                  </kbd>
                </div>
              </div>
              <span className="text-muted-foreground">
                Opens full-screen high-resolution previewer with camera EXIF details and histogram.
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 p-3 text-xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[200px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <History className="size-4 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Decision History
                </span>
              </div>
              <span className="text-muted-foreground">
                Click the History button in the control bar to inspect all past decisions in this session and bulk-modify or toggle any previous vote.
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 p-3 text-xs transition-colors hover:bg-muted/10 sm:grid sm:grid-cols-[200px_1fr] sm:items-center sm:gap-4">
              <div className="flex shrink-0 items-center gap-2">
                <Filter className="size-4 shrink-0 text-primary" />
                <span className="font-semibold text-foreground">
                  Only Show Flagged
                </span>
              </div>
              <span className="text-muted-foreground">
                Filters the culling deck strictly to defect candidates (blurry, dark, duplicate, low res) to accelerate your cleanup.
              </span>
            </div>
          </div>
        </div>

        {/* 3. Collapsible Under the Hood Technical Concepts */}
        <Collapsible open={isTechOpen} onOpenChange={setIsTechOpen} className="space-y-2">
          <CollapsibleTrigger asChild>
            <button className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <Code2 className="size-4" />
                Under the Hood & Technical Concepts
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-normal text-muted-foreground">
                  {isTechOpen ? "Hide details" : "Learn how it works"}
                </span>
                <ChevronDown className={`size-4 text-muted-foreground transition-transform duration-200 ${isTechOpen ? "rotate-180" : ""}`} />
              </div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-1">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-3">
                <span className="text-xs font-bold text-foreground">
                  Similarity-Grouped Sorting
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  Pre-computes perceptual hash distances so burst shots and identical scenes are lined up next to each other in the queue.
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-3">
                <span className="text-xs font-bold text-foreground">
                  Offscreen Multi-Deck Virtualization
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  Pre-renders virtualized cards ahead of time to maintain 60fps hardware-accelerated CSS swipe transitions.
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-3">
                <span className="text-xs font-bold text-foreground">
                  Stateful Session Checkpointing
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  All swipe decisions persist in local SQLite storage so you can exit the app mid-cull without losing progress.
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/10 p-3">
                <span className="text-xs font-bold text-foreground">
                  Native OS Recycle Bin Safety
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  Deletions invoke native trash APIs (`Electron shell.trashItem`), allowing complete recovery via your operating system recycle bin.
                </span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Pro Tip Banner */}
      <div className="mt-auto flex shrink-0 flex-row items-start gap-3 border-t border-border pt-4">
        <div className="shrink-0 rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary">
          <Zap className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-primary">
            Pro Tip: One-Handed WASD Rapid Triage
          </span>
          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
            Rest your left hand on <kbd className="font-mono bg-muted px-1 text-xs rounded">WASD</kbd> (<kbd className="font-mono bg-muted px-1 text-xs rounded">A</kbd> = Trash, <kbd className="font-mono bg-muted px-1 text-xs rounded">D</kbd> = Keep, <kbd className="font-mono bg-muted px-1 text-xs rounded">W</kbd> = Full Preview, <kbd className="font-mono bg-muted px-1 text-xs rounded">S</kbd> = Undo) and toggle <strong>"Only Show Flagged"</strong> to breeze through hundreds of defect candidates in minutes.
          </span>
        </div>
      </div>
    </>
  )
}
