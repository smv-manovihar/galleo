import React, { useState } from "react"
import { useSettingsStore } from "../../stores/settings-store"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"
import {
  Plus,
  X,
  RotateCcw,
  FolderX,
  FolderPlus,
  ChevronDown,
  ChevronUp,
  Settings2,
} from "lucide-react"
import { toast } from "sonner"
import { DEFAULT_EXCLUDE_PATTERNS } from "../../../shared/constants"

export const ScanConfig: React.FC = () => {
  const { settings, saveSettings } = useSettingsStore()

  const [includeSubfolders, setIncludeSubfolders] = useState(
    settings.scanning.includeSubfolders
  )
  const [minFileSizeKB, setMinFileSizeKB] = useState(
    Math.round(settings.scanning.minFileSize / 1024)
  )
  const [concurrency, setConcurrency] = useState(
    settings.performance.maxConcurrentOps ?? 4
  )
  // Merge stored excludePatterns with DEFAULT_EXCLUDE_PATTERNS if stored settings had old partial defaults
  const [excludePatterns, setExcludePatterns] = useState<string[]>(() => {
    const stored = settings.scanning.excludePatterns
    if (!stored || stored.length === 0) {
      return [...DEFAULT_EXCLUDE_PATTERNS]
    }
    // If stored contains the old 3-item list or partial list, ensure all defaults are included by default
    const merged = Array.from(new Set([...stored, ...DEFAULT_EXCLUDE_PATTERNS]))
    return merged
  })
  const [newPatternInput, setNewPatternInput] = useState("")
  const [isDefaultsOpen, setIsDefaultsOpen] = useState(false)

  const handleToggleSubfolders = async (val: boolean) => {
    setIncludeSubfolders(val)
    await saveSettings({
      ...settings,
      scanning: {
        ...settings.scanning,
        includeSubfolders: val,
      },
    })
    toast.success("Scan rules updated successfully", {
      description: val
        ? "Subdirectory inclusion enabled."
        : "Subdirectory inclusion disabled.",
    })
  }

  const handleMinSizeChange = async (e: React.FocusEvent<HTMLInputElement>) => {
    const kbVal = parseInt(e.target.value, 10)
    if (isNaN(kbVal) || kbVal < 0) return

    setMinFileSizeKB(kbVal)
    await saveSettings({
      ...settings,
      scanning: {
        ...settings.scanning,
        minFileSize: kbVal * 1024,
      },
    })
    toast.success("Scan rules updated successfully", {
      description: `Minimum file size filter set to ${kbVal} KB.`,
    })
  }

  const handleConcurrencyCommit = async (val: number[]) => {
    const next = val[0]
    setConcurrency(next)
    await saveSettings({
      ...settings,
      performance: {
        ...settings.performance,
        maxConcurrentOps: next,
      },
    })
    toast.success("Scan rules updated successfully", {
      description: `Indexing parallelism set to ${next} threads.`,
    })
  }

  const handleAddExcludePattern = async (patternToAdd?: string) => {
    const targetPattern = (patternToAdd || newPatternInput).trim()
    if (!targetPattern) return

    if (/[?*+]\{/.test(targetPattern) || targetPattern.includes("***")) {
      toast.error("Invalid glob pattern format", {
        description: "Please check pattern syntax (e.g. *.tmp, node_modules).",
      })
      return
    }

    if (excludePatterns.includes(targetPattern)) {
      toast.error("Pattern already exists", {
        description: `"${targetPattern}" is already in the exclusion list.`,
      })
      return
    }

    const updated = [...excludePatterns, targetPattern]
    setExcludePatterns(updated)
    if (!patternToAdd) {
      setNewPatternInput("")
    }

    try {
      await saveSettings({
        ...settings,
        scanning: {
          ...settings.scanning,
          excludePatterns: updated,
        },
      })
      toast.success("Exclusion pattern added", {
        description: `Added "${targetPattern}" to exclusion rules.`,
      })
    } catch {
      toast.error("Failed to save settings")
    }
  }

  const handleBrowseFolderToExclude = async () => {
    if (typeof window !== "undefined" && window.api?.selectFolder) {
      try {
        const selectedPath = await window.api.selectFolder()
        if (selectedPath) {
          await handleAddExcludePattern(selectedPath)
        }
      } catch (err) {
        console.error("Failed to select folder to exclude", err)
      }
    }
  }

  const handleRemoveExcludePattern = async (patternToRemove: string) => {
    const updated = excludePatterns.filter((p) => p !== patternToRemove)
    setExcludePatterns(updated)

    await saveSettings({
      ...settings,
      scanning: {
        ...settings.scanning,
        excludePatterns: updated,
      },
    })

    toast.success("Exclusion pattern removed", {
      description: `Removed "${patternToRemove}" from exclusion rules.`,
    })
  }

  const handleResetExcludePatterns = async () => {
    const updatedDefaults = [...DEFAULT_EXCLUDE_PATTERNS]
    const customUserPatterns = excludePatterns.filter(
      (p) => !(DEFAULT_EXCLUDE_PATTERNS as readonly string[]).includes(p)
    )
    const resetList = Array.from(new Set([...customUserPatterns, ...updatedDefaults]))
    setExcludePatterns(resetList)

    await saveSettings({
      ...settings,
      scanning: {
        ...settings.scanning,
        excludePatterns: resetList,
      },
    })

    toast.success("Default exclusions restored", {
      description: "Restored system default exclusion patterns.",
    })
  }

  const customPatterns = excludePatterns.filter(
    (p) => !(DEFAULT_EXCLUDE_PATTERNS as readonly string[]).includes(p)
  )

  const activeDefaultPatterns = excludePatterns.filter((p) =>
    (DEFAULT_EXCLUDE_PATTERNS as readonly string[]).includes(p)
  )

  return (
    <div className="space-y-4 font-sans text-xs select-none">
      {/* Basic Scan Rules */}
      <Card className="border-border/60 bg-card/50 shadow-xs">
        <CardHeader className="border-b border-border/40 px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-xs font-bold text-foreground">
            <Settings2 className="h-3.5 w-3.5 text-primary" />
            Scan Rules
          </CardTitle>
          <CardDescription className="text-2xs text-muted-foreground">
            Tune scanning heuristics, filters, and background performance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          {/* Subfolders toggle */}
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/10 p-3.5 sm:p-4">
            <div className="min-w-0 flex-1 space-y-0.5">
              <Label
                htmlFor="include-subfolders"
                className="cursor-pointer font-semibold text-foreground"
              >
                Include Subdirectories
              </Label>
              <p className="text-xs leading-normal text-muted-foreground">
                Scan all subfolders recursively.
              </p>
            </div>
            <Switch
              id="include-subfolders"
              checked={includeSubfolders}
              onCheckedChange={handleToggleSubfolders}
              className="shrink-0"
            />
          </div>

          {/* Min file size filter */}
          <div className="flex flex-col justify-between gap-3 rounded-lg border border-border bg-muted/10 p-3.5 sm:flex-row sm:items-center sm:gap-4 sm:p-4">
            <div className="min-w-0 flex-1 space-y-0.5">
              <Label
                htmlFor="min-file-size"
                className="cursor-pointer font-semibold text-foreground"
              >
                Minimum File Size Filter
              </Label>
              <p className="text-xs leading-normal text-muted-foreground">
                Ignore files smaller than threshold (filters icon junk).
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
              <Input
                id="min-file-size"
                type="number"
                value={minFileSizeKB}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setMinFileSizeKB(parseInt(e.target.value, 10) || 0)
                }
                onBlur={handleMinSizeChange}
                className="h-9 w-24 border-border bg-background/50 text-center text-xs sm:w-20"
              />
              <span className="text-xs font-medium text-muted-foreground">
                KB
              </span>
            </div>
          </div>

          {/* Indexing parallelism */}
          <div className="flex flex-col justify-between gap-3 rounded-lg border border-border bg-muted/10 p-3.5 sm:flex-row sm:items-center sm:gap-4 sm:p-4">
            <div className="min-w-0 flex-1 space-y-0.5">
              <Label className="font-semibold text-foreground">
                Indexing Parallelism
              </Label>
              <p className="text-xs leading-normal text-muted-foreground">
                Simultaneous workers. Higher values speed up scans but use more CPU & RAM.
              </p>
            </div>
            <div className="flex w-full shrink-0 items-center gap-3 pt-1 sm:w-44 sm:pt-0">
              <Slider
                id="concurrency-slider"
                min={1}
                max={8}
                step={1}
                value={[concurrency]}
                onValueChange={(val) => setConcurrency(val[0])}
                onValueCommit={handleConcurrencyCommit}
                className="flex-1 py-2"
              />
              <span className="w-5 shrink-0 text-center text-xs font-semibold text-foreground tabular-nums">
                {concurrency}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exclusion Rules & Patterns */}
      <Card className="border-border/60 bg-card/50 shadow-xs">
        <CardHeader className="border-b border-border/40 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <CardTitle className="flex items-center gap-2 text-xs font-bold text-foreground">
                <FolderX className="h-3.5 w-3.5 text-primary" />
                Folder & File Exclusion List
              </CardTitle>
              <CardDescription className="text-2xs text-muted-foreground">
                Specify folder names, paths, or glob patterns to skip during folder indexing.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-2xs cursor-pointer"
              onClick={handleResetExcludePatterns}
            >
              <RotateCcw className="h-3 w-3" />
              Reset Defaults
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          {/* Controls: Input pattern + Browse folder picker */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex flex-1 gap-2">
              <Input
                type="text"
                placeholder="e.g. **/temp/** or *.bak or folder name..."
                value={newPatternInput}
                onChange={(e) => setNewPatternInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddExcludePattern()
                  }
                }}
                className="h-9 flex-1 border-border bg-background/50 text-xs"
              />
              <Button
                variant="default"
                size="sm"
                className="h-9 gap-1.5 px-3.5 text-xs cursor-pointer shrink-0"
                onClick={() => handleAddExcludePattern()}
                disabled={!newPatternInput.trim()}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Pattern
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2 px-3.5 text-xs cursor-pointer shrink-0 border-border bg-background/40 hover:bg-accent"
              onClick={handleBrowseFolderToExclude}
            >
              <FolderPlus className="h-3.5 w-3.5 text-primary" />
              Browse Folder...
            </Button>
          </div>

          {/* Custom User Exclusion List */}
          <div className="space-y-2">
            <Label className="text-2xs font-semibold text-muted-foreground">
              Custom User Exclusions ({customPatterns.length})
            </Label>

            {customPatterns.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-1">
                No custom folder or file patterns added. Use the input or &quot;Browse Folder...&quot; above to exclude specific paths.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 pt-0.5">
                {customPatterns.map((pattern) => (
                  <Badge
                    key={pattern}
                    variant="secondary"
                    className="flex items-center gap-1.5 py-1 px-2.5 text-xs font-mono bg-primary/10 border border-primary/25 text-primary"
                  >
                    <span className="truncate max-w-xs">{pattern}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveExcludePattern(pattern)}
                      className="ml-0.5 text-primary/70 hover:text-destructive transition-colors cursor-pointer"
                      title={`Remove exclusion "${pattern}"`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Collapsible Default System Patterns */}
          <Collapsible
            open={isDefaultsOpen}
            onOpenChange={setIsDefaultsOpen}
            className="rounded-lg border border-border/60 bg-muted/10 p-3"
          >
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer select-none">
                <div className="flex items-center gap-2">
                  <span className="text-2xs font-semibold text-muted-foreground">
                    Default System Patterns ({activeDefaultPatterns.length}/{DEFAULT_EXCLUDE_PATTERNS.length})
                  </span>
                </div>
                <div className="flex items-center gap-1 text-2xs text-muted-foreground hover:text-foreground transition-colors">
                  <span>{isDefaultsOpen ? "Hide Default List" : "Show Default List"}</span>
                  {isDefaultsOpen ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </div>
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent className="pt-3 space-y-2">
              <p className="text-xs leading-normal text-muted-foreground">
                These built-in patterns automatically prevent scanning heavy build artifacts, temporary caches, and system folders:
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1 max-h-48 overflow-y-auto scrollbar-thin">
                {DEFAULT_EXCLUDE_PATTERNS.map((pattern) => {
                  const isActive = excludePatterns.includes(pattern)
                  return (
                    <Badge
                      key={pattern}
                      variant="outline"
                      className={`flex items-center gap-1.5 py-0.5 px-2 text-2xs font-mono transition-colors ${
                        isActive
                          ? "border-border/60 bg-background/70 text-foreground/90 hover:bg-background"
                          : "border-border/20 bg-muted/20 text-muted-foreground/40"
                      }`}
                    >
                      <span>{pattern}</span>
                      {isActive ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveExcludePattern(pattern)
                          }}
                          className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                          title={`Remove default pattern "${pattern}"`}
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAddExcludePattern(pattern)
                          }}
                          className="ml-0.5 text-muted-foreground hover:text-primary transition-colors cursor-pointer text-3xs font-sans font-medium"
                          title={`Re-enable pattern "${pattern}"`}
                        >
                          +Enable
                        </button>
                      )}
                    </Badge>
                  )
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </div>
  )
}

