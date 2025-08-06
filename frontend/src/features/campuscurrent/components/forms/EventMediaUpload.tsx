// src/features/campuscurrent/components/forms/EventMediaUpload.tsx
import { MediaUploadZone } from '@/components/organisms/media';
import { useMediaSelection } from '@/features/media/hooks/useMediaSelection';
import { useMediaUploadContext } from '@/context/MediaUploadContext';
import { useMediaEdit } from '@/features/media/hooks/useMediaEdit';
import { useEventForm } from '../../../../context/EventFormContext';

export function EventMediaUpload() {
  const { isEditMode } = useEventForm();
  const { isUploading } = useMediaUploadContext();
  const { handleMediaDelete } = useMediaEdit();
  const mediaSelection = useMediaSelection();

  return (
    <MediaUploadZone
      // Core functionality
      items={mediaSelection.previewMedia}
      onItemsChange={() => {}} // Handled by mediaSelection hook
      onRemove={isEditMode ? handleMediaDelete : mediaSelection.removeNewMedia}
      title="Event main poster"
      // Drag & drop
      isDragging={mediaSelection.isDragging}
      onDragOver={mediaSelection.handleDragOver}
      onDragLeave={mediaSelection.handleDragLeave}
      onDrop={mediaSelection.handleDrop}
      onFileSelect={mediaSelection.handleFileSelect}
      
      // Upload state
      isUploading={isUploading}
      
      // Customization
      label="Event Images"
      showLabel={true}
      enablePreview={true}
      
      // Component-specific props
      dropZoneProps={{
        maxSizeText: "PNG, JPG, GIF up to 10MB",
        variant: "default"
      }}
      
      galleryProps={{
        animateEntrance: true,
        columns: 3
      }}
    />
  );
}