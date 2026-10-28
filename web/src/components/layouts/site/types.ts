import type { ComponentType } from "react"
import type { LinkProps } from "@tanstack/react-router"
import type { LucideIcon } from "lucide-react"

interface RailSectionBase {
  label: string
  icon: LucideIcon
  /** Lit only on `to` itself, not below it: a host's front door. */
  exact?: boolean
  /** Sits hard right, for a row that leaves the host. */
  trailing?: LucideIcon
  /**
   * Sits hard right too, for a row that carries a number. A component so it
   * can fetch its own count; it renders nothing when it has none.
   */
  badge?: ComponentType
  /** Hidden from a signed-out visitor: the row is about the signed-in person. */
  requiresSession?: boolean
}

/**
 * One row of a host's rail. It goes to a route (`to`), or, until the route
 * exists, to an address on the host (`href`); a ticket that adds the route
 * swaps the `href` for a `to` and the build then guards it.
 */
export type RailSection = RailSectionBase &
  (
    | {
        /**
         * Typed against the route tree, so a section whose route moves fails
         * the build here rather than linking to a 404.
         */
        to: LinkProps["to"]
        href?: never
      }
    | { href: string; to?: never }
  )

/**
 * What a route tells the site shell. Set it as `staticData.shell` on a layout
 * route and every screen below it inherits it; a deeper route that sets a key
 * overrides it for its own subtree.
 */
export interface ShellOptions {
  /**
   * The host's sections: a sticky rail beside the content from `md` up, and a
   * sheet from the header's burger below it. No sections, no rail, no burger.
   */
  sections?: readonly RailSection[]
  /**
   * A field in the header, for the search screens. It is a component so it
   * can read its own route's search params.
   */
  search?: ComponentType
  /**
   * No header, rail, footer or gutter: a screen that brings its own compact
   * bar and wants the whole viewport, like a Page and its editor.
   */
  bare?: boolean
}

declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    shell?: ShellOptions
  }
}
