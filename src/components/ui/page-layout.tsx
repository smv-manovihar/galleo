import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageContainerProps extends React.ComponentProps<"div"> {
  maxWidth?: "default" | "sm" | "md" | "lg" | "xl" | "full";
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
  };

  return (
    <div
      className={cn(
        "w-full mx-auto px-6 py-6 md:py-8 flex flex-col gap-6 md:gap-8 min-h-0",
        maxWidthClasses[maxWidth],
        className
      )}
      {...props}
    />
  );
}

export interface PageHeaderProps extends React.ComponentProps<"div"> {
  title: string;
  description?: string;
  action?: React.ReactNode;
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
        "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5 shrink-0",
        className
      )}
      {...props}
    >
      <div className="flex flex-col gap-1 flex-1">
        <h1 className="font-heading font-bold text-xl md:text-2xl text-foreground tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground text-xs leading-relaxed max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex items-center gap-2 mt-2 sm:mt-0 shrink-0">{action}</div>}
    </div>
  );
}
