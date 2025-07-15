import { useState, useRef } from "react";
import { format } from "date-fns";
import { Trash2, 
  Users,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Modal } from "@/components/atoms/modal";
import { Input } from "@/components/atoms/input";
import { Label } from "@/components/atoms/label";
import {Select, 
        SelectContent, 
        SelectItem, 
        SelectTrigger, 
        SelectValue } from "@/components/atoms/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/atoms/popover";
import { clubTypes } from "@/data/clubs/club-types";
import { clubCategories } from "@/data/clubs/club-categories";
import { useImage } from "@/modules/kupi-prodai/hooks/use-image";
import { useEditCommunity } from "@/modules/nu-events/clubs/api/hooks/use-edit-community";
import { clubStatus } from "@/data/clubs/club-status";
import { Calendar as CalendarComponent } from "../atoms/calendar";
import { Textarea } from "../atoms/textarea";
import { toast } from "../atoms/sonner";

interface EditCommunityModalProps {
  onClose: () => void;
  club: NuEvents.Club;
  onSave: (club: NuEvents.Club) => void;
}

{/* Edit Community Modal */}
export function EditCommunityModal({
  club, 
  onSave, 
  onClose
}: EditCommunityModalProps) {
  const [editForm, setEditForm] = useState(club);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const fileInputRefProfile = useRef<HTMLInputElement>(null);
  const fileInputRefBanner = useRef<HTMLInputElement>(null);
  const {handleImageUpload, handleDeleteImage} = useImage();
  const { mutate: editCommunity, isPending } = useEditCommunity();

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleEditSelectChange = (name: string, value: string) => {
      setEditForm({ ...editForm, [name]: value });
  };

  // Handle saving edited community details
  const handleSave = () => {
    editCommunity( {
      ...editForm,
      established: date ? date.toISOString() : editForm.established,
    },  
    {
      onSuccess: () => {
        onClose();
        toast({ title: "Club updated!" });
      },
      onError: (error: any) => {
        toast({ title: "Error", description: error });
      }
    });
  };

    return (
    <Modal  
        isOpen={true} 
        onClose={onClose}
        title="Edit Community"
        className="max-w-2xl"
      >
        {/* Editing Profile and Background images */}
      <div className="grid grid-cols-2 gap-4">
        {/* Profile */}
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full overflow-hidden 
                          border-4 border-background bg-muted flex items-center justify-center">
            {club.media && club.media.length > 0 ? ( <img
              src={club.media[0].url || "/placeholder.svg"}
              alt={club.name}
              className="w-full h-full object-cover"
            />) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Users className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium">Profile</div>
            <div className="flex items-center gap-2">
              <input
                type="file"
                name="images"
                ref={fileInputRefProfile}
                className="hidden"
                required
                accept="image/*"
                multiple
                onChange={handleImageUpload}
              />
              <Button className="h-8 px-2 text-xs" 
                      onClick={() => fileInputRefProfile.current?.click()}>Change Image</Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 bg-black hover:bg-black/80">
                <Trash2 className="h-4 w-4 text-white" onClick={() => handleDeleteImage(club.media[0].id)}  />
              </Button>
            </div>
          </div>
        </div>
        {/* Background */}
        <div className="flex items-center gap-4">
          <div className="h-20 bg-gradient-to-r from-primary/80 to-primary/30 w-20 
                          aspect-square rounded-lg overflow-hidden border-4 border-background  
                          bg-muted flex items-center justify-center">
            {club.media && club.media.length > 1 && (
            <img
              src={club.media[1].url || "/placeholder.svg"}
              alt={`${club.name} banner`}
              className="w-full h-full object-cover"
            />
          )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium">Background</div>
            <div className="flex items-center gap-2">
              <input
                type="file"
                name="images"
                ref={fileInputRefBanner}
                className="hidden"
                required
                accept="image/*"
                multiple
                onChange={handleImageUpload}
              />
              <Button className ="h-8 px-2 text-xs"
                      onClick={() => fileInputRefBanner.current?.click()}>Change Image</Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 bg-black hover:bg-black/80">
                <Trash2 className="h-4 w-4 text-white" onClick={() => handleDeleteImage(club.media[1].id)} />
              </Button>
            </div>
          </div>
        </div>
      </div>

        {/* Editing Club Info */}
    <div className="grid grid-cols-2 gap-4">
    <div>
      <Label htmlFor="name">Name</Label>
      <Input id="name" name="name" value={editForm.name} onChange={handleEditChange} placeholder="Name" />
    </div>
    <div>
      <Label htmlFor="type">Type</Label>
      <Select id="type" value={editForm.type} onValueChange={(value: string) => handleEditSelectChange("type", value)}>
        <SelectTrigger>
          <SelectValue placeholder="Select Type" />
        </SelectTrigger>
        <SelectContent className="z-[150]">
          {clubTypes.map((type) => (
        <SelectItem key={type} value={type.toLowerCase()}>
          {type}
        </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
    <div>
      <Label htmlFor="category">Category</Label>
      <Select id="category" value={editForm.category} onValueChange={(value: string) => handleEditSelectChange("category", value)}>
        <SelectTrigger>
          <SelectValue placeholder="Select Category" />
        </SelectTrigger>
        <SelectContent className="z-[150]">
            {clubCategories.map((category) => (
              <SelectItem key={category} value={category.toLowerCase()}>
                {category} 
              </SelectItem>
            ))}
          </SelectContent>
      </Select>
    </div>
    <div>
      <Label htmlFor="recruitment_status">Recruitment Status</Label>
      <Select id="recruitment_status" value={editForm.recruitment_status} onValueChange={(value: string) => handleEditSelectChange("recruitment_status", value)}>
        <SelectTrigger>
          <SelectValue placeholder="Select Status" />
        </SelectTrigger>
        <SelectContent className="z-[150]">
            {clubStatus.map((recruitment_status: string) => (
              <SelectItem key={recruitment_status} value={recruitment_status.toLowerCase()}>
                {recruitment_status} 
              </SelectItem>
            ))}
          </SelectContent>
      </Select>
    </div>
    <div>
      <Label htmlFor="description">Description</Label>
      <Textarea
        id="description"
        name="description"
        value={editForm.description}
        onChange={handleEditChange}
        placeholder="Description"
        className="h-24"
      />
    </div>
    <div>
      <Label htmlFor="established">Established</Label>
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
    </div>
    <div>
      <Label htmlFor="telegram_url">Telegram</Label>
      <Input id="telegram_url" name="telegram_url" value={editForm.telegram_url} onChange={handleEditChange} placeholder="Telegram URL" />
    </div>
    <div>
      <Label htmlFor="instagram_url">Instagram</Label>
      <Input id="instagram_url" name="instagram_url" value={editForm.instagram_url} onChange={handleEditChange} placeholder="Instagram URL" />
    </div>
  </div>
  <div className="flex justify-end gap-2 mt-4">
    <Button variant="outline" onClick={onClose}>
      Cancel
    </Button>
    <Button 
      variant="default"
      onClick={handleSave}
      disabled={isPending}
    >
      {isPending ? "Saving..." : "Save Changes"}
    </Button>
    </div>
    </Modal>
    );
}