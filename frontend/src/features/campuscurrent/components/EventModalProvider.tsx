import { MediaUploadProvider } from "@/context/MediaUploadContext";
import { MediaEditProvider } from "@/context/MediaEditContext";
import { EventModal } from "./EventModal";
import { Permissions, Event } from "../types/types";

interface EventModalProviderProps {
  isOpen: boolean;
  onClose: () => void;
  communityId?: number;
  permissions?: Permissions;
  event?: Event;
}

export function EventModalProvider({ isOpen, onClose, communityId, permissions, event }: EventModalProviderProps) {
  return (
    <MediaUploadProvider>
      <MediaEditProvider>
        {permissions ? (
        <EventModal 
          isOpen={isOpen} 
          onClose={onClose} 
          communityId={communityId} 
          isEditMode={true}
          event={event}
          permissions={permissions}
          />
        ) : (
          <EventModal 
            isOpen={isOpen} 
            onClose={onClose} 
            communityId={communityId} 
            isEditMode={false}
            permissions={permissions}
          />
        )}
      </MediaEditProvider>
    </MediaUploadProvider>
  );
}