import { useState, useMemo } from "react";
import { Label } from "@/components/atoms/label";
import { MediaDropZone, MediaDropZoneProps } from "./MediaDropZone";
import { MediaGallery, MediaGalleryProps, MediaItem, MediaAction } from "./MediaGallery";
import { MediaUploadProgress, MediaUploadProgressProps } from "./MediaUploadProgress";
import { MediaPreview } from "./MediaPreview";

export interface MediaUploadZoneProps {
  // Core functionality
  items: MediaItem[] | string[];
  onItemsChange: (items: MediaItem[] | string[]) => void;
  onRemove: (index: number, item?: MediaItem) => void;
  
  // Upload handling
  isDragging: boolean;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  
  // Upload progress
  isUploading?: boolean;
  uploadProgress?: number;
  uploadStatus?: MediaUploadProgressProps['status'];
  
  // Customization
  label?: string;
  showLabel?: boolean;
  title?: string;
  
  // DropZone props
  dropZoneProps?: Partial<Omit<MediaDropZoneProps, 'title' | 'isDragging' | 'onDragOver' | 'onDragLeave' | 'onDrop' | 'onFileSelect'>>;
  
  // Gallery props  
  galleryProps?: Partial<Omit<MediaGalleryProps, 'items' | 'onRemove'>>;
  
  // Progress props
  progressProps?: Partial<Omit<MediaUploadProgressProps, 'isUploading' | 'progress' | 'status'>>;
  
  // Preview
  enablePreview?: boolean;
  
  // Layout
  layout?: 'vertical' | 'horizontal';
  spacing?: 'tight' | 'normal' | 'loose';
  
  // Styling
  className?: string;
  
  // Callbacks
  onSetMain?: (index: number, item: MediaItem) => void;
  onPreview?: (index: number, item: MediaItem) => void;
  onDownload?: (item: MediaItem, index: number) => void;
  
  // Custom actions
  customActions?: MediaAction[];
}

const DEFAULT_PROPS = {
  showLabel: true,
  label: "Upload Media",
  isUploading: false,
  uploadProgress: 0,
  uploadStatus: 'idle' as const,
  enablePreview: true,
  layout: 'vertical' as const,
  spacing: 'normal' as const,
  className: "",
  customActions: []
};

export function MediaUploadZone(props: MediaUploadZoneProps) {
  const {
    items,
    onItemsChange,
    onRemove,
    isDragging,
    onDragOver,
    onDragLeave,
    onDrop,
    onFileSelect,
    title,
    isUploading = DEFAULT_PROPS.isUploading,
    uploadProgress = DEFAULT_PROPS.uploadProgress,
    uploadStatus = DEFAULT_PROPS.uploadStatus,
    label = DEFAULT_PROPS.label,
    showLabel = DEFAULT_PROPS.showLabel,
    dropZoneProps = {},
    galleryProps = {},
    progressProps = {},
    enablePreview = DEFAULT_PROPS.enablePreview,
    layout = DEFAULT_PROPS.layout,
    spacing = DEFAULT_PROPS.spacing,
    className = DEFAULT_PROPS.className,
    onSetMain,
    onPreview,
    onDownload,
    customActions = DEFAULT_PROPS.customActions
  } = props;

  const [previewIndex, setPreviewIndex] = useState<number>(-1);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Normalize items for consistent handling
  const normalizedItems: MediaItem[] = useMemo(() => {
    return items.map((item, index) => {
      if (typeof item === 'string') {
        return { id: index, url: item, type: 'image' as const };
      }
      return { ...item, id: item.id ?? index, type: item.type ?? 'image' };
    });
  }, [items]);

  const handlePreview = (index: number, item: MediaItem) => {
    setPreviewIndex(index);
    setIsPreviewOpen(true);
    onPreview?.(index, item);
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    setPreviewIndex(-1);
  };

  const handleNavigatePreview = (index: number) => {
    setPreviewIndex(index);
  };

  const getSpacingClass = () => {
    switch (spacing) {
      case 'tight':
        return 'space-y-2';
      case 'loose':
        return 'space-y-6';
      default:
        return 'space-y-4';
    }
  };

  const getLayoutClass = () => {
    if (layout === 'horizontal') {
      return 'flex gap-4 items-start';
    }
    return getSpacingClass();
  };

  // Combine gallery actions
  const galleryActions: MediaAction[] = [
    ...(enablePreview ? [{
      id: 'preview',
      label: 'Preview',
      icon: () => null, // Will use Eye icon from MediaGallery
      onClick: handlePreview,
      showInHover: true,
      showInDropdown: false
    }] : []),
    ...customActions
  ];

  const shouldShowDropZone = !isUploading && normalizedItems.length === 0;
  const shouldShowGallery = normalizedItems.length > 0;
  const shouldShowProgress = isUploading || uploadStatus !== 'idle';

  return (
    <div className={`${getLayoutClass()} ${className}`}>
      {/* Label */}
      {showLabel && (
        <Label className="text-base font-semibold">
          {label}
        </Label>
      )}
      
      {layout === 'horizontal' ? (
        <div className="flex gap-4 flex-1">
          {/* Drop zone - always visible in horizontal layout */}
          <div className="flex-1 min-w-0">
            <MediaDropZone
              title={title}
              isDragging={isDragging}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onFileSelect={onFileSelect}
              disabled={isUploading}
              variant="compact"
              {...dropZoneProps}
            />
          </div>
          
          {/* Gallery */}
          {shouldShowGallery && (
            <div className="flex-1 min-w-0">
              <MediaGallery
                items={normalizedItems}
                onRemove={onRemove}
                onSetMain={onSetMain}
                onPreview={enablePreview ? handlePreview : undefined}
                customActions={galleryActions}
                {...galleryProps}
              />
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Drop zone - conditional in vertical layout */}
          {shouldShowDropZone && (
            <MediaDropZone
              title={title}
              isDragging={isDragging}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onFileSelect={onFileSelect}
              disabled={isUploading}
              {...dropZoneProps}
            />
          )}
          
          {/* Gallery */}
          {shouldShowGallery && (
            <MediaGallery
              items={normalizedItems}
              onRemove={onRemove}
              onSetMain={onSetMain}
              onPreview={enablePreview ? handlePreview : undefined}
              customActions={galleryActions}
              {...galleryProps}
            />
          )}
        </>
      )}
      
      {/* Upload Progress */}
      {shouldShowProgress && (
        <MediaUploadProgress
          isUploading={isUploading}
          progress={uploadProgress}
          status={uploadStatus}
          variant={layout === 'horizontal' ? 'inline' : 'standalone'}
          {...progressProps}
        />
      )}
      
      {/* Preview Modal */}
      {enablePreview && (
        <MediaPreview
          items={normalizedItems}
          currentIndex={previewIndex}
          isOpen={isPreviewOpen}
          onClose={handleClosePreview}
          onNavigate={handleNavigatePreview}
          onDownload={onDownload}
        />
      )}
    </div>
  );
}

// Export default props for external reference
export { DEFAULT_PROPS as MediaUploadZoneDefaults };