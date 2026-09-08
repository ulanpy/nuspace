import { useState } from "react"
import { LogOutIcon, UserMinusIcon } from "lucide-react"

import { useRemoveCommunityAdmin } from "@/lib/communities"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

export interface AdminTableRow {
  sub: string
  name: string
  surname: string
  picture: string | null
  isOwner: boolean
}

/** Fixed page size; a community rarely has more than a handful of admins. */
const PAGE_SIZE = 10

function initialsOf(name: string, surname: string): string {
  return `${name.charAt(0)}${surname.charAt(0)}`.toUpperCase()
}

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

interface AdminsTableProps {
  slug: string
  rows: AdminTableRow[]
  meSub: string
  isOwner: boolean
  onLeave: () => void
}

export function AdminsTable({
  slug,
  rows,
  meSub,
  isOwner,
  onLeave,
}: AdminsTableProps) {
  const removeCommunityAdmin = useRemoveCommunityAdmin()
  const [removingAdmin, setRemovingAdmin] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const removedAdmin = rows.find((admin) => admin.sub === removingAdmin)

  return (
    <div className="space-y-4">
      <Card>
        <div className="divide-y">
          {pageRows.map((row) => {
            const isSelf = row.sub === meSub
            return (
              <div key={row.sub} className="flex items-center gap-3 p-4">
                <Avatar>
                  <AvatarImage
                    src={row.picture ?? undefined}
                    alt={`${row.name} ${row.surname}`}
                  />
                  <AvatarFallback>
                    {initialsOf(row.name, row.surname)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <p className="truncate font-medium">
                    {row.name} {row.surname}
                  </p>
                  {row.isOwner ? (
                    <Badge variant="secondary">Owner</Badge>
                  ) : null}
                </div>
                {row.isOwner ? null : isSelf ? (
                  <Button variant="outline" size="sm" onClick={onLeave}>
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
              </div>
            )
          })}
        </div>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-center sm:justify-end">
          <Pagination>
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
              {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                (item) => pageItem(item, safePage, setPage)
              )}
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
    </div>
  )
}
