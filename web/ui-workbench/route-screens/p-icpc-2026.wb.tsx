// Stands in for pages.nuspace.kz/p/icpc-2026, a rendered Page: the compact bar
// a Page wears, and the design below it, drawn by the editor's own renderer.
import { ArrowLeftIcon, SettingsIcon } from "lucide-react"

import { PageRenderer } from "@/components/shared/page-editor/components/page-renderer"
import { ResilientImage } from "@/components/shared/media/resilient-image"
import { Button } from "@/components/ui/button"

const AVATAR =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect width='200' height='200' fill='%231d4ed8'/%3E%3Ctext x='100' y='128' font-family='system-ui,sans-serif' font-size='76' font-weight='600' fill='%23ffffff' fill-opacity='0.92' text-anchor='middle'%3EIC%3C/text%3E%3C/svg%3E"

const PAGE = {
  name: "ICPC 2026",
  slug: "icpc-2026",
}

/**
 * The page's design, in the blocks the editor writes. A block's `id` lives
 * inside `props`, not beside `type`: Puck reads it as `props.id` when it
 * builds the layer tree, and a block without one lands in that tree as a null
 * node and takes the whole page down with it.
 */
const DESIGN = {
  content: [
    {
      type: "Hero",
      props: {
        id: "hero",
        title: "ICPC 2026",
        description:
          "<p>The regional contest. Three hours, one problem set, and a team of three.</p>",
        fontSize: 16,
        align: "left",
        verticalAlign: "center",
        buttons: [
          {
            label: "Register",
            href: "#",
            variant: "primary",
            size: "large",
            icon: "none",
            iconPosition: "left",
            iconOnly: false,
          },
          {
            label: "Rules",
            href: "#",
            variant: "secondary",
            size: "large",
            icon: "none",
            iconPosition: "left",
            iconOnly: false,
          },
        ],
        image: {
          mode: "inline",
          placement: "right",
          url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%231d4ed8'/%3E%3Cstop offset='1' stop-color='%230e7490'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='800' height='600' fill='url(%23g)'/%3E%3C/svg%3E",
          alt: "",
          aspectRatio: "original",
        },
        verticalGap: "24px",
        horizontalGap: "24px",
        layout: { paddingX: "16px", padding: "64px" },
      },
    },
    {
      type: "Heading",
      props: { id: "schedule", text: "Schedule", level: "2", size: 14 },
    },
    {
      type: "RichText",
      props: {
        id: "schedule-body",
        richtext:
          "<p>Registration opens at 09:00. The practice round runs from 10:00 to 12:00, and the contest itself starts at 13:00 sharp.</p>",
        size: 14,
      },
    },
    {
      type: "Heading",
      props: { id: "where", text: "Where", level: "2", size: 14 },
    },
    {
      type: "Text",
      props: {
        id: "where-body",
        text: "Assembly Hall, Block 1. Doors open an hour before the first round.",
        size: 14,
      },
    },
  ],
  root: {
    props: {
      backgroundColor: "#ffffff",
      textColor: "",
      accentColor: "#1d4ed8",
      fontFamily: "Inter",
      borderRadius: "12px",
    },
  },
}

export default function RenderedPage() {
  return (
    <article>
      <header className="sticky top-0 z-40 border-b border-sidebar-border bg-sidebar">
        <div className="mx-auto flex h-[52px] max-w-6xl items-center gap-2 px-3 sm:px-6 md:h-16">
          <Button
            nativeButton={false}
            variant="ghost"
            size="icon"
            aria-label="Back to pages"
            render={<a href="?c=pages" />}
          >
            <ArrowLeftIcon className="size-5" aria-hidden />
          </Button>

          <div className="aspect-square size-9 shrink-0 overflow-hidden rounded-md bg-page/10 ring-1 ring-border md:size-11">
            <ResilientImage
              src={AVATAR}
              alt={`${PAGE.name} logo`}
              containerClassName="size-full"
              eager
            />
          </div>

          <h1 className="min-w-0 truncate text-lg/tight font-semibold tracking-tight">
            {PAGE.name}
          </h1>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            <Button
              nativeButton={false}
              variant="ghost"
              size="icon"
              aria-label="Settings"
              render={<a href="?c=p-icpc-2026-settings" />}
            >
              <SettingsIcon className="size-5" aria-hidden />
            </Button>
          </div>
        </div>
      </header>

      {/* No width clamp: the page's own design decides how wide it is. */}
      <div>
        <PageRenderer data={DESIGN} />
      </div>
    </article>
  )
}
