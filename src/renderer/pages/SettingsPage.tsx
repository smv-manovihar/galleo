import React from "react"
import { useUIStore } from "../stores/ui-store"
import { FolderConfig } from "../components/settings/FolderConfig"
import { ScanConfig } from "../components/settings/ScanConfig"
import { QualityConfig } from "../components/settings/QualityConfig"
import { AppearanceConfig } from "../components/settings/AppearanceConfig"
import { ResetConfig } from "../components/settings/ResetConfig"
import { AboutConfig } from "../components/settings/AboutConfig"
import { PageContainer } from "@/components/ui/page-layout"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import {
  FolderSync,
  Settings2,
  LineChart,
  Eye,
  RefreshCcw,
  Info,
} from "lucide-react"

export const SettingsPage: React.FC = () => {
  const {
    activeSettingsTab,
    setActiveSettingsTab,
    updateInfo,
    dismissedVersion,
  } = useUIStore()

  interface TabItem {
    value: "folders" | "scan" | "quality" | "appearance" | "reset" | "about"
    label: string
    icon: React.ComponentType<{ className?: string }>
    hasUpdate?: boolean
  }

  const tabsData: TabItem[] = [
    { value: "folders", label: "Allowed Roots", icon: FolderSync },
    { value: "scan", label: "Scan Rules", icon: Settings2 },
    { value: "quality", label: "Defect Sensitivity", icon: LineChart },
    { value: "appearance", label: "Theme & Interface", icon: Eye },
    { value: "reset", label: "Reset App Data", icon: RefreshCcw },
    {
      value: "about",
      label: "About & Updates",
      icon: Info,
      hasUpdate: Boolean(
        updateInfo?.updateAvailable &&
        updateInfo.latestVersion !== dismissedVersion
      ),
    },
  ]

  const activeTabItem =
    tabsData.find((t) => t.value === activeSettingsTab) || tabsData[0]
  const ActiveIcon = activeTabItem.icon

  return (
    <PageContainer maxWidth="xl" className="px-3.5 py-4 sm:px-6 sm:py-6">
      {/* Mobile/Tablet Full-Width Select Dropdown on Low Widths (< 1024px) */}
      <div className="sticky top-0 z-20 mb-3 w-full lg:hidden">
        <Select
          value={activeSettingsTab}
          onValueChange={(val: string) =>
            setActiveSettingsTab(val as TabItem["value"])
          }
        >
          <SelectTrigger className="h-12! w-full cursor-pointer justify-between rounded-xl border-border bg-card/90 px-4 text-xs font-semibold shadow-xs backdrop-blur-md sm:text-sm">
            <div className="flex min-w-0 items-center gap-3 truncate">
              <ActiveIcon className="h-4.5 w-4.5 shrink-0 text-primary" />
              <span className="truncate">{activeTabItem.label}</span>
              {activeTabItem.hasUpdate && (
                <span className="flex h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-500" />
              )}
            </div>
          </SelectTrigger>
          <SelectContent
            position="popper"
            align="center"
            className="z-50 w-(--radix-select-trigger-width) rounded-xl border border-border bg-popover p-1 shadow-md"
          >
            <SelectGroup>
              {tabsData.map((t) => {
                const TIcon = t.icon
                return (
                  <SelectItem
                    key={t.value}
                    value={t.value}
                    className="cursor-pointer gap-2.5 rounded-md px-3 py-2.5 text-xs font-medium"
                  >
                    <TIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span>{t.label}</span>
                    {t.hasUpdate && (
                      <span className="ml-auto flex h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-500" />
                    )}
                  </SelectItem>
                )
              })}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <Tabs
        value={activeSettingsTab}
        onValueChange={(val: string) =>
          setActiveSettingsTab(val as TabItem["value"])
        }
        orientation="vertical"
        className="flex min-h-0 min-w-0 flex-1 flex-col items-stretch gap-4 lg:flex-row lg:gap-8"
      >
        {/* Settings Navigation Tabs Sidebar */}
        <TabsList className="z-10 hidden h-fit w-56 shrink-0 gap-1.5 rounded-xl border border-border bg-card/60 p-1.5 backdrop-blur-md select-none lg:sticky lg:top-6 lg:flex lg:flex-col">
          {tabsData.map((tab) => {
            const Icon = tab.icon
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="h-9 w-full cursor-pointer justify-start gap-2 rounded-lg px-3.5 text-xs font-medium whitespace-nowrap transition-all data-active:bg-background data-active:shadow-xs"
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-data-active:text-primary" />
                <span className="truncate">{tab.label}</span>
                {tab.hasUpdate && (
                  <span className="ml-auto flex h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-500" />
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {/* Configurations Views Panels */}
        <div className="min-w-0 flex-1">
          <TabsContent
            value="folders"
            className="m-0 focus-visible:outline-none"
          >
            <FolderConfig />
          </TabsContent>
          <TabsContent value="scan" className="m-0 focus-visible:outline-none">
            <ScanConfig />
          </TabsContent>
          <TabsContent
            value="quality"
            className="m-0 focus-visible:outline-none"
          >
            <QualityConfig />
          </TabsContent>
          <TabsContent
            value="appearance"
            className="m-0 focus-visible:outline-none"
          >
            <AppearanceConfig />
          </TabsContent>
          <TabsContent value="reset" className="m-0 focus-visible:outline-none">
            <ResetConfig />
          </TabsContent>
          <TabsContent value="about" className="m-0 focus-visible:outline-none">
            <AboutConfig />
          </TabsContent>
        </div>
      </Tabs>
    </PageContainer>
  )
}
