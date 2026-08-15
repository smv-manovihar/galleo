"use client"

import * as React from "react"
import { useEffect } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list relative inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-horizontal/tabs:h-8 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
        animated: "bg-muted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  const listRef = React.useRef<HTMLDivElement>(null)
  const indicatorRef = React.useRef<HTMLDivElement>(null)

  useEffect(() => {
    const list = listRef.current
    const indicator = indicatorRef.current
    if (!list || !indicator || variant !== "animated") return

    let isInitial = true

    // Direct DOM manipulation completely bypasses React render delays
    const updateIndicator = (activeTab: HTMLElement) => {
      // Disable transition for the very first mount so it doesn't fly in from 0,0
      if (isInitial) {
        indicator.style.transition = "none"
      }

      indicator.style.left = `${activeTab.offsetLeft}px`
      indicator.style.top = `${activeTab.offsetTop}px`
      indicator.style.width = `${activeTab.offsetWidth}px`
      indicator.style.height = `${activeTab.offsetHeight}px`
      indicator.style.opacity = "1"

      if (isInitial) {
        // Force a browser reflow to apply the styles immediately
        void indicator.offsetWidth
        isInitial = false
        // Re-enable smooth transitions for all subsequent clicks
        indicator.style.transition = ""
      }
    }

    const sync = () => {
      const activeTab = list.querySelector(
        '[role="tab"][data-state="active"]'
      ) as HTMLElement
      if (activeTab) {
        updateIndicator(activeTab)
      }
    }

    // Run sync initially
    requestAnimationFrame(sync)

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "data-state" &&
          (mutation.target as HTMLElement).getAttribute("data-state") ===
            "active"
        ) {
          updateIndicator(mutation.target as HTMLElement)
        }
      }
    })

    observer.observe(list, {
      attributes: true,
      attributeFilter: ["data-state"],
      subtree: true,
    })

    const resizeObserver = new ResizeObserver(sync)
    resizeObserver.observe(list)
    list.querySelectorAll('[role="tab"]').forEach((tab) => {
      resizeObserver.observe(tab)
    })

    return () => {
      observer.disconnect()
      resizeObserver.disconnect()
    }
  }, [variant])

  return (
    <TabsPrimitive.List
      ref={listRef}
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    >
      {variant === "animated" && (
        <div
          ref={indicatorRef}
          // Utilizing a custom, snappy spring-like cubic-bezier easing
          className="absolute z-0 rounded-md bg-background shadow-sm transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] dark:border dark:border-input dark:bg-input/30"
          style={{ opacity: 0 }}
        />
      )}
      {props.children}
    </TabsPrimitive.List>
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        // Added duration-200 to `transition-all` so text colors fade in harmoniously with the sliding pill
        "relative z-10 inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-foreground/60 transition-all duration-200 group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start group-data-vertical/tabs:py-[calc(--spacing(1.25))] hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:border-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent",
        "data-[state=active]:bg-background data-[state=active]:text-foreground dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 dark:data-[state=active]:text-foreground",
        "group-data-[variant=animated]/tabs-list:data-[state=active]:bg-transparent group-data-[variant=animated]/tabs-list:data-[state=active]:shadow-none dark:group-data-[variant=animated]/tabs-list:data-[state=active]:bg-transparent",
        "after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:-bottom-1.25 group-data-horizontal/tabs:after:h-0.5 group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:-right-1 group-data-vertical/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        "data-[state=active]:slide-in-from-bottom-2.5 flex-1 text-xs/relaxed transition-all duration-200 outline-none data-[state=active]:animate-in data-[state=active]:fade-in-0",
        className
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
