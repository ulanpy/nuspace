import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { qk } from "@/api/query-keys"
import { fetchTicketsPage } from "@/features/sgotinish/api"
import { TicketCard } from "@/features/sgotinish/components/ticket-card"
import {
  STATUS_LABEL,
  TICKET_CATEGORIES,
  TICKET_STATUSES,
  type Ticket,
} from "@/features/sgotinish/types"
import { useInfiniteList } from "@/hooks/use-infinite-list"
import { EmptyState } from "@/components/query-boundary"
import { InfiniteList } from "@/components/infinite-list"
import { cn } from "@/lib/utils"
import { ChoiceChips } from "@/components/list-filters"
import { TelegramConnectPrompt } from "@/features/profile/components/telegram-connect-prompt"
import { Card } from "@/components/ui/card"

const inboxSearchSchema = z.object({
  status: z.enum(TICKET_STATUSES).optional(),
  category: z.enum(TICKET_CATEGORIES).optional(),
})

export const Route = createFileRoute("/_app/sgotinish/sg/")({
  validateSearch: inboxSearchSchema,
  component: SgInbox,
})

function SgInbox() {
  const { status, category } = Route.useSearch()
  const navigate = Route.useNavigate()

  const list = useInfiniteList<Ticket>({
    queryKey: qk.sgotinish.list({ inbox: true, status, category }),
    fetchPage: ({ page, size }) =>
      fetchTicketsPage({ page, size, status, category }),
  })

  return (
    <div className="space-y-4">
      <TelegramConnectPrompt
        storageKey="nuspace_sgotinish_tg_banner_dismissed"
        title="Receive delegated-ticket updates on Telegram"
      />
      <Card className="gap-4 p-4">
        <h2 className="text-sm font-semibold">Filter the inbox</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <fieldset className="flex flex-wrap content-start gap-1">
            <legend className="mb-2 text-sm font-medium">Ticket status</legend>
            {[undefined, ...TICKET_STATUSES].map((option) => {
              const isActive = status === option

              return (
                <button
                  key={option ?? "all"}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => {
                    void navigate({
                      search: (previous) => ({
                        ...previous,
                        status: option,
                      }),
                    })
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    isActive
                      ? "border-primary bg-primary/10 font-medium"
                      : "text-muted-foreground hover:bg-muted/60"
                  )}
                >
                  {option ? STATUS_LABEL[option] : "All"}
                </button>
              )
            })}
          </fieldset>
          <ChoiceChips
            label="Ticket category"
            value={category}
            options={TICKET_CATEGORIES.map((value) => ({
              value,
              label: value.charAt(0).toUpperCase() + value.slice(1),
            }))}
            onChange={(next) => {
              void navigate({
                search: (previous) => ({ ...previous, category: next }),
              })
            }}
          />
        </div>
      </Card>

      <InfiniteList
        items={list.items}
        getKey={(ticket) => ticket.id}
        renderItem={(ticket) => (
          <TicketCard ticket={ticket} to="/sgotinish/sg/$ticketId" />
        )}
        isPending={list.isPending}
        isError={list.isError}
        error={list.error}
        refetch={() => {
          void list.refetch()
        }}
        hasNextPage={list.hasNextPage}
        isFetchingNextPage={list.isFetchingNextPage}
        fetchNextPage={() => {
          void list.fetchNextPage()
        }}
        empty={
          <EmptyState
            title="Nothing in the inbox"
            description="Tickets raised by students appear here."
          />
        }
      />
    </div>
  )
}
