import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import {
  BadgeCheckIcon,
  CalendarIcon,
  ExternalLinkIcon,
  MailIcon,
  PencilIcon,
  Trash2Icon,
  UserIcon,
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
import { ResilientImage } from "@/components/resilient-image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

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
    <article className="mx-auto max-w-5xl space-y-6">
      <Card className="p-0">
        <div className="aspect-[3/1] min-h-40 bg-community/10">
          <ResilientImage
            src={banner}
            alt={`${community.name} banner`}
            containerClassName="size-full"
            eager
            fallback={
              <span className="block size-full bg-community/10" aria-hidden />
            }
          />
        </div>

        <header className="relative px-5 pt-16 pb-6 sm:px-8 sm:pt-5 sm:pl-44">
          <div className="absolute -top-12 left-5 rounded-full bg-card p-1.5 shadow-md sm:-top-14 sm:left-8">
            <ResilientImage
              src={avatar}
              alt={`${community.name} profile`}
              containerClassName="size-24 rounded-full sm:size-28"
              eager
              fallback={
                <span
                  aria-hidden
                  className="grid size-full place-items-center bg-community/15 text-3xl font-semibold text-community"
                >
                  {community.name.charAt(0).toUpperCase()}
                </span>
              }
            />
          </div>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-3">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-balance">
                  {community.name}
                </h1>
                {community.verified && (
                  <BadgeCheckIcon
                    className="size-6 shrink-0 text-primary"
                    aria-label="Verified community"
                  />
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{community.category}</Badge>
                <Badge variant="outline">{community.type}</Badge>
              </div>
            </div>

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
          </div>

          {deleteCommunity.isError && (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {apiErrorMessage(
                deleteCommunity.error,
                "Could not delete the community. Try again."
              )}
            </p>
          )}
        </header>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="p-6">
          <h2 className="text-xl font-semibold">About us</h2>
          {community.description ? (
            <Markdown className="text-muted-foreground">
              {community.description}
            </Markdown>
          ) : (
            <p className="text-muted-foreground">
              This community has not added a description yet.
            </p>
          )}
        </Card>

        <Card className="p-5 lg:sticky lg:top-20">
          <h2 className="font-semibold">Community details</h2>
          <dl className="space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <CalendarIcon
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <div>
                <dt className="font-medium">Established</dt>
                <dd className="text-muted-foreground">
                  {formatCampusDate(community.established)}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <UserIcon
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <div>
                <dt className="font-medium">Community head</dt>
                <dd className="text-muted-foreground">
                  {community.head_user.name} {community.head_user.surname}
                </dd>
              </div>
            </div>
          </dl>

          {(community.telegram_url ||
            community.instagram_url ||
            community.email) && (
            <div className="space-y-3 border-t border-border pt-4">
              <h3 className="text-sm font-medium">Contact</h3>
              <div className="flex flex-col items-start gap-3">
                {community.telegram_url && (
                  <ExternalLink
                    href={community.telegram_url}
                    label="Telegram"
                  />
                )}
                {community.instagram_url && (
                  <ExternalLink
                    href={community.instagram_url}
                    label="Instagram"
                  />
                )}
                {community.email && (
                  <a
                    href={`mailto:${community.email}`}
                    className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <MailIcon className="size-4" aria-hidden />
                    <span className="break-all">{community.email}</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </Card>
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
