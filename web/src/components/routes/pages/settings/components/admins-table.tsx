import { useState } from "react"
import { CrownIcon, LogOutIcon, UserMinusIcon } from "lucide-react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"

import { qk } from "@/api/query-keys"
import type { AdminControlsSearch } from "@/routes/_app/p/$slug/settings/admin-controls"
import {
  adminPageActions,
  fetchPageAdminsPage,
  sortingToSearch,
  useLeavePage,
  useRemovePageAdmin,
  useTransferPageOwner,
} from "@/lib/pages"
import { isPageAdminSort, PAGE_SIZES } from "@/lib/pages/constants"
import { useDataTable } from "@/hooks/use-data-table"
import { DataTable } from "@/components/shared/data-table/data-table"
import { DataTableColumnHeader } from "@/components/shared/data-table/data-table-column-header"
import { DataTableToolbar } from "@/components/shared/data-table/data-table-toolbar"
import { QueryError } from "@/components/shared/query/boundary"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { TablePagination } from "@/components/shared/table/pagination"
import { pageRangeSummary } from "@/components/shared/table/page-range"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

export interface AdminRow {
  sub: string
  name: string
  surname: string
  picture: string | null
}

/**
 * A row in the table, whether it came from the server or not.
 *
 * `label` is the Role cell's text and `pinned` is what the two fixed rows need
 * to differ on: they sit above the server page and cannot be selected, because
 * "Remove" on yourself is a Leave and "Make owner" on the owner is nothing.
 */
type AdminTableRow = AdminRow & {
  label: string
  pinned: boolean
}

function initialsOf(name: string, surname: string): string {
  return `${name.charAt(0)}${surname.charAt(0)}`.toUpperCase()
}

interface AdminsTableProps {
  slug: string
  search: AdminControlsSearch
  onSearchChange: (
    updater: (previous: AdminControlsSearch) => AdminControlsSearch
  ) => void
  owner: AdminRow
  /**
   * The signed-in user, always present.
   *
   * Previously `null` unless a two-term guess about `can_edit` and
   * `can_manage_admins` came out "plain page admin". A guess that decides
   * whether a prop exists is a guess that eventually guesses wrong, so the
   * prop is unconditional and the one question it used to answer — should this
   * user get a "You" row at all? — is answered from facts below.
   */
  me: AdminRow
  /**
   * A site admin is not a page admin, so they get no "You" row and no Leave
   * button: they were never in the list, and there is nothing to leave.
   */
  isSiteAdmin: boolean
  canManageAdmins: boolean
  /** The signed-in user is the owner, so a transfer costs them these settings. */
  isCurrentUserOwner: boolean
  /** Called after a transfer that locks the current user out. */
  onOwnershipTransferredAway: () => void
}

