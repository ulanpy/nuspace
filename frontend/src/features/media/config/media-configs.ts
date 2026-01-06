import { EntityType, MediaFormat } from "@/features/media/types/types";
import { MediaConfig } from '@/features/media/context/unified-media-context';

export const MEDIA_CONFIGS = {
  // Campus Current Events
  campusCurrentEvents: {
    entityType: EntityType.community_events,
    mediaFormat: MediaFormat.carousel,
    maxFiles: 1,
    maxFileSize: 10, // MB
    allowedTypes: ['image/png', 'image/jpg', 'image/jpeg', 'image/webp'],
    enableMainSelection: true,
    enablePreview: true,
    enableReordering: true,
    recommendedAspectRatio: "3:4",
    recommendedDimensions: "min 1080x1440",
    recommendedNote: "Portrait poster fits best on event cards.",
  } as MediaConfig,

  // Community Profile Images
  communityProfiles: {
    entityType: EntityType.communities,
    mediaFormat: MediaFormat.profile,
    maxFiles: 1,
    maxFileSize: 10, // MB
    allowedTypes: ['image/png', 'image/jpg', 'image/jpeg', 'image/webp'],
    enableMainSelection: false,
    enablePreview: true,
    enableReordering: false,
    recommendedAspectRatio: "1:1",
    recommendedDimensions: "min 512x512",
    recommendedNote: "Center face/logo; used as a round avatar.",
  } as MediaConfig,

  // Community Banner Images

  // Community Banner Images
  communityBanners: {
    entityType: EntityType.communities,
    mediaFormat: MediaFormat.banner,
    maxFiles: 1,
    maxFileSize: 10, // MB
    allowedTypes: ['image/png', 'image/jpg', 'image/jpeg', 'image/webp'],
    enableMainSelection: false,
    enablePreview: true,
    enableReordering: false,
    recommendedAspectRatio: "16:9",
    recommendedDimensions: "min 1920x1080",
    recommendedNote: "Wide banner used as cover; avoid important text near edges.",
  } as MediaConfig,

  // Community Posts
  communityPosts: {
    entityType: EntityType.community_posts,
    mediaFormat: MediaFormat.carousel,
    maxFiles: 5,
    maxFileSize: 8, // MB
    allowedTypes: ['image/png', 'image/jpg', 'image/jpeg', 'image/webp', 'image/gif'],
    enableMainSelection: false,
    enablePreview: true,
    enableReordering: false,
    recommendedAspectRatio: "1:1",
    recommendedDimensions: "min 1080x1080",
  } as MediaConfig,

  // Reviews
  reviews: {
    entityType: EntityType.reviews,
    mediaFormat: MediaFormat.carousel,
    maxFiles: 3,
    maxFileSize: 3, // MB
    allowedTypes: ['image/png', 'image/jpg', 'image/jpeg', 'image/webp'],
    enableMainSelection: false,
    enablePreview: true,
    enableReordering: false,
  } as MediaConfig,

  // Profile Avatars (single image)Config
  profileAvatars: {
    entityType: EntityType.communities,
    mediaFormat: MediaFormat.carousel,
    maxFiles: 1,
    maxFileSize: 1, // MB
    allowedTypes: ['image/png', 'image/jpg', 'image/jpeg', 'image/webp'],
    enableMainSelection: false,
    enablePreview: false,
    enableReordering: false,
    recommendedAspectRatio: "1:1",
    recommendedDimensions: "min 256x256",
  } as MediaConfig,
} as const;

export type MediaConfigKey = keyof typeof MEDIA_CONFIGS;

export function getMediaConfig(key: MediaConfigKey): MediaConfig {
  return MEDIA_CONFIGS[key];
}

export function createCustomMediaConfig(base: MediaConfigKey, overrides: Partial<MediaConfig>): MediaConfig {
  return {
    ...MEDIA_CONFIGS[base],
    ...overrides,
  };
}
