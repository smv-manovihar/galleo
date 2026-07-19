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

export const AppearanceConfig: React.FC = () => {
  const { settings, saveSettings } = useSettingsStore()
  const { theme, setTheme } = useTheme()

  const handleThemeChange = async (val: string) => {
    const nextTheme = val as "dark" | "light" | "system"

    // Update ThemeProvider (single source of truth — persists to localStorage)
    setTheme(nextTheme)

    // Save to settings db
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

  return (
    <div className="space-y-6 font-sans text-xs select-none">
      <Card className="border-border bg-card/45">
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">
            Theme & Interface
          </CardTitle>
          <CardDescription className="mt-0.5 text-xs text-muted-foreground">
            Configure application visual styles and appearance preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase">
              Color Theme
            </Label>

            <RadioGroup
              value={theme}
              onValueChange={handleThemeChange}
              className="xs:grid-cols-3 mt-1.5 grid grid-cols-1 gap-2.5"
            >
              {[
                { value: "light", id: "theme-light", label: "Light Theme" },
                { value: "dark", id: "theme-dark", label: "Dark Theme" },
                { value: "system", id: "theme-system", label: "System Sync" },
              ].map((themeOpt) => (
                <label
                  key={themeOpt.value}
                  htmlFor={themeOpt.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border/60 bg-muted/10 p-3 transition-all select-none hover:bg-muted/20"
                >
                  <RadioGroupItem
                    value={themeOpt.value}
                    id={themeOpt.id}
                    className="shrink-0 border-border focus-visible:ring-1"
                  />
                  <span className="truncate text-xs font-medium text-foreground">
                    {themeOpt.label}
                  </span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="my-6 h-px bg-border" />

          <div className="space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase">
              Font Size Scale
            </Label>

            <RadioGroup
              value={settings.ui.fontSize || "md"}
              onValueChange={handleFontSizeChange}
              className="xs:grid-cols-2 mt-1.5 grid grid-cols-1 gap-2.5 sm:grid-cols-4"
            >
              {[
                { value: "sm", id: "font-sm", label: "Small (85%)" },
                { value: "md", id: "font-md", label: "Normal (100%)" },
                { value: "lg", id: "font-lg", label: "Large (115%)" },
                { value: "xl", id: "font-xl", label: "Extra Large (130%)" },
              ].map((fontOpt) => (
                <label
                  key={fontOpt.value}
                  htmlFor={fontOpt.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border/60 bg-muted/10 p-3 transition-all select-none hover:bg-muted/20"
                >
                  <RadioGroupItem
                    value={fontOpt.value}
                    id={fontOpt.id}
                    className="shrink-0 border-border focus-visible:ring-1"
                  />
                  <span className="truncate text-xs font-medium text-foreground">
                    {fontOpt.label}
                  </span>
                </label>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
