import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser } from '@/hooks/use-user';
import { CreateEventData, EditEventData, EventPolicy, EventType, Event, EventPermissions, EventEditableFields, Community } from '@/features/campuscurrent/types/types';

interface EventFormContextType {
  // Form data
  formData: CreateEventData | EditEventData;
  setFormData: (data: CreateEventData | EditEventData) => void;
  
  // Date/time state
  startDate: Date | undefined;
  setStartDate: (date: Date | undefined) => void;
  startTime: string;
  setStartTime: (time: string) => void;
  endDate: Date | undefined;
  setEndDate: (date: Date | undefined) => void;
  endTime: string;
  setEndTime: (time: string) => void;
  
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
    start_datetime: "",
    end_datetime: "",
    policy: "open" as EventPolicy,
    registration_link: "",
    type: "academic" as EventType,
    community_id: communityId || undefined,
    creator_sub: user?.user.sub || "",
  });
  
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [endTime, setEndTime] = useState("");
  
  // Community selection state
  const [isCommunityEvent, setIsCommunityEvent] = useState(!!communityId);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);

  // Update form data when modal opens or event changes
  useEffect(() => {
    if (isEditMode && event) {
      setFormData({
        name: event.name,
        place: event.place,
        start_datetime: event.start_datetime,
        end_datetime: event.end_datetime,
        description: event.description,
        policy: event.policy,
        registration_link: event.registration_link,
        type: event.type,
        tag: event.tag,
        status: event.status,
      });
      
      // Initialize start date and time
      const startD = new Date(event.start_datetime);
      setStartDate(new Date(startD.getFullYear(), startD.getMonth(), startD.getDate()));
      const startHh = String(startD.getHours()).padStart(2, '0');
      const startMm = String(startD.getMinutes()).padStart(2, '0');
      setStartTime(`${startHh}:${startMm}`);
      
      // Initialize end date and time
      const endD = new Date(event.end_datetime);
      setEndDate(new Date(endD.getFullYear(), endD.getMonth(), endD.getDate()));
      const endHh = String(endD.getHours()).padStart(2, '0');
      const endMm = String(endD.getMinutes()).padStart(2, '0');
      setEndTime(`${endHh}:${endMm}`);
      
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
        start_datetime: "",
        end_datetime: "",
        policy: "open" as EventPolicy,
        registration_link: "",
        type: "academic" as EventType,
        community_id: undefined,
        creator_sub: user?.user.sub || "",
      });
      setStartDate(undefined);
      setStartTime("");
      setEndDate(undefined);
      setEndTime("");
      
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
        start_datetime: "",
        end_datetime: "",
        policy: "open" as EventPolicy,
        registration_link: "",
        type: "academic" as EventType,
        community_id: communityId || undefined,
        creator_sub: user?.user.sub || "",
      } as CreateEventData);
      setStartDate(undefined);
      setStartTime("");
      setEndDate(undefined);
      setEndTime("");
    }
  };

  const contextValue: EventFormContextType = {
    formData,
    setFormData,
    startDate,
    setStartDate,
    startTime,
    setStartTime,
    endDate,
    setEndDate,
    endTime,
    setEndTime,
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