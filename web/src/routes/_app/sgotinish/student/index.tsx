import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { qk } from "@/api/query-keys"
import { fetchTicketsPage } from "@/features/sgotinish/api"
import { TicketCard } from "@/features/sgotinish/components/ticket-card"
import { NewTicketForm } from "@/features/sgotinish/components/new-ticket-form"
import {
  STATUS_LABEL,
  TICKET_CATEGORIES,
  TICKET_STATUSES,
  type Ticket,
} from "@/features/sgotinish/types"
import { useInfiniteList } from "@/hooks/use-infinite-list"
import { TelegramConnectPrompt } from "@/features/profile/components/telegram-connect-prompt"
import { ChoiceChips } from "@/components/list-filters"
import { EmptyState } from "@/components/query-boundary"
import { InfiniteList } from "@/components/infinite-list"

const studentSearchSchema = z.object({
  status: z.enum(TICKET_STATUSES).optional(),
  category: z.enum(TICKET_CATEGORIES).optional(),
})

export const Route = createFileRoute("/_app/sgotinish/student/")({
  validateSearch: studentSearchSchema,
  component: MyTickets,
})

function MyTickets() {
  const { status, category } = Route.useSearch()
  const navigate = Route.useNavigate()

  const list = useInfiniteList<Ticket>({
    queryKey: qk.sgotinish.list({ mine: true, status, category }),
    fetchPage: ({ page, size }) =>
      fetchTicketsPage({ page, size, status, category, author_sub: "me" }),
  })

  return (
    <div className="space-y-4">
      <TelegramConnectPrompt
        storageKey="nuspace_sgotinish_tg_banner_dismissed"
        title="Get appeal updates on Telegram"
      />
      <NewTicketForm />
      <ChoiceChips
        label="Ticket status"
        value={status}
        options={TICKET_STATUSES.map((value) => ({
          value,
          label: STATUS_LABEL[value],
        }))}
        onChange={(next) => {
          void navigate({
            search: (previous) => ({ ...previous, status: next }),
          })
        }}
      />
      <ChoiceChips
        label="Ticket category"
        value={category}
        options={TICKET_CATEGORIES.map((value) => ({
          value,
          label: titleCase(value),
        }))}
        onChange={(next) => {
          void navigate({
            search: (previous) => ({ ...previous, category: next }),
          })
        }}
      />

      <InfiniteList
        items={list.items}
        getKey={(ticket) => ticket.id}
        renderItem={(ticket) => (
          <TicketCard ticket={ticket} to="/sgotinish/student/$ticketId" />
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
            title="You have not raised anything yet"
            description="Tickets you send to Student Government appear here."
          />
        }
      />
    </div>
  )
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
