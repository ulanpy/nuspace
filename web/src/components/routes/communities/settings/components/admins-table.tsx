import { useState } from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  CrownIcon,
  LogOutIcon,
  UserMinusIcon,
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { keepPreviousData } from "@tanstack/react-query"

import { qk } from "@/api/query-keys"
import {
  adminRowActions,
  fetchCommunityAdminsPage,
  useLeaveCommunity,
  useRemoveCommunityAdmin,
  useTransferCommunityOwner,
} from "@/lib/communities"
import { QueryBoundary } from "@/components/shared/query/boundary"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export interface AdminRow {
  sub: string
  name: string
  surname: string
  picture: string | null
}

const PAGE_SIZE = 10

function initialsOf(name: string, surname: string): string {
  return `${name.charAt(0)}${surname.charAt(0)}`.toUpperCase()
}

interface AdminsTableProps {
  slug: string
  page: number
  onPageChange: (page: number) => void
  owner: AdminRow
  /** Present only when the signed-in user is a community admin. */
  me: AdminRow | null
  canManageAdmins: boolean
  /** The signed-in user is the owner, so a transfer costs them these settings. */
  isCurrentUserOwner: boolean
  /** Called after a transfer that locks the current user out. */
  onOwnershipTransferredAway: () => void
}

export function AdminsTable({
  slug,
  page,
  onPageChange,
  owner,
  me,
  canManageAdmins,
  isCurrentUserOwner,
  onOwnershipTransferredAway,
}: AdminsTableProps) {
  const excludeSub = me?.sub

  const query = useQuery({
    queryKey: qk.communities.admins(slug, page, excludeSub),
    queryFn: () =>
      fetchCommunityAdminsPage(slug, {
        page,
        size: PAGE_SIZE,
        // The signed-in admin is pinned above the table, so the server has to
        // drop them from the rows AND the count or the last page comes back
        // empty. See `GET /communities/{slug}/admins`.
        excludeSub,
      }),
    placeholderData: keepPreviousData,
  })

  const removeCommunityAdmin = useRemoveCommunityAdmin()
  const transferOwner = useTransferCommunityOwner()
  const leaveCommunity = useLeaveCommunity()

  const [removingAdmin, setRemovingAdmin] = useState<AdminRow | null>(null)
  const [transferringTo, setTransferringTo] = useState<AdminRow | null>(null)
  const [isConfirmingLeave, setIsConfirmingLeave] = useState(false)

  const totalPages = query.data?.total_pages ?? 1

  return (
    <div className="space-y-4">
      <Card className="py-0">
        <div className="divide-y">
          {me ? (
            <AdminRowView
              row={me}
              badge="You"
              actions={adminRowActions(
                { isSelf: true, isOwner: false },
                canManageAdmins
              )}
              onLeave={() => setIsConfirmingLeave(true)}
            />
          ) : null}

          <AdminRowView
            row={owner}
            badge="Owner"
            actions={adminRowActions(
              { isSelf: isCurrentUserOwner, isOwner: true },
              canManageAdmins
            )}
          />

          <QueryBoundary query={query}>
            {(admins) =>
              admins.items.map((admin) => (
                <AdminRowView
                  key={admin.sub}
                  row={{
                    sub: admin.sub,
                    name: admin.name,
                    surname: admin.surname,
                    picture: admin.picture ?? null,
                  }}
                  actions={adminRowActions(
                    { isSelf: false, isOwner: false },
                    canManageAdmins
                  )}
                  onRemove={() =>
                    setRemovingAdmin({
                      sub: admin.sub,
                      name: admin.name,
                      surname: admin.surname,
                      picture: admin.picture ?? null,
                    })
                  }
                  onTransfer={() =>
                    setTransferringTo({
                      sub: admin.sub,
                      name: admin.name,
                      surname: admin.surname,
                      picture: admin.picture ?? null,
                    })
                  }
                />
              ))
            }
          </QueryBoundary>
        </div>
      </Card>

      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-sm text-muted-foreground">
          {query.data && query.data.total > 0
            ? `Showing ${(query.data.page - 1) * query.data.size + 1}\u2013${
                (query.data.page - 1) * query.data.size +
                query.data.items.length
              } of ${query.data.total}`
            : null}
          {query.isFetching && !query.isPlaceholderData ? (
            <span className="ml-2">Updating\u2026</span>
          ) : null}
        </p>

        <div className="flex w-full items-center justify-center gap-4 sm:w-fit sm:justify-end">
          <span className="text-sm font-medium">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="hidden lg:flex"
              onClick={() => onPageChange(1)}
              disabled={page === 1 || query.isPlaceholderData}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeftIcon aria-hidden />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1 || query.isPlaceholderData}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeftIcon aria-hidden />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(page + 1)}
              disabled={!query.data?.has_next || query.isPlaceholderData}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRightIcon aria-hidden />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="hidden lg:flex"
              onClick={() => onPageChange(totalPages)}
              disabled={!query.data?.has_next || query.isPlaceholderData}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRightIcon aria-hidden />
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={removingAdmin != null}
        onOpenChange={(open) => {
          if (!open) setRemovingAdmin(null)
        }}
        title="Remove this admin?"
        description={
          removingAdmin
            ? `${removingAdmin.name} ${removingAdmin.surname} will lose the ability to edit this community.`
            : ""
        }
        confirmLabel="Remove admin"
        isPending={removeCommunityAdmin.isPending}
        onConfirm={() => {
          if (!removingAdmin) return
          removeCommunityAdmin.mutate(
            { slug, userSub: removingAdmin.sub },
            { onSuccess: () => setRemovingAdmin(null) }
          )
        }}
      />

      <ConfirmDialog
        open={transferringTo != null}
        onOpenChange={(open) => {
          if (!open) setTransferringTo(null)
        }}
        title="Transfer ownership?"
        description={
          transferringTo
            ? `${transferringTo.name} ${transferringTo.surname} becomes the owner of this community.${
                isCurrentUserOwner
                  ? " You will lose admin access, because owners are not also admins — transfer to someone else first if you want to stay on the team."
                  : ""
              }`
            : ""
        }
        confirmLabel="Transfer ownership"
        isPending={transferOwner.isPending}
        onConfirm={() => {
          if (!transferringTo) return
          transferOwner.mutate(
            { slug, ownerSub: transferringTo.sub },
            {
              onSuccess: () => {
                setTransferringTo(null)
                // The backend does not re-add the old owner as an admin, so the
                // settings route they are standing on is about to redirect them
                // away. Leaving them there would bounce them on the next refetch.
                if (isCurrentUserOwner) onOwnershipTransferredAway()
              },
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
              onOwnershipTransferredAway()
            },
          })
        }}
      />
    </div>
  )
}

