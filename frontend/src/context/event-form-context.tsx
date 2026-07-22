"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser } from '@/hooks/use-user';
import { CreateEventData, EditEventData, EventPolicy, EventType, Event, EventPermissions, EventEditableFields } from '@/features/shared/campus/types';

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
  
  // Modal props
  isEditMode: boolean;
  event?: Event;
  permissions?: EventPermissions;
  
  // Handlers
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleSelectChange: (name: string, value: string) => void;
  isFieldEditable: (fieldName: string) => boolean;
  resetForm: () => void;
}

const EventFormContext = createContext<EventFormContextType | undefined>(undefined);

interface EventFormProviderProps {
  children: React.ReactNode;
  isEditMode: boolean;
  event?: Event;
  permissions?: EventPermissions;
}

export function EventFormProvider({
  children,
  isEditMode,
  event,
  permissions,
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
    creator_sub: user?.user.sub || "",
  });
  
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [endTime, setEndTime] = useState("");

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
        creator_sub: user?.user.sub || "",
      });
      setStartDate(undefined);
      setStartTime("");
      setEndDate(undefined);
      setEndTime("");
    }
  }, [isEditMode, event, user]);

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
    isEditMode,
    event,
    permissions,
    handleInputChange,
    handleSelectChange,
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
