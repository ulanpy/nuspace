import React, { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/atoms/button";
import { Label } from "@/components/atoms/label";
import { Progress } from "@/components/atoms/progress";
import { 
  ImageIcon, 
  Upload, 
  X, 
  Star, 
  Eye, 
  MoreHorizontal,
  RefreshCw,
  CheckCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/atoms/dropdown-menu";
import { useUnifiedMedia } from "@/features/media/hooks/useUnifiedMedia";
import { MediaItem } from "@/features/media/types/media";

export interface UnifiedMediaUploadZoneProps {
  // Core props
  label?: string;
  title?: string;
  description?: string;
  
  // Layout options
  layout?: 'vertical' | 'horizontal' | 'grid';
  spacing?: 'tight' | 'normal' | 'loose';
  
  // Gallery options
  columns?: 'auto' | 2 | 3 | 4 | 5 | 6;
  aspectRatio?: 'square' | 'video' | 'auto';
  showMainIndicator?: boolean;
  enablePreview?: boolean;
  enableReordering?: boolean;
  
  // Drop zone options
  dropZoneVariant?: 'default' | 'compact' | 'minimal';
  showDropZoneWhenHasItems?: boolean;
  
  // Progress options
  showProgress?: boolean;
  progressVariant?: 'inline' | 'overlay' | 'standalone';
  
  // Callbacks
  onPreview?: (index: number, item: MediaItem) => void;
  onSetMain?: (index: number, item: MediaItem) => void;
  onReorder?: (oldIndex: number, newIndex: number) => void;
  
  // Custom actions
  customActions?: Array<{
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    onClick: (index: number, item: MediaItem) => void;
    variant?: 'default' | 'destructive';
    showInHover?: boolean;
    showInDropdown?: boolean;
  }>;
  
  // Styling
  className?: string;
  dropZoneClassName?: string;
  galleryClassName?: string;
  progressClassName?: string;
}

export function UnifiedMediaUploadZone({
  label,
  title = "Upload files",
  description,
  layout = 'vertical',
  spacing = 'normal',
  columns = 'auto',
  aspectRatio = 'square',
  showMainIndicator = true,
  enablePreview = true,
  // enableReordering = false,
  dropZoneVariant = 'default',
  showDropZoneWhenHasItems = true,
  showProgress = true,
  progressVariant = 'standalone',
  onPreview,
  onSetMain,
  // onReorder,
  customActions = [],
  className = "",
  dropZoneClassName = "",
  galleryClassName = "",
  progressClassName = "",
}: UnifiedMediaUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    previewMedia,
    originalMedia,
    isUploading,
    uploadProgress,
    isDragging,
    currentIndex,
    handleFileSelect,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    removeMedia,
    canAddMoreFiles,
    setCurrentMediaIndex,
    getTotalMediaCount,
    maxFiles,
    recommendedAspectRatio,
    recommendedDimensions,
    recommendedNote,
  } = useUnifiedMedia();

  // Normalize items for consistent handling
  const normalizedItems: MediaItem[] = previewMedia.map((url, index) => {
    if (index < originalMedia.length) {
      return { ...originalMedia[index], url };
    }
    return { id: `new-${index}`, url, type: 'image' as const };
  });

  const shouldShowDropZone = canAddMoreFiles() && (!isUploading && (showDropZoneWhenHasItems || normalizedItems.length === 0));
  const shouldShowGallery = normalizedItems.length > 0;
  const shouldShowProgress = showProgress && (isUploading || uploadProgress > 0);

  // Styling helpers
  const getSpacingClass = () => {
    switch (spacing) {
      case 'tight': return 'space-y-2';
      case 'loose': return 'space-y-6';
      default: return 'space-y-4';
    }
  };

  const getLayoutClass = () => {
    if (layout === 'horizontal') return 'flex gap-4 items-start';
    if (layout === 'grid') return 'grid grid-cols-1 lg:grid-cols-2 gap-4';
    return getSpacingClass();
  };

  const getGridColumns = () => {
    if (columns === 'auto') return 'grid-cols-3 sm:grid-cols-4';
    return `grid-cols-${Math.min(columns, 3)} sm:grid-cols-${columns}`;
  };

  const getAspectRatio = () => {
    switch (aspectRatio) {
      case 'video': return 'aspect-video';
      case 'auto': return '';
      default: return 'aspect-square';
    }
  };

  const getDropZoneSize = () => {
    switch (dropZoneVariant) {
      case 'compact': return 'p-4';
      case 'minimal': return 'p-2';
      default: return 'p-8';
    }
  };

  // Handlers
  const handleFileInputClick = () => {
    if (!isUploading && canAddMoreFiles()) {
      fileInputRef.current?.click();
    }
  };

  const handleRemove = (index: number) => {
    removeMedia(index);
  };

  const handleSetMain = (index: number, item: MediaItem) => {
    setCurrentMediaIndex(index);
    onSetMain?.(index, item);
  };

  const handlePreviewClick = (index: number, item: MediaItem) => {
    setCurrentMediaIndex(index);
    onPreview?.(index, item);
  };

  // Progress component
  const renderProgress = () => {
    if (!shouldShowProgress) return null;

    const getProgressIcon = () => {
      if (isUploading) return <RefreshCw className="h-4 w-4 animate-spin" />;
      if (uploadProgress === 100) return <CheckCircle className="h-4 w-4 text-green-500" />;
      if (uploadProgress > 0) return <Upload className="h-4 w-4" />;
      return null;
    };

    const progressContent = (
      <div className="flex items-center gap-2">
        {getProgressIcon()}
        <div className="flex-1">
          <Progress value={uploadProgress} className="h-2" />
        </div>
        <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
      </div>
    );

    if (progressVariant === 'overlay' && shouldShowGallery) {
      return (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="w-full max-w-xs">{progressContent}</div>
        </div>
      );
    }

    return (
      <div className={`${progressClassName}`}>
        {progressContent}
      </div>
    );
  };

  // Drop zone component
  const renderDropZone = () => {
    if (!shouldShowDropZone) return null;

    return (
      <motion.div
        className={`relative border-2 rounded-lg cursor-pointer transition-all duration-300 overflow-hidden group ${
          isUploading 
            ? "border-muted-foreground/10 bg-muted/5 cursor-not-allowed"
            : isDragging 
              ? "border-primary bg-primary/5 scale-[1.02]" 
              : "border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5"
        } ${getDropZoneSize()} ${dropZoneClassName}`}
        onDragOver={!isUploading ? handleDragOver : undefined}
        onDragLeave={!isUploading ? handleDragLeave : undefined}
        onDrop={!isUploading ? handleDrop : undefined}
        onClick={handleFileInputClick}
        whileHover={!isUploading ? { scale: 1.01 } : {}}
        whileTap={!isUploading ? { scale: 0.99 } : {}}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={maxFiles !== 1}
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading || !canAddMoreFiles()}
        />

        <div className="flex flex-col items-center justify-center text-center">
          <motion.div
            className={`rounded-full p-3 mb-3 ${
              isDragging ? "bg-primary/10" : "bg-muted/50 group-hover:bg-primary/10"
            }`}
            animate={{ 
              scale: isDragging ? 1.1 : 1,
              rotate: isDragging ? 5 : 0 
            }}
          >
            <ImageIcon className={`h-6 w-6 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
          </motion.div>

          <h3 className="font-medium text-foreground mb-1">
            {title}
          </h3>
          
          {description && (
            <p className="text-sm text-muted-foreground mb-2">
              {description}
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Drag & drop files here or click to browse{typeof maxFiles === 'number' ? ` (max ${maxFiles} ${maxFiles === 1 ? 'image' : 'files'})` : ''}
          </p>
          {(recommendedAspectRatio || recommendedDimensions || recommendedNote) && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Recommended{recommendedAspectRatio ? `: ${recommendedAspectRatio}` : ''}{recommendedDimensions ? `${recommendedAspectRatio ? ' · ' : ': '} ${recommendedDimensions}` : ''}{recommendedNote ? `${recommendedAspectRatio || recommendedDimensions ? ' · ' : ': '} ${recommendedNote}` : ''}
            </p>
          )}
        </div>

        {isDragging && (
          <motion.div
            className="absolute inset-0 border-2 border-primary rounded-lg bg-primary/5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </motion.div>
    );
  };

  // Gallery component
  const renderGallery = () => {
    if (!shouldShowGallery) return null;

    return (
      <div className={`relative ${galleryClassName}`}>
        <div className={`grid ${getGridColumns()} gap-3`}>
          <AnimatePresence mode="popLayout">
            {normalizedItems.map((item, index) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={`relative ${getAspectRatio()} rounded-lg overflow-hidden group bg-muted`}
              >
                {/* Media Content */}
                {item.type === 'video' ? (
                  <video
                    src={item.url}
                    className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-110"
                    muted
                    playsInline
                  />
                ) : (
                  <img
                    src={item.url || "/placeholder.svg"}
                    alt={item.name || `Media ${index + 1}`}
                    className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-110"
                    loading="lazy"
                  />
                )}

                {/* Main indicator */}
                {showMainIndicator && index === currentIndex && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 z-10"
                  >
                    <Star className="h-3 w-3 fill-current" />
                    Main
                  </motion.div>
                )}

                {/* Hover overlay with actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                  <div className="flex gap-2">
                    {/* Preview action */}
                    {enablePreview && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreviewClick(index, item);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Set main action */}
                    {showMainIndicator && index !== currentIndex && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetMain(index, item);
                        }}
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Custom actions dropdown */}
                    {customActions.length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {customActions.map((action) => {
                            const IconComponent = action.icon;
                            return (
                              <DropdownMenuItem
                                key={action.id}
                                onClick={() => action.onClick(index, item)}
                                className={action.variant === 'destructive' ? 'text-destructive focus:text-destructive' : ''}
                              >
                                <IconComponent className="h-4 w-4 mr-2" />
                                {action.label}
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>

                {/* Quick remove button */}
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 h-6 w-6 p-0 opacity-80 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-30"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(index);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Progress overlay */}
        {progressVariant === 'overlay' && renderProgress()}
      </div>
    );
  };

  return (
    <div className={`${getLayoutClass()} ${className}`}>
      {(label || typeof maxFiles === 'number') && (
        <div className="flex items-center justify-between mb-2">
          {label && (
            <Label className="text-base font-semibold">
              {label}
            </Label>
          )}
          {typeof maxFiles === 'number' && (
            <span className="text-xs text-muted-foreground">
              {getTotalMediaCount()} of {maxFiles}
            </span>
          )}
        </div>
      )}
      
      {/* Main content based on layout */}
      {layout === 'horizontal' ? (
        <div className="flex gap-4 flex-1">
          <div className="flex-1 min-w-0">
            {renderDropZone()}
          </div>
          {shouldShowGallery && (
            <div className="flex-1 min-w-0">
              {renderGallery()}
            </div>
          )}
        </div>
      ) : (
        <>
          {renderDropZone()}
          {renderGallery()}
        </>
      )}
      {maxFiles === 1 && getTotalMediaCount() >= 1 && (
        <p className="text-xs text-muted-foreground mt-2">
          Only one image is allowed. Remove the current image to upload another.
        </p>
      )}
      
      {/* Standalone progress */}
      {progressVariant === 'standalone' && renderProgress()}
    </div>
  );
}
