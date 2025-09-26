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
} from "../types";

export const sgotinishApi = {
  // Tickets
  getTickets: async (params?: { size?: number; page?: number; category?: string }): Promise<TicketListResponse> => {
    const qs = new URLSearchParams();
    if (params?.size) qs.set("size", String(params.size));
    if (params?.page) qs.set("page", String(params.page));
    if (params?.category) qs.set("category", params.category);
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
  getMessages: async (conversationId: number, params?: { size?: number; page?: number }): Promise<{ messages: Message[]; total_pages: number }> => {
    const qs = new URLSearchParams({ conversation_id: String(conversationId) });
    if (params?.size) qs.set("size", String(params.size));
    if (params?.page) qs.set("page", String(params.page));
    return await apiCall(`/messages?${qs.toString()}`);
  },

  createMessage: async (payload: MessageCreatePayload): Promise<Message> => {
    return await apiCall(`/messages`, { method: "POST", json: payload });
  },

  getMessageById: async (messageId: number): Promise<Message> => {
    return await apiCall(`/messages/${messageId}`);
  },

  markAsRead: async (messageId: number): Promise<Message> => {
    return await apiCall(`/messages/${messageId}/read`, { method: "POST" });
  },
};