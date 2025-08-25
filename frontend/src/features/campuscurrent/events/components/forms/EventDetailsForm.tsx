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
        <select
          value={formData.policy || "open"}
          disabled={!isFieldEditable("policy")}
          onChange={(e) => handleSelectChange("policy", e.target.value)}
          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {Object.values(EventPolicy).map((policy) => (
            <option key={policy} value={policy}>
              {policy}
            </option>
          ))}
        </select>
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
        <select 
          value={String(formData.type || "")}
          disabled={!isFieldEditable('type')} 
          onChange={(e) => handleSelectChange("type", e.target.value)}
          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Select event type</option>
          {eventTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}