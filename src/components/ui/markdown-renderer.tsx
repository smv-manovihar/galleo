import * as React from 'react';
import { Streamdown } from 'streamdown';

interface MarkdownRendererProps {
  children: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`select-text ${className}`}>
      <Streamdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-base font-bold text-foreground mt-4 mb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-bold text-foreground mt-3 mb-1.5">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-semibold text-foreground mt-2 mb-1 uppercase tracking-wider">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-xs text-muted-foreground my-1 leading-relaxed">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-4 space-y-0.5 my-1 text-xs text-muted-foreground">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-4 space-y-0.5 my-1 text-xs text-muted-foreground">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-xs text-muted-foreground leading-normal">
              {children}
            </li>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              onClick={(e) => {
                e.preventDefault();
                if (href && typeof window !== 'undefined' && window.api) {
                  window.api.openExternal(href);
                }
              }}
              className="text-primary hover:underline font-medium cursor-pointer"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="font-mono text-2xs bg-accent/60 px-1 py-0.5 rounded-sm text-primary font-medium">
              {children}
            </code>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
        }}
      >
        {children}
      </Streamdown>
    </div>
  );
};
