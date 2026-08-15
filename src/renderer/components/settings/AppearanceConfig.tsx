import React from "react"
import { useSettingsStore } from "../../stores/settings-store"
import { useTheme } from "@/components/theme-provider"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Sun, Moon, Monitor, Check, Palette, Type, Sparkles } from "lucide-react"
import { useUIStore } from "../../stores/ui-store"
import { Switch } from "@/components/ui/switch"

export const AppearanceConfig: React.FC = () => {
  const { settings, saveSettings } = useSettingsStore()
  const { theme, setTheme } = useTheme()
  const previewTransitionAnimation = useUIStore((s) => s.previewTransitionAnimation)
  const setPreviewTransitionAnimation = useUIStore((s) => s.setPreviewTransitionAnimation)

  const handleThemeChange = async (val: string) => {
    const nextTheme = val as "dark" | "light" | "system"
    setTheme(nextTheme)

    await saveSettings({
      ...settings,
      ui: {
        ...settings.ui,
        theme: nextTheme,
      },
    })
    toast.success("Interface preferences updated successfully", {
      description: `Color theme set to ${val === "system" ? "System Sync" : val + " theme"}.`,
    })
  }

  const handleFontSizeChange = async (val: string) => {
    const nextSize = val as "sm" | "md" | "lg" | "xl"

    await saveSettings({
      ...settings,
      ui: {
        ...settings.ui,
        fontSize: nextSize,
      },
    })
    const sizeLabels = {
      sm: "Small",
      md: "Normal",
      lg: "Large",
      xl: "Extra Large",
    }
    toast.success("Interface preferences updated successfully", {
      description: `Font size scale set to ${sizeLabels[nextSize] || nextSize}.`,
    })
  }

  const currentFontSize = settings.ui.fontSize || "md"

  return (
    <div className="space-y-4 font-sans text-xs select-none">
      <Card className="border-border/60 bg-card/50 shadow-xs py-0 gap-0">
        <CardHeader className="border-b border-border/40 px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Palette className="size-4 text-primary" />
            Theme & Interface
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Configure application visual styles and appearance preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          {/* Color Theme Section */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Sun className="size-4 text-primary" />
              Color Theme
            </Label>

            <RadioGroup
              value={theme}
              onValueChange={handleThemeChange}
              className="grid grid-cols-3 gap-2"
            >
              {[
                {
                  value: "light",
                  id: "theme-light",
                  label: "Light",
                  icon: Sun,
                  iconColor: "text-amber-500 dark:text-amber-400",
                },
                {
                  value: "dark",
                  id: "theme-dark",
                  label: "Dark",
                  icon: Moon,
                  iconColor: "text-indigo-500 dark:text-indigo-400",
                },
                {
                  value: "system",
                  id: "theme-system",
                  label: "System",
                  icon: Monitor,
                  iconColor: "text-sky-500 dark:text-sky-400",
                },
              ].map((themeOpt) => {
                const IconComponent = themeOpt.icon
                const isSelected = theme === themeOpt.value

                return (
                  <label
                    key={themeOpt.value}
                    htmlFor={themeOpt.id}
                    className={`relative flex cursor-pointer items-center justify-between gap-2 rounded-md border px-3 py-2 transition-all select-none ${
                      isSelected
                        ? "border-primary/50 bg-primary/10 text-foreground font-medium shadow-2xs"
                        : "border-border/50 bg-muted/20 text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <RadioGroupItem
                        value={themeOpt.value}
                        id={themeOpt.id}
                        className="sr-only"
                      />
                      <div className="flex h-5 w-4 shrink-0 items-center justify-start">
                        <IconComponent className={`size-4 ${themeOpt.iconColor}`} />
                      </div>
                      <span className="truncate text-xs">{themeOpt.label}</span>
                    </div>
                    {isSelected && (
                      <Check className="size-4 shrink-0 text-primary" />
                    )}
                  </label>
                )
              })}
            </RadioGroup>
          </div>

          <div className="h-px bg-border/40" />

          {/* Font Size Scale Section */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Type className="size-4 text-primary" />
              Font Size Scale
            </Label>

            <RadioGroup
              value={currentFontSize}
              onValueChange={handleFontSizeChange}
              className="grid grid-cols-2 gap-2 sm:grid-cols-4"
            >
              {[
                {
                  value: "sm",
                  id: "font-sm",
                  label: "Small",
                  sub: "85%",
                  iconSize: "size-3",
                },
                {
                  value: "md",
                  id: "font-md",
                  label: "Normal",
                  sub: "100%",
                  iconSize: "size-4",
                },
                {
                  value: "lg",
                  id: "font-lg",
                  label: "Large",
                  sub: "115%",
                  iconSize: "size-5",
                },
                {
                  value: "xl",
                  id: "font-xl",
                  label: "Extra Large",
                  sub: "130%",
                  iconSize: "size-6",
                },
              ].map((fontOpt) => {
                const isSelected = currentFontSize === fontOpt.value

                return (
                  <label
                    key={fontOpt.value}
                    htmlFor={fontOpt.id}
                    className={`relative flex cursor-pointer items-center justify-between gap-2 rounded-md border px-3 py-2 transition-all select-none ${
                      isSelected
                        ? "border-primary/50 bg-primary/10 text-foreground font-medium shadow-2xs"
                        : "border-border/50 bg-muted/20 text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <RadioGroupItem
                        value={fontOpt.value}
                        id={fontOpt.id}
                        className="sr-only"
                      />
                      <div className="flex h-5 w-4 shrink-0 items-center justify-start">
                        <Type className={`${fontOpt.iconSize} ${isSelected ? "text-primary" : "text-muted-foreground"} -ml-3`} />
                      </div>
                      <div className="flex flex-col min-w-0 leading-none">
                        <span className="truncate text-xs">{fontOpt.label}</span>
                        <span className="text-xs text-muted-foreground/80 mt-1">{fontOpt.sub}</span>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="size-4 shrink-0 text-primary" />
                    )}
                  </label>
                )
              })}
            </RadioGroup>
          </div>

          {/* Media Preview Transitions Section */}
          <div className="flex items-center justify-between pt-3 border-t border-border/40">
            <div className="space-y-0.5 pr-4">
              <Label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer" htmlFor="preview-transitions">
                <Sparkles className="size-4 text-primary" />
                Media Preview Animations
              </Label>
              <p className="text-xs text-muted-foreground">
                Enable slide and fade transitions when cycling between media files in preview. Disable for instant side-by-side comparison mode.
              </p>
            </div>
            <Switch
              id="preview-transitions"
              checked={previewTransitionAnimation}
              onCheckedChange={(checked) => {
                setPreviewTransitionAnimation(checked)
                toast.success("Preview preferences updated", {
                  description: checked ? "Navigation animations enabled." : "Instant comparison mode enabled (animations off).",
                })
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

