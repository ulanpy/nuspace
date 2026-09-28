import type { CSSProperties } from "react"

import { contrastColor } from "./contrast"

/**
 * The colour the Puck editor chose for a page's root, read back out of its
 * saved `page_content`.
 *
 * Two shapes are accepted because Puck has written both: newer data nests the
 * styling under `root.props`, older saves put it straight on `root`. The
 * values are `unknown` because `page_content` is a JSON blob by design — the
 * editor validates it on the way in, and this only has to survive whatever it
 * wrote.
 */
export function pageRootColors(
  pageContent: Record<string, unknown> | null | undefined
): { background: string; foreground: string } {
  const root = (pageContent?.root ?? {}) as {
    props?: { backgroundColor?: unknown; textColor?: unknown }
    backgroundColor?: unknown
    textColor?: unknown
  }

  const rawBackground =
    root.props?.backgroundColor ?? root.backgroundColor
  const background =
    typeof rawBackground === "string" && rawBackground ? rawBackground : "#ffffff"

  const rawText = root.props?.textColor ?? root.textColor
  const foreground =
    typeof rawText === "string" && rawText ? rawText : contrastColor(background)

  return { background, foreground }
}

/**
 * Match the app chrome to the page it is showing.
 *
 * Applied to the public profile and community pages so the header does not sit
 * on a white bar above a page the reader chose to be dark. Every derived
 * colour is `color-mix` off the foreground, which is what keeps the muted and
 * border tokens legible without a second palette per page.
 */
export function pageChromeStyle(
  pageContent: Record<string, unknown> | null | undefined
): CSSProperties {
  const { background, foreground } = pageRootColors(pageContent)
  const mix = (percent: number) =>
    `color-mix(in oklab, ${foreground} ${String(percent)}%, transparent)`

  return {
    backgroundColor: background,
    color: foreground,
    ["--sidebar" as string]: background,
    ["--sidebar-foreground" as string]: foreground,
    ["--sidebar-border" as string]: mix(15),
    ["--sidebar-accent" as string]: mix(10),
    ["--sidebar-accent-foreground" as string]: foreground,
    ["--foreground" as string]: foreground,
    ["--muted-foreground" as string]: mix(65),
    ["--border" as string]: mix(15),
  }
}
