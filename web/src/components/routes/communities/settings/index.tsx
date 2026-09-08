import { useState } from "react"
import {
  ArrowLeftIcon,
  CheckIcon,
  CopyIcon,
  LogOutIcon,
  RotateCwIcon,
  Trash2Icon,
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
  useDeleteCommunity,
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

function initialsOf(name: string, surname: string): string {
  return `${name.charAt(0)}${surname.charAt(0)}`.toUpperCase()
}

interface AdminTableRow {
  sub: string
  name: string
  surname: string
  picture: string | null
  created_at: string | null
  isOwner: boolean
}

const PAGE_SIZES = [10, 25, 50] as const
const DEFAULT_PAGE_SIZE = 10

function pageItem(
  text: number,
  current: number,
  onPageChange: (page: number) => void
) {
  return (
    <PaginationItem>
      <PaginationLink
        href="#"
        isActive={current === text}
        onClick={(event) => {
          event.preventDefault()
          onPageChange(text)
        }}
      >
        {text}
      </PaginationLink>
    </PaginationItem>
  )
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
  const deleteCommunity = useDeleteCommunity()

  const [removingAdmin, setRemovingAdmin] = useState<string | null>(null)
  const [isConfirmingLeave, setIsConfirmingLeave] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)

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

  const removedAdmin = community.admins?.find(
    (admin) => admin.sub === removingAdmin
  )

  const rows: AdminTableRow[] = [
    {
      sub: community.owner_user.sub,
      name: community.owner_user.name,
      surname: community.owner_user.surname,
      picture: community.owner_user.picture ?? null,
      created_at: null,
      isOwner: true,
    },
    ...(community.admins ?? []).map((admin) => ({
      sub: admin.sub,
      name: admin.name,
      surname: admin.surname,
      picture: admin.picture ?? null,
      created_at: admin.created_at,
      isOwner: false,
    })),
  ]

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize)

  const changePageSize = (value: string | null) => {
    const next = Number(value ?? DEFAULT_PAGE_SIZE)
    setPageSize(next)
    setPage(1)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Community settings</h1>
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
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Admins</h2>
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((row) => {
                const isSelf = row.sub === me.sub
                return (
                  <TableRow key={row.sub}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage
                            src={row.picture ?? undefined}
                            alt={`${row.name} ${row.surname}`}
                          />
                          <AvatarFallback>
                            {initialsOf(row.name, row.surname)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="truncate font-medium">
                            {row.name} {row.surname}
                          </p>
                          {row.isOwner ? (
                            <Badge variant="secondary">Owner</Badge>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {row.isOwner
                        ? "Owner"
                        : `Admin since ${formatCampusDate(row.created_at ?? "")}`}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.isOwner ? null : isSelf ? (
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
                          aria-label={`Remove ${row.name} ${row.surname}`}
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setRemovingAdmin(row.sub)}
                        >
                          <UserMinusIcon aria-hidden />
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Rows per page
              </span>
              <Select value={String(pageSize)} onValueChange={changePageSize}>
                <SelectTrigger className="w-20">
                  <SelectValue>{pageSize}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Pagination className="justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    aria-disabled={safePage === 1}
                    onClick={(event) => {
                      if (safePage === 1) {
                        event.preventDefault()
                      } else {
                        setPage((current) => Math.max(1, current - 1))
                      }
                    }}
                  />
                </PaginationItem>
                {Array.from(
                  { length: totalPages },
                  (_, index) => index + 1
                ).map((item) => pageItem(item, safePage, setPage))}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    aria-disabled={safePage === totalPages}
                    onClick={(event) => {
                      if (safePage === totalPages) {
                        event.preventDefault()
                      } else {
                        setPage((current) => Math.min(totalPages, current + 1))
                      }
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      </section>

      {canViewAdminLink && <AdminAccessLinkSection slug={slug} />}

      {canDelete && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Danger zone</h2>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-destructive/40 p-4">
            <div>
              <p className="font-medium">Delete this community</p>
              <p className="text-sm text-muted-foreground">
                The community and its images will be removed for everyone. Its
                events are not deleted with it.
              </p>
            </div>
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setIsConfirmingDelete(true)}
            >
              <Trash2Icon aria-hidden />
              Delete community
            </Button>
          </div>
        </section>
      )}

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
      <div className="space-y-4">
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
      </div>
    </section>
  )
}
