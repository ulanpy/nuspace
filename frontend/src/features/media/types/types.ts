export interface Media {
    id: number;
    url: string;
    mime_type: string;
    entity_type: EntityType;
    entity_id: number;
    media_format: MediaFormat;
    media_order: number;
}


export enum MediaFormat {
    banner = "banner",
    carousel = "carousel",
    profile = "profile"
}

export enum EntityType {
    products = "products",
    community_events = "community_events",
    communities = "communities",
    community_posts = "community_posts",
    reviews = "reviews",
    community_comments = "community_comments"
}


export interface SignedUrlRequest {
    entity_type: EntityType;
    entity_id: number;
    media_format: MediaFormat;
    media_order: number;
    mime_type: string;
    content_type: string;
  }
  
  export interface SignedUrlResponse {
    filename: string;
    upload_url: string;
    entity_type: EntityType;
    entity_id: number;
    media_format: MediaFormat;
    media_order: number;
    mime_type: string;
  }


export interface UploadMediaOptions {
    entity_type: EntityType;
    entityId: number;
    mediaFormat: MediaFormat;
    startOrder?: number;
  }