"use client";

import { forwardRef, useEffect, useImperativeHandle } from "react";
import { UnifiedMediaProvider, useUnifiedMediaContext } from "@/features/media/context/unified-media-context";
import { UnifiedMediaUploadZone } from "@/components/organisms/media/unified-media-upload-zone";
import { useUnifiedMedia } from "@/features/media/hooks/use-unified-media";
import { getMediaConfig } from "@/features/media/config/media-configs";
import { useEventForm } from "@/context/event-form-context";
import { EntityType } from "@/features/media/types/types";

export type EventUploadHandle = {
  upload: (entityId: number) => Promise<boolean>;
  getMarkedForDeletion: () => number[];
  clearMarkedForDeletion: () => void;
  hasPending: () => boolean;
};

const EventMediaUploadBridge = forwardRef<EventUploadHandle>(function EventMediaUploadBridge(_, ref) {
  const { isEditMode, event } = useEventForm();
  const { uploadFiles, initializeExistingMedia, mediaFiles, mediaToDelete } = useUnifiedMedia();
  const { config, unmarkForDeletion } = useUnifiedMediaContext();

  useEffect(() => {
    if (isEditMode && event && Array.isArray(event.media) && event.media.length > 0) {
      initializeExistingMedia(
        event.media.map((item) => ({
          id: item.id,
          url: item.url,
        })),
      );
    }
  }, [isEditMode, event, initializeExistingMedia]);

  useImperativeHandle(ref, () => ({
    upload: async (entityId: number) => {
      if (mediaFiles.length === 0) {
        return true;
      }

      return uploadFiles({
        entity_type: EntityType.community_events,
        entityId,
        mediaFormat: config.mediaFormat,
        startOrder: isEditMode ? event?.media?.length ?? 0 : 0,
      });
    },
    getMarkedForDeletion: () => mediaToDelete,
    clearMarkedForDeletion: () => {
      mediaToDelete.forEach((id) => unmarkForDeletion(id));
    },
    hasPending: () => mediaFiles.length > 0 || mediaToDelete.length > 0,
  }));

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
    />
  );
});

export const UnifiedEventMediaUpload = forwardRef<EventUploadHandle>(
  function UnifiedEventMediaUpload(_, ref) {
    const config = getMediaConfig("campusCurrentEvents");

    return (
      <UnifiedMediaProvider config={config}>
        <EventMediaUploadBridge ref={ref} />
      </UnifiedMediaProvider>
    );
  },
);
