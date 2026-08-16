import type { MediaItem } from "../../../../shared/types/media"
import type { DuplicateStrategy } from "../../../../shared/types/settings"

export type FolderRuleType = "keep" | "delete" | "off"

export interface ExactDuplicateGroup {
  groupIdx: number
  keep: MediaItem
  deletes: MediaItem[]
}

export interface StrategyOption {
  value: DuplicateStrategy
  label: string
  shortLabel: string
  description: string
}

export const STRATEGY_OPTIONS: StrategyOption[] = [
  {
    value: "keep_most_grouped",
    label: "Most Grouped",
    shortLabel: "Grouped",
    description: "Keep copy in the folder with the most photos",
  },
  {
    value: "keep_oldest",
    label: "Oldest Capture",
    shortLabel: "Oldest",
    description: "Keep copy with the earliest capture timestamp",
  },
  {
    value: "keep_newest",
    label: "Newest Capture",
    shortLabel: "Newest",
    description: "Keep copy with the latest capture timestamp",
  },
  {
    value: "keep_shortest_path",
    label: "Shortest Path",
    shortLabel: "Short Path",
    description: "Keep copy stored in the shortest path / root-most directory",
  },
]

export const getDirPath = (filePath: string): string => {
  const lastSlash = Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\"))
  return lastSlash > 0 ? filePath.substring(0, lastSlash) : filePath
}

export const getFilenameAndExt = (name: string): { base: string; ext: string } => {
  const lastDot = name.lastIndexOf(".")
  if (lastDot > 0) {
    return {
      base: name.substring(0, lastDot),
      ext: name.substring(lastDot),
    }
  }
  return { base: name, ext: "" }
}
