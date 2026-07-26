import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import {
  BadgeCheckIcon,
  ExternalLinkIcon,
  MailIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"

import { apiErrorMessage } from "@/api/errors"
import {
  communityDetailQueryOptions,
  useDeleteCommunity,
} from "@/features/communities/api"
import { CommunityFormDialog } from "@/features/communities/components/community-form-dialog"
import { selectMedia } from "@/features/media/select"
import { formatCampusDate } from "@/lib/datetime"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Markdown } from "@/components/markdown"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/_app/communities/$communityId")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      communityDetailQueryOptions(Number(params.communityId))
    ),
  component: CommunityDetail,
})

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

  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const deleteCommunity = useDeleteCommunity()

  const banner = selectMedia(community.media, "banner")?.url
  const avatar = selectMedia(community.media, "profile")?.url

  // Server-decided. Note that a head gets can_edit but not can_delete —
  // removing a community is admin-only.
  const { can_edit: canEdit, can_delete: canDelete } = community.permissions

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

          {(canEdit || canDelete) && (
            <div className="flex flex-wrap gap-2">
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditing(true)
                  }}
                >
                  <PencilIcon aria-hidden />
                  Edit
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    setIsConfirmingDelete(true)
                  }}
                >
                  <Trash2Icon aria-hidden />
                  Delete
                </Button>
              )}
            </div>
          )}

          {deleteCommunity.isError && (
            <p className="text-sm text-destructive" role="alert">
              {apiErrorMessage(
                deleteCommunity.error,
                "Could not delete the community. Try again."
              )}
            </p>
          )}
        </div>
      </header>

      {community.description && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">About</h2>
          <Markdown className="text-muted-foreground">
            {community.description}
          </Markdown>
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

      <CommunityFormDialog
        community={community}
        open={isEditing}
        onOpenChange={setIsEditing}
      />

      <ConfirmDialog
        open={isConfirmingDelete}
        onOpenChange={setIsConfirmingDelete}
        title="Delete this community?"
        description={`“${community.name}” and its images will be removed for everyone. Its events are not deleted with it.`}
        confirmLabel="Delete community"
        isPending={deleteCommunity.isPending}
        onConfirm={() => {
          deleteCommunity.mutate(community.id, {
            onSuccess: () => {
              setIsConfirmingDelete(false)
              void navigate({ to: "/communities", search: {} })
            },
          })
        }}
      />
    </article>
  )
}
