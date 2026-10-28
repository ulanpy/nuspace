import { Outlet, useMatches } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"

import { visibleSections } from "@/lib/shell"
import { sessionQueryOptions } from "@/lib/user"
import { Rail } from "./rail"
import { SiteFooter } from "./site-footer"
import { SiteHeader } from "./site-header"
import type { ShellOptions } from "./types"

export type { RailSection, ShellOptions } from "./types"

/**
 * The shell every host renders inside: the shared header, the host's rail when
 * it has sections, the content, and the shared footer.
 *
 * It decides nothing about which routes exist on which host (nginx and the
 * route table do). A route shapes it through `staticData.shell`, read from
 * every match root first, so a layout route's sections cover its subtree and a
 * deeper route can override a key:
 *
 *     export const Route = createFileRoute("/_app/courses")({
 *       staticData: { shell: { sections: COURSES_SECTIONS } },
 *     })
 */
export function SiteLayout() {
  const shell = useMatches({
    select: (matches) =>
      matches.reduce<ShellOptions>(
        (merged, match) => ({ ...merged, ...match.staticData.shell }),
        {}
      ),
  })

  // The session is already in the cache: `_app` resolves it before any screen
  // renders. A row that is about the signed-in person drops out without one.
  const { data: session } = useQuery(sessionQueryOptions)
  const sections = visibleSections(shell.sections, Boolean(session))

  if (shell.bare) return <Outlet />

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SiteHeader sections={sections} search={shell.search} />
      <div className="flex flex-1">
        {sections ? <Rail sections={sections} /> : null}
        {/* The gutter lives here and nowhere else: screens never set their own
            padding, so they cannot end up padded twice. */}
        <main className="min-w-0 flex-1 px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
          <Outlet />
        </main>
      </div>
      <SiteFooter />
    </div>
  )
}
