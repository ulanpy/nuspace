export interface ShortUserResponse {
    sub: string;
    name: string;
    surname: string;
    picture: string;
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
    ticket_access?: PermissionType | null;
    unread_count: number;
    conversation: Conversation | null;
    conversations?: LegacyConversation[]; // legacy support until backend returns single conversation
}

export interface PaginatedMeta {
    total_pages: number;
    total: number;
    page: number;
    size: number;
    has_next: boolean;
}

export interface TicketListResponse extends PaginatedMeta {
    items: Ticket[];
}

export interface TicketCreatePayload {
    author_sub?: "me" | string;
    category: TicketCategory;
    title: string;
    body: string;
    is_anonymous?: boolean;
    owner_hash?: string;
}

export interface TicketUpdatePayload {
    status?: TicketStatus;
}

export interface Conversation {
    id: number;
    ticket_id: number;
    status: ConversationStatus;
    created_at: string;
    messages_count: number;
    permissions: ResourcePermissions;
    participants: ShortUserResponse[];
}

export interface LegacyConversation {
    id: number;
    ticket_id: number;
    sg_member_sub?: string | null;
    status: ConversationStatus;
    created_at: string;
    sg_member?: ShortUserResponse | null;
    messages_count: number;
    permissions: ResourcePermissions;
}

export type ConversationCreatePayload = {
    ticket_id: number;
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
    sender: ShortUserResponse | SGUserResponse | null;
}

export interface MessageListResponse extends PaginatedMeta {
    items: Message[];
}

export interface MessageCreatePayload {
    conversation_id: number;
    body: string;
}

export interface DelegateAccessPayload {
    target_user_sub: string;
    permission: PermissionType;
}

export interface Department {
    id: number;
    name: string;
}

export interface SGUserResponse {
    user: ShortUserResponse;
    department_name: string;
    role: "boss" | "capo" | "soldier" | "admin";
}