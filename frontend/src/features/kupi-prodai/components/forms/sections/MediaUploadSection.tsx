import { motion } from "framer-motion";
import { Button } from "@/components/atoms/button";
import { ImageIcon } from "lucide-react";
import { MediaDropZone } from "../../media/MediaDropZone";
import { MediaGallery } from "../../media/MediaGallery";
import { UploadProgressIndicator } from "../../media/UploadProgressIndicator";
import { sectionVariants } from "@/utils/animationVariants";

interface MediaUploadSectionProps {
  mode: 'create' | 'edit';
  // For create mode
  previewMedia?: any[];
  isDragging?: boolean;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;
  onFileSelect?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveNewMedia?: (index: number) => void;
  // For edit mode
  existingImages?: { id: number; url: string; main: boolean }[];
  onSetMainImage?: (imageId: number) => void;
  onRemoveImage?: (imageId: number) => void;
  onUploadNewImage?: () => void;
  isUploading?: boolean;
}

export function MediaUploadSection({
  mode,
  previewMedia = [],
  isDragging = false,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
  onRemoveNewMedia,
  existingImages = [],
  onSetMainImage,
  onRemoveImage,
  onUploadNewImage,
  isUploading = false
}: MediaUploadSectionProps) {
  // Convert preview media to MediaGallery format
  const previewItems = previewMedia?.map((url, index) => ({
    id: index,
    url: url,
    name: `Image ${index + 1}`
  })) || [];

  // Convert existing images to MediaGallery format
  const existingItems = existingImages?.map(img => ({
    id: img.id,
    url: img.url,
    isMain: img.main
  })) || [];

  if (mode === 'create') {
    return (
      <motion.div className="space-y-4" variants={sectionVariants}>
        <label className="block text-sm font-medium text-foreground">
          Product Images
        </label>
        
        <MediaDropZone
          isDragging={isDragging || false}
          onDragOver={onDragOver!}
          onDragLeave={onDragLeave!}
          onDrop={onDrop!}
          onFileSelect={onFileSelect!}
          disabled={isUploading}
        />
        
        {previewItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.3 }}
          >
            <MediaGallery
              items={previewItems}
              onRemove={onRemoveNewMedia!}
              showMainIndicator={false}
              animateEntrance={true}
            />
          </motion.div>
        )}

        {isUploading && (
          <UploadProgressIndicator
            isUploading={isUploading}
            progress={0}
            status="uploading"
            variant="standalone"
            size="sm"
          />
        )}
      </motion.div>
    );
  }

  // Edit mode - show existing images with management controls
  return (
    <motion.div className="space-y-4" variants={sectionVariants}>
      <label className="block text-sm font-medium text-foreground">
        Product Images
      </label>
      
      <div className="space-y-4">
        {existingItems.length > 0 && (
          <MediaGallery
            items={existingItems}
            onRemove={(index) => {
              const imageId = existingImages![index]?.id;
              if (imageId && onRemoveImage) {
                onRemoveImage(imageId);
              }
            }}
            onSetMain={(index) => {
              const imageId = existingImages![index]?.id;
              if (imageId && onSetMainImage) {
                onSetMainImage(imageId);
              }
            }}
            showMainIndicator={true}
            showActions={true}
            animateEntrance={false}
          />
        )}

        {/* Add new image section */}
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
          <Button
            type="button"
            onClick={onUploadNewImage}
            disabled={isUploading}
            variant="outline"
            className="w-full"
          >
            {isUploading ? (
              <UploadProgressIndicator
                isUploading={isUploading}
                progress={0}
                status="uploading"
                variant="inline"
                size="sm"
                showPercentage={false}
              />
            ) : (
              <>
                <ImageIcon className="h-5 w-5 mr-2" />
                Add More Images
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}