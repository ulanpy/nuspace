import { useEffect } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import { ArrowLeftIcon, SettingsIcon } from "lucide-react"
import { toast } from "sonner"

import { apiErrorMessage } from "@/api/errors"
import { pageDetailQueryOptions, useAcceptPageAdminLink } from "@/lib/pages"
import { selectMedia } from "@/lib/media"
import { PageRenderer } from "@/components/shared/page-editor/components/page-renderer"
import { pageChromeStyle } from "@/components/shared/page-editor/blocks/_lib"
import { ResilientImage } from "@/components/shared/media/resilient-image"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/** Messages for each idempotent redemption outcome. */
const REDEMPTION_MESSAGES = {
  granted: (name: string) => `You're now an admin of ${name}.`,
  already_admin: (name: string) => `You're already an admin of ${name}.`,
  already_owner: (name: string) => `You own ${name}.`,
} as const

export function Page({
  slug,
  adminToken,
}: {
  slug: string
  adminToken?: string
}) {
  const { data: page } = useSuspenseQuery(pageDetailQueryOptions(slug))

  const navigate = useNavigate()
  const acceptAdminLink = useAcceptPageAdminLink()

  const avatar = selectMedia(page.media, "profile")?.url

  // Match the app header to the background the page's puck editor chose for
  // the page root.
  const headerStyle = pageChromeStyle(page.page_content)

  // Server-decided. An owner gets can_edit; a page admin also gets can_edit.
  // (Delete lives on the settings page, not here.)
  const { can_edit: canEdit } = page.permissions

  // Redeem a shareable admin-link (`?admin=<token>`) exactly once, on load.
  useEffect(() => {
    const token = adminToken
    if (!token) return
    acceptAdminLink.mutate(token, {
      onSuccess: (result) => {
        toast.success(REDEMPTION_MESSAGES[result.status](page.name))
        void navigate({
          to: "/p/$slug",
          params: { slug },
          search: {},
          replace: true,
        })
      },
      onError: (error) => {
        toast.error(
          apiErrorMessage(error, "This admin link is no longer valid.")
        )
        void navigate({
          to: "/p/$slug",
          params: { slug },
          search: {},
          replace: true,
        })
      },
    })
    // Intentionally run once per page load, whenever a token is present.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <article>
      <header
        className="sticky top-0 z-40 border-b border-sidebar-border bg-sidebar"
        style={headerStyle}
      >
        <div className="mx-auto flex h-[52px] max-w-6xl items-center gap-2 px-3 sm:px-6 md:h-16">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  nativeButton={false}
                  variant="ghost"
                  size="icon"
                  aria-label="Back to pages"
                  render={<Link to="/mynuspace" search={{}} />}
                >
                  <ArrowLeftIcon className="size-5" aria-hidden />
                </Button>
              }
            />
            <TooltipContent>Back to pages</TooltipContent>
          </Tooltip>

          <div className="aspect-square size-9 shrink-0 overflow-hidden rounded-md bg-page/10 ring-1 ring-border md:size-11">
            <ResilientImage
              src={avatar}
              alt={`${page.name} logo`}
              containerClassName="size-full"
              eager
              fallback={
                <span
                  aria-hidden
                  className="grid size-full place-items-center bg-page/15 text-base font-semibold text-page"
                >
                  {page.name.charAt(0).toUpperCase()}
                </span>
              }
            />
          </div>

          <h1 className="min-w-0 truncate text-lg/tight font-semibold tracking-tight">
            {page.name}
          </h1>

          {canEdit ? (
            <div className="ml-auto flex shrink-0 items-center gap-1">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      nativeButton={false}
                      variant="ghost"
                      size="icon"
                      aria-label="Settings"
                      render={<Link to="/p/$slug/settings" params={{ slug }} />}
                    >
                      <SettingsIcon className="size-5" aria-hidden />
                    </Button>
                  }
                />
                <TooltipContent>Settings</TooltipContent>
              </Tooltip>
            </div>
          ) : null}
        </div>
      </header>

      {/* No width clamp: the page's own design decides how wide it is. */}
      <div>
        <PageRenderer data={page.page_content ?? {}} />
      </div>
    </article>
  )
}
