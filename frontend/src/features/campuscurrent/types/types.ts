import { Media } from "@/features/media/types/types";

    export enum CommunityType {
      club = "club",
      university = "university",
      organization = "organization"
    }

    export enum CommunityCategory {
      academic = "academic",
      professional = "professional",
      recreational = "recreational",
      cultural = "cultural",
      sports = "sports",
      social = "social",
      art = "art",
      technology = "technology"
    }

    export enum EventPolicy {
      open = "open",
      registration = "registration"
    }

    export enum CommunityRecruitmentStatus {
      open = "open",
      closed = "closed"
    }

    export interface HeadUser {
      sub: string;
      name: string;
      surname: string;
      picture: string;
    }

    export enum EventEditableFields {
      name = "name",
      place = "place",
      event_datetime = "event_datetime",
      description = "description",
      duration = "duration",
      policy = "policy",
      registration_link = "registration_link",
      status = "status",
      type = "type",
      tag = "tag"
    }

    export enum CommunityEditableFields {
      name = "name",
      type = "type",
      category = "category",
      email = "email",
      recruitment_status = "recruitment_status",
      recruitment_link = "recruitment_link",
      description = "description",
      established = "established",
      head = "head",
      telegram_url = "telegram_url",
      instagram_url = "instagram_url"
    }


    export interface EventPermissions {
      can_edit: boolean;
      can_delete: boolean;
      editable_fields: EventEditableFields[]
    }

    export interface CommunityPermissions {
      can_edit: boolean;
      can_delete: boolean;
      editable_fields: CommunityEditableFields[]
    }

    export interface Community {
      id: number;
      name: string;
      type: CommunityType;
      category: CommunityCategory;
      email?: string;
      recruitment_status: CommunityRecruitmentStatus;
      recruitment_link: string;
      description: string;
      head: string;
      established: string;
      telegram_url: string;
      instagram_url: string;
      created_at: string;
      updated_at: string;
      head_user: HeadUser;
      media: Media[];
      permissions: CommunityPermissions;

    }

    export interface Tag {
      id: number;
      community_id: number;
      name: string;
      created_at: string;
      updated_at: string;
    }

    export enum Scope {
      personal = "personal",
      community = "community"
    }

    export interface Post {
      id: number;
      community_id: number;
      user_sub: string;
      title: string;
      description: string;
      tag_id?: number;
      created_at: string;
      updated_at: string;
      from_community: Scope;
      media?: Media[];
      user: HeadUser;
      total_comments: number;
      tag: Tag;
      permissions: EventPermissions;
    }

    // Post creation request and response types
    export interface CommunityPostRequest {
      community_id: number;
      title: string;
      description: string;
      tag_id?: number;
    }

    export interface CommunityPostResponse {
      id: number;
      community_id: number;
      user_sub: string;
      title: string;
      description: string;
      tag_id?: number;
      created_at: string;
      updated_at: string;
      from_community: boolean;
      media?: Media[];
      user: HeadUser;
      total_comments: number;
      tag: Tag;
      permissions: CommunityPermissions;
    }

    export interface ListCommunityPostResponse {
      posts: Post[];
      total_pages: number;
    }
    

    export enum EventStatus {
      approved = "approved",
      pending = "pending",
      rejected = "rejected",
      cancelled = "cancelled"
    }
    
    export enum EventTag {
      featured = "featured",
      promotional = "promotional",
      regular = "regular",
      charity = "charity"
    }
    
    export enum EventType {
      academic = "academic",
      professional = "professional",
      recreational = "recreational",
      cultural = "cultural",
      sports = "sports",
      social = "social",
      art = "art"
    }

    export interface Event {
      id: number;
      community_id: number;
      creator_sub: string;
      policy: EventPolicy;
      registration_link?: string;
      name: string;
      place: string;
      event_datetime: string;
      description: string;
      duration: number;
      scope: Scope;
      type: EventType;
      status: EventStatus;
      tag: EventTag;
      created_at: string;
      updated_at: string;
      media: Media[];
      community?: Community;
      creator?: HeadUser;
      permissions?: EventPermissions;
    }

    export interface CreateEventData {
      community_id?: number;
      creator_sub: string;
      policy: EventPolicy;
      registration_link?: string;
      name: string;
      place: string;
      event_datetime: string;
      description: string;
      duration: number;
      type: EventType;
    }

    //no id, community_id, creator_sub, permissions, media, community, creator
    export interface EditEventData {
      name?: string;
      place?: string;
      event_datetime?: string;
      description?: string;
      duration?: number;
      policy?: EventPolicy;
      registration_link?: string;
      status?: EventStatus;
      type?: EventType;
      tag?: EventTag;
    }

    export interface CreateCommunityData {
      name: string;
      type: CommunityType;
      category: CommunityCategory;
      email?: string;
      recruitment_status: CommunityRecruitmentStatus;
      recruitment_link?: string;
      description: string;
      established: string;
      head: string;
      telegram_url?: string;
      instagram_url?: string;
    }

    export interface EditCommunityData {
      name?: string;
      email?: string;
      established?: string;
      recruitment_status?: CommunityRecruitmentStatus;
      recruitment_link?: string;
      description?: string;
      telegram_url?: string;
      instagram_url?: string;
    }