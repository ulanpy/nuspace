import { createFileRoute } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import { BadgeCheckIcon, ExternalLinkIcon, MailIcon } from "lucide-react"

import { communityDetailQueryOptions } from "@/features/communities/api"
import type { Community } from "@/features/communities/types"
import { formatCampusDate } from "@/lib/datetime"
import { Badge } from "@/components/ui/badge"

export const Route = createFileRoute("/_app/communities/$communityId")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      communityDetailQueryOptions(Number(params.communityId))
    ),
  component: CommunityDetail,
})

function mediaBy(community: Community, format: string) {
  return community.media.find((m) => m.media_format === format)?.url
}

function ExternalLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {label}
      <ExternalLinkIcon className="size-4" aria-hidden />
    </a>
  )
}

function CommunityDetail() {
  const { communityId } = Route.useParams()
  const { data: community } = useSuspenseQuery(
    communityDetailQueryOptions(Number(communityId))
  )

  const banner = mediaBy(community, "banner")
  const avatar = mediaBy(community, "profile")

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      {banner && (
        <img
          src={banner}
          alt=""
          aria-hidden
          className="aspect-[3/1] w-full rounded-lg bg-muted object-cover"
        />
      )}

      <header className="flex flex-wrap items-start gap-4">
        {avatar ? (
          <img
            src={avatar}
            alt=""
            aria-hidden
            className="size-20 shrink-0 rounded-full bg-muted object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="grid size-20 shrink-0 place-items-center rounded-full bg-community/15 text-2xl font-semibold text-community"
          >
            {community.name.charAt(0).toUpperCase()}
          </span>
        )}

        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-balance">
              {community.name}
            </h1>
            {community.verified && (
              <BadgeCheckIcon
                className="size-6 shrink-0 text-primary"
                aria-label="Verified"
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{community.category}</Badge>
            <Badge variant="outline">{community.type}</Badge>
          </div>

          <p className="text-sm text-muted-foreground">
            Established {formatCampusDate(community.established)} · Head:{" "}
            {community.head_user.name} {community.head_user.surname}
          </p>
        </div>
      </header>

      {community.description && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">About</h2>
          <p className="whitespace-pre-line text-muted-foreground">
            {community.description}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        {community.telegram_url && (
          <ExternalLink href={community.telegram_url} label="Telegram" />
        )}
        {community.instagram_url && (
          <ExternalLink href={community.instagram_url} label="Instagram" />
        )}
        {community.email && (
          <a
            href={`mailto:${community.email}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <MailIcon className="size-4" aria-hidden />
            {community.email}
          </a>
        )}
      </div>
    </article>
  )
}
