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
import { Sun, Moon, Monitor, Type, Palette, Check } from "lucide-react"

export const AppearanceConfig: React.FC = () => {
  const { settings, saveSettings } = useSettingsStore()
  const { theme, setTheme } = useTheme()

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
      <Card className="border-border/60 bg-card/50 shadow-xs">
        <CardHeader className="border-b border-border/40 px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wide">
            <Palette className="h-3.5 w-3.5 text-primary" />
            Theme & Interface
          </CardTitle>
          <CardDescription className="text-2xs text-muted-foreground">
            Configure application visual styles and appearance preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          {/* Color Theme Section */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-2xs font-bold text-muted-foreground uppercase tracking-wider">
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
                    className={`relative flex cursor-pointer items-center justify-between gap-1.5 rounded-md border pl-2 pr-2.5 py-2 transition-all select-none ${
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
                        <IconComponent className={`h-3.5 w-3.5 ${themeOpt.iconColor}`} />
                      </div>
                      <span className="truncate text-xs">{themeOpt.label}</span>
                    </div>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                    )}
                  </label>
                )
              })}
            </RadioGroup>
          </div>

          <div className="h-px bg-border/40" />

          {/* Font Size Scale Section */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-2xs font-bold text-muted-foreground uppercase tracking-wider">
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
                  iconSize: "h-3 w-3",
                },
                {
                  value: "md",
                  id: "font-md",
                  label: "Normal",
                  sub: "100%",
                  iconSize: "h-3.5 w-3.5",
                },
                {
                  value: "lg",
                  id: "font-lg",
                  label: "Large",
                  sub: "115%",
                  iconSize: "h-4 w-4",
                },
                {
                  value: "xl",
                  id: "font-xl",
                  label: "Extra Large",
                  sub: "130%",
                  iconSize: "h-4.5 w-4.5",
                },
              ].map((fontOpt) => {
                const isSelected = currentFontSize === fontOpt.value

                return (
                  <label
                    key={fontOpt.value}
                    htmlFor={fontOpt.id}
                    className={`relative flex cursor-pointer items-center justify-between gap-1.5 rounded-md border pl-2 pr-2.5 py-2 transition-all select-none ${
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
                        <span className="text-3xs text-muted-foreground/80 mt-0.5">{fontOpt.sub}</span>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                    )}
                  </label>
                )
              })}
            </RadioGroup>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

