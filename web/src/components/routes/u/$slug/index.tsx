import { useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { ArrowLeftIcon, InfoIcon, PaletteIcon } from "lucide-react"

import { useSession } from "@/hooks/use-session"
import { selectMedia } from "@/lib/media"
import { userPageQueryOptions } from "@/lib/user"
import type { UserCategory } from "@/lib/user"
import { PageRenderer } from "@/components/shared/page-editor/components/page-renderer"
import { pageChromeStyle } from "@/components/shared/page-editor/blocks/_lib"
import { ResilientImage } from "@/components/shared/media/resilient-image"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const CATEGORY_LABELS: Record<UserCategory, string> = {
  student: "Student",
  faculty: "Faculty",
  staff: "Staff",
}

/**
 * A public profile page.
 *
 * The community detail page, one column narrower: a sticky header tinted with
 * whatever the owner's editor chose for the page root, the page itself, and
 * nothing else. The community row list that was here went — a profile is about
 * the person, and the communities they head are one click away in the sidebar.
 *
 * "Design Page" is owner-only. Visibility is a setting, not something a
 * stranger can flip, and `is_page_public` off means a stranger gets a 404 with
 * no header at all.
 */
export function Page({ slug }: { slug: string }) {
  const { data: user } = useSuspenseQuery(userPageQueryOptions(slug))
  const session = useSession()
  const isOwner = session?.user.sub === user.sub

  return (
    <article>
      <header
        className="sticky top-0 z-40 border-b border-sidebar-border bg-sidebar"
        style={pageChromeStyle(user.page_content)}
      >
        <div className="mx-auto flex h-[52px] max-w-6xl items-center gap-2 px-3 sm:px-6 md:h-16">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  nativeButton={false}
                  variant="ghost"
                  size="icon"
                  aria-label="Back to My Nuspace"
                  render={<Link to="/mynuspace" />}
                >
                  <ArrowLeftIcon className="size-5" aria-hidden />
                </Button>
              }
            />
            <TooltipContent>Back to My Nuspace</TooltipContent>
          </Tooltip>

          <div className="size-9 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border md:size-11">
            <ResilientImage
              src={selectMedia(user.media, "profile")?.url ?? user.picture}
              alt={`${user.name} ${user.surname} profile`}
              containerClassName="size-full"
              eager
              fallback={
                <span
                  aria-hidden
                  className="grid size-full place-items-center bg-muted text-base font-semibold text-muted-foreground"
                >
                  {user.name.charAt(0).toUpperCase()}
                </span>
              }
            />
          </div>

          <div className="flex min-w-0 items-center gap-1.5">
            <h1 className="truncate text-lg/tight font-semibold tracking-tight">
              {user.name} {user.surname}
            </h1>
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Profile details"
                  >
                    <InfoIcon className="size-5" aria-hidden />
                  </Button>
                }
              />
              <PopoverContent align="start" className="w-56">
                <div className="grid gap-2 p-1">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Category
                    </p>
                    <p className="text-sm">{CATEGORY_LABELS[user.category]}</p>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            {isOwner ? (
              <Button
                nativeButton={false}
                size="sm"
                render={
                  <Link to="/u/$slug/editor" params={{ slug }}>
                    <PaletteIcon aria-hidden />
                    Design Page
                  </Link>
                }
              />
            ) : null}
          </div>
        </div>
      </header>

      {/* No `max-w-*` here: the page is the design, and the editor's own
          containers are what constrain its width. A `prose` column here would
          clamp every template the same way the community page does not. */}
      <div>
        <PageRenderer data={user.page_content ?? {}} />
      </div>
    </article>
  )
}
