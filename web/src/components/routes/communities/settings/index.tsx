import { useState } from "react"
import { ArrowLeftIcon, PaletteIcon, Trash2Icon } from "lucide-react"
import { Link, useNavigate } from "@tanstack/react-router"
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { toast } from "sonner"

import { apiErrorMessage } from "@/api/errors"
import { qk } from "@/api/query-keys"
import {
  communityDetailQueryOptions,
  useDeleteCommunity,
  useLeaveCommunity,
  useUpdateCommunity,
} from "@/lib/communities"
import { useCurrentUser } from "@/hooks/use-session"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { AdminAccessLinkSection } from "@/components/routes/communities/settings/components/admin-access-link"
import {
  AdminsTable,
  type AdminTableRow,
} from "@/components/routes/communities/settings/components/admins-table"
import { SectionHeading } from "@/components/routes/communities/settings/components/section-heading"
import {
  CommunityForm,
  type CommunitySubmitPayload,
} from "@/components/routes/communities/components/community-form"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export function Page({ slug }: { slug: string }) {
  const { data: community } = useSuspenseQuery(
    communityDetailQueryOptions(slug)
  )

  const me = useCurrentUser()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const updateCommunity = useUpdateCommunity()
  const leaveCommunity = useLeaveCommunity()
  const deleteCommunity = useDeleteCommunity()

  const [isConfirmingLeave, setIsConfirmingLeave] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

  const { can_view_admin_link: canViewAdminLink, can_delete: canDelete } =
    community.permissions
  const isOwner = community.owner_user.sub === me.sub

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
          void navigate({
            to: "/communities/$slug",
            params: { slug: currentSlug },
          })
          void queryClient.invalidateQueries({
            queryKey: qk.communities.all(),
          })
        },
        onError: (error) => {
          toast.error(apiErrorMessage(error, "Could not save. Try again."), {
            id: loading,
          })
        },
      }
    )
  }

  const rows: AdminTableRow[] = [
    {
      sub: community.owner_user.sub,
      name: community.owner_user.name,
      surname: community.owner_user.surname,
      picture: community.owner_user.picture ?? null,
      isOwner: true,
    },
    ...(community.admins ?? []).map((admin) => ({
      sub: admin.sub,
      name: admin.name,
      surname: admin.surname,
      picture: admin.picture ?? null,
      isOwner: false,
    })),
  ]

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Settings
          </h1>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            render={
              <Link to="/communities/$slug/editor" params={{ slug }}>
                <PaletteIcon aria-hidden />
                Design page
              </Link>
            }
          />
          <Button
            variant="outline"
            render={
              <Link to="/communities/$slug" params={{ slug }}>
                <ArrowLeftIcon aria-hidden />
                Back to community
              </Link>
            }
          />
        </div>
      </header>

      <section className="space-y-4">
        <SectionHeading title="Details" />
        <Card className="px-4 sm:px-6">
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
      </section>

      <section className="space-y-4">
        <SectionHeading title="Admins" />
        <AdminsTable
          slug={slug}
          rows={rows}
          meSub={me.sub}
          isOwner={isOwner}
          onLeave={() => setIsConfirmingLeave(true)}
        />
      </section>

      {canViewAdminLink && <AdminAccessLinkSection slug={slug} />}

      {canDelete && (
        <section className="space-y-4">
          <SectionHeading title="Danger zone" />
          <div className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="space-y-1">
              <p className="font-medium">Delete this community</p>
              <p className="text-sm text-muted-foreground">
                The community and its images will be removed for everyone. Its
                events are not deleted with it.
              </p>
            </div>
            <Button
              variant="outline"
              className="shrink-0 text-destructive hover:text-destructive"
              onClick={() => setIsConfirmingDelete(true)}
            >
              <Trash2Icon aria-hidden />
              Delete community
            </Button>
          </div>
        </section>
      )}

      <ConfirmDialog
        open={isConfirmingLeave}
        onOpenChange={setIsConfirmingLeave}
        title="Leave this community?"
        description="You will lose admin access to this community until someone adds you again."
        confirmLabel="Leave community"
        isPending={leaveCommunity.isPending}
        onConfirm={() => {
          leaveCommunity.mutate(slug, {
            onSuccess: () => {
              setIsConfirmingLeave(false)
              void navigate({
                to: "/communities/$slug",
                params: { slug },
              })
            },
          })
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
    </div>
  )
}
