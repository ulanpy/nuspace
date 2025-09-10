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
  { value: "recruitment", label: "Recruitment" },
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
          value={formData.policy || "open"}
          disabled={!isFieldEditable("policy")}
          onValueChange={(value) => handleSelectChange("policy", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select entry policy" />
          </SelectTrigger>
          <SelectContent className="z-[11050]">
            {Object.values(EventPolicy).map((policy) => (
              <SelectItem key={policy} value={policy}>
                {policy}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {formData.policy === EventPolicy.registration && (
        <div className="space-y-2 md:col-span-2">
          <div className="flex justify-between">
            <Label htmlFor="registration_link">Registration Link</Label>
            <span className="text-xs text-gray-500">
              {(formData as any).registration_link?.length || 0} / 2048
            </span>
          </div>
          <Input
            id="registration_link"
            name="registration_link"
            value={(formData as any).registration_link || ""}
            disabled={!isFieldEditable('registration_link')}
            onChange={handleInputChange}
            placeholder="https://example.com/register"
            required
            maxLength={2048}
            type="url"
            inputMode="url"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="type">Event Type</Label>
        <Select 
          value={String(formData.type || "")}
          disabled={!isFieldEditable('type')} 
          onValueChange={(value) => handleSelectChange("type", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select event type" />
          </SelectTrigger>
          <SelectContent className="z-[11050]">
            {eventTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}