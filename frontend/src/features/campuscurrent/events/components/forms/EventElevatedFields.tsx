import { Label } from '@/components/atoms/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/atoms/select';
import { useEventForm } from '../../../../../context/EventFormContext';
import { EventEditableFields } from '@/features/campuscurrent/types/types';

export function EventElevatedFields() {
  const {
    formData,
    isEditMode,
    permissions,
    handleSelectChange,
    isFieldEditable,
  } = useEventForm();

  // Only render in edit mode
  if (!isEditMode) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Tag */}
      {permissions?.editable_fields.includes(EventEditableFields.tag) && (
        <div className="space-y-2">
          <Label htmlFor="tag">Tag</Label>
          <Select 
            value={isEditMode && 'tag' in formData ? formData.tag : ''} 
            disabled={!isFieldEditable('tag')} 
            onValueChange={(value) => handleSelectChange("tag", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select event tag" />
            </SelectTrigger>
            <SelectContent className="z-[150]">
              <SelectItem value="featured">Featured</SelectItem>
              <SelectItem value="promotional">Promotional</SelectItem>
              <SelectItem value="regular">Regular</SelectItem>
              <SelectItem value="charity">Charity</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Status */}
      {permissions?.editable_fields.includes(EventEditableFields.status) && (
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select 
            value={isEditMode && 'status' in formData ? formData.status : ''} 
            disabled={!isFieldEditable('status')} 
            onValueChange={(value) => handleSelectChange("status", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select event status" />
            </SelectTrigger>
            <SelectContent className="z-[150]">
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}