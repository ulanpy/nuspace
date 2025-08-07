import { EntityType, MediaFormat } from "@/features/media/types/types";
import { MediaConfig } from "@/features/media/context/UnifiedMediaContext";

export const MEDIA_CONFIGS = {
  // Campus Current Events
  campusCurrentEvents: {
    entityType: EntityType.community_events,
    mediaFormat: MediaFormat.carousel,
    maxFiles: 5,
    maxFileSize: 10, // MB
    allowedTypes: ['image/png', 'image/jpg', 'image/jpeg', 'image/webp'],
    enableMainSelection: true,
    enablePreview: true,
    enableReordering: true,
  } as MediaConfig,

  // Kupi-Prodai Products
  kupiProdaiProducts: {
    entityType: EntityType.products,
    mediaFormat: MediaFormat.carousel,
    maxFiles: 5,
    maxFileSize: 10, // MB
    allowedTypes: ['image/png', 'image/jpg', 'image/jpeg', 'image/webp'],
    enableMainSelection: true,
    enablePreview: true,
    enableReordering: true,
  } as MediaConfig,

  // Community Profile Images
  communityProfiles: {
    entityType: EntityType.communities,
    mediaFormat: MediaFormat.carousel,
    maxFiles: 1,
    maxFileSize: 2, // MB
    allowedTypes: ['image/png', 'image/jpg', 'image/jpeg'],
    enableMainSelection: false,
    enablePreview: true,
    enableReordering: false,
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
  } as MediaConfig,

  // Reviews
  reviews: {
    entityType: EntityType.reviews,
    mediaFormat: MediaFormat.carousel,
    maxFiles: 3,
    maxFileSize: 3, // MB
    allowedTypes: ['image/png', 'image/jpg', 'image/jpeg'],
    enableMainSelection: false,
    enablePreview: true,
    enableReordering: false,
  } as MediaConfig,

  // Profile Avatars (single image)
  profileAvatars: {
    entityType: EntityType.communities,
    mediaFormat: MediaFormat.carousel,
    maxFiles: 1,
    maxFileSize: 1, // MB
    allowedTypes: ['image/png', 'image/jpg', 'image/jpeg'],
    enableMainSelection: false,
    enablePreview: false,
    enableReordering: false,
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
