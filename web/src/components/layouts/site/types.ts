import type { ComponentType } from "react"
import type { LinkProps } from "@tanstack/react-router"
import type { LucideIcon } from "lucide-react"

/** One row of a host's rail. */
export interface RailSection {
  /**
   * Typed against the route tree, so a section whose route moves fails the
   * build here rather than linking to a 404.
   */
  to: LinkProps["to"]
  label: string
  icon: LucideIcon
  /** Lit only on `to` itself, not below it: a host's front door. */
  exact?: boolean
  /** Sits hard right, for a row that leaves the host. */
  trailing?: LucideIcon
}

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
