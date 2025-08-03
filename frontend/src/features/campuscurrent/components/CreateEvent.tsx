import { useState } from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Modal } from "@/components/atoms/modal";
import { Input } from "@/components/atoms/input";
import { Label } from "@/components/atoms/label";
import { Select, 
        SelectContent, 
        SelectItem, 
        SelectTrigger, 
        SelectValue } 
        from "@/components/atoms/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/atoms/popover";
import { Textarea } from "@/components/atoms/textarea";
import { Calendar as CalendarComponent } from "@/components/atoms/calendar";
import { format } from "date-fns";
import { useCreateEvent } from "@/features/campuscurrent/hooks/events/useCreateEvent";
import { useMediaSelection } from "@/features/media/hooks/useMediaSelection";
import { useMediaUploadContext } from "@/context/MediaUploadContext";
import { useUser } from "@/hooks/use-user";
import { MediaDropZone } from "@/features/kupi-prodai/components/media/MediaDropZone";
import { MediaGallery } from "@/features/kupi-prodai/components/media/MediaGallery";
import { CreateEventData, EventPolicy, EventTag, EventType, Scope } from "@/features/campuscurrent/types/types";

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  communityId?: number;
}

const eventTypes = [
  { value: "academic", label: "Academic" },
  { value: "professional", label: "Professional" },
  { value: "recreational", label: "Recreational" },
  { value: "cultural", label: "Cultural" },
  { value: "sports", label: "Sports" },
  { value: "art", label: "Art" },
];

const eventTags = [
  { value: "featured", label: "Featured"},
  { value: "promotional", label: "Promotional"},
  { value: "regular", label: "Regular"},
  { value: "charity", label: "Charity"},


];

export function CreateEventModal({ isOpen, onClose, communityId }: CreateEventModalProps) {
  const { user } = useUser();
  const { handleCreate, isCreating, uploadProgress } = useCreateEvent();
  const { isUploading } = useMediaUploadContext();
  
  const {
    previewMedia,
    isDragging,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    removeNewMedia,
    handleFileSelect,
  } = useMediaSelection();

  const [createForm, setCreateForm] = useState({
    name: "",
    place: "",
    description: "",
    duration: 60,
    policy: "open" as EventPolicy,
    type: "academic" as EventType,
    tag: "regular" as EventTag,
    scope: communityId ? "community" : "personal" as Scope,
  });
  
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCreateForm({ ...createForm, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (name: string, value: string) => {
    setCreateForm({ ...createForm, [name]: value });
  };

  const handleSubmit = async () => {
    if (!user || !date) return;

    // Combine date and time for event_datetime
    let eventDateTime = date.toISOString();
    if (time) {
      const [hours, minutes] = time.split(':');
      const eventDate = new Date(date);
      eventDate.setHours(parseInt(hours), parseInt(minutes));
      eventDateTime = eventDate.toISOString();
    }

    const eventData: CreateEventData = {
      community_id: communityId || 1,
      creator_sub: user.user.sub,
      policy: createForm.policy,
      name: createForm.name,
      place: createForm.place,
      event_datetime: eventDateTime,
      description: createForm.description,
      duration: Number(createForm.duration),
      type: createForm.type as EventType,
    };

    try {
      await handleCreate(eventData);
      // Reset form
      setCreateForm({
        name: "",
        place: "",
        description: "",
        duration: 60,
        policy: "open" as EventPolicy,
        type: "academic" as EventType,
        tag: "regular" as EventTag,
        scope: communityId ? "community" : "personal",
      });
      setDate(undefined);
      setTime("");
      onClose();
    } catch (error) {
      console.error("Failed to create event:", error);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Event"
      className="max-w-4xl max-h-[90vh] overflow-y-auto"
    >
      <div className="space-y-6">
        {/* Media Upload Section */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Event Images</Label>
          <MediaDropZone
            isDragging={isDragging}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onFileSelect={handleFileSelect}
            disabled={isUploading}
            maxSizeText="PNG, JPG, GIF up to 10MB"
          />
          
          {previewMedia.length > 0 && (
            <MediaGallery
              items={previewMedia}
              onRemove={removeNewMedia}
              showMainIndicator={false}
              animateEntrance={true}
            />
          )}
        </div>

        {/* Event Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Event Name</Label>
            <Input 
              id="name" 
              name="name" 
              value={createForm.name} 
              onChange={handleInputChange} 
              placeholder="Enter event name" 
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="place">Location</Label>
            <Input 
              id="place" 
              name="place" 
              value={createForm.place} 
              onChange={handleInputChange} 
              placeholder="Enter event location" 
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="policy">Entry Policy</Label>
            <Select 
              value={createForm.policy} 
              onValueChange={(value) => handleSelectChange("policy", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select entry policy" />
              </SelectTrigger>
              <SelectContent className="z-[150]">
                <SelectItem value="open">Open Entry</SelectItem>
                <SelectItem value="free_ticket">Free Ticket</SelectItem>
                <SelectItem value="paid_ticket">Paid Ticket</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Event Type</Label>
            <Select 
              value={createForm.type} 
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
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Input 
              id="duration" 
              name="duration" 
              type="number" 
              value={createForm.duration} 
              onChange={handleInputChange} 
              placeholder="60" 
              min="1"
            />
          </div>
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="event_date">Event Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[150]">
                <CalendarComponent
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event_time">Event Time</Label>
            <Input 
              id="event_time" 
              name="time" 
              type="time" 
              value={time} 
              onChange={(e) => setTime(e.target.value)} 
            />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            value={createForm.description}
            onChange={handleInputChange}
            placeholder="Enter event description"
            className="min-h-[100px]"
          />
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Creating event...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isCreating || isUploading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isCreating || isUploading || !createForm.name || !createForm.place || !date}
          >
            {isCreating || isUploading ? "Creating..." : "Create Event"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}