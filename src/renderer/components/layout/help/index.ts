import React from "react"
import { DashboardHelp } from "./dashboard"
import { BrowseHelp } from "./browse"
import { CullingHelp } from "./culling"
import { DuplicatesHelp } from "./duplicates"
import { OrganizeHelp } from "./organize"
import { SettingsHelp } from "./settings"
import { DefaultHelp } from "./default"

export const helpComponentsMap: Record<string, React.ComponentType> = {
  dashboard: DashboardHelp,
  browse: BrowseHelp,
  review: CullingHelp,
  duplicates: DuplicatesHelp,
  organize: OrganizeHelp,
  settings: SettingsHelp,
}

export {
  DashboardHelp,
  BrowseHelp,
  CullingHelp,
  DuplicatesHelp,
  OrganizeHelp,
  SettingsHelp,
  DefaultHelp,
}
