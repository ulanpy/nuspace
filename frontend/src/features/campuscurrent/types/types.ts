export {};

declare global {

namespace CampusCurrent {
    interface Media {
      id: number;
      url: string;
    }
    type ClubType =
      | "academic"
      | "professional"
      | "recreational"
      | "cultural"
      | "sports"
      | "social"
      | "art"
      | "technology";
    interface HeadUser {
      sub: string;
      name: string;
      surname: string;
      picture: string;
    }

    interface Permissions {
      can_edit: boolean;
      can_delete: boolean;
      editable_fields: string[];
    }
    interface Club {
      id: number;
      name: string;
      type: ClubType;
      category: string;
      recruitment_status: string;
      description: string;
      head: string;
      established: string;
      telegram_url: string;
      instagram_url: string;
      created_at: string;
      updated_at: string;
      head_user: HeadUser;
      media: Media[];
      permissions: Permissions;
      members: number;
      followers: number;
      isFollowing: boolean;
    }

    interface Tag {
      id: number;
      community_id: number;
      name: string;
      created_at: string;
      updated_at: string;
    }


    interface Post {
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
      permissions: Permissions;
    }

    // Post creation request and response types
    interface CommunityPostRequest {
      community_id: number;
      title: string;
      description: string;
      tag_id?: number;
    }

    interface CommunityPostResponse {
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
      permissions: Permissions;
    }

    interface ListCommunityPostResponse {
      posts: Post[];
      num_of_pages: number;
    }
    
    type EventPolicy = "all" | "open" | "free_ticket" | "paid_ticket";
    interface Event {
      id: number;
      club_id: number;
      name: string;
      place: string;
      description: string;
      duration: number;
      event_datetime: string;
      policy: EventPolicy;
      created_at: string;
      updated_at: string;
      media: Media[];
      club?: Club;
      rating?: number; // Mock rating for UI
    }
  }
}