import { useState } from "react"
import {
  Link,
  createFileRoute,
  notFound,
  useNavigate,
} from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import { BadgeCheckIcon, MailIcon, PencilIcon, Trash2Icon } from "lucide-react"

import { ApiError } from "@/api/client"
import { apiErrorMessage } from "@/api/errors"
import {
  communityDetailQueryOptions,
  useDeleteCommunity,
} from "@/features/communities/api"
import { selectMedia } from "@/features/media/select"
import { PageRenderer } from "@/features/page-editor/components/page-renderer"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { ResilientImage } from "@/components/resilient-image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export const Route = createFileRoute("/_app/communities/$slug/")({
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
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const deleteCommunity = useDeleteCommunity()

  const banner = selectMedia(community.media, "banner")?.url
  const avatar = selectMedia(community.media, "profile")?.url

  // Server-decided. Note that an owner gets can_edit but not can_delete —
  // removing a community is admin-only.
  const { can_edit: canEdit, can_delete: canDelete } = community.permissions

  return (
    <article className="mx-auto max-w-4xl space-y-4">
      <Card className="overflow-hidden p-0 sm:rounded-4xl">
        <div className="aspect-[3/1] max-h-72 min-h-40 bg-community/10">
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

        <header className="relative px-5 pt-14 pb-6 sm:px-8 sm:pt-5 sm:pb-8 sm:pl-44">
          <div className="absolute top-[-3.5rem] left-5 rounded-full bg-card p-1.5 shadow-md ring-2 ring-border sm:top-[-3.75rem] sm:left-8">
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
                <h1 className="text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">
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
                <Badge variant="default">{community.category}</Badge>
                <Badge variant="outline">{community.type}</Badge>
                {community.email && (
                  <>
                    <span className="text-muted-foreground" aria-hidden>
                      &middot;
                    </span>
                    <a
                      href={`mailto:${community.email}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <MailIcon className="size-4" aria-hidden />
                      <span className="break-all">{community.email}</span>
                    </a>
                  </>
                )}
              </div>
            </div>

            {(canEdit || canDelete) && (
              <div className="flex flex-wrap gap-2">
                {canEdit && (
                  <Button
                    render={
                      <Link
                        to="/communities/$slug/edit-details"
                        params={{ slug }}
                      />
                    }
                    variant="outline"
                    size="sm"
                  >
                    <PencilIcon aria-hidden />
                    Edit details
                  </Button>
                )}
                {canEdit && (
                  <Button
                    render={
                      <Link
                        to="/communities/$slug/edit-page"
                        params={{ slug }}
                      />
                    }
                    variant="outline"
                    size="sm"
                  >
                    Design page
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

      <PageRenderer data={community.page_content ?? {}} />

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
