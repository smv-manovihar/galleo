import * as React from "react"
import { cn } from "@/lib/utils"

export interface PageContainerProps extends React.ComponentProps<"div"> {
  maxWidth?: "default" | "sm" | "md" | "lg" | "xl" | "full"
}

export function PageContainer({
  className,
  maxWidth = "default",
  ...props
}: PageContainerProps) {
  const maxWidthClasses = {
    default: "max-w-6xl",
    sm: "max-w-3xl",
    md: "max-w-4xl",
    lg: "max-w-5xl",
    xl: "max-w-7xl",
    full: "max-w-full",
  }

  return (
    <div
      className={cn(
        "mx-auto flex min-h-0 w-full flex-col gap-6 px-6 py-6 md:gap-8 md:py-8",
        maxWidthClasses[maxWidth],
        className
      )}
      {...props}
    />
  )
}

export interface PageHeaderProps extends React.ComponentProps<"div"> {
  title: string
  description?: string
  action?: React.ReactNode
}

export function PageHeader({
  className,
  title,
  description,
  action,
  ...props
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-2 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
      {...props}
    >
      <div className="flex flex-1 flex-col gap-1">
        <h1 className="font-heading text-xl font-bold tracking-tight text-foreground md:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="mt-2 flex shrink-0 items-center gap-2 sm:mt-0">
          {action}
        </div>
      )}
    </div>
  )
}
