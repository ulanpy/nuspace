import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser } from '@/hooks/use-user';
import { CreateEventData, EditEventData, EventPolicy, EventType, Event, EventPermissions, EventEditableFields, Community } from '@/features/campuscurrent/types/types';

interface EventFormContextType {
  // Form data
  formData: CreateEventData | EditEventData;
  setFormData: (data: CreateEventData | EditEventData) => void;
  
  // Date/time state
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  time: string;
  setTime: (time: string) => void;
  
  // Community state
  isCommunityEvent: boolean;
  setIsCommunityEvent: (value: boolean) => void;
  selectedCommunity: Community | null;
  setSelectedCommunity: (community: Community | null) => void;
  
  // Modal props
  isEditMode: boolean;
  event?: Event;
  permissions?: EventPermissions;
  communityId?: number;
  
  // Handlers
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleSelectChange: (name: string, value: string) => void;
  handleCommunityToggle: (checked: boolean) => void;
  handleCommunitySelect: (community: Community) => void;
  isFieldEditable: (fieldName: string) => boolean;
  resetForm: () => void;
}

const EventFormContext = createContext<EventFormContextType | undefined>(undefined);

interface EventFormProviderProps {
  children: React.ReactNode;
  isEditMode: boolean;
  event?: Event;
  permissions?: EventPermissions;
  communityId?: number;
  initialCommunity?: Community;
}

export function EventFormProvider({
  children,
  isEditMode,
  event,
  permissions,
  communityId,
  initialCommunity,
}: EventFormProviderProps) {
  const { user } = useUser();

  // Initialize with empty data, will be set by useEffect
  const [formData, setFormData] = useState<CreateEventData | EditEventData>({
    name: "",
    place: "",
    description: "",
    duration: 60,
    policy: "open" as EventPolicy,
    type: "academic" as EventType,
    community_id: communityId || undefined,
    creator_sub: user?.user.sub || "",
    event_datetime: "",
  });
  
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("");
  
  // Community selection state
  const [isCommunityEvent, setIsCommunityEvent] = useState(!!communityId);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);

  // Update form data when modal opens or event changes
  useEffect(() => {
    if (isEditMode && event) {
      setFormData({
        name: event.name,
        place: event.place,
        event_datetime: event.event_datetime,
        description: event.description,
        duration: event.duration,
        policy: event.policy,
        type: event.type,
        tag: event.tag,
        status: event.status,
      });
      // Initialize date and time using LOCAL components for editing UX
      // Display the event at the user's local time while storing in UTC on save
      const d = new Date(event.event_datetime);
      setDate(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      setTime(`${hh}:${mm}`);
      
      // Set community state for edit mode
      if (event.community) {
        setIsCommunityEvent(true);
        setSelectedCommunity(event.community);
      } else {
        setIsCommunityEvent(false);
        setSelectedCommunity(null);
      }
    } else if (!isEditMode) {
      setFormData({
        name: "",
        place: "",
        description: "",
        duration: 60,
        policy: "open" as EventPolicy,
        type: "academic" as EventType,
        community_id: undefined,
        creator_sub: user?.user.sub || "",
        event_datetime: "",
      });
      setDate(undefined);
      setTime("");
      
      // Reset community state for create mode
      setIsCommunityEvent(!!communityId);
      if (initialCommunity || communityId) {
        const id = initialCommunity?.id ?? communityId;
        const name = initialCommunity?.name ?? undefined;
        setSelectedCommunity({ id, name } as unknown as Community);
        setFormData((prev) => ({ ...prev, community_id: id }));
      } else {
        setSelectedCommunity(null);
      }
    }
  }, [isEditMode, event, communityId, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    // Check permissions for edit mode
    if (isEditMode && permissions && !permissions.editable_fields.includes(name as EventEditableFields)) {
      return; // Field is not editable
    }
    
    // Special validation for duration field
    if (name === 'duration' && type === 'number') {
      const numValue = parseInt(value);
      const min = 0;
      const max = 100800;
      
      // If empty, allow it and set to undefined to show placeholder
      if (value === '') {
        setFormData({ ...formData, [name]: undefined });
        return;
      }
      
      // If not a valid number, don't update
      if (isNaN(numValue)) {
        return;
      }
      
      // Enforce min/max limits
      if (numValue < min) {
        setFormData({ ...formData, [name]: min });
        return;
      }
      
      if (numValue > max) {
        setFormData({ ...formData, [name]: max });
        return;
      }
      
      // Valid value, update normally
      setFormData({ ...formData, [name]: numValue });
      return;
    }
    
    setFormData({ ...formData, [name]: value });
  };

  const handleSelectChange = (name: string, value: string) => {
    // Check permissions for edit mode
    if (isEditMode && permissions && !permissions.editable_fields.includes(name as EventEditableFields)) {
      return; // Field is not editable
    }
    
    setFormData({ ...formData, [name]: value });
  };

  // Helper function to check if a field is editable
  const isFieldEditable = (fieldName: string): boolean => {
    if (!isEditMode) return true; // All fields editable in create mode
    if (!permissions) return false; // No permissions means no editing
    return permissions.editable_fields.includes(fieldName as EventEditableFields);
  };

  // Community selection handlers
  const handleCommunityToggle = (checked: boolean) => {
    // If modal opened from community page, prevent switching away from community event
    if (communityId != null) {
      setIsCommunityEvent(true);
      return;
    }
    setIsCommunityEvent(checked);
    if (!checked) {
      setSelectedCommunity(null);
      setFormData({ ...formData, community_id: undefined });
    }
  };

  const handleCommunitySelect = (community: Community) => {
    // If modal opened from community page, prevent changing to a different community
    if (communityId != null && community.id !== communityId) {
      setSelectedCommunity({ id: communityId } as unknown as Community);
      setFormData({ ...formData, community_id: communityId });
      return;
    }
    setSelectedCommunity(community);
    setFormData({ ...formData, community_id: community.id });
  };

  const resetForm = () => {
    if (!isEditMode) {
      setFormData({
        name: "",
        place: "",
        description: "",
        duration: 60,
        policy: "open" as EventPolicy,
        type: "academic" as EventType,
        community_id: communityId || undefined,
        creator_sub: user?.user.sub || "",
        event_datetime: "",
      } as CreateEventData);
      setDate(undefined);
      setTime("");
    }
  };

  const contextValue: EventFormContextType = {
    formData,
    setFormData,
    date,
    setDate,
    time,
    setTime,
    isCommunityEvent,
    setIsCommunityEvent,
    selectedCommunity,
    setSelectedCommunity,
    isEditMode,
    event,
    permissions,
    communityId,
    handleInputChange,
    handleSelectChange,
    handleCommunityToggle,
    handleCommunitySelect,
    isFieldEditable,
    resetForm,
  };

  return (
    <EventFormContext.Provider value={contextValue}>
      {children}
    </EventFormContext.Provider>
  );
}

export function useEventForm() {
  const context = useContext(EventFormContext);
  if (context === undefined) {
    throw new Error('useEventForm must be used within an EventFormProvider');
  }
  return context;
}