interface AdminRowViewProps {
  row: AdminRow
  badge?: string
  actions: { canManage: boolean; canLeave: boolean }
  onRemove?: () => void
  onTransfer?: () => void
  onLeave?: () => void
}

function AdminRowView({
  row,
  badge,
  actions,
  onRemove,
  onTransfer,
  onLeave,
}: AdminRowViewProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Avatar>
        <AvatarImage
          src={row.picture ?? undefined}
          alt={`${row.name} ${row.surname}`}
        />
        <AvatarFallback>{initialsOf(row.name, row.surname)}</AvatarFallback>
      </Avatar>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <p className="truncate font-medium">
          {row.name} {row.surname}
        </p>
        {badge ? <Badge variant="secondary">{badge}</Badge> : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {actions.canManage && onTransfer ? (
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex"
            onClick={onTransfer}
          >
            <CrownIcon aria-hidden />
            Make owner
          </Button>
        ) : null}
        {actions.canManage && onTransfer ? (
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={`Make ${row.name} ${row.surname} the owner`}
            className="sm:hidden"
            onClick={onTransfer}
          >
            <CrownIcon aria-hidden />
          </Button>
        ) : null}

        {actions.canManage && onRemove ? (
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex"
            onClick={onRemove}
          >
            <UserMinusIcon aria-hidden />
            Remove
          </Button>
        ) : null}
        {actions.canManage && onRemove ? (
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={`Remove ${row.name} ${row.surname}`}
            className="sm:hidden"
            onClick={onRemove}
          >
            <UserMinusIcon aria-hidden />
          </Button>
        ) : null}

        {actions.canLeave && onLeave ? (
          <Button variant="outline" size="sm" onClick={onLeave}>
            <LogOutIcon aria-hidden />
            Leave
          </Button>
        ) : null}
      </div>
    </div>
  )
}
