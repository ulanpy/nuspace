// Unified Media System - Main Export File

// Context
export { 
  UnifiedMediaProvider, 
  useUnifiedMediaContext,
  type MediaConfig,
  type MediaState,
  type MediaActions,
  type UnifiedMediaContextType 
} from './context/unified-media-context';

// Hooks
export { 
  useUnifiedMedia,
  type UnifiedMediaHookReturn 
} from './hooks/use-unified-media';

// Components
export { 
  UnifiedMediaUploadZone,
  type UnifiedMediaUploadZoneProps 
} from '@/components/organisms/media/unified-media-upload-zone';

// Configuration
export { 
  MEDIA_CONFIGS,
  getMediaConfig,
  createCustomMediaConfig,
  type MediaConfigKey 
} from './config/media-configs';

// Feature-specific components
export { UnifiedEventMediaUpload } from '@/features/events/components/unified-event-media-upload';

// Legacy exports for backward compatibility (deprecated)
export { useMediaUpload } from './hooks/use-media-upload';
export { useMediaSelection } from './hooks/use-media-selection';
export { useMediaEdit } from './hooks/use-media-edit';

// Types
export type { UploadMediaOptions } from './types/types';
