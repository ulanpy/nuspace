"use client";

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEventForm } from '@/context/event-form-context';
import { EventPolicy} from '@/features/shared/campus/types'

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

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="policy">How people join</Label>
        <Select
          value={formData.policy || "open"}
          disabled={!isFieldEditable("policy")}
          onValueChange={(value) => handleSelectChange("policy", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select how people join" />
          </SelectTrigger>
          <SelectContent className="z-[11050]">
            <SelectItem value={EventPolicy.open}>Open</SelectItem>
            <SelectItem value={EventPolicy.registration}>
              Registration — external form
            </SelectItem>
          </SelectContent>
        </Select>
        {(formData.policy || EventPolicy.open) === EventPolicy.open ? (
          <p className="text-sm text-muted-foreground">
            Guests can tap <span className="text-foreground/80">I’m going</span> on the
            event page. You’ll see the count and Who’s going list for planning.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Use your own Google Form, Typeform, etc. We’ll show a Register button that
            opens your link.
          </p>
        )}
      </div>

      {formData.policy === EventPolicy.registration && (
        <div className="space-y-2 md:col-span-2">
          <div className="flex justify-between">
            <Label htmlFor="registration_link">Registration link</Label>
            <span className="text-xs text-muted-foreground">
              {(formData as any).registration_link?.length || 0} / 2048
            </span>
          </div>
          <Input
            id="registration_link"
            name="registration_link"
            value={(formData as any).registration_link || ""}
            disabled={!isFieldEditable('registration_link')}
            onChange={handleInputChange}
            placeholder="https://forms.gle/…"
            required
            maxLength={2048}
            type="url"
            inputMode="url"
          />
          <p className="text-sm text-muted-foreground">
            Paste the form URL people should complete to sign up.
          </p>
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