import { apiCall } from "@/utils/api";
import { ConversationUpdate, Ticket, Conversation, Message } from "../types";

export const sgotinishApi = {

    sgotinish: async (): Promise<void> => {
        return await apiCall(`/sgotinish`);
    },
    // Tickets APIs
    getTicket: async (): Promise<Ticket[]> => {
        return await apiCall(`/tickets`);
    },

    createTicket: async (): Promise<Ticket> => {
        return await apiCall('/tickets', { method: 'POST' });
    },
    
    getTicketById: async (ticketId: number): Promise<Ticket> => {
        return await apiCall(`/tickets/${ticketId}`);
    },
    
    getConversations: async (): Promise<Conversation[]> => {
        return await apiCall(`/conversations`);
    },

    getConversationsById: async (conversationId: number): Promise<Conversation> => {
        return await apiCall(`/conversations/${conversationId}`);
    },

    updateConversation: async (conversationId: number, payload: ConversationUpdate): Promise<void> => {
        return await apiCall(`/conversations/${conversationId}`, { method: 'PATCH', json: payload });
    },

    //Messages APIs
    getMessages: async (): Promise<Message[]> => {
        return await apiCall(`/messages`);
    },
    
    createMessage: async (): Promise<Message> => {
        return await apiCall('/messages', { method: 'POST' });
    },

    getMessagesById: async (messageId: number): Promise<Message> => {
        return await apiCall(`/messages/${messageId}`);
    },
    
    markAsRead: async (messageId: number): Promise<Message> => {
        return await apiCall(`/messages/${messageId}/read`, { method: 'POST' });
    },
};