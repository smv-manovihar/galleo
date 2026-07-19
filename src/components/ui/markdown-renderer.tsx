import * as React from "react"
import { Streamdown } from "streamdown"

interface MarkdownRendererProps {
  children: string
  className?: string
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  children,
  className = "",
}) => {
  return (
    <div className={`select-text ${className}`}>
      <Streamdown
        components={{
          h1: ({ children }) => (
            <h1 className="mt-4 mb-2 text-base font-bold text-foreground">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-3 mb-1.5 text-sm font-bold text-foreground">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-2 mb-1 text-xs font-semibold tracking-wider text-foreground uppercase">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="my-1 text-xs leading-relaxed text-muted-foreground">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="my-1 list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-1 list-decimal space-y-0.5 pl-4 text-xs text-muted-foreground">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-xs leading-normal text-muted-foreground">
              {children}
            </li>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              onClick={(e) => {
                e.preventDefault()
                if (href && typeof window !== "undefined" && window.api) {
                  window.api.openExternal(href)
                }
              }}
              className="cursor-pointer font-medium text-primary hover:underline"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="rounded-sm bg-accent/60 px-1 py-0.5 font-mono text-2xs font-medium text-primary">
              {children}
            </code>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">
              {children}
            </strong>
          ),
        }}
      >
        {children}
      </Streamdown>
    </div>
  )
}
