import { MediaUploadProvider } from "@/context/MediaUploadContext";
import { MediaEditProvider } from "@/context/MediaEditContext";
import { CreateEventModal } from "./CreateEvent";

interface EventModalProviderProps {
  isOpen: boolean;
  onClose: () => void;
  communityId?: number;
}

export function EventModalProvider({ isOpen, onClose, communityId }: EventModalProviderProps) {
  return (
    <MediaUploadProvider>
      <MediaEditProvider>
        <CreateEventModal 
          isOpen={isOpen} 
          onClose={onClose} 
          communityId={communityId} 
        />
      </MediaEditProvider>
    </MediaUploadProvider>
  );
}