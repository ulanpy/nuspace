// Core components
export { MediaDropZone, MediaDropZoneDefaults } from './MediaDropZone';
export type { MediaDropZoneProps } from './MediaDropZone';

export { MediaGallery, MediaGalleryDefaults } from './MediaGallery';
export type { MediaGalleryProps, MediaItem, MediaAction } from './MediaGallery';

export { MediaUploadProgress, MediaUploadProgressDefaults } from './MediaUploadProgress';
export type { MediaUploadProgressProps } from './MediaUploadProgress';

export { MediaPreview, MediaPreviewDefaults } from './MediaPreview';
export type { MediaPreviewProps } from './MediaPreview';

// Composite component
export { MediaUploadZone, MediaUploadZoneDefaults } from './MediaUploadZone';
export type { MediaUploadZoneProps } from './MediaUploadZone';

// Re-export commonly used types for convenience
export type {
  MediaItem as MediaFileItem,
  MediaAction as MediaActionConfig
} from './MediaGallery';