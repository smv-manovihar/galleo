import React, { useState, useEffect, useRef } from 'react';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  RotateCcw,
  Trash2,
  Bookmark,
  Compass,
  MousePointer2,
  Zap,
  ArrowRight,
  CheckSquare,
} from 'lucide-react';

export interface CullingAnimationDemoProps {
  standalone?: boolean;
}

export const CullingAnimationDemo: React.FC<CullingAnimationDemoProps> = ({ standalone = false }) => {
  const [animationState, setAnimationState] = useState<'idle' | 'swiping-left' | 'swiping-right' | 'returning'>('idle');
  const [isAutoplay, setIsAutoplay] = useState(true);
  const [cardIndex, setCardIndex] = useState(0);
  const autoplayTimerRef = useRef<any>(null);

  // High fidelity card gradients
  const cardGradients = [
    {
      name: 'Sunset View.jpg',
      gradient: 'from-orange-500 via-rose-500 to-indigo-600',
      tag: 'Blurry',
      score: 34,
      desc: 'Failed sharpness threshold',
    },
    {
      name: 'Mountain Lake.png',
      gradient: 'from-blue-600 via-cyan-500 to-emerald-500',
      tag: 'Duplicate',
      score: 95,
      desc: 'Exact metadata match',
    },
    {
      name: 'Forest Canopy.jpg',
      gradient: 'from-emerald-600 via-teal-600 to-cyan-700',
      tag: 'Dark',
      score: 41,
      desc: 'Underexposed exposure levels',
    },
  ];

  const currentCard = cardGradients[cardIndex % cardGradients.length];
  const nextCard = cardGradients[(cardIndex + 1) % cardGradients.length];

  const triggerSwipe = (direction: 'left' | 'right') => {
    if (animationState !== 'idle') return;

    setAnimationState(direction === 'left' ? 'swiping-left' : 'swiping-right');

    setTimeout(() => {
      setAnimationState('returning');
      setTimeout(() => {
        setCardIndex((prev) => prev + 1);
        setAnimationState('idle');
      }, 150);
    }, 600);
  };

  const handleManualSwipe = (direction: 'left' | 'right') => {
    setIsAutoplay(false);
    triggerSwipe(direction);
  };

  useEffect(() => {
    if (!isAutoplay) return;

    const startAutoplayCycle = () => {
      autoplayTimerRef.current = setTimeout(() => {
        // Alternate swipe directions
        const nextDirection = cardIndex % 2 === 0 ? 'right' : 'left';
        triggerSwipe(nextDirection);
      }, 2500);
    };

    if (animationState === 'idle') {
      startAutoplayCycle();
    }

    return () => {
      if (autoplayTimerRef.current) {
        clearTimeout(autoplayTimerRef.current);
      }
    };
  }, [isAutoplay, cardIndex, animationState]);

  // CSS transform styles for the top card
  const getTopCardStyle = (): React.CSSProperties => {
    switch (animationState) {
      case 'swiping-left':
        return {
          transform: 'translate(-140px, 15px) rotate(-15deg)',
          opacity: 0,
          transition: 'transform 550ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 450ms ease',
        };
      case 'swiping-right':
        return {
          transform: 'translate(140px, 15px) rotate(15deg)',
          opacity: 0,
          transition: 'transform 550ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 450ms ease',
        };
      case 'returning':
        return {
          transform: 'scale(0.9) translateY(-10px)',
          opacity: 0,
          transition: 'none',
        };
      case 'idle':
      default:
        return {
          transform: 'translate(0px, 0px) rotate(0deg) scale(1)',
          opacity: 1,
          transition: 'transform 350ms cubic-bezier(0.25, 1, 0.5, 1), opacity 300ms ease',
        };
    }
  };

  // CSS transform styles for the virtual mouse pointer (autoplay visual tutor)
  const getCursorStyle = (): React.CSSProperties => {
    if (!isAutoplay) {
      return { display: 'none' };
    }

    switch (animationState) {
      case 'swiping-left':
        return {
          transform: 'translate(-100px, 25px) scale(0.9)',
          opacity: 0,
          transition: 'transform 550ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 450ms ease',
        };
      case 'swiping-right':
        return {
          transform: 'translate(100px, 25px) scale(0.9)',
          opacity: 0,
          transition: 'transform 550ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 450ms ease',
        };
      case 'returning':
        return {
          transform: 'translate(0px, 50px) scale(0.8)',
          opacity: 0,
          transition: 'none',
        };
      case 'idle':
      default:
        return {
          transform: 'translate(0px, 15px) scale(1)',
          opacity: 0.9,
          transition: 'transform 350ms ease-out, opacity 300ms ease',
        };
    }
  };

  const wrapperClass = standalone 
    ? "flex flex-col items-center justify-between h-full w-full"
    : "flex flex-col items-center gap-4 bg-muted/15 border border-border/60 rounded-xl p-4 my-2";

  return (
    <div className={wrapperClass}>
      {!standalone && (
        <div className="flex items-center justify-between w-full">
          <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Compass className="size-3.5 text-primary" />
            Interactive Swipe Simulation
          </span>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`text-3xs font-semibold px-1.5 py-0 border-primary/20 ${
                isAutoplay ? 'bg-primary/5 text-primary' : 'bg-muted text-muted-foreground'
              }`}
            >
              {isAutoplay ? 'Autoplaying Demo' : 'Manual Mode'}
            </Badge>
            {!isAutoplay && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-md hover:bg-primary/5 text-primary"
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
      <div className="relative w-full flex-1 min-h-[140px] flex items-center justify-center overflow-hidden py-2">
        <div className={`relative w-full h-full flex items-center justify-center transition-all ${
          standalone ? 'scale-85 md:scale-90 lg:scale-95' : ''
        }`}>
          {/* Background Card */}
          <div
            className="absolute w-32 aspect-4/5 rounded-xl border border-border bg-card shadow-sm opacity-35 filter brightness-[0.3]"
            style={{
              transform: 'translateY(-16px) scale(0.92)',
            }}
          />

          {/* Next Card */}
          <div
            className={`absolute w-32 aspect-4/5 rounded-xl border border-border bg-card shadow-md flex flex-col justify-between p-2 select-none pointer-events-none transition-all duration-500 ${
              animationState === 'idle' ? 'opacity-80 filter brightness-[0.7] translateY(-8px) scale(0.96)' : 'opacity-100 filter brightness-100 translateY(0px) scale(1)'
            }`}
          >
            <div className={`w-full h-18 rounded-lg bg-linear-to-tr ${nextCard.gradient} opacity-90`} />
            <div className="space-y-1">
              <div className="h-2 w-14 bg-muted-foreground/35 rounded-full" />
              <div className="h-1.5 w-18 bg-muted-foreground/20 rounded-full" />
            </div>
          </div>

          {/* Top Active Card */}
          <div
            style={getTopCardStyle()}
            className="absolute w-32 aspect-4/5 rounded-xl border border-border/80 bg-card shadow-xl flex flex-col justify-between p-2 select-none z-10"
          >
            <div className="relative w-full h-18 rounded-lg overflow-hidden flex flex-col justify-end bg-black">
              <div className={`absolute inset-0 bg-linear-to-tr ${currentCard.gradient} opacity-90`} />
              
              {/* Action Overlay Stamps */}
              {animationState === 'swiping-right' && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-12 border-2 border-green-500 text-green-500 rounded px-1.5 py-0.5 text-2xs font-bold tracking-widest bg-black/60 shadow-lg">
                  KEEP
                </div>
              )}
              {animationState === 'swiping-left' && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 border-2 border-destructive text-destructive rounded px-1.5 py-0.5 text-2xs font-bold tracking-widest bg-black/60 shadow-lg">
                  DELETE
                </div>
              )}

              {/* Micro Badge */}
              <div className="absolute top-1.5 left-1.5 flex gap-1 z-10">
                <span className="text-3xs font-extrabold px-1 py-0 bg-background/90 text-foreground rounded backdrop-blur-xs">
                  {currentCard.score}
                </span>
                <span className="text-[0.45rem] font-medium px-1 py-0 bg-destructive/15 border border-destructive/25 text-destructive rounded backdrop-blur-xs">
                  {currentCard.tag}
                </span>
              </div>
            </div>

            <div className="space-y-1 min-w-0">
              <span className="text-[0.55rem] font-bold truncate block text-foreground leading-tight">
                {currentCard.name}
              </span>
              <span className="text-[0.45rem] text-muted-foreground truncate block leading-none">
                {currentCard.desc}
              </span>
            </div>
          </div>

          {/* Autoplay Hand/Pointer Cursor Overlay */}
          <div
            style={getCursorStyle()}
            className="absolute pointer-events-none z-20"
          >
            <MousePointer2 className="size-5 text-primary fill-primary stroke-background drop-shadow-[0_2px_5px_rgba(0,0,0,0.55)] rotate-22" />
          </div>
        </div>
      </div>

      {/* Control Actions */}
      <div className="flex items-center gap-3 w-full justify-center">
        <Button
          variant="outline"
          size="sm"
          disabled={animationState !== 'idle'}
          className="h-7 rounded-lg text-destructive border-destructive/20 hover:border-destructive/40 hover:bg-destructive/5 cursor-pointer font-semibold px-2 text-[9px] flex gap-1 items-center justify-center shrink-0"
          onClick={() => handleManualSwipe('left')}
        >
          <Trash2 className="size-3" />
          Swipe Left (Delete)
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={animationState !== 'idle'}
          className="h-7 rounded-lg text-green-500 border-green-500/20 hover:border-green-500/40 hover:bg-green-500/5 cursor-pointer font-semibold px-2 text-[9px] flex gap-1 items-center justify-center shrink-0"
          onClick={() => handleManualSwipe('right')}
        >
          <Bookmark className="size-3 fill-current" />
          Swipe Right (Keep)
        </Button>
      </div>
    </div>
  );
};

