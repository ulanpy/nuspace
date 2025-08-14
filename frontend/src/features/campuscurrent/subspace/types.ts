import type { Media } from "@/features/media/types/types";
import type { HeadUser } from "@/features/campuscurrent/types/types";

export type Tag = {
  id: number;
  community_id: number;
  name: string;
  created_at: string;
  updated_at: string;
};

export type CommunitySummary = {
  id: number;
  name: string;
  description: string;
  media: Media[];
};

export enum PostEditableFields {
    title = "title",
    description = "description",
    tag = "tag",
}

export interface PostPermissions {
    can_edit: boolean;
    can_delete: boolean;
    editable_fields: PostEditableFields[]
  }

export type SubspacePost = {
  id: number;
  community_id: number;
  user_sub: string;
  title: string;
  description: string;
  tag_id?: number | null;
  created_at: string;
  updated_at: string;
  from_community: boolean;
  media?: Media[];
  user: HeadUser;
  total_comments: number;
  tag?: Tag | null;
  community: CommunitySummary;
  permissions: PostPermissions;
};

export type CreatePostData = {
  community_id: number;
  user_sub?: string; // backend accepts "me"
  title: string;
  description: string;
  tag_id?: number | null;
  from_community?: boolean | null;
};

export type UpdatePostData = {
  title?: string;
  description?: string;
  tag_id?: number | null;
};
