"use client";

import { useEffect, forwardRef, useImperativeHandle } from "react";
import { UnifiedMediaProvider, useUnifiedMediaContext } from '@/features/media/context/unified-media-context';
import { UnifiedMediaUploadZone } from '@/components/organisms/media/unified-media-upload-zone';
import { useUnifiedMedia } from '@/features/media/hooks/use-unified-media';
import { getMediaConfig } from '@/features/media/config/media-configs';
import { useCommunityForm } from '@/context/community-form-context';
import { EntityType } from "@/features/media/types/types";
import { useCreateCommunity } from '@/features/communities/hooks/use-create-community';
import { useUpdateCommunity } from '@/features/communities/hooks/use-update-community';

export type CommunityUploadHandle = {
  upload: (entityId: number) => Promise<boolean>;
  deleteMarked: () => Promise<boolean>;
  hasPending: () => boolean;
};

// Bridge component that manages its own unified media state and exposes imperative actions
const CommunityMediaUploadBridge = forwardRef<CommunityUploadHandle, { type: 'communityProfiles' | 'communityBanners' }>(
  function CommunityMediaUploadBridge({ type }, ref) {
    const { isEditMode, community } = useCommunityForm();
    const { uploadFiles, deleteMarkedMedia, initializeExistingMedia, mediaFiles, mediaToDelete, isUploading } = useUnifiedMedia();
    const { config } = useUnifiedMediaContext();
    const { uploadProgress: createProgress } = useCreateCommunity();
    const { uploadProgress: updateProgress } = useUpdateCommunity();

    const { setProgress } = useUnifiedMediaContext();

    // Initialize existing media in edit mode from the community, filtered by the format this zone manages
    useEffect(() => {
      if (isEditMode && community && Array.isArray(community.media)) {
        const desiredFormat = config.mediaFormat; // profile or banner
        const existingForFormat = community.media
          .filter((m) => m.entity_type === EntityType.communities && m.media_format === desiredFormat)
          .map((m) => ({ id: m.id, url: m.url }));
        initializeExistingMedia(existingForFormat as any[]);
      }
    }, [isEditMode, community, config.mediaFormat, initializeExistingMedia]);

    useImperativeHandle(ref, () => ({
      upload: async (entityId: number) => {
        return uploadFiles({
          entity_type: EntityType.communities,
          entityId,
          mediaFormat: config.mediaFormat,
        });
      },
      deleteMarked: async () => {
        return deleteMarkedMedia();
      },
      hasPending: () => {
        return mediaFiles.length > 0 || mediaToDelete.length > 0;
      },
    }));

    // Mirror flow progress into unified context for consistent UI
    useEffect(() => {
      const progress = isEditMode ? updateProgress : createProgress;
      if (!isUploading) {
        setProgress(progress || 0);
      }
    }, [createProgress, updateProgress, isEditMode, setProgress, isUploading]);

    return (
      <UnifiedMediaUploadZone
        label={type === 'communityProfiles' ? "Community Profile Image" : "Community Banner Image"}
        title={type === 'communityProfiles' ? "Upload community profile image" : "Upload community banner image"}
        description={type === 'communityProfiles' ? "Add image to showcase your community" : "Add image to showcase your community"}
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
);

export const UnifiedCommunityMediaUpload = forwardRef<CommunityUploadHandle, { type: 'communityProfiles' | 'communityBanners' }>(
  function UnifiedCommunityMediaUpload({ type }, ref) {
    const config = getMediaConfig(type);
    return (
      <UnifiedMediaProvider config={config}>
        <CommunityMediaUploadBridge ref={ref} type={type} />
      </UnifiedMediaProvider>
    );
  }
);
