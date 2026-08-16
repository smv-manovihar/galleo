import React from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Grid,
  List,
  InboxIcon,
  Clock,
  Bookmark,
  Trash2,
  Summary,
  CalendarClock,
} from "lucide-react"

export type FilterType = "all" | "photo" | "video"
export type FilterReviewState = "all" | "pending" | "kept" | "trash"
export type FilterQuality =
  | "all"
  | "blurry"
  | "dark"
  | "duplicates"
  | "screenshots"
  | "small"
export type SortBy =
  | "date-desc"
  | "date-asc"
  | "score-desc"
  | "score-asc"
  | "size-desc"
  | "size-asc"
export type LayoutMode = "card" | "list"
export type GroupMode = "normal" | "date"

export interface BrowseToolbarProps {
  filterType: FilterType
  onFilterTypeChange: (value: FilterType) => void
  filterReviewState: FilterReviewState
  onFilterReviewStateChange: (value: FilterReviewState) => void
  filterQuality: FilterQuality
  onFilterQualityChange: (value: FilterQuality) => void
  sortBy: SortBy
  onSortByChange: (value: SortBy) => void
  layoutMode: LayoutMode
  onLayoutModeChange: (value: LayoutMode) => void
  groupMode: GroupMode
  onGroupModeChange: (value: GroupMode) => void
  keptCount: number
  trashCount: number
}

const BrowseToolbarComponent: React.FC<BrowseToolbarProps> = ({
  filterType,
  onFilterTypeChange,
  filterReviewState,
  onFilterReviewStateChange,
  filterQuality,
  onFilterQualityChange,
  sortBy,
  onSortByChange,
  layoutMode,
  onLayoutModeChange,
  groupMode,
  onGroupModeChange,
  keptCount,
  trashCount,
}) => {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-center sm:justify-between gap-2 rounded-2xl border border-border/80 bg-card/90 p-1.5 shadow-xl backdrop-blur-md ring-1 ring-black/5 dark:ring-white/10 select-none">
      {/* Group 1: Tabs (Type & Review State) */}
      <div className="flex shrink-0 items-center gap-2">
        <Tabs
          value={filterType}
          onValueChange={(val) => onFilterTypeChange(val as FilterType)}
        >
          <TabsList className="h-8 rounded-lg border border-border bg-background p-0.5">
            <TabsTrigger
              value="all"
              className="h-7 rounded-md px-2.5 text-xs font-medium"
            >
              All
            </TabsTrigger>
            <TabsTrigger
              value="photo"
              className="h-7 rounded-md px-2.5 text-xs font-medium"
            >
              Photos
            </TabsTrigger>
            <TabsTrigger
              value="video"
              className="h-7 rounded-md px-2.5 text-xs font-medium"
            >
              Videos
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Review State Tabs (All, Pending, Kept, To Delete) */}
        <Tabs
          value={filterReviewState}
          onValueChange={(val) =>
            onFilterReviewStateChange(val as FilterReviewState)
          }
        >
          <TabsList className="h-8 rounded-lg border border-border bg-background p-0.5">
            <TabsTrigger
              value="all"
              className="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium"
              title="All Items"
            >
              <InboxIcon className="size-3.5 shrink-0" />
              <span className="hidden sm:inline">All</span>
            </TabsTrigger>
            <TabsTrigger
              value="pending"
              className="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium"
              title="Pending Review"
            >
              <Clock className="size-3.5 shrink-0" />
              <span className="hidden sm:inline">Pending</span>
            </TabsTrigger>
            <TabsTrigger
              value="kept"
              className="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium"
              title="Marked to Keep"
            >
              <Bookmark className="size-3.5 shrink-0" />
              <span className="hidden sm:inline">Kept</span>
              {keptCount > 0 && (
                <Badge
                  variant="outline"
                  className="flex h-4 min-w-4 items-center justify-center border-green-500/20 bg-green-500/10 px-1 text-xs text-green-600 dark:text-green-400"
                >
                  {keptCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="trash"
              className="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium"
              title="Marked to Delete"
            >
              <Trash2 className="size-3.5 shrink-0" />
              <span className="hidden sm:inline">To Delete</span>
              {trashCount > 0 && (
                <Badge
                  variant="outline"
                  className="flex h-4 min-w-4 items-center justify-center border-destructive/20 bg-destructive/10 px-1 text-xs text-destructive"
                >
                  {trashCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Group 2: Selects & Views (Quality, Sort, Layout & Grouping toggles) */}
      <div className="flex shrink-0 items-center gap-2.5">
        {/* Quality & Feature Filters Dropdown Select */}
        <Select
          value={filterQuality}
          onValueChange={(val) => onFilterQualityChange(val as FilterQuality)}
        >
          <SelectTrigger className="h-8 w-auto min-w-32 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground hover:bg-accent">
            <SelectValue placeholder="Quality Features" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Quality Features</SelectItem>
            <SelectItem value="duplicates">Duplicates</SelectItem>
            <SelectItem value="blurry">Blurry Photos</SelectItem>
            <SelectItem value="screenshots">Screenshots</SelectItem>
            <SelectItem value="dark">Dark Photos</SelectItem>
            <SelectItem value="small">Low Resolution</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={sortBy}
          onValueChange={(val) => onSortByChange(val as SortBy)}
        >
          <SelectTrigger className="h-8 w-auto max-w-40 min-w-28 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-foreground hover:bg-accent">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">Newest First</SelectItem>
            <SelectItem value="date-asc">Oldest First</SelectItem>
            <SelectItem value="score-desc">Highest Quality</SelectItem>
            <SelectItem value="score-asc">Lowest Quality</SelectItem>
            <SelectItem value="size-desc">Largest Size</SelectItem>
            <SelectItem value="size-asc">Smallest Size</SelectItem>
          </SelectContent>
        </Select>

        {/* Layout Mode Toggle: Card vs List */}
        <Tabs
          value={layoutMode}
          onValueChange={(val) => onLayoutModeChange(val as LayoutMode)}
        >
          <TabsList className="h-8 rounded-lg border border-border bg-background p-0.5">
            <TabsTrigger
              value="card"
              className="flex h-7 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-semibold"
              title="Card Layout"
            >
              <Grid className="size-3.5" />
              <span className="hidden lg:inline">Cards</span>
            </TabsTrigger>
            <TabsTrigger
              value="list"
              className="flex h-7 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-semibold"
              title="List Layout"
            >
              <List className="size-3.5" />
              <span className="hidden lg:inline">List</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Grouping Mode Toggle: Normal vs Date */}
        <Tabs
          value={groupMode}
          onValueChange={(val) => onGroupModeChange(val as GroupMode)}
        >
          <TabsList className="h-8 rounded-lg border border-border bg-background p-0.5">
            <TabsTrigger
              value="normal"
              className="flex h-7 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-semibold"
              title="Normal Sorted View"
            >
              <Summary className="size-3.5" />
              <span className="hidden lg:inline">Normal</span>
            </TabsTrigger>
            <TabsTrigger
              value="date"
              className="flex h-7 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-semibold"
              title="Date Grouped View"
            >
              <CalendarClock className="size-3.5" />
              <span className="hidden lg:inline">Date</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  )
}

export const BrowseToolbar = React.memo(BrowseToolbarComponent)
