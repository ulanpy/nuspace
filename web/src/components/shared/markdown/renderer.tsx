import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"

import { cn } from "@/lib/utils"

/**
 * Renders the descriptions that `markdown-toolbar.tsx` helps people write.
 *
 * Without this the toolbar is a trap: the author sees a **Bold** button, uses
 * it, and every reader gets literal asterisks. The first pass of the rebuild
 * rendered descriptions as `whitespace-pre-line` text, so every community and
 * event carried over from the old app showed its markup.
 *
 * `react-markdown` builds React elements rather than HTML, so there is no
 * `dangerouslySetInnerHTML` anywhere in the path and a description containing
 * `<script>` renders as the text it is. That property is the reason to use a
 * real parser here rather than a handful of regexes over the six constructs the
 * toolbar emits — descriptions are user input, and people paste into them.
 *
 * `jsx-a11y/anchor-has-content` and `heading-has-content` are switched off for
 * this file in `.oxlintrc.json`. These are renderer overrides: react-markdown
 * supplies the children at render time from the parsed document, so the lint
 * rules see an empty `<a>` that never exists at runtime. An empty link or
 * heading here would mean an empty one in the source text.
 */

const components: Components = {
  p: ({ className, ...props }) => (
    <p {...props} className={cn("leading-relaxed break-words", className)} />
  ),

  a: ({ className, ...props }) => (
    <a
      {...props}
      // Descriptions link off-campus more often than not, and `noreferrer`
      // keeps Nuspace out of the destination's referrer log.
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "font-medium break-words text-primary underline underline-offset-3",
        className
      )}
    />
  ),

  ul: ({ className, ...props }) => (
    <ul {...props} className={cn("list-disc space-y-1 pl-5", className)} />
  ),

  ol: ({ className, ...props }) => (
    <ol {...props} className={cn("list-decimal space-y-1 pl-5", className)} />
  ),

  /**
   * Headings inside a description are demoted: the page already has an `h1`
   * for the entity's name and an `h2` for "About", so a `##` written by an
   * author must not compete with either in the document outline.
   */
  h1: ({ className, ...props }) => (
    <h3 {...props} className={cn("text-lg font-semibold", className)} />
  ),
  h2: ({ className, ...props }) => (
    <h3 {...props} className={cn("text-base font-semibold", className)} />
  ),
  h3: ({ className, ...props }) => (
    <h4 {...props} className={cn("text-base font-medium", className)} />
  ),

  blockquote: ({ className, ...props }) => (
    <blockquote
      {...props}
      className={cn("border-l-2 border-border pl-3 italic", className)}
    />
  ),

  code: ({ className, ...props }) => (
    <code
      {...props}
      className={cn(
        "rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]",
        className
      )}
    />
  ),

  hr: ({ className, ...props }) => (
    <hr {...props} className={cn("border-border", className)} />
  ),

  // GFM tables, which nobody authors deliberately but which arrive pasted.
  table: ({ className, ...props }) => (
    <div className="overflow-x-auto">
      <table {...props} className={cn("w-full text-sm", className)} />
    </div>
  ),
  th: ({ className, ...props }) => (
    <th
      {...props}
      className={cn("border border-border px-2 py-1 text-left", className)}
    />
  ),
  td: ({ className, ...props }) => (
    <td
      {...props}
      className={cn("border border-border px-2 py-1", className)}
    />
  ),
}

/**
 * The same text with its markup taken off, for a truncated card preview.
 *
 * A preview is one clamped paragraph, so rendering it as markdown would fight
 * `line-clamp` — but showing `**Beginners welcome**` with the asterisks intact
 * is what the list pages did before, and it looked like a bug to everyone who
 * saw it. This removes the markers rather than interpreting them.
 *
 * Only the constructs the toolbar produces, plus links. Anything it misses
 * degrades to the character it already was.
 */
export function toPlainText(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s+/gm, "") // headings
    .replace(/^\s*>\s?/gm, "") // quotes
    .replace(/^\s*[-*+]\s+/gm, "") // bullets
    .replace(/^\s*\d+\.\s+/gm, "") // numbered items
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links, keeping the label
    .replace(/(\*\*|__)(.*?)\1/g, "$2") // bold
    .replace(/(\*|_)(.*?)\1/g, "$2") // italic
    .replace(/`([^`]*)`/g, "$1") // inline code
    .replace(/\s+/g, " ")
    .trim()
}

export function Markdown({
  children,
  className,
}: {
  children: string
  className?: string
}) {
  return (
    <div className={cn("space-y-3", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
