import { Button } from "@/components/atoms/button";
import { X } from "lucide-react";

export function ImageGalery({
  previewImages,
  removeImage,
}: {
  previewImages: string[];
  removeImage: (index: number) => void;
}) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-4">
      {previewImages.map((src, index) => (
        <div
          key={index}
          className="relative aspect-square rounded-md overflow-hidden"
        >
          <img
            src={src || "/placeholder.svg"}
            alt={`Preview ${index + 1}`}
            className="object-cover w-full h-full"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              removeImage(index);
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}
