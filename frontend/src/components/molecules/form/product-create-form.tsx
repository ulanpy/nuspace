import { Progress } from "@/components/atoms/progress";
import { ProductInfo } from "./product-info";
import { ImageGalery } from "./image-galery";
import { ImageIcon, RefreshCw } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { useImage } from "@/modules/kupi-prodai/hooks/use-image";
import { useProduct } from "./use-product";
import { useRef } from "react";
import { useListingState } from "@/context/listing-context";
interface ProductCreateFormProps {
  isTelegramLinked: boolean;
  uploadProgress: number;
  handleCreate: (e: React.FormEvent<HTMLFormElement>) => void;
}
export const ProductCreateForm = ({
  isTelegramLinked,
  uploadProgress,
  handleCreate,
}: ProductCreateFormProps) => {
  const {
    isDragging,
    isUploading,
    previewImages,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleImageUpload,
    removeImage,
  } = useImage();
  const {
    categories,
    conditions,
    handleInputChange,
    handlePriceInputBlur,
    handlePriceInputFocus,
    handleSelectChange,
  } = useProduct();
  const { newListing } = useListingState();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  return (
    <form onSubmit={handleCreate} className="space-y-4">
      {/* Name */}
      <ProductInfo
        newListing={newListing}
        categories={categories}
        conditions={conditions}
        handleInputChange={(e) => handleInputChange(e)}
        handlePriceInputBlur={handlePriceInputBlur}
        handlePriceInputFocus={handlePriceInputFocus}
        handleSelectChange={handleSelectChange}
      />
      <div className="space-y-2">
        <label className="block text-sm font-medium">Images</label>
        <div
          ref={dropZoneRef}
          className={`border-2 ${
            isDragging ? "border-primary" : "border-dashed"
          } rounded-md p-6 transition-colors duration-200 ease-in-out`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center justify-center text-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm font-medium mb-1">
              Upload a file or drag and drop
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              PNG, JPG, GIF up to 10MB
            </p>
            <input
              type="file"
              name="images"
              ref={fileInputRef}
              className="hidden"
              required
              accept="image/*"
              multiple
              onChange={handleImageUpload}
            />
            <Button type="button" variant="outline" size="sm">
              Upload a file
            </Button>
          </div>
        </div>
        {previewImages.length > 0 && (
          <ImageGalery
            previewImages={previewImages}
            removeImage={removeImage}
          />
        )}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isUploading || !isTelegramLinked}
        className="w-full"
      >
        {isUploading ? (
          <div className="flex items-center justify-center gap-2">
            <RefreshCw className="animate-spin h-4 w-4" />
            <span>Uploading... {uploadProgress}%</span>
          </div>
        ) : (
          "Create Listing"
        )}
      </Button>

      {/* Media Reorder */}
      {isUploading && <Progress value={uploadProgress} className="mt-2" />}
    </form>
  );
};
