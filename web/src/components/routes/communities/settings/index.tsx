import { useState, type ReactNode } from "react"
import {
  ArrowLeftIcon,
  CheckIcon,
  CopyIcon,
  LogOutIcon,
  RotateCwIcon,
  UserMinusIcon,
} from "lucide-react"
import { Link, useNavigate } from "@tanstack/react-router"
import {
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { toast } from "sonner"

import { apiErrorMessage } from "@/api/errors"
import { qk } from "@/api/query-keys"
import {
  communityAdminLinkQueryOptions,
  communityDetailQueryOptions,
  useLeaveCommunity,
  useRemoveCommunityAdmin,
  useRotateAdminLink,
  useUpdateCommunity,
} from "@/lib/communities"
import {
  CommunityForm,
  type CommunitySubmitPayload,
} from "@/components/routes/communities/components/community-form"
import { useCurrentUser } from "@/hooks/use-session"
import { formatCampusDate } from "@/lib/utils"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

function initialsOf(name: string, surname: string): string {
  return `${name.charAt(0)}${surname.charAt(0)}`.toUpperCase()
}

export function Page({ slug }: { slug: string }) {
  const { data: community } = useSuspenseQuery(
    communityDetailQueryOptions(slug)
  )

  const me = useCurrentUser()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const updateCommunity = useUpdateCommunity()
  const removeCommunityAdmin = useRemoveCommunityAdmin()
  const leaveCommunity = useLeaveCommunity()

  const [removingAdmin, setRemovingAdmin] = useState<string | null>(null)
  const [isConfirmingLeave, setIsConfirmingLeave] = useState(false)

  const { can_view_admin_link: canViewAdminLink } = community.permissions
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
          if (currentSlug !== slug) {
            void navigate({
              to: "/communities/$slug/settings",
              params: { slug: currentSlug },
            })
          }
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

  const removedAdmin = community.admins?.find(
    (admin) => admin.sub === removingAdmin
  )

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Community settings</h1>
          <p className="text-muted-foreground">
            Update details, manage admins and share access.
          </p>
        </div>
        <Button
          render={
            <Link to="/communities/$slug" params={{ slug }}>
              <ArrowLeftIcon aria-hidden />
              Back to community
            </Link>
          }
          variant="outline"
        />
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Details</h2>
        <Card className="p-6">
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
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Admins</h2>
            <p className="text-muted-foreground">
              Admins can edit community details and the page.
            </p>
          </div>
          {canViewAdminLink && (
            <Button
              render={<Link to="/communities/$slug/editor" params={{ slug }} />}
              variant="outline"
              size="sm"
            >
              Design page
            </Button>
          )}
        </div>

        <Card className="p-6">
          {(community.admins ?? []).length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No admins yet</EmptyTitle>
                <EmptyDescription>
                  Share the admin access link below to add helpers.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div>
              <AdminRow
                picture={community.owner_user.picture}
                name={community.owner_user.name}
                surname={community.owner_user.surname}
                right={<Badge variant="secondary">Owner</Badge>}
              />
              {(community.admins ?? []).map((admin) => {
                const isSelf = admin.sub === me.sub
                return (
                  <div key={admin.sub}>
                    <Separator />
                    <AdminRow
                      picture={admin.picture}
                      name={admin.name}
                      surname={admin.surname}
                      meta={`Admin since ${formatCampusDate(admin.created_at)}`}
                      right={
                        isSelf ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsConfirmingLeave(true)}
                          >
                            <LogOutIcon aria-hidden />
                            Leave
                          </Button>
                        ) : isOwner ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove ${admin.name}`}
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => setRemovingAdmin(admin.sub)}
                          >
                            <UserMinusIcon aria-hidden />
                          </Button>
                        ) : null
                      }
                    />
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </section>

      {canViewAdminLink && <AdminAccessLinkSection slug={slug} />}

      <ConfirmDialog
        open={removingAdmin != null}
        onOpenChange={(open) => {
          if (!open) setRemovingAdmin(null)
        }}
        title="Remove this admin?"
        description={
          removedAdmin
            ? `${removedAdmin.name} ${removedAdmin.surname} will lose the ability to edit this community.`
            : ""
        }
        confirmLabel="Remove admin"
        isPending={removeCommunityAdmin.isPending}
        onConfirm={() => {
          if (!removingAdmin) return
          removeCommunityAdmin.mutate(
            { slug, userSub: removingAdmin },
            {
              onSuccess: () => setRemovingAdmin(null),
            }
          )
        }}
      />

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
    </div>
  )
}

function AdminRow({
  picture,
  name,
  surname,
  meta,
  right,
}: {
  picture?: string | null
  name: string
  surname: string
  meta?: string
  right?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar>
          <AvatarImage src={picture ?? undefined} alt={`${name} ${surname}`} />
          <AvatarFallback>{initialsOf(name, surname)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-medium">
            {name} {surname}
          </p>
          {meta && <p className="text-sm text-muted-foreground">{meta}</p>}
        </div>
      </div>
      {right}
    </div>
  )
}

function AdminAccessLinkSection({ slug }: { slug: string }) {
  const { data: adminLink } = useQuery(communityAdminLinkQueryOptions(slug))
  const rotateAdminLink = useRotateAdminLink()
  const [copied, setCopied] = useState(false)

  const url = adminLink?.url ?? ""

  const copyLink = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success("Link copied to clipboard.")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Could not copy the link. Try again.")
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Admin Access Link</h2>
      <Card className="space-y-4 p-6">
        <Alert>
          <AlertDescription>
            Anyone with this link who is signed in becomes an admin of this
            community.
          </AlertDescription>
        </Alert>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            readOnly
            value={url}
            aria-label="Admin access link"
            placeholder="Loading link\u2026"
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Copy admin access link"
              onClick={() => void copyLink()}
            >
              {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
            </Button>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Rotate admin access link"
                    onClick={() => rotateAdminLink.mutate(slug)}
                  >
                    <RotateCwIcon aria-hidden />
                  </Button>
                }
              />
              <TooltipContent>
                Rotating invalidates the current link and issues a new one
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        {rotateAdminLink.isError && (
          <p className="text-sm text-destructive" role="alert">
            {apiErrorMessage(
              rotateAdminLink.error,
              "Could not rotate the link. Try again."
            )}
          </p>
        )}
      </Card>
    </section>
  )
}
