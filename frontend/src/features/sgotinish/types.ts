export interface ShortUserResponse {
    sub: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
}

export interface ResourcePermissions {
    can_edit: boolean;
    can_delete: boolean;
    editable_fields: string[];
}

export interface BaseMessageReadStatus {
    message_id: number;
    user_sub: string;
    read_at: string; // ISO date
}

export enum TicketCategory{
    academic = "academic",
    administrative = "administrative",
    technical = "technical",
    complaint = "complaint",
    suggestion = "suggestion",
    other = "other",
}

export enum TicketStatus{
    open = "open",
    in_progress = "in_progress",
    closed = "closed",
    resolved = "resolved",
}

export enum ConversationStatus{
    active = "active",
    archived = "archived",
}

export enum PermissionType{
    VIEW = "view",
    ASSIGN = "assign",
    DELEGATE = "delegate",
}

export interface Ticket {
    id: number;
    author_sub?: string | null;
    category: TicketCategory;
    title: string;
    body: string;
    status: TicketStatus;
    is_anonymous: boolean;
    created_at: string;
    updated_at: string;
    author?: ShortUserResponse | null;
    permissions: ResourcePermissions;
    unread_count: number;
    conversations: Conversation[];
}

export interface TicketListResponse{
    tickets: Ticket[];
    total_pages: number;
}

export interface TicketCreatePayload {
    author_sub?: "me" | string;
    category: TicketCategory;
    title: string;
    body: string;
    is_anonymous?: boolean;
}

export interface TicketUpdatePayload {
    status?: TicketStatus;
}

export interface Conversation {
    id: number;
    ticket_id: number;
    sg_member_sub?: string | null;
    status: ConversationStatus;
    created_at: string;
    sg_member?: ShortUserResponse | null;
    messages_count: number;
    permissions: ResourcePermissions;
}

export interface ConversationListResponse {
    conversations: Conversation;
    total_pages: number;
}

export type ConversationCreatePayload = {
    ticket_id: number;
    sg_member_sub?: "me" | string;
};

export interface ConversationUpdatePayload {
    status?: ConversationStatus;
}

export interface Message {
    id: number;
    conversation_id: number;
    sender_sub?: string | null;
    body: string;
    is_from_sg_member: boolean;
    sent_at: string;
    message_read_statuses: BaseMessageReadStatus[];
    permissions: ResourcePermissions;
}

export interface MessageCreatePayload {
    conversation_id: number;
    sender_sub?: "me" | string;
    body: string;
}