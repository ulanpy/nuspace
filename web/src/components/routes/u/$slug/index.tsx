import { useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { ArrowLeftIcon, PaletteIcon } from "lucide-react"

import { useSession } from "@/hooks/use-session"
import { selectMedia } from "@/lib/media"
import { userPageQueryOptions } from "@/lib/user"
import type { UserCategory, UserCommunity } from "@/lib/user"
import { PageRenderer } from "@/components/shared/page-editor/components/page-renderer"
import { pageChromeStyle } from "@/components/shared/page-editor/blocks/_lib"
import { ResilientImage } from "@/components/shared/media/resilient-image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"

const CATEGORY_LABELS: Record<UserCategory, string> = {
  student: "Student",
  faculty: "Faculty",
  staff: "Staff",
}

const POSITION_LABELS: Record<UserCommunity["position"], string> = {
  owner: "Owner",
  admin: "Admin",
}

/**
 * A public profile page.
 *
 * The same shape as a community page: a sticky header tinted with whatever the
 * owner's editor chose for the page root, then the rendered page. The one
 * action is "Design Page" and only the owner sees it — visibility is a setting,
 * not something a stranger can flip, and `is_page_public` off means a stranger
 * gets a 404 with no header at all.
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
          <Button
            nativeButton={false}
            variant="ghost"
            size="icon"
            aria-label="Back to My Nuspace"
            render={<Link to="/mynuspace" />}
          >
            <ArrowLeftIcon className="size-5" aria-hidden />
          </Button>

          <ResilientImage
            src={selectMedia(user.media, "profile")?.url ?? user.picture}
            alt=""
            aria-hidden
            eager
            containerClassName="size-9 shrink-0 rounded-full md:size-11"
            fallback={
              <span
                aria-hidden
                className="grid size-full place-items-center bg-muted text-base font-semibold text-muted-foreground"
              >
                {user.name.charAt(0).toUpperCase()}
              </span>
            }
          />

          <div className="flex min-w-0 items-center gap-1.5">
            <h1 className="truncate text-lg/tight font-semibold tracking-tight">
              {user.name} {user.surname}
            </h1>
            <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">
              {CATEGORY_LABELS[user.category]}
            </Badge>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            {isOwner ? (
              <Button
                nativeButton={false}
                variant="outline"
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

      {user.communities.length > 0 ? (
        <div className="mx-auto max-w-6xl px-3 pt-6 sm:px-6">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            Communities
          </h2>
          <ItemGroup className="gap-2">
            {user.communities.map((community) => (
              <Item
                key={community.id}
                variant="muted"
                size="sm"
                render={
                  <Link
                    to="/communities/$slug"
                    params={{ slug: community.slug }}
                  />
                }
              >
                <ItemMedia variant="image" className="rounded-md">
                  <ResilientImage
                    src={selectMedia(community.media, "profile")?.url}
                    alt=""
                    aria-hidden
                    containerClassName="size-10 rounded-md"
                    fallback={
                      <span
                        aria-hidden
                        className="grid size-full place-items-center bg-community/15 text-sm font-semibold text-community"
                      >
                        {community.name.charAt(0).toUpperCase()}
                      </span>
                    }
                  />
                </ItemMedia>

                <ItemContent>
                  <ItemTitle className="w-auto min-w-0 flex-1">
                    {community.name}
                  </ItemTitle>
                </ItemContent>

                <ItemActions className="ml-auto">
                  <Badge variant="secondary">
                    {POSITION_LABELS[community.position]}
                  </Badge>
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>
        </div>
      ) : null}

      <div className="mx-auto max-w-4xl">
        <PageRenderer data={user.page_content ?? {}} />
      </div>
    </article>
  )
}
