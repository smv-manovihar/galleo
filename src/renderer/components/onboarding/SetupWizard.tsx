import React, { useState, useEffect, useRef } from "react"
import { useSettingsStore } from "../../stores/settings-store"
import { Button } from "@/components/ui/button"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { CullingAnimationDemo } from "../layout/help/culling"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip"
import {
  FolderPlus,
  ShieldCheck,
  Zap,
  Layers,
  AlertCircle,
  Folder,
  FileImage,
  Trash2,
  Loader2,
  Aperture,
  Copy,
  Check,
  Play,
  Pause,
} from "lucide-react"

// ==========================================
// FEATURE 3: Duplicate Finder (Audit) Preview
// ==========================================
const DuplicatePreview: React.FC = () => {
  const [removedDuplicate, setRemovedDuplicate] = useState<boolean>(false)

  return (
    <div className="flex h-full flex-col justify-between space-y-2">
      <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
        <span className="flex items-center gap-1 font-semibold text-foreground">
          <Layers className="h-3.5 w-3.5 text-primary" />
          Duplicate Audit Review
        </span>
        <span className="text-[9px] text-muted-foreground">
          1 duplicate group detected
        </span>
      </div>

      <div className="space-y-2 rounded-xl border border-border/50 bg-muted/20 p-2.5">
        <div className="flex items-center justify-between text-[8px] text-muted-foreground">
          <span>
            Group:{" "}
            <span className="font-mono font-semibold text-foreground">
              IMG_0920.jpg
            </span>
          </span>
          <span className="py-0.2 rounded border border-primary/20 bg-primary/10 px-1 font-bold text-primary">
            100% Match
          </span>
        </div>

        <div className="relative grid grid-cols-2 gap-2.5">
          {/* File A: Original (Keep) */}
          <div className="flex min-h-[75px] flex-col justify-between space-y-1 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2">
            <div className="flex items-center justify-between">
              <span className="max-w-[65px] truncate font-mono text-[8px] text-foreground">
                IMG_0920.jpg
              </span>
              <span className="py-0.2 rounded bg-emerald-500/10 px-1 text-[7px] font-semibold text-emerald-600 dark:text-emerald-400">
                KEEP
              </span>
            </div>
            <div className="space-y-0.5 border-t border-border/30 pt-1 text-[8px] text-muted-foreground">
              <div>
                Size: <span className="text-foreground">5.2 MB</span>
              </div>
            </div>
          </div>

          {/* File B: Duplicate (Delete) */}
          <div
            className={`flex min-h-[75px] flex-col justify-between space-y-1 rounded-lg border p-2 transition-all duration-300 ${
              removedDuplicate
                ? "scale-95 border-dashed border-border/40 bg-muted/5 opacity-30"
                : "border-rose-500/20 bg-rose-500/5"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="max-w-[65px] truncate font-mono text-[8px] text-foreground">
                IMG_0920_copy.jpg
              </span>
              <span
                className={`py-0.2 rounded border px-1 text-[7px] font-semibold ${
                  removedDuplicate
                    ? "border-border/20 bg-muted text-muted-foreground"
                    : "border-rose-500/10 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                }`}
              >
                {removedDuplicate ? "DELETED" : "TRASH"}
              </span>
            </div>
            <div className="space-y-0.5 border-t border-border/30 pt-1 text-[8px] text-muted-foreground">
              <div>
                Size: <span className="text-foreground">5.2 MB</span>
              </div>
            </div>
          </div>

          {!removedDuplicate && (
            <div className="absolute top-1/2 left-1/2 flex h-5.5 w-5.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-muted bg-border shadow-sm">
              <Copy className="h-3 w-3 text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

      {!removedDuplicate ? (
        <Button
          className="h-6 w-full cursor-pointer gap-1 bg-primary text-[9px] font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/95"
          onClick={() => setRemovedDuplicate(true)}
        >
          <Trash2 className="h-3 w-3" /> Clean Up Exact Duplicate
        </Button>
      ) : (
        <div className="flex items-center justify-between py-0.5 text-[8px]">
          <span className="flex items-center gap-0.5 font-semibold text-emerald-500">
            <Check className="h-3 w-3" /> Duplicate cleaned. Freed 5.2 MB.
          </span>
          <Button
            variant="ghost"
            className="h-5 cursor-pointer px-1.5 text-[8px] text-muted-foreground underline"
            onClick={() => setRemovedDuplicate(false)}
          >
            Undo
          </Button>
        </div>
      )}
    </div>
  )
}

// ==========================================
// FEATURE 4: File Organizer (Sort) Preview
// ==========================================
const OrganizerPreview: React.FC = () => {
  const [step, setStep] = useState<number>(0) // 0: Messy, 1: Scanning, 2: Organized

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => (prev + 1) % 3)
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex h-full flex-col justify-between space-y-2">
      {step === 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between border-b border-border pb-1.5">
            <span className="flex items-center gap-1 font-semibold text-foreground">
              <Folder className="h-3.5 w-3.5 text-muted-foreground" />
              Unorganized Source Folder
            </span>
            <span className="text-[9px] text-muted-foreground">3 items</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between rounded border border-border/40 bg-muted/20 p-1.5 text-[9px]">
              <span className="flex items-center gap-1.5 truncate">
                <FileImage className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="truncate font-medium text-foreground/90">
                  DSC_0981.jpg
                </span>
              </span>
              <span className="shrink-0 text-[8px] text-muted-foreground">
                2.4 MB
              </span>
            </div>
            <div className="flex items-center justify-between rounded border border-amber-500/10 bg-amber-500/5 p-1.5 text-[9px]">
              <span className="flex items-center gap-1.5 truncate">
                <FileImage className="h-3 w-3 shrink-0 text-amber-500" />
                <span className="truncate font-medium text-foreground/90">
                  screenshot_22.png
                </span>
              </span>
              <span className="py-0.2 shrink-0 rounded bg-amber-500/10 px-1 text-[8px] font-medium text-amber-600 dark:text-amber-400">
                Screenshot
              </span>
            </div>
            <div className="flex items-center justify-between rounded border border-orange-500/10 bg-orange-500/5 p-1.5 text-[9px]">
              <span className="flex items-center gap-1.5 truncate">
                <FileImage className="h-3 w-3 shrink-0 text-orange-500" />
                <span className="truncate font-medium text-foreground/90">
                  IMG_4330.jpg
                </span>
              </span>
              <span className="py-0.2 shrink-0 rounded bg-orange-500/10 px-1 text-[8px] font-medium text-orange-600 dark:text-orange-400">
                Blurry
              </span>
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col items-center justify-center space-y-3 py-5">
          <Loader2 className="mb-1 h-6 w-6 animate-spin text-primary" />
          <div className="space-y-0.5 text-center">
            <div className="text-xs font-semibold text-foreground">
              Sorting & Filing...
            </div>
            <div className="text-[9px] text-muted-foreground">
              Reading EXIF date tags and filing structure
            </div>
          </div>
          <div className="h-1 w-full max-w-[150px] overflow-hidden rounded-full bg-muted">
            <div
              className="h-1 rounded-full bg-primary"
              style={{ width: "75%" }}
            ></div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between border-b border-border pb-1.5">
            <span className="flex items-center gap-1 font-semibold text-foreground">
              <Folder className="h-3.5 w-3.5 text-emerald-500" />
              Organized Target Hierarchy
            </span>
            <span className="text-[9px] font-medium text-emerald-500">
              Success
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="space-y-1.5 rounded border border-emerald-500/10 bg-emerald-500/5 p-2 text-[9px]">
              <div className="flex items-center gap-1 font-medium text-foreground">
                <Folder className="h-3 w-3 shrink-0 text-emerald-500" />
                <span>2026 / 07-July</span>
              </div>
              <div className="flex items-center justify-between pl-4 text-[8px] text-muted-foreground">
                <span className="flex items-center gap-1 truncate">
                  <FileImage className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">DSC_0981.jpg</span>
                </span>
                <span>2.4 MB</span>
              </div>
            </div>
            <div className="flex items-center justify-between rounded border border-border/50 bg-muted/40 p-1.5 text-[9px]">
              <span className="flex items-center gap-1 truncate text-muted-foreground">
                <Trash2 className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="truncate">Moved to Recycle Bin</span>
              </span>
              <span className="py-0.2 shrink-0 rounded bg-muted px-1 text-[8px] font-medium text-muted-foreground">
                2 clutter items
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border/60 pt-2 text-[8px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${step === 0 ? "scale-125 bg-primary" : "bg-border"}`}
          />
          <span
            className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${step === 1 ? "scale-125 bg-primary" : "bg-border"}`}
          />
          <span
            className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${step === 2 ? "scale-125 bg-primary" : "bg-border"}`}
          />
        </div>
        <span>Organize Pipeline Simulator</span>
      </div>
    </div>
  )
}

// ==========================================
// FEATURE SHOWCASE WIDGET (Tabs + Autoplay)
// ==========================================
const FeatureShowcaseVisualizer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("cull")
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null)

  const tabs = [
    { id: "cull", label: "Media culling", icon: Zap },
    { id: "duplicates", label: "Duplicates", icon: Layers },
    { id: "organize", label: "Organizer", icon: Folder },
  ]

  useEffect(() => {
    if (!isPlaying) {
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current)
      return
    }

    autoplayTimerRef.current = setInterval(() => {
      setActiveTab((prev) => {
        const idx = tabs.findIndex((t) => t.id === prev)
        return tabs[(idx + 1) % tabs.length].id
      })
    }, 6000)

    return () => {
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current)
    }
  }, [isPlaying])

  const handleTabClick = (tabId: string) => {
    setIsPlaying(false) // Pause autoplay when user manually interacts
    setActiveTab(tabId)
  }

  return (
    <TooltipProvider>
      <div className="flex w-full flex-col justify-between py-0.5 font-sans text-xs select-none lg:h-[350px]">
        <div className="flex flex-1 flex-col justify-between overflow-hidden rounded-xl border border-border/80 bg-card/65 shadow-lg backdrop-blur-sm">
          {/* macOS Style Mock Window Header */}
          <div className="flex items-center justify-between border-b border-border/50 bg-muted/30 px-3 py-1.5">
            <div className="flex gap-1">
              <span className="h-2 w-2 rounded-full bg-rose-500/60" />
              <span className="h-2 w-2 rounded-full bg-amber-500/60" />
              <span className="h-2 w-2 rounded-full bg-emerald-500/60" />
            </div>
            <div className="flex items-center gap-1 text-[9px] font-medium text-muted-foreground">
              <Aperture className="animate-spin-slow h-3 w-3 text-primary" />
              <span>Galleo Preview Mode</span>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setIsPlaying((p) => !p)}
                  className="flex cursor-pointer items-center justify-center rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                >
                  {isPlaying ? (
                    <Pause className="h-2.5 w-2.5" />
                  ) : (
                    <Play className="h-2.5 w-2.5 animate-pulse text-primary" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="px-2 py-1 text-[10px]">
                {isPlaying ? "Pause Auto-cycle" : "Resume Auto-cycle"}
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Feature Tabs Navigation */}
          <div className="grid grid-cols-3 gap-0.5 border-b border-border/50 bg-muted/10 p-0.5">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border px-0.5 py-1 transition-all duration-200 ${
                    isActive
                      ? "border-border/85 bg-card font-semibold text-foreground shadow-2xs"
                      : "border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  }`}
                >
                  <Icon
                    className={`h-3 w-3 ${isActive ? "text-primary" : "text-muted-foreground/80"}`}
                  />
                  <span className="max-w-full truncate text-[8px] tracking-tight">
                    {tab.label}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Active Previews Container */}
          <div className="flex min-h-[190px] flex-1 flex-col justify-between bg-card/25 p-3">
            {activeTab === "cull" && <CullingAnimationDemo standalone={true} />}
            {activeTab === "duplicates" && <DuplicatePreview />}
            {activeTab === "organize" && <OrganizerPreview />}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

export const SetupWizard: React.FC = () => {
  const { addRootFolder } = useSettingsStore()
  const [error, setError] = useState<string | null>(null)

  const handleSelectRoot = async () => {
    setError(null)
    try {
      if (
        typeof window === "undefined" ||
        !window.api ||
        !window.api.selectFolder
      ) {
        throw new Error(
          "Galleo requires the Electron wrapper to select local directories. If you are previewing in a web browser, please close this tab and run the app via Electron."
        )
      }
      const selected = await window.api.selectFolder()
      if (selected) {
        const success = await addRootFolder(selected)
        if (!success) {
          throw new Error(
            "Failed to save the selected root folder settings to the database."
          )
        }
      }
    } catch (e: any) {
      console.error("Wizard folder select failed:", e)
      setError(e.message || "Folder selection failed")
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-background p-4 font-sans md:p-6">
      <div className="grid max-h-[calc(100vh-40px)] w-full max-w-5xl grid-cols-1 gap-0 overflow-hidden rounded-2xl border border-border/85 bg-card/40 shadow-2xl backdrop-blur-md lg:h-[540px] lg:grid-cols-12">
        {/* Left Column: Branding and Feature List */}
        <div className="flex flex-col justify-between space-y-6 p-6 md:p-8 lg:col-span-7">
          {/* Header */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="animate-spin-slow flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-primary to-destructive text-primary-foreground">
                <Aperture className="h-4.5 w-4.5" />
              </div>
              <span className="font-heading text-xl font-extrabold tracking-tight text-foreground">
                Galleo
              </span>
            </div>

            <div className="space-y-1">
              <h1 className="font-heading text-2xl leading-tight font-black tracking-tight text-foreground md:text-3xl">
                Your media,
                <br />
                beautifully structured.
              </h1>
              <p className="max-w-md text-2xs leading-relaxed text-muted-foreground">
                Local-first media organizer. Select a folder to scan, cull low-quality photos, remove duplicates, and organize files.
              </p>
            </div>
          </div>

          {/* Core Features */}
          <div className="space-y-3.5 pt-0.5">
            <div className="flex gap-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary">
                <Zap className="h-3.5 w-3.5" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs font-semibold text-foreground">
                  Media culling
                </h3>
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  Flags blurry and low-quality photos to reclaim storage space.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary">
                <Layers className="h-3.5 w-3.5" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs font-semibold text-foreground">
                  Duplicate Finder
                </h3>
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  Finds exact duplicates and similar shots to remove clutter.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary">
                <Folder className="h-3.5 w-3.5" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs font-semibold text-foreground">
                  File Organizer
                </h3>
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  Sorts files into clean folders by EXIF year and month.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2.5 pt-1">
            {error && (
              <Alert variant="destructive" className="px-2.5 py-2">
                <AlertCircle className="h-3.5 w-3.5" />
                <AlertTitle className="text-2xs font-semibold">
                  Folder Selection Failed
                </AlertTitle>
                <AlertDescription className="text-[10px]">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-1.5">
              <Button
                className="h-9.5 w-full cursor-pointer gap-1.5 bg-primary text-xs font-medium text-primary-foreground shadow-md transition-colors hover:bg-primary/95"
                onClick={handleSelectRoot}
              >
                <FolderPlus className="h-3.5 w-3.5" />
                Select Folder to Manage
              </Button>

              {/* Privacy Banner */}
              <div className="flex items-center gap-2 rounded-lg border border-primary/10 bg-primary/5 p-2 text-[10px] text-muted-foreground">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>
                  <strong className="text-[10px] font-semibold text-foreground">
                    100% Offline & Private:
                  </strong>{" "}
                  All analysis is local. Media never leaves your PC.
                </span>
              </div>
            </div>

            <p className="text-center text-3xs text-muted-foreground">
              Configure folders, quality rules, and shortcuts in Settings.
            </p>
          </div>
        </div>

        {/* Right Column: Interactive Mockup Showcase */}
        <div className="relative flex flex-col items-stretch justify-center overflow-hidden p-6 select-none lg:col-span-5">
          <div className="bg-radial-gradient absolute inset-0 from-transparent to-background/5 opacity-50" />
          <div className="relative z-10 w-full">
            <FeatureShowcaseVisualizer />
          </div>
        </div>
      </div>
    </div>
  )
}
