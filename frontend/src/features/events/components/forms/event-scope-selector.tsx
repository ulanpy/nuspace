"use client";

import { Users } from 'lucide-react';
import { Label } from '@/components/atoms/label';
import { Switch } from '@/components/atoms/switch';
import { Button } from '@/components/atoms/button';
import { useEventForm } from '@/context/event-form-context';

interface EventScopeSelectorProps {
  onCommunityModalOpen: () => void;
}

export function EventScopeSelector({ onCommunityModalOpen }: EventScopeSelectorProps) {
  const {
    isEditMode,
    isCommunityEvent,
    selectedCommunity,
    handleCommunityToggle,
    communityId,
  } = useEventForm();

  // Don't render in edit mode. Available in create mode only.
  if (isEditMode) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Title row with inline scope switch aligned to the title */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Event Type</Label>
          <div className="flex items-center gap-3">
            <span className={`text-sm ${!isCommunityEvent ? 'font-medium text-primary' : 'text-muted-foreground'}`}>
              Personal
            </span>
            <Switch
              checked={isCommunityEvent}
              onCheckedChange={handleCommunityToggle}
              disabled={communityId != null}
            />
            <span className={`text-sm ${isCommunityEvent ? 'font-medium text-primary' : 'text-muted-foreground'}`}>
              Community
            </span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Choose whether this is a personal event or a community event
        </p>
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
            disabled={communityId != null}
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