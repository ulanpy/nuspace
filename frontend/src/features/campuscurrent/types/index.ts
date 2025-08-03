

export interface HeadUser {
  sub: string;
  name: string;
  surname: string;
  picture: string;
}

export interface Club {
  id: number;
  name: string;
  type:
    | "academic"
    | "professional"
    | "recreational"
    | "cultural"
    | "sports"
    | "social"
    | "art"
    | "technology";
  description: string;
  president_name: string;
  telegram_url: string;
  instagram_url: string;
  created_at: string;
  updated_at: string;
  media: Media[];
  members: number;
  followers: number;
  isFollowing: boolean;
}

export interface EventStatus {
  approved: "approved";
  pending: "pending";
  rejected: "rejected";
  cancelled: "cancelled";
}

export interface EventTag {
  featured: "featured";
  promotional: "promotional";
  regular: "regular";
  charity: "charity";
}

export interface EventType {
  academic: "academic";
  professional: "professional";
  recreational: "recreational";
  cultural: "cultural";
  sports: "sports";
  social: "social";
  art: "art";
}

export interface Event {
  id: number;
  community_id: number;
  creator_sub: string;
  policy: "open" | "free_ticket" | "paid_ticket";
  name: string;
  place: string;
  event_datetime: string;
  description: string;
  duration: number;
  scope: "personal" | "community";
  type: EventType;
  status: EventStatus;
  tag: EventTag;
  created_at: string;
  updated_at: string;
  media: Media[];
  club?: Club;
  creator?: CampusCurrent.HeadUser;
  permissions?: CampusCurrent.Permissions;
}

export interface Media {
  id: number;
  url: string;
}
