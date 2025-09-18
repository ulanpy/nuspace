export interface Ticket {
    id: number;
    title: string;
    description: string;
    created_at: string;
    updated_at: string;
}

export interface Conversation {
    id: number;
    ticket_id: number;
    user_id: number;
    content: string;
    created_at: string;
    updated_at: string;
}

export interface Message {
    id: number;
    conversation_id: number;
    user_id: number;
    content: string;
    created_at: string;
    updated_at: string;
}

export interface ConversationUpdate {
    content: string;
}