import { useState } from "react";
import { Trash2, Calendar, format } from "lucide-react";
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
import { useImage } from "@/modules/kupi-prodai/hooks/use-image";
import { useRef } from "react";
import { eventCategories } from "@/data/events/event-categories";
import { Textarea } from "../atoms/textarea";
import { Calendar as CalendarComponent } from "../atoms/calendar";
import { toast } from "../atoms/sonner";

const [createForm, setCreateForm] = useState({
  name: "",
  place: "",
  description: "",
  duration: 60,
  event_datetime: "",
  policy: "open" as const,
  type: "academic" as const
});
const [date, setDate] = useState<Date | undefined>(undefined);
const fileInputRefEvent = useRef<HTMLInputElement>(null);
const {handleImageUpload, handleDeleteImage} = useImage();


const handleCreateChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  setCreateForm({ ...createForm, [e.target.name]: e.target.value });
};
const handleCreateSelectChange = (name: string, value: string) => {
  setCreateForm({ ...createForm, [name]: value });
};

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: NuEvents.Event) => void;
}

export function CreateEventModal( { isOpen, onClose, onSave }: CreateEventModalProps ) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Create Event"
        className="max-w-xl">
          <div className="flex items-center gap-4">
          <div className="h-20 w-20 aspect-square rounded-lg overflow-hidden 
                          border-4 border-background bg-muted flex items-center justify-center">
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input
                type="file"
                name="images"
                ref={fileInputRefEvent}
                className="hidden"
                required
                accept="image/*"
                multiple
                onChange={handleImageUpload}
              />
              <Button className="h-8 px-2 text-xs" 
                      onClick={() => fileInputRefEvent.current?.click()}>Change Image</Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 bg-black hover:bg-black/80">
                <Trash2 className="h-4 w-4 text-white" onClick={() => handleDeleteImage(createForm.media[0].id)} />
              </Button>
            </div>
          </div>
        </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" value={createForm.name} onChange={handleCreateChange} placeholder="Name" />
              </div>
              <div>
                <Label htmlFor="policy">Policy</Label>
                <Select id="policy" name="policy" value={createForm.policy} onValueChange={(value: string) => handleCreateSelectChange("policy", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Policy" />
                  </SelectTrigger>
                  <SelectContent className="z-[150]">
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="free_ticket">Free Ticket</SelectItem>
                    <SelectItem value="paid_ticket">Paid Ticket</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select id="category" name="category" value={createForm.category} onValueChange={(value: string) => handleCreateSelectChange("category", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent className="z-[150]">
                    {eventCategories.map((category) => (
                  <SelectItem key={category.title} value={category.title}>
                    {category.title}
                  </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="place">Location</Label>
                <Input id="place" name="place" value={createForm.place} onChange={handleCreateChange} placeholder="Location" />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={createForm.description}
                  onChange={handleCreateChange}
                  placeholder="Description"
                  className="h-24"
                />
              </div>
              <div>
                <Label htmlFor="event_datetime">Date</Label>
                <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full flex items-center gap-2 justify-start">
                        <Calendar className="h-4 w-4" />
                        {date ? format(date, "PPP") : "Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[150]">
                      <CalendarComponent
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                      />
                    </PopoverContent>
                  </Popover>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input id="duration" name="duration" type="number" 
                value={createForm.duration} onChange={handleCreateChange} placeholder="Duration in minutes" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="default"
                onClick={() => {
                  // Handle event creation here
                  console.log("Creating event:", createForm);
                  onClose();  
                  toast({
                    title: "Event Created",
                    description: "Your event has been created successfully!",
                  });
                }}
              >
                Create Event
              </Button>
            </div>
          </div>
        </Modal>
    )
}