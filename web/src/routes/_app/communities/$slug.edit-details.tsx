import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"

import { ApiError } from "@/api/client"
import { apiErrorMessage } from "@/api/errors"
import {
  communityDetailQueryOptions,
  useUpdateCommunity,
} from "@/features/communities/api"
import {
  CommunityForm,
  type CommunitySubmitPayload,
} from "@/features/communities/components/community-form"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { qk } from "@/api/query-keys"

export const Route = createFileRoute("/_app/communities/$slug/edit-details")({
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.ensureQueryData(
        communityDetailQueryOptions(params.slug)
      )
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) throw notFound()
      throw error
    }
  },
  component: CommunityEditDetailsPage,
})

function CommunityEditDetailsPage() {
  const { slug } = Route.useParams()
  const { data: community } = useSuspenseQuery(
    communityDetailQueryOptions(slug)
  )
  const updateCommunity = useUpdateCommunity()
  const navigate = useNavigate()
  const queryClient = Route.useRouteContext().queryClient

  const handleDetailsSubmit = ({ update, items }: CommunitySubmitPayload) => {
    const loading = toast.loading("Saving community\u2026")
    updateCommunity.mutate(
      {
        slug: community.slug,
        id: community.id,
        body: update,
        items,
      },
      {
        onSuccess: (result) => {
          toast.success("Community updated.", { id: loading })
          const currentSlug = result.entity.slug ?? slug
          if (currentSlug !== slug) {
            void navigate({
              to: "/communities/$slug/edit-details",
              params: { slug: currentSlug },
            })
          }
          void queryClient.invalidateQueries({
            queryKey: qk.communities.all(),
          })
        },
        onError: (error) => {
          toast.error(
            apiErrorMessage(error, "Could not save. Try again."),
            { id: loading }
          )
        },
      }
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Edit {community.name}
          </h1>
          <p className="text-muted-foreground">
            Update the name, handle and photos.
          </p>
        </div>
        <Button
          render={
            <Link
              to="/communities/$slug/edit-page"
              params={{ slug }}
            />
          }
          variant="outline"
        >
          Design page content
        </Button>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">Details</h2>
        <CommunityForm
          community={community}
          isPending={updateCommunity.isPending}
          submitError={
            updateCommunity.error
              ? apiErrorMessage(
                  updateCommunity.error,
                  "Could not save. Try again."
                )
              : null
          }
          onSubmit={handleDetailsSubmit}
          onCancel={() => {
            void navigate({
              to: "/communities/$slug",
              params: { slug },
            })
          }}
        />
      </Card>
    </div>
  )
}