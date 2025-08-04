import { Users } from 'lucide-react';
import { Label } from '@/components/atoms/label';
import { Switch } from '@/components/atoms/switch';
import { Button } from '@/components/atoms/button';
import { useEventForm } from './EventFormProvider';

interface EventScopeSelectorProps {
  onCommunityModalOpen: () => void;
}

export function EventScopeSelector({ onCommunityModalOpen }: EventScopeSelectorProps) {
  const {
    isEditMode,
    isCommunityEvent,
    selectedCommunity,
    handleCommunityToggle,
  } = useEventForm();

  // Don't render in edit mode
  if (isEditMode) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label className="text-base font-semibold">Event Type</Label>
          <p className="text-sm text-muted-foreground">
            Choose whether this is a personal event or a community event
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span className={`text-sm ${!isCommunityEvent ? 'font-medium text-primary' : 'text-muted-foreground'}`}>
            Personal
          </span>
          <Switch
            checked={isCommunityEvent}
            onCheckedChange={handleCommunityToggle}
          />
          <span className={`text-sm ${isCommunityEvent ? 'font-medium text-primary' : 'text-muted-foreground'}`}>
            Community
          </span>
        </div>
      </div>

      {/* Community Selection */}
      {isCommunityEvent && (
        <div className="space-y-2">
          <Label htmlFor="community-selection">Select Community</Label>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start"
            onClick={onCommunityModalOpen}
          >
            <Users className="mr-2 h-4 w-4" />
            {selectedCommunity ? selectedCommunity.name : "Choose a community..."}
          </Button>
          {selectedCommunity && (
            <p className="text-xs text-muted-foreground">
              {selectedCommunity.description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}


export function CommunityDisplay() {
  const { isEditMode, event } = useEventForm();

  // Only render in edit mode if event has a community
  if (!isEditMode || !event?.community) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Label className="text-base font-semibold">Community</Label>
      <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg">
        <Users className="h-5 w-5 text-primary" />
        <div>
          <p className="font-medium text-sm">{event.community.name}</p>
          <p className="text-xs text-muted-foreground">{event.community.description}</p>
        </div>
      </div>
    </div>
  );
}