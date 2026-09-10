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
