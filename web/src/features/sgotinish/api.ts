import {
  queryOptions,
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query"

import { api, unwrap } from "@/api/client"
import { qk } from "@/api/query-keys"

import type { Ticket, TicketCategory, TicketStatus } from "./types"

/**
 * The anonymous owner hash travels as a header, never as a query parameter.
 *
 * It is the only credential guarding an anonymous ticket, and a query string
 * lands in access logs, `Referer` and browser history. The backend accepts
 * both for backwards compatibility; this client only ever sends the header.
 */
function ownerHashHeader(ownerHash?: string) {
  return ownerHash ? { "X-Owner-Hash": ownerHash } : undefined
}

export interface TicketFilters {
  status?: TicketStatus
  category?: TicketCategory
  /** `me` for the caller's own tickets; SG views omit it. */
  author_sub?: string
}

export function fetchTicketsPage(
  params: { page: number; size: number } & TicketFilters
) {
  const { page, size, ...filters } = params

  return unwrap(
    api.GET("/tickets", {
      params: {
        query: {
          page,
          size,
          status: filters.status ?? null,
          category: filters.category ?? null,
          author_sub: filters.author_sub ?? null,
        },
      },
    })
  )
}

export function ticketQueryOptions(ticketId: number) {
  return queryOptions({
    queryKey: qk.sgotinish.ticket(ticketId),
    queryFn: () =>
      unwrap(
        api.GET("/tickets/{ticket_id}", {
          params: { path: { ticket_id: ticketId } },
        })
      ),
  })
}

/**
 * Look a ticket up by its owner hash — the anonymous author's only way in.
 *
 * A POST because the hash goes in the body rather than the URL.
 */
export function anonymousTicketQueryOptions(ownerHash: string | null) {
  return queryOptions({
    queryKey: [...qk.sgotinish.all(), "by-owner-hash", ownerHash] as const,
    queryFn: () =>
      unwrap(
        api.POST("/tickets/by-owner-hash", {
          body: { owner_hash: ownerHash ?? "" },
        })
      ),
    enabled: Boolean(ownerHash),
    retry: false,
  })
}

export function messagesQueryOptions(
  conversationId: number,
  ownerHash?: string
) {
  return queryOptions({
    queryKey: qk.sgotinish.messages(conversationId),
    queryFn: () =>
      unwrap(
        api.GET("/messages", {
          params: { query: { conversation_id: conversationId, size: 100 } },
          headers: ownerHashHeader(ownerHash),
        })
      ),
    // Conversations are a back-and-forth with SG; nothing pushes updates, so
    // an open conversation polls rather than going stale.
    refetchInterval: 20_000,
  })
}

export function sgMembersQueryOptions() {
  return queryOptions({
    queryKey: qk.sgotinish.members(),
    queryFn: () => unwrap(api.GET("/sg-members")),
  })
}

function refreshTickets(client: QueryClient) {
  return client.invalidateQueries({ queryKey: qk.sgotinish.all() })
}

export interface NewTicket {
  category: TicketCategory
  title: string
  body: string
  is_anonymous: boolean
  /** Present only for anonymous tickets. */
  owner_hash?: string
}

export function useCreateTicket() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (draft: NewTicket) =>
      unwrap(
        api.POST("/tickets", {
          body: {
            // An anonymous ticket must carry no author, or the anonymity is
            // only skin deep.
            author_sub: draft.is_anonymous ? null : "me",
            category: draft.category,
            title: draft.title,
            body: draft.body,
            is_anonymous: draft.is_anonymous,
            owner_hash: draft.owner_hash ?? null,
          },
        })
      ),
    onSuccess: () => refreshTickets(client),
  })
}

export function useSendMessage(conversationId: number, ownerHash?: string) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (body: string) =>
      unwrap(
        api.POST("/messages", {
          body: { conversation_id: conversationId, body },
          headers: ownerHashHeader(ownerHash),
        })
      ),
    onSuccess: () =>
      client.invalidateQueries({
        queryKey: qk.sgotinish.messages(conversationId),
      }),
  })
}

/** Open a conversation on a ticket — the SG side accepting it. */
export function useStartConversation() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (ticketId: number) =>
      unwrap(api.POST("/conversations", { body: { ticket_id: ticketId } })),
    onSuccess: () => refreshTickets(client),
  })
}

export function useUpdateTicketStatus() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: ({
      ticketId,
      status,
    }: {
      ticketId: number
      status: TicketStatus
    }) =>
      unwrap<Ticket>(
        api.PATCH("/tickets/{ticket_id}", {
          params: { path: { ticket_id: ticketId } },
          body: { status },
        })
      ),
    onSuccess: () => refreshTickets(client),
  })
}
