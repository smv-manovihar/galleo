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
import { toast } from "sonner"

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

  return (
    <div className="space-y-6 font-sans text-xs select-none">
      <Card className="border-border bg-card/45">
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">
            Scan Rules
          </CardTitle>
          <CardDescription className="mt-0.5 text-xs text-muted-foreground">
            Tune the scanning heuristics and parameters.
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
    </div>
  )
}
