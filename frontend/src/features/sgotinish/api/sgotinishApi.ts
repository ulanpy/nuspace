import { apiCall } from "@/utils/api";
import {
  Ticket, // align to backend TicketResponseDTO shape
  Conversation,
  Message,
  ConversationUpdatePayload,
  TicketListResponse, // add types for DTOs below
  TicketCreatePayload,
  TicketUpdatePayload,
  ConversationCreatePayload,
  MessageCreatePayload,
  DelegateAccessPayload,
  Department,
  SGUser,
  MessageListResponse,
} from "../types";

export const sgotinishApi = {
  // Tickets
  getTickets: async (params?: { size?: number; page?: number; category?: string; author_sub?: string }): Promise<TicketListResponse> => {
    const qs = new URLSearchParams();
    if (params?.size) qs.set("size", String(params.size));
    if (params?.page) qs.set("page", String(params.page));
    if (params?.category) qs.set("category", params.category);
    if (params?.author_sub) qs.set("author_sub", params.author_sub);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return await apiCall(`/tickets${suffix}`);
  },

  createTicket: async (payload: TicketCreatePayload): Promise<Ticket> => {
    return await apiCall(`/tickets`, { method: "POST", json: payload });
  },

  getTicketById: async (ticketId: number): Promise<Ticket> => {
    return await apiCall(`/tickets/${ticketId}`);
  },

  updateTicket: async (ticketId: number, payload: TicketUpdatePayload): Promise<Ticket> => {
    return await apiCall(`/tickets/${ticketId}`, { method: "PATCH", json: payload });
  },

  // Conversations (no list endpoint)
  createConversation: async (payload: ConversationCreatePayload): Promise<Conversation> => {
    return await apiCall(`/conversations`, { method: "POST", json: payload });
  },

  updateConversation: async (conversationId: number, payload: ConversationUpdatePayload): Promise<Conversation> => {
    return await apiCall(`/conversations/${conversationId}`, { method: "PATCH", json: payload });
  },

  // Messages
  getMessages: async (
    conversationId: number,
    params?: { page?: number; size?: number },
  ): Promise<MessageListResponse> => {
    const qs = new URLSearchParams({
      conversation_id: String(conversationId),
    });
    if (params?.page) qs.set("page", String(params.page));
    if (params?.size) qs.set("size", String(params.size));
    
    return await apiCall(`/messages?${qs.toString()}`);
  },

  createMessage: async (payload: MessageCreatePayload): Promise<Message> => {
    return await apiCall(`/messages`, { method: "POST", json: payload });
  },

  markMessageAsRead: async (messageId: number): Promise<Message> => {
    return await apiCall(`/messages/${messageId}/read`, { method: "POST" });
  },

  // Delegation
  getDepartments: async (): Promise<Department[]> => {
    return await apiCall(`/sg-delegation/departments`);
  },

  getSgUsers: async (departmentId: number): Promise<SGUser[]> => {
    return await apiCall(`/sg-delegation/users?department_id=${departmentId}`);
  },

  delegateAccess: async (ticketId: number, payload: DelegateAccessPayload): Promise<void> => {
    return await apiCall(`/tickets/${ticketId}/delegate`, { method: "POST", json: payload });
  },
};