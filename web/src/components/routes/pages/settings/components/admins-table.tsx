import { useState } from "react"
import { CrownIcon, LogOutIcon, UserMinusIcon } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { keepPreviousData } from "@tanstack/react-query"

import { qk } from "@/api/query-keys"
import {
  adminPageActions,
  fetchPageAdminsPage,
  useLeavePage,
  useRemovePageAdmin,
  useTransferPageOwner,
} from "@/lib/pages"
import { QueryBoundary } from "@/components/shared/query/boundary"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { TablePagination } from "@/components/shared/table/pagination"
import { pageRangeSummary } from "@/components/shared/table/page-range"

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
  /** Present only when the signed-in user is a page admin. */
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
    queryKey: qk.pages.admins(slug, { page, excludeSub }),
    queryFn: () =>
      fetchPageAdminsPage(slug, {
        page,
        size: PAGE_SIZE,
        // The signed-in admin is pinned above the table, so the server has to
        // drop them from the rows AND the count or the last page comes back
        // empty. See `GET /pages/{slug}/admins`.
        excludeSub,
      }),
    placeholderData: keepPreviousData,
  })

  const removePageAdmin = useRemovePageAdmin()
  const transferOwner = useTransferPageOwner()
  const leavePage = useLeavePage()

  const [removingAdmin, setRemovingAdmin] = useState<AdminRow | null>(null)
  const [transferringTo, setTransferringTo] = useState<AdminRow | null>(null)
  const [isConfirmingLeave, setIsConfirmingLeave] = useState(false)

  const totalPages = query.data?.total_pages ?? 1

  return (
    <div className="space-y-4">
      <ItemGroup className="gap-2">
        {me ? (
          <AdminRowView
            row={me}
            badge="You"
            actions={adminPageActions(
              { isSelf: true, isOwner: false },
              canManageAdmins
            )}
            onLeave={() => setIsConfirmingLeave(true)}
          />
        ) : null}

        <AdminRowView
          row={owner}
          badge="Owner"
          actions={adminPageActions(
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
                actions={adminPageActions(
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
      </ItemGroup>

      <TablePagination
        page={page}
        totalPages={totalPages}
        hasNext={query.data?.has_next ?? false}
        summary={pageRangeSummary(
          query.data,
          // "You" and "Owner" are pinned above the page, so they are rows the
          // reader can count whether or not the query has any admins.
          (me ? 1 : 0) + 1
        )}
        isFetching={query.isFetching && !query.isPlaceholderData}
        disabled={query.isPlaceholderData}
        onPageChange={onPageChange}
      />

      <ConfirmDialog
        open={removingAdmin != null}
        onOpenChange={(open) => {
          if (!open) setRemovingAdmin(null)
        }}
        title="Remove this admin?"
        description={
          removingAdmin
            ? `${removingAdmin.name} ${removingAdmin.surname} will lose the ability to edit this page.`
            : ""
        }
        confirmLabel="Remove admin"
        isPending={removePageAdmin.isPending}
        onConfirm={() => {
          if (!removingAdmin) return
          removePageAdmin.mutate(
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
            ? `${transferringTo.name} ${transferringTo.surname} becomes the owner of this page.${
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
        title="Leave this page?"
        description="You will lose admin access to this page until someone adds you again."
        confirmLabel="Leave page"
        isPending={leavePage.isPending}
        onConfirm={() => {
          leavePage.mutate(slug, {
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
    <Item variant="muted" size="sm">
      <ItemMedia variant="image" className="rounded-full">
        <Avatar className="size-10 rounded-full">
          <AvatarImage
            src={row.picture ?? undefined}
            alt={`${row.name} ${row.surname}`}
          />
          <AvatarFallback>{initialsOf(row.name, row.surname)}</AvatarFallback>
        </Avatar>
      </ItemMedia>

      <ItemContent>
        <ItemTitle className="w-auto min-w-0 flex-1">
          {row.name} {row.surname}
        </ItemTitle>
      </ItemContent>

      <ItemActions className="ml-auto">
        {badge ? <Badge variant="secondary">{badge}</Badge> : null}

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
      </ItemActions>
    </Item>
  )
}
