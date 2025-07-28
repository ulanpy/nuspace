import { EntityType } from "./media-format.enum";

export interface UploadMediaOptions {
    entity_type: EntityType;
    entityId: number;
    mediaFormat: string;
    startOrder?: number;
  }