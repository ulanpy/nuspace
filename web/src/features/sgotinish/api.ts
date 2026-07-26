import {
  queryOptions,
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query"

import { api, unwrap } from "@/api/client"
import { apiErrorMessage } from "@/api/errors"
import { qk } from "@/api/query-keys"

import type {
  PermissionType,
  SGMember,
  SGRole,
  Ticket,
  TicketCategory,
  TicketStatus,
} from "./types"

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

export function departmentsQueryOptions() {
  return queryOptions({
    queryKey: qk.sgotinish.departments(),
    queryFn: () => unwrap(api.GET("/sg-delegation/departments")),
  })
}

/** SG members of one department — the middle step of the delegation cascade. */
export function sgUsersQueryOptions(departmentId: number | null) {
  return queryOptions({
    queryKey: [
      ...qk.sgotinish.all(),
      "department-users",
      departmentId,
    ] as const,
    queryFn: () =>
      unwrap(
        api.GET("/sg-delegation/users", {
          params: { query: { department_id: departmentId ?? 0 } },
        })
      ),
    enabled: departmentId !== null,
  })
}

/** Any Nuspace user, searched by name or email, for adding to SG. */
export function userSearchQueryOptions(query: string) {
  return queryOptions({
    queryKey: [...qk.sgotinish.all(), "user-search", query] as const,
    queryFn: () =>
      unwrap(api.GET("/sg-members/users", { params: { query: { q: query } } })),
    enabled: query.length > 0,
  })
}

function refreshTickets(client: QueryClient) {
  return client.invalidateQueries({ queryKey: qk.sgotinish.all() })
}

/**
 * Membership changes ripple further than the roster: a removed member loses
 * access to tickets, and their own session carries the role that decides which
 * tabs they see.
 */
async function refreshMembership(client: QueryClient) {
  await Promise.all([
    client.invalidateQueries({ queryKey: qk.sgotinish.all() }),
    client.invalidateQueries({ queryKey: qk.session() }),
  ])
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

/** Add someone to SG, or change the role or department of someone already in. */
export function useUpsertSgMember() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (payload: {
      target_user_sub: string
      role: SGRole
      department_id: number
    }) => unwrap(api.POST("/sg-members", { body: payload })),
    onSuccess: () => refreshMembership(client),
  })
}

export function useRemoveSgMember() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (targetUserSub: string) =>
      unwrap(
        api.DELETE("/sg-members/{target_user_sub}", {
          params: { path: { target_user_sub: targetUserSub } },
        })
      ),
    onSuccess: () => refreshMembership(client),
  })
}

/** Leaving SG under your own steam. Distinct from being removed. */
export function useWithdrawFromSg() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: () => unwrap(api.POST("/sg-members/withdraw", {})),
    onSuccess: () => refreshMembership(client),
  })
}

export interface CabinetWithdrawal {
  removed: number
  total: number
  failures: { name: string; reason: string }[]
}

/**
 * Remove every non-Head member of SG, one request at a time.
 *
 * There is no bulk endpoint, so this is a loop over `DELETE /sg-members/{sub}`
 * and each call can fail on its own — the server refuses, for instance, a
 * removal that would leave no boss. A single rejected promise would throw away
 * the fact that the other nineteen worked, so failures are collected and
 * reported rather than raised: the caller shows what happened to whom.
 */
export function useWithdrawCabinet() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: async (targets: SGMember[]): Promise<CabinetWithdrawal> => {
      const failures: CabinetWithdrawal["failures"] = []
      let removed = 0

      // Sequential on purpose: twenty parallel deletes race each other through
      // the "at least one boss must remain" check.
      for (const member of targets) {
        try {
          await unwrap(
            api.DELETE("/sg-members/{target_user_sub}", {
              params: { path: { target_user_sub: member.user.sub } },
            })
          )
          removed += 1
        } catch (error) {
          failures.push({
            name: `${member.user.name} ${member.user.surname}`,
            reason: apiErrorMessage(error, "Could not remove this member."),
          })
        }
      }

      return { removed, total: targets.length, failures }
    },
    onSuccess: () => refreshMembership(client),
  })
}

export function useCreateDepartment() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (payload: { name: string; is_special: boolean }) =>
      unwrap(api.POST("/sg-delegation/departments", { body: payload })),
    onSuccess: () => refreshMembership(client),
  })
}

export function useDeleteDepartment() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (departmentId: number) =>
      unwrap(
        api.DELETE("/sg-delegation/departments/{department_id}", {
          params: { path: { department_id: departmentId } },
        })
      ),
    onSuccess: () => refreshMembership(client),
  })
}

/** Grant another SG member access to one ticket. */
export function useDelegateTicketAccess(ticketId: number) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (payload: {
      target_user_sub: string
      permission: PermissionType
    }) =>
      unwrap(
        api.POST("/tickets/{ticket_id}/delegate", {
          params: { path: { ticket_id: ticketId } },
          body: payload,
        })
      ),
    onSuccess: () => refreshTickets(client),
  })
}

/**
 * Mark one message as read.
 *
 * Drives the `unread_count` on the ticket list, which the ported conversation
 * view showed but never cleared — so a ticket read three times still claimed
 * unread replies. Deliberately quiet: a read receipt that fails is not worth
 * interrupting anyone over, and the next open will try again.
 */
export function useMarkMessageRead(conversationId: number, ownerHash?: string) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (messageId: number) =>
      unwrap(
        api.POST("/messages/{message_id}/read", {
          params: { path: { message_id: messageId } },
          headers: ownerHashHeader(ownerHash),
        })
      ),
    onSuccess: async () => {
      // The count lives on the ticket, not the message.
      await client.invalidateQueries({ queryKey: qk.sgotinish.all() })
      await client.invalidateQueries({
        queryKey: qk.sgotinish.messages(conversationId),
      })
    },
  })
}
