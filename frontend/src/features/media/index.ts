// Unified Media System - Main Export File

export {
  UnifiedMediaProvider,
  useUnifiedMediaContext,
  type MediaConfig,
  type MediaState,
  type MediaActions,
  type UnifiedMediaContextType,
} from "./context/unified-media-context";

export { useUnifiedMedia, type UnifiedMediaHookReturn } from "./hooks/use-unified-media";

export {
  UnifiedMediaUploadZone,
  type UnifiedMediaUploadZoneProps,
} from "@/components/organisms/media/unified-media-upload-zone";

export {
  MEDIA_CONFIGS,
  getMediaConfig,
  createCustomMediaConfig,
  type MediaConfigKey,
} from "./config/media-configs";

export { UnifiedEventMediaUpload } from "@/features/events/components/unified-event-media-upload";

export type { UploadMediaOptions } from "./types/types";
