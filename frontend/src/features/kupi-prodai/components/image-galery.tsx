import { MediaGallery } from "./media/MediaGallery";

/**
 * @deprecated Use MediaGallery component instead. This component is maintained for backward compatibility.
 * @see src/features/kupi-prodai/components/media/MediaGallery.tsx
 */
export function ImageGalery({
  previewImages,
  removeImage,
}: {
  previewImages: string[];
  removeImage: (index: number) => void;
}) {
  return (
    <MediaGallery
      items={previewImages}
      onRemove={removeImage}
      showMainIndicator={false}
      showActions={true}
      animateEntrance={true}
      className="mt-4"
    />
  );
}
