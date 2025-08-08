import { useEffect } from "react";
import { UnifiedMediaProvider } from "@/features/media/context/UnifiedMediaContext";
import { UnifiedMediaUploadZone } from "@/components/organisms/media/UnifiedMediaUploadZone";
import { useUnifiedMedia } from "@/features/media/hooks/useUnifiedMedia";
import { getMediaConfig } from "@/features/media/config/mediaConfigs";
import { useEventForm } from "@/context/EventFormContext";
import { useMediaUploadContext } from "@/context/MediaUploadContext";
import { useMediaEditContext } from "@/context/MediaEditContext";

// Bridge component to connect unified system with legacy contexts
function EventMediaUploadBridge() {
  const { isEditMode } = useEventForm();
  const { setPreviewMedia, setMediaFiles, setIsUploading } = useMediaUploadContext();
  const { originalMedia, setOriginalMedia, setMediaToDelete } = useMediaEditContext();
  
  const {
    previewMedia,
    mediaFiles,
    isUploading,
    initializeExistingMedia,
    uploadFiles,
    deleteMarkedMedia,
    mediaToDelete,
  } = useUnifiedMedia();

  // Sync with legacy contexts
  useEffect(() => {
    setPreviewMedia(previewMedia);
  }, [previewMedia, setPreviewMedia]);

  useEffect(() => {
    setMediaFiles(mediaFiles);
  }, [mediaFiles, setMediaFiles]);

  useEffect(() => {
    setIsUploading(isUploading);
  }, [isUploading, setIsUploading]);

  useEffect(() => {
    setMediaToDelete(mediaToDelete);
  }, [mediaToDelete, setMediaToDelete]);

  // Initialize existing media in edit mode
  useEffect(() => {
    if (isEditMode && originalMedia.length > 0) {
      initializeExistingMedia(originalMedia);
    }
  }, [isEditMode, originalMedia, initializeExistingMedia]);

  return (
    <UnifiedMediaUploadZone
      label="Event Images"
      title="Upload event images"
      description="Add images to showcase your event"
      layout="vertical"
      columns={3}
      showMainIndicator={true}
      enablePreview={true}
      enableReordering={false}
      showDropZoneWhenHasItems={true}
      dropZoneVariant="default"
      progressVariant="standalone"
      customActions={[
        {
          id: 'optimize',
          label: 'Optimize Image',
          icon: ({ className }) => <span className={className}>🎨</span>,
          onClick: (index, item) => {
            console.log('Optimize image:', index, item);
          },
          showInDropdown: true,
        }
      ]}
    />
  );
}

export function UnifiedEventMediaUpload() {
  const config = getMediaConfig('campusCurrentEvents');

  return (
    <UnifiedMediaProvider config={config}>
      <EventMediaUploadBridge />
    </UnifiedMediaProvider>
  );
}
