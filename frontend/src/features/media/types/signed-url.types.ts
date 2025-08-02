export interface SignedUrlRequest {
    entity_type: string;
    entity_id: number;
    media_format: string;
    media_order: number;
    mime_type: string;
    content_type: string;
  }
  
  export interface SignedUrlResponse {
    filename: string;
    upload_url: string;
    entity_type: string;
    entity_id: number;
    media_format: string;
    media_order: number;
    mime_type: string;
  }
  