export function AdminsTable({
  slug,
  search,
  onSearchChange,
  owner,
  me,
  isSiteAdmin,
  canManageAdmins,
  isCurrentUserOwner,
  onOwnershipTransferredAway,
}: AdminsTableProps) {
  /**
   * "You" is pinned only for someone who is actually a page admin. The owner
   * is already the Owner row, and a site admin is not in the list at all —
   * showing either of them a "You" row would be a second row for a person who
   * has one, or a Leave button for a membership that does not exist.
   */
  const showsSelf = !isCurrentUserOwner && !isSiteAdmin
  const excludeSub = showsSelf ? me.sub : undefined

  const query = useQuery({
    queryKey: qk.pages.admins(slug, {
      page: search.page,
      size: search.size,
      sort: search.sort,
      order: search.order,
      excludeSub,
    }),
    queryFn: () =>
      fetchPageAdminsPage(slug, {
        page: search.page,
        size: search.size,
        sort: search.sort,
        order: search.order,
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

  const [removing, setRemoving] = useState<AdminRow[]>([])
  const [isRemoving, setIsRemoving] = useState(false)
  const [transferringTo, setTransferringTo] = useState<AdminRow | null>(null)
  const [isConfirmingLeave, setIsConfirmingLeave] = useState(false)

  /**
   * "You" and the owner are rows, not chrome above the table.
   *
   * The old `ItemGroup` drew them as separate elements, which is why the
   * footer's `pinned` count was a hand-summed `(me ? 1 : 0) + 1` that had to
   * agree with two separate `if`s. One list, one count, no way to render a
   * "You" row without a footer that also counts it.
   */
  const rows: AdminTableRow[] = [
    ...(showsSelf ? [{ ...me, label: "You", pinned: true }] : []),
    { ...owner, label: "Owner", pinned: true },
    ...(query.data?.items ?? []).map((admin) => ({
      sub: admin.sub,
      name: admin.name,
      surname: admin.surname,
      picture: admin.picture ?? null,
      label: "Admin",
      pinned: false,
    })),
  ]
  const pinnedCount = rows.length - (query.data?.items.length ?? 0)

  // Page, size, sort and order are all URL state here too, so a reload and a
  // pasted link land on the same page of the same order.
  const sorting = search.sort
    ? [{ id: search.sort, desc: search.order === "desc" }]
    : []

  const changeSearch = (patch: Partial<AdminControlsSearch>) => {
    onSearchChange((previous) => ({
      ...previous,
      ...patch,
      // Any change that reorders or re-slices the rows invalidates the current
      // page number. `patch.page` is set explicitly when a real page click
      // arrives, and `??` keeps it instead of overwriting it with 1.
      page: patch.page ?? 1,
    }))
  }

  const columns: ColumnDef<AdminTableRow>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          // A page with no removable admins would otherwise show a live-looking
          // checkbox that selects nothing, which is the same lie as a checkbox
          // on a pinned row.
          disabled={table
            .getRowModel()
            .rows.every((row) => !row.getCanSelect())}
          onCheckedChange={(checked) =>
            table.toggleAllPageRowsSelected(checked)
          }
          aria-label="Select every admin on this page"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onCheckedChange={(checked) => row.toggleSelected(checked)}
          aria-label={`Select ${row.original.name} ${row.original.surname}`}
        />
      ),
      enableSorting: false,
    },
    {
      id: "avatar",
      enableSorting: false,
      header: () => null,
      cell: ({ row }) => (
        <Avatar className="size-8">
          <AvatarImage
            src={row.original.picture ?? undefined}
            alt={`${row.original.name} ${row.original.surname}`}
          />
          <AvatarFallback className="text-xs">
            {initialsOf(row.original.name, row.original.surname)}
          </AvatarFallback>
        </Avatar>
      ),
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.name} {row.original.surname}
        </span>
      ),
    },
    {
      accessorKey: "label",
      header: "Role",
      cell: ({ row }) => (
        <Badge variant="secondary">{row.original.label}</Badge>
      ),
      enableSorting: false,
    },
    {
      id: "actions",
      enableSorting: false,
      header: () => null,
      cell: ({ row }) => {
        // 6.7: `adminPageActions` is the only place the rules live. The
        // component reads its answer, it does not re-derive it, because the
        // bulk bar below asks the same function and two copies of a permission
        // rule always diverge eventually.
        const actions = adminPageActions(
          {
            isSelf: showsSelf && row.original.sub === me.sub,
            isOwner: row.original.pinned && row.original.sub === owner.sub,
          },
          canManageAdmins
        )
        return (
          <div className="flex flex-wrap justify-end gap-2">
            {actions.canManage ? (
              <>
                <ResponsiveAction
                  icon={CrownIcon}
                  label="Make owner"
                  iconLabel={`Make ${row.original.name} ${row.original.surname} the owner`}
                  onClick={() => setTransferringTo(row.original)}
                />
                <ResponsiveAction
                  icon={UserMinusIcon}
                  label="Remove"
                  iconLabel={`Remove ${row.original.name} ${row.original.surname}`}
                  onClick={() => setRemoving([row.original])}
                />
              </>
            ) : null}
            {actions.canLeave ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsConfirmingLeave(true)}
              >
                <LogOutIcon aria-hidden />
                Leave
              </Button>
            ) : null}
          </div>
        )
      },
    },
  ]

  const table = useDataTable<AdminTableRow>({
    data: rows,
    columns,
    sorting,
    onSortingChange: (updater) =>
      changeSearch(
        sortingToSearch(
          typeof updater === "function" ? updater(sorting) : updater,
          isPageAdminSort
        )
      ),
    getRowId: (row) => row.sub,
    // The two pinned rows are not admins you can remove, so the header's
    // select-all skips them rather than rendering checkboxes that lie. In v8
    // this is a table option, not a column one, and `row.getCanSelect()` — what
    // the checkbox's `disabled` reads — is derived from it.
    enableRowSelection: (row) => !row.original.pinned,
  })

  const selected = table.getSelectedRowModel().rows.map((row) => row.original)
  // Every selected row has to permit the action. Pinned rows cannot be
  // selected, so in practice this is `canManageAdmins` — but asking the gate
  // per row costs one `every` and cannot be wrong about a future row type.
  const canManageSelection =
    selected.length > 0 &&
    selected.every(
      () =>
        adminPageActions({ isSelf: false, isOwner: false }, canManageAdmins)
          .canManage
    )

  const totalPages = query.data?.total_pages ?? 1

  async function confirmRemove() {
    const targets = removing
    setIsRemoving(true)
    // One request per admin: the endpoint takes a single `user_sub`, so a
    // "bulk" remove is N removes. `allSettled` rather than `all` because one
    // failure must not leave the dialog open over rows that did go through —
    // and must not be silent either.
    const results = await Promise.allSettled(
      targets.map((target) =>
        removePageAdmin.mutateAsync({ slug, userSub: target.sub })
      )
    )
    setIsRemoving(false)
    setRemoving([])
    table.resetRowSelection()
    const failed = results.filter((result) => result.status === "rejected")
    if (failed.length > 0) {
      toast.error(
        failed.length === targets.length
          ? "Could not remove the selected admins. Try again."
          : `Removed ${String(targets.length - failed.length)} of ${String(targets.length)} admins. The rest are still here.`
      )
    }
  }

  return (
    <div className="space-y-4">
      {/* `QueryBoundary` hides its children until the query resolves, and the
          two pinned rows do not come from the query — the old code drew them
          outside the boundary for exactly that reason. Here the boundary's
          pending slot would also swallow the toolbar and the footer, so the
          error case is the only thing it was still needed for. */}
      {query.isError ? (
        <QueryError
          error={query.error}
          onRetry={() => {
            void query.refetch()
          }}
        />
      ) : (
        <DataTable
          table={table}
          // First load only. A page or sort change keeps the previous page on
          // screen via `keepPreviousData` rather than flashing a skeleton, so
          // the pinned rows never blink out from under the reader.
          isLoading={query.isPending}
          skeletonRows={search.size}
          toolbar={(instance) => {
            const count = instance.getSelectedRowModel().rows.length
            if (count === 0) return null
            const [only] = instance.getSelectedRowModel().rows
            return (
              <DataTableToolbar
                selectedCount={count}
                selectionActions={
                  <>
                    {canManageSelection ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRemoving(selected)}
                        >
                          <UserMinusIcon aria-hidden />
                          Remove
                        </Button>
                        {/* Ownership is one row's worth of authority. Offering
                            "Make owner" for three selected rows would be a
                            button that cannot do what it says, so it is not
                            rendered at all rather than shown disabled. */}
                        {count === 1 && only ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setTransferringTo(only.original)}
                          >
                            <CrownIcon aria-hidden />
                            Make owner
                          </Button>
                        ) : null}
                      </>
                    ) : null}
                  </>
                }
              >
                {null}
              </DataTableToolbar>
            )
          }}
          /* Unreachable while the owner row exists, which it always does — but
             `DataTable` requires the prop, and an ownerless page (a dangling
             `owner_user`) still renders a row rather than nothing. */
          emptyState={
            <p className="text-sm text-muted-foreground">
              This page has no other admins.
            </p>
          }
        />
      )}

      <TablePagination
        page={search.page}
        pageSize={search.size}
        pageSizeOptions={PAGE_SIZES}
        onPageSizeChange={(size) => changeSearch({ size })}
        totalPages={totalPages}
        hasNext={query.data?.has_next ?? false}
        summary={pageRangeSummary(query.data, pinnedCount)}
        isFetching={query.isFetching && !query.isPlaceholderData}
        disabled={query.isPlaceholderData}
        onPageChange={(page) => changeSearch({ page })}
      />

      <ConfirmDialog
        open={removing.length > 0}
        onOpenChange={(open) => {
          if (!open) setRemoving([])
        }}
        title={
          removing.length === 1 ? "Remove this admin?" : "Remove these admins?"
        }
        description={
          removing.length === 1 && removing[0]
            ? `${removing[0].name} ${removing[0].surname} will lose the ability to edit this page.`
            : `${String(removing.length)} people will lose the ability to edit this page.`
        }
        confirmLabel={removing.length === 1 ? "Remove admin" : "Remove admins"}
        isPending={isRemoving}
        onConfirm={() => {
          void confirmRemove()
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
                table.resetRowSelection()
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

/**
 * The pair the old `Item` rows used: a labelled button from `sm` up, an
 * icon-only square below it.
 *
 * Ported as one component with the same breakpoints rather than as four copied
 * blocks, so the two widths cannot drift apart — the failure mode of copy-paste
 * here is a phone with an unlabelled "Remove" and a desktop missing its icon.
 */
function ResponsiveAction({
  icon: Icon,
  label,
  iconLabel,
  onClick,
}: {
  icon: typeof CrownIcon
  label: string
  /** The visible label, spoken where there is no visible label. */
  iconLabel: string
  onClick: () => void
}) {
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="hidden sm:inline-flex"
        onClick={onClick}
      >
        <Icon aria-hidden />
        {label}
      </Button>
      <Button
        variant="outline"
        size="icon-sm"
        className="sm:hidden"
        aria-label={iconLabel}
        onClick={onClick}
      >
        <Icon aria-hidden />
      </Button>
    </>
  )
}
