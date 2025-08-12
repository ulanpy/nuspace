import { Label } from '@/components/atoms/label';
import { Textarea } from '@/components/atoms/textarea';
import { useEventForm } from '../../../../../context/EventFormContext';

export function EventDescription() {
  const {
    formData,
    handleInputChange,
    isFieldEditable,
  } = useEventForm();

  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <Label htmlFor="description">Description</Label>
        <span className="text-xs text-gray-500">
          {formData.description?.length} / 1250
        </span>
      </div>
      <Textarea
        id="description"
        name="description"
        value={formData.description || ""}
        disabled={!isFieldEditable('description')}
        onChange={handleInputChange}
        placeholder="Enter event description"
        className="min-h-[100px]"
        maxLength={1250}
        required
      />
    </div>
  );
}