export const ReviewHelp: React.FC = () => {
  return (
    <>
      {/* Header */}
      <DialogHeader className="border-b border-border pb-3 shrink-0">
        <DialogTitle className="flex items-center gap-2.5 text-base font-bold text-foreground">
          <Sparkles className="size-5 text-primary" />
          Media Culling Queue
        </DialogTitle>
        <DialogDescription className="text-2xs text-muted-foreground leading-normal font-semibold mt-0.5 uppercase tracking-wider">
          Evaluate files quickly using hotkey decisions.
        </DialogDescription>
      </DialogHeader>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto space-y-5 min-h-0 pr-1 scrollbar-thin">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Review photos and videos sequentially to decide whether to keep them or queue them for deletion. Staged deletions are placed in a queue for your final review before anything is changed on disk.
        </p>

        {/* Interactive swipe animation demo */}
        <CullingAnimationDemo />

        {/* Core Concepts */}
        <div className="space-y-2">
          <h4 className="text-3xs font-extrabold uppercase text-primary tracking-wider">
            Core Concepts
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 border border-border/60 bg-muted/10 rounded-xl flex flex-col gap-1 transition-all duration-200 hover:border-primary/20">
              <span className="text-xs font-bold text-foreground">Culling Queue</span>
              <span className="text-2xs text-muted-foreground leading-normal mt-0.5">
                A deck of photos/videos loaded based on active filters, presented one-by-one for quick evaluation.
              </span>
            </div>
            <div className="p-3 border border-border/60 bg-muted/10 rounded-xl flex flex-col gap-1 transition-all duration-200 hover:border-primary/20">
              <span className="text-xs font-bold text-foreground">Review State</span>
              <span className="text-2xs text-muted-foreground leading-normal mt-0.5">
                Files in the queue are marked as Keep, Delete, or Skipped during inspection.
              </span>
            </div>
            <div className="p-3 border border-border/60 bg-muted/10 rounded-xl flex flex-col gap-1 transition-all duration-200 hover:border-primary/20">
              <span className="text-xs font-bold text-foreground">Staged Deletions</span>
              <span className="text-2xs text-muted-foreground leading-normal mt-0.5">
                Flagged items are not deleted immediately. They are staged in a summary view where you can review them once more before committing to disk.
              </span>
            </div>
          </div>
        </div>

        {/* Actions & Controls */}
        <div className="space-y-2">
          <h4 className="text-3xs font-extrabold uppercase text-primary tracking-wider">
            Actions & Controls
          </h4>
          <div className="border border-border/60 rounded-xl overflow-hidden divide-y divide-border/40 bg-muted/5">
            <div className="flex flex-col sm:grid sm:grid-cols-[250px_1fr] p-3 gap-1 sm:gap-4 text-2xs hover:bg-muted/10 transition-colors items-start sm:items-center">
              <div className="flex items-center gap-2 shrink-0">
                <Bookmark className="size-3.5 text-green-500 fill-green-500/10 shrink-0" />
                <span className="font-semibold text-foreground">Swipe Right (Keep)</span>
                <div className="flex gap-1">
                  <kbd className="px-1.5 py-0.5 text-3xs font-mono font-bold bg-muted border border-border/80 rounded shadow-xs text-muted-foreground select-none">K</kbd>
                  <kbd className="px-1.5 py-0.5 text-3xs font-mono font-bold bg-muted border border-border/80 rounded shadow-xs text-muted-foreground select-none">→</kbd>
                </div>
              </div>
              <span className="text-muted-foreground">
                Confirm you want to save the photo. Moves to the next item.
              </span>
            </div>
            <div className="flex flex-col sm:grid sm:grid-cols-[250px_1fr] p-3 gap-1 sm:gap-4 text-2xs hover:bg-muted/10 transition-colors items-start sm:items-center">
              <div className="flex items-center gap-2 shrink-0">
                <Trash2 className="size-3.5 text-destructive shrink-0" />
                <span className="font-semibold text-foreground">Swipe Left (Delete)</span>
                <div className="flex gap-1">
                  <kbd className="px-1.5 py-0.5 text-3xs font-mono font-bold bg-muted border border-border/80 rounded shadow-xs text-muted-foreground select-none">D</kbd>
                  <kbd className="px-1.5 py-0.5 text-3xs font-mono font-bold bg-muted border border-border/80 rounded shadow-xs text-muted-foreground select-none">←</kbd>
                  <kbd className="px-1.5 py-0.5 text-3xs font-mono font-bold bg-muted border border-border/80 rounded shadow-xs text-muted-foreground select-none">Del</kbd>
                </div>
              </div>
              <span className="text-muted-foreground">
                Stage the file for removal from disk. Moves to the next item.
              </span>
            </div>
            <div className="flex flex-col sm:grid sm:grid-cols-[250px_1fr] p-3 gap-1 sm:gap-4 text-2xs hover:bg-muted/10 transition-colors items-start sm:items-center">
              <div className="flex items-center gap-2 shrink-0">
                <ArrowRight className="size-3.5 text-muted-foreground shrink-0" />
                <span className="font-semibold text-foreground">Skip Card</span>
                <div className="flex gap-1">
                  <kbd className="px-1.5 py-0.5 text-3xs font-mono font-bold bg-muted border border-border/80 rounded shadow-xs text-muted-foreground select-none">Space</kbd>
                  <kbd className="px-1.5 py-0.5 text-3xs font-mono font-bold bg-muted border border-border/80 rounded shadow-xs text-muted-foreground select-none">↑</kbd>
                </div>
              </div>
              <span className="text-muted-foreground">
                Skip the current file without making a decision.
              </span>
            </div>
            <div className="flex flex-col sm:grid sm:grid-cols-[250px_1fr] p-3 gap-1 sm:gap-4 text-2xs hover:bg-muted/10 transition-colors items-start sm:items-center">
              <div className="flex items-center gap-2 shrink-0">
                <RotateCcw className="size-3.5 text-muted-foreground shrink-0" />
                <span className="font-semibold text-foreground">Undo / Go Back</span>
                <div className="flex gap-1">
                  <kbd className="px-1.5 py-0.5 text-3xs font-mono font-bold bg-muted border border-border/80 rounded shadow-xs text-muted-foreground select-none">Backspace</kbd>
                  <kbd className="px-1.5 py-0.5 text-3xs font-mono font-bold bg-muted border border-border/80 rounded shadow-xs text-muted-foreground select-none">↓</kbd>
                </div>
              </div>
              <span className="text-muted-foreground">
                Go back to the previous media card to change your decision.
              </span>
            </div>
            <div className="flex flex-col sm:grid sm:grid-cols-[250px_1fr] p-3 gap-1 sm:gap-4 text-2xs hover:bg-muted/10 transition-colors items-start sm:items-center">
              <div className="flex items-center gap-2 shrink-0">
                <CheckSquare className="size-3.5 text-primary shrink-0" />
                <span className="font-semibold text-foreground">Review Summary</span>
              </div>
              <span className="text-muted-foreground">
                Opens the deletion staging dialog to commit all staged deletions to disk.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tip Banner */}
      <div className="border-t border-border pt-3.5 mt-auto flex flex-row items-start gap-3 shrink-0">
        <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
          <Zap className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-2xs font-extrabold uppercase text-primary tracking-wider block">PRO TIP</span>
          <span className="text-2xs text-muted-foreground leading-relaxed mt-0.5 block">
            Filter the queue to only flagged low-quality items using the checkbox at the top to accelerate library cleaning.
          </span>
        </div>
      </div>
    </>
  );
};
