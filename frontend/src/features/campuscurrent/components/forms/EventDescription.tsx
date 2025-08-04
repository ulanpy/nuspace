import React from 'react';
import { Label } from '@/components/atoms/label';
import { Textarea } from '@/components/atoms/textarea';
import { useEventForm } from './EventFormProvider';

export function EventDescription() {
  const {
    formData,
    handleInputChange,
    isFieldEditable,
  } = useEventForm();

  return (
    <div className="space-y-2">
      <Label htmlFor="description">Description</Label>
      <Textarea
        id="description"
        name="description"
        value={formData.description}
        disabled={!isFieldEditable('description')}
        onChange={handleInputChange}
        placeholder="Enter event description"
        className="min-h-[100px]"
      />
    </div>
  );
}