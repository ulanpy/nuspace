"use client";

import { useEffect } from "react";
import { UnifiedMediaProvider } from '@/features/media/context/unified-media-context';
import { UnifiedMediaUploadZone } from '@/components/organisms/media/unified-media-upload-zone';
import { useUnifiedMedia } from '@/features/media/hooks/use-unified-media';
import { useUnifiedMediaContext } from '@/features/media/context/unified-media-context';
import { getMediaConfig } from '@/features/media/config/media-configs';
import { useEventForm } from '@/context/event-form-context';
import { useMediaUploadContext } from '@/context/media-upload-context';
import { useMediaEditContext } from '@/context/media-edit-context';
import { useCreateEvent } from '@/features/events/hooks/use-create-event';
import { useUpdateEvent } from '@/features/events/hooks/use-update-event';

// Bridge component to connect unified system with legacy contexts
function EventMediaUploadBridge() {
  const { isEditMode } = useEventForm();
  const { setPreviewMedia, setMediaFiles, setIsUploading, isUploading: legacyIsUploading } = useMediaUploadContext();
  const { originalMedia, setMediaToDelete } = useMediaEditContext();
  const { uploadProgress: createProgress } = useCreateEvent();
  const { uploadProgress: updateProgress } = useUpdateEvent();
  
  const {
    previewMedia,
    mediaFiles,
    isUploading,
    initializeExistingMedia,
    mediaToDelete,
  } = useUnifiedMedia();

  const { setUploading, setProgress } = useUnifiedMediaContext();

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

  // Mirror legacy/flow progress into unified context
  useEffect(() => {
    setUploading(legacyIsUploading);
  }, [legacyIsUploading, setUploading]);

  useEffect(() => {
    const progress = isEditMode ? updateProgress : createProgress;
    if (!isUploading) {
      setProgress(progress || 0);
    }
  }, [createProgress, updateProgress, isEditMode, setProgress, isUploading]);

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
