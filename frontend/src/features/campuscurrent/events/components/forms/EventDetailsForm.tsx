import React from 'react';
import { Label } from '@/components/atoms/label';
import { Input } from '@/components/atoms/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/atoms/select';
import { useEventForm } from '../../../../../context/EventFormContext';
import { EventPolicy} from '@/features/campuscurrent/types/types'

const eventTypes = [
  { value: "academic", label: "Academic" },
  { value: "professional", label: "Professional" },
  { value: "recreational", label: "Recreational" },
  { value: "cultural", label: "Cultural" },
  { value: "sports", label: "Sports" },
  { value: "social", label: "Social" },
  { value: "art", label: "Art" },
];

export function EventDetailsForm() {
  const {
    formData,
    handleInputChange,
    handleSelectChange,
    isFieldEditable,
  } = useEventForm();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <div className="flex justify-between">
          <Label htmlFor="name">Event Name</Label>
          <span className="text-xs text-gray-500">
            {formData.name?.length} / 75
          </span>
        </div>
        <Input 
          id="name" 
          name="name" 
          value={formData.name || ""}
          disabled={!isFieldEditable('name')} 
          onChange={handleInputChange} 
          placeholder="Enter event name" 
          required
          maxLength={75}
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <Label htmlFor="place">Location</Label>
          <span className="text-xs text-gray-500">
            {formData.place?.length} / 100
          </span>
        </div>
        <Input 
          id="place" 
          name="place" 
          value={formData.place || ""}
          disabled={!isFieldEditable('place')} 
          onChange={handleInputChange} 
          placeholder="Enter event location" 
          required
          maxLength={100}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="policy">Entry Policy</Label>
        <Select
          value={formData.policy || ""}
          disabled={!isFieldEditable("policy")}
          onValueChange={(value) => handleSelectChange("policy", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select entry policy" />
          </SelectTrigger>
          <SelectContent className="z-[150]">
            {Object.values(EventPolicy).map((policy) => (
              <SelectItem key={policy} value={policy}>
                {policy}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Event Type</Label>
        <Select 
          value={formData.type || ""}
          disabled={!isFieldEditable('type')} 
          onValueChange={(value) => handleSelectChange("type", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select event type" />
          </SelectTrigger>
          <SelectContent className="z-[150]">
            {eventTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <Label htmlFor="duration">Duration (minutes)</Label>
          <span className="text-xs text-gray-500">
            {formData.duration || 0} / 100800
          </span>
        </div>
        <Input 
          id="duration" 
          name="duration" 
          type="number" 
          value={formData.duration === undefined ? '' : formData.duration || ''}
          disabled={!isFieldEditable('duration')} 
          onChange={handleInputChange} 
          placeholder="60" 
          min="0"
          max="100800"
        />
      </div>
    </div>
  );
}