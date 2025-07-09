import { Button } from "@/components/atoms/button";
import { ImageIcon } from "lucide-react";
interface ImageUploaderProps {
  dropZoneRef: React.RefObject<HTMLDivElement>;
  isDragging: boolean;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}
export function ImageUploader({
  dropZoneRef,
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  fileInputRef,
  onFileChange,
}: ImageUploaderProps) {
  return (
    <div
      ref={dropZoneRef}
      className={`border-2 ${
        isDragging ? "border-primary" : "border-dashed"
      } rounded-md p-6 transition-colors duration-200 ease-in-out`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
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
          onChange={onFileChange}
        />
        <Button type="button" variant="outline" size="sm">
          Upload a file
        </Button>
      </div>
    </div>
  );
}
