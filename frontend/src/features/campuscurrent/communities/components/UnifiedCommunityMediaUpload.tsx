import React, { useEffect } from "react";
import { UnifiedMediaProvider } from "@/features/media/context/UnifiedMediaContext";
import { UnifiedMediaUploadZone } from "@/components/organisms/media/UnifiedMediaUploadZone";
import { useUnifiedMedia } from "@/features/media/hooks/useUnifiedMedia";
import { getMediaConfig } from "@/features/media/config/mediaConfigs";
import { useCommunityForm } from "@/context/CommunityFormContext";
import { useMediaUploadContext } from "@/context/MediaUploadContext";
import { useMediaEditContext } from "@/context/MediaEditContext";

// Bridge component to connect unified system with legacy contexts
function CommunityMediaUploadBridge() {
  const { isEditMode } = useCommunityForm();
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
      label="Community Images"
      title="Upload community images"
      description="Add images to showcase your community"
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

export function UnifiedCommunityMediaUpload() {
  const config = getMediaConfig('communityProfiles');

  return (
    <UnifiedMediaProvider config={config}>
      <CommunityMediaUploadBridge />
    </UnifiedMediaProvider>
  );
}
