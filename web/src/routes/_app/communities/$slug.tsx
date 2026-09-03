import { useState } from "react"
import {
  Link,
  createFileRoute,
  notFound,
  useNavigate,
} from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import {
  BadgeCheckIcon,
  MailIcon,
  PencilIcon,
  Trash2Icon,
  UserIcon,
} from "lucide-react"

import { ApiError } from "@/api/client"
import { apiErrorMessage } from "@/api/errors"
import {
  communityDetailQueryOptions,
  useDeleteCommunity,
} from "@/features/communities/api"
import { CommunityFormDialog } from "@/features/communities/components/community-form-dialog"
import { selectMedia } from "@/features/media/select"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { ResilientImage } from "@/components/resilient-image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export const Route = createFileRoute("/_app/communities/$slug")({
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.ensureQueryData(
        communityDetailQueryOptions(params.slug)
      )
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        throw notFound()
      }
      throw error
    }
  },
  notFoundComponent: CommunityNotFound,
  component: CommunityDetail,
})

function CommunityNotFound() {
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
          <Button render={<Link to="/communities">Browse communities</Link>} />
        </div>
      </Card>
    </article>
  )
}

function CommunityDetail() {
  const { slug } = Route.useParams()
  const { data: community } = useSuspenseQuery(
    communityDetailQueryOptions(slug)
  )

  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const deleteCommunity = useDeleteCommunity()

  const banner = selectMedia(community.media, "banner")?.url
  const avatar = selectMedia(community.media, "profile")?.url

  // Server-decided. Note that an owner gets can_edit but not can_delete —
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
          <p className="text-muted-foreground">
            This community has not added a page yet.
          </p>
        </Card>

        <Card className="p-5 lg:sticky lg:top-20">
          <h2 className="font-semibold">Community details</h2>
          <dl className="space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <UserIcon
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <div>
                <dt className="font-medium">Community owner</dt>
                <dd className="text-muted-foreground">
                  {community.owner_user.name} {community.owner_user.surname}
                </dd>
              </div>
            </div>
          </dl>

          {community.email && (
            <div className="space-y-3 border-t border-border pt-4">
              <h3 className="text-sm font-medium">Contact</h3>
              <div className="flex flex-col items-start gap-3">
                <a
                  href={`mailto:${community.email}`}
                  className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <MailIcon className="size-4" aria-hidden />
                  <span className="break-all">{community.email}</span>
                </a>
              </div>
            </div>
          )}
        </Card>
      </div>

      <CommunityFormDialog
        community={community}
        open={isEditing}
        onOpenChange={setIsEditing}
        onSaved={(saved) => {
          // An edited slug moves the community to a new URL; take the user
          // there instead of leaving them on the stale address.
          if (saved.slug !== slug) {
            void navigate({
              to: "/communities/$slug",
              params: { slug: saved.slug },
            })
          }
        }}
      />

      <ConfirmDialog
        open={isConfirmingDelete}
        onOpenChange={setIsConfirmingDelete}
        title="Delete this community?"
        description={`"${community.name}" and its images will be removed for everyone. Its events are not deleted with it.`}
        confirmLabel="Delete community"
        isPending={deleteCommunity.isPending}
        onConfirm={() => {
          deleteCommunity.mutate(community.slug, {
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
