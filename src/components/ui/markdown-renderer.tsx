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
            <h1 className="mt-5 mb-2.5 text-3xl font-extrabold tracking-tight text-foreground">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-4 mb-2 text-2xl font-bold tracking-tight text-foreground">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-3.5 mb-1.5 text-xl font-bold text-foreground">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="mt-3 mb-1 text-lg font-semibold text-foreground">
              {children}
            </h4>
          ),
          h5: ({ children }) => (
            <h5 className="mt-2.5 mb-1 text-base font-semibold text-foreground">
              {children}
            </h5>
          ),
          h6: ({ children }) => (
            <h6 className="mt-2 mb-0.5 text-sm font-semibold uppercase tracking-wider text-foreground">
              {children}
            </h6>
          ),
          p: ({ children }) => (
            <p className="my-1.5 text-xs leading-relaxed text-foreground">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="my-1.5 list-disc space-y-1 pl-4 text-xs text-foreground">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-1.5 list-decimal space-y-1 pl-4 text-xs text-foreground">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-xs leading-relaxed text-foreground">
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
          pre: ({ children }) => (
            <pre className="my-2 overflow-x-auto rounded-md bg-accent/50 p-2 font-mono text-2xs text-foreground">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-primary/60 pl-3 italic text-xs text-foreground">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-3 border-border" />,
          table: ({ children }) => (
            <table className="my-2 w-full border-collapse text-xs">
              {children}
            </table>
          ),
          thead: ({ children }) => (
            <thead className="border-b border-border bg-accent/30">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-border/50">{children}</tbody>
          ),
          tr: ({ children }) => <tr>{children}</tr>,
          th: ({ children }) => (
            <th className="px-2 py-1 text-left font-bold text-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-2 py-1 text-foreground">{children}</td>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-foreground">
              {children}
            </strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          del: ({ children }) => (
            <del className="line-through text-foreground/75">
              {children}
            </del>
          ),
        }}
      >
        {children}
      </Streamdown>
    </div>
  )
}
