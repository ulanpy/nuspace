import { Button } from "@/components/atoms/button";
import { RefreshCw } from "lucide-react";
interface SubmutButtonProps {
  isUploading: boolean;
  isTelegramLinked: boolean;
  uploadProgress: number;
}
export function SubmitButton({
  isUploading,
  isTelegramLinked,
  uploadProgress,
}: SubmutButtonProps) {
  return (
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
  );
}
