import { Link } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import { SettingsIcon } from "lucide-react"

import { profileQueryOptions } from "@/lib/profiles"
import { PageRenderer } from "@/components/shared/page-editor/components/page-renderer"
import { pageChromeStyle } from "@/components/shared/page-editor/blocks/_lib"
import { ResilientImage } from "@/components/shared/media/resilient-image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * `my.nuspace.kz/u/<handle>`: a profile page, shown the way a Page is shown.
 *
 * The compact bar is the identity header: picture, name, handle, department
 * and Student Government membership, all read from the account on this
 * request. None of it is in the design below, so it is never stale and the
 * person cannot edit it away.
 *
 * No "back" control yet: it would go to the people directory, which is #436.
 */
export function ProfileScreen({ handle }: { handle: string }) {
  const { data: profile } = useSuspenseQuery(profileQueryOptions(handle))

  const fullName = `${profile.name} ${profile.surname}`
  const initials =
    `${profile.name.charAt(0)}${profile.surname.charAt(0)}`.toUpperCase()
  const details = [`@${profile.handle}`, profile.department].filter(Boolean)

  return (
    <article>
      <header
        className="sticky top-0 z-40 border-b border-sidebar-border bg-sidebar"
        style={pageChromeStyle(profile.content)}
      >
        <div className="mx-auto flex h-[52px] max-w-6xl items-center gap-3 px-3 sm:px-6 md:h-16">
          <div className="aspect-square size-9 shrink-0 overflow-hidden rounded-md bg-page/10 ring-1 ring-border md:size-11">
            <ResilientImage
              src={profile.picture ?? undefined}
              alt={fullName}
              containerClassName="size-full"
              eager
              fallback={
                <span
                  aria-hidden
                  className="grid size-full place-items-center bg-page/15 text-base font-semibold text-page"
                >
                  {initials}
                </span>
              }
            />
          </div>

          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="min-w-0 truncate text-lg/tight font-semibold tracking-tight">
                {fullName}
              </h1>
              {profile.sg_role ? (
                <Badge variant="secondary" className="shrink-0">
                  Student Government
                </Badge>
              ) : null}
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {details.join(" · ")}
            </p>
          </div>

          {profile.can_edit ? (
            <div className="ml-auto flex shrink-0 items-center gap-1">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      nativeButton={false}
                      variant="ghost"
                      size="icon"
                      aria-label="Profile settings"
                      render={<Link to="/my/profile" />}
                    >
                      <SettingsIcon className="size-5" aria-hidden />
                    </Button>
                  }
                />
                <TooltipContent>Profile settings</TooltipContent>
              </Tooltip>
            </div>
          ) : null}
        </div>
      </header>

      {/* No width clamp: the profile's own design decides how wide it is. */}
      <div>
        <PageRenderer data={profile.content ?? {}} />
      </div>
    </article>
  )
}
