import { useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"

import { useSession } from "@/hooks/use-session"
import { selectMedia } from "@/lib/media"
import { userPageQueryOptions } from "@/lib/user"
import { PageRenderer } from "@/components/shared/page-editor/components/page-renderer"
import { pageChromeStyle } from "@/components/shared/page-editor/blocks/_lib"
import { ResilientImage } from "@/components/shared/media/resilient-image"
import { Button } from "@/components/ui/button"

/**
 * A public profile page.
 *
 * The same shape as a community page: a sticky header tinted with whatever the
 * owner's editor chose for the page root, then the rendered page. There is no
 * owner action here beyond "Design page" — visibility is a setting, not
 * something a stranger can flip, and the editor for a page you cannot see is
 * still reachable from `/profile` because the owner always can.
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
        <div className="mx-auto flex h-[52px] max-w-4xl items-center gap-3 px-3 sm:px-6 md:h-16">
          <ResilientImage
            src={selectMedia(user.media, "profile")?.url ?? user.picture}
            alt=""
            aria-hidden
            eager
            containerClassName="size-8 shrink-0 rounded-full"
            fallback={
              <span
                aria-hidden
                className="grid size-full place-items-center bg-muted text-sm font-medium text-muted-foreground"
              >
                {user.name.charAt(0).toUpperCase()}
              </span>
            }
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">
              {user.name} {user.surname}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              /u/{user.slug}
            </span>
          </span>
          {isOwner ? (
            <Button
              nativeButton={false}
              size="sm"
              variant="outline"
              render={<Link to="/profile/editor">Design page</Link>}
            />
          ) : null}
        </div>
      </header>

      <div className="mx-auto max-w-4xl">
        <PageRenderer data={user.page_content ?? {}} />
      </div>
    </article>
  )
}
