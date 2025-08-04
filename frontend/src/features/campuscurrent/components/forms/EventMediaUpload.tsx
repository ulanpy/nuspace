import { Label } from '@/components/atoms/label';
import { MediaDropZone } from '@/features/kupi-prodai/components/media/MediaDropZone';
import { MediaGallery } from '@/features/kupi-prodai/components/media/MediaGallery';
import { useMediaSelection } from '@/features/media/hooks/useMediaSelection';
import { useMediaUploadContext } from '@/context/MediaUploadContext';
import { useMediaEdit } from '@/features/media/hooks/useMediaEdit';
import { useEventForm } from './EventFormProvider';

export function EventMediaUpload() {
  const { isEditMode } = useEventForm();
  const { isUploading } = useMediaUploadContext();
  const { handleMediaDelete } = useMediaEdit();
  
  const {
    previewMedia,
    isDragging,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    removeNewMedia,
    handleFileSelect,
  } = useMediaSelection();

  return (
    <div className="space-y-4">
      <Label className="text-base font-semibold">Event Images</Label>
      <MediaDropZone
        isDragging={isDragging}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onFileSelect={handleFileSelect}
        disabled={isUploading}
        maxSizeText="PNG, JPG, GIF up to 10MB"
      />
      
      {previewMedia.length > 0 && (
        <MediaGallery
          items={previewMedia}
          onRemove={isEditMode ? handleMediaDelete : removeNewMedia}
          showMainIndicator={false}
          animateEntrance={true}
        />
      )}
    </div>
  );
}