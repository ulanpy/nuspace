import { useEffect } from "react";
import { UnifiedMediaProvider } from "@/features/media/context/UnifiedMediaContext";
import { UnifiedMediaUploadZone } from "@/components/organisms/media/UnifiedMediaUploadZone";
import { useUnifiedMedia } from "@/features/media/hooks/useUnifiedMedia";
import { useUnifiedMediaContext } from "@/features/media/context/UnifiedMediaContext";
import { getMediaConfig } from "@/features/media/config/mediaConfigs";
import { useMediaUploadContext } from "@/context/MediaUploadContext";
import { useMediaEditContext } from "@/context/MediaEditContext";
import { useListingState } from "@/context/ListingContext";
import { Zap, Download } from "lucide-react";

// Bridge component to connect unified system with legacy contexts
function ProductMediaUploadBridge() {
  const { setPreviewMedia, setMediaFiles, setIsUploading, isUploading: legacyIsUploading } = useMediaUploadContext();
  const { originalMedia } = useMediaEditContext();
  const { uploadProgress } = useListingState();
  
  const {
    previewMedia,
    mediaFiles,
    isUploading,
    initializeExistingMedia,
    setMainMedia,
  } = useUnifiedMedia();

  // Access unified media context setters to mirror legacy progress into unified UI
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

  // Mirror legacy upload state into unified context so the zone shows consistent progress
  useEffect(() => {
    setUploading(legacyIsUploading);
  }, [legacyIsUploading, setUploading]);

  useEffect(() => {
    setProgress(uploadProgress || 0);
  }, [uploadProgress, setProgress]);

  // Initialize existing media
  useEffect(() => {
    if (originalMedia.length > 0) {
      initializeExistingMedia(originalMedia);
    }
  }, [originalMedia, initializeExistingMedia]);

  const handleOptimizeImage = (index: number, item: any) => {
    // TODO: Implement image optimization
    console.log('Optimizing image:', index, item);
  };

  const handleDownloadImage = (index: number, item: any) => {
    // Create download link
    const link = document.createElement('a');
    link.href = item.url;
    link.download = item.name || `image-${index + 1}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <UnifiedMediaUploadZone
      label="Product Images"
      title="Upload product images"
      description="Add high-quality images of your product"
      layout="vertical"
      columns={4}
      showMainIndicator={true}
      enablePreview={true}
      enableReordering={true}
      showDropZoneWhenHasItems={true}
      dropZoneVariant="default"
      progressVariant="standalone"
      onSetMain={(index, item) => {
        setMainMedia(index);
        console.log('Set main image:', index, item);
      }}
      customActions={[
        {
          id: 'optimize',
          label: 'Optimize',
          icon: Zap,
          onClick: handleOptimizeImage,
          showInDropdown: true,
        },
        {
          id: 'download',
          label: 'Download',
          icon: Download,
          onClick: handleDownloadImage,
          showInDropdown: true,
        }
      ]}
    />
  );
}

export function UnifiedProductMediaUpload() {
  const config = getMediaConfig('kupiProdaiProducts');

  return (
    <UnifiedMediaProvider config={config}>
      <ProductMediaUploadBridge />
    </UnifiedMediaProvider>
  );
}
