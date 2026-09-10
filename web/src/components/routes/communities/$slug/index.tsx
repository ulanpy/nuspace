import { useEffect, type CSSProperties } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import {
  ArrowLeftIcon,
  BadgeCheckIcon,
  InfoIcon,
  MailIcon,
  SettingsIcon,
} from "lucide-react"
import { toast } from "sonner"

import { apiErrorMessage } from "@/api/errors"
import {
  communityDetailQueryOptions,
  useAcceptCommunityAdminLink,
} from "@/lib/communities"
import { selectMedia } from "@/lib/media"
import { PageRenderer } from "@/components/shared/page-editor/components/page-renderer"
import { contrastColor } from "@/components/shared/page-editor/blocks/_lib"
import { ResilientImage } from "@/components/shared/media/resilient-image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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

export function CommunityNotFound() {
  return (
    <article className="mx-auto max-w-5xl space-y-6">
      <Card className="grid min-h-[40vh] place-items-center p-6">
        <div className="max-w-md space-y-4 text-center">
          <p className="text-sm font-medium text-muted-foreground">404</p>
          <h1 className="text-2xl font-bold tracking-tight">
            Community not found
          </h1>
          <p className="text-muted-foreground">
            We couldn&apos;t find a community at that address. It may have been
            renamed or removed.
          </p>
          <Button
            nativeButton={false}
            render={<Link to="/communities">Browse communities</Link>}
          />
        </div>
      </Card>
    </article>
  )
}

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
  const { data: community } = useSuspenseQuery(
    communityDetailQueryOptions(slug)
  )

  const navigate = useNavigate()
  const acceptAdminLink = useAcceptCommunityAdminLink()

  const avatar = selectMedia(community.media, "profile")?.url

  // Match the app header to the background the page's puck editor chose for
  // the page root, re-rendering as it changes.
  const rootData = (community.page_content?.root ?? {}) as
    | {
        props?: { backgroundColor?: unknown; textColor?: unknown }
        backgroundColor?: unknown
        textColor?: unknown
      }
    | undefined
  const rawPageBg =
    rootData?.props?.backgroundColor ?? rootData?.backgroundColor
  const pageBg =
    typeof rawPageBg === "string" && rawPageBg ? rawPageBg : "#ffffff"
  const rawTextColor = rootData?.props?.textColor ?? rootData?.textColor
  const headerFg =
    typeof rawTextColor === "string" && rawTextColor
      ? rawTextColor
      : contrastColor(pageBg)
  const headerStyle: CSSProperties = {
    backgroundColor: pageBg,
    color: headerFg,
    ["--sidebar" as string]: pageBg,
    ["--sidebar-foreground" as string]: headerFg,
    ["--sidebar-border" as string]: `color-mix(in oklab, ${headerFg} 15%, transparent)`,
    ["--sidebar-accent" as string]: `color-mix(in oklab, ${headerFg} 10%, transparent)`,
    ["--sidebar-accent-foreground" as string]: headerFg,
    ["--foreground" as string]: headerFg,
    ["--muted-foreground" as string]: `color-mix(in oklab, ${headerFg} 65%, transparent)`,
    ["--border" as string]: `color-mix(in oklab, ${headerFg} 15%, transparent)`,
  }

  // Server-decided. An owner gets can_edit; a community admin also gets
  // can_edit. (Delete lives on the settings page, not here.)
  const { can_edit: canEdit } = community.permissions

  // Redeem a shareable admin-link (`?admin=<token>`) exactly once, on load.
  useEffect(() => {
    const token = adminToken
    if (!token) return
    acceptAdminLink.mutate(token, {
      onSuccess: (result) => {
        toast.success(REDEMPTION_MESSAGES[result.status](community.name))
        void navigate({
          to: "/communities/$slug",
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
          to: "/communities/$slug",
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
                  aria-label="Back to communities"
                  render={<Link to="/communities" search={{}} />}
                >
                  <ArrowLeftIcon className="size-5" aria-hidden />
                </Button>
              }
            />
            <TooltipContent>Back to communities</TooltipContent>
          </Tooltip>

          <div className="aspect-square size-9 shrink-0 overflow-hidden rounded-md bg-community/10 ring-1 ring-border md:size-11">
            <ResilientImage
              src={avatar}
              alt={`${community.name} profile`}
              containerClassName="size-full"
              eager
              fallback={
                <span
                  aria-hidden
                  className="grid size-full place-items-center bg-community/15 text-base font-semibold text-community"
                >
                  {community.name.charAt(0).toUpperCase()}
                </span>
              }
            />
          </div>

          <div className="flex min-w-0 items-center gap-1.5">
            <h1 className="truncate text-lg/tight font-semibold tracking-tight">
              {community.name}
            </h1>
            {community.verified && (
              <BadgeCheckIcon
                className="size-5 shrink-0 text-primary"
                aria-label="Verified community"
              />
            )}
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Community details"
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
                    <p className="text-sm capitalize">{community.category}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Type
                    </p>
                    <p className="text-sm capitalize">{community.type}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Verification
                    </p>
                    <p className="text-sm">
                      {community.verified ? "Verified" : "Not verified"}
                    </p>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            {canEdit && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      nativeButton={false}
                      variant="ghost"
                      size="icon"
                      aria-label="Settings"
                      render={
                        <Link
                          to="/communities/$slug/settings"
                          params={{ slug }}
                        />
                      }
                    >
                      <SettingsIcon className="size-5" aria-hidden />
                    </Button>
                  }
                />
                <TooltipContent>Settings</TooltipContent>
              </Tooltip>
            )}
            {community.email && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      nativeButton={false}
                      variant="ghost"
                      size="icon"
                      aria-label={`Email ${community.name}`}
                      render={
                        <a href={`mailto:${community.email}`}>
                          <MailIcon className="size-5" aria-hidden />
                        </a>
                      }
                    />
                  }
                />
                <TooltipContent>{community.email}</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </header>

      <div>
        <PageRenderer data={community.page_content ?? {}} />
      </div>
    </article>
  )
}
