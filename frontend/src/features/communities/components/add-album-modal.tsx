"use client";

import { useState } from "react";
import { Modal } from "@/components/atoms/modal";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Textarea } from "@/components/atoms/textarea";
import { Label } from "@/components/atoms/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select";
import { useToast } from "@/hooks/use-toast";
import { Save, ExternalLink, AlertCircle } from "lucide-react";
import { campuscurrentAPI } from '@/features/communities/api/communities-api';
import { useQueryClient } from "@tanstack/react-query";
import { PhotoAlbumType } from '../hooks/use-infinite-photo-albums';
import { Card } from "@/components/atoms/card";

interface AddAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  communityId: number;
}

const ALBUM_TYPE_OPTIONS: { value: PhotoAlbumType; label: string }[] = [
  { value: "event_photos", label: "Event Photos" },
  { value: "club_photoshoot", label: "Club Photoshoot" },
  { value: "other", label: "Other" },
];

export function AddAlbumModal({
  isOpen,
  onClose,
  communityId,
}: AddAlbumModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [albumUrl, setAlbumUrl] = useState("");
  const [description, setDescription] = useState("");
  const [albumType, setAlbumType] = useState<PhotoAlbumType>("other");

  const resetForm = () => {
    setAlbumUrl("");
    setDescription("");
    setAlbumType("other");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSave = async () => {
    if (!albumUrl.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a Google Photos album URL",
        variant: "destructive",
      });
      return;
    }

    // Basic URL validation
    try {
      new URL(albumUrl.startsWith("http") ? albumUrl : `https://${albumUrl}`);
    } catch {
      toast({
        title: "Validation Error",
        description: "Please enter a valid URL",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await campuscurrentAPI.createPhotoAlbum({
        community_id: communityId,
        album_url: albumUrl,
        description: description || undefined,
        album_type: albumType,
      });

      toast({
        title: "Success",
        description: "Photo album added successfully",
      });

      await queryClient.invalidateQueries({
        queryKey: ["campusCurrent", "community", String(communityId), "albums"],
      });

      handleClose();
    } catch (error: any) {
      console.error("Error creating photo album:", error);
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to add photo album",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Photo Album"
      description="Add a link to a Google Photos album"
    >
      <div className="space-y-4">
        {/* Info message */}
        <Card className="p-3 bg-muted/50 border-muted">
          <div className="flex gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              Album title, cover image, and date will be automatically fetched from Google Photos.
              Make sure your album is set to "Anyone with the link can view".
            </span>
          </div>
        </Card>

        {/* Album URL */}
        <div>
          <Label htmlFor="album-url">
            Google Photos Album URL <span className="text-destructive">*</span>
          </Label>
          <Input
            id="album-url"
            value={albumUrl}
            onChange={(e) => setAlbumUrl(e.target.value)}
            placeholder="https://photos.google.com/share/..."
            className="mt-1"
          />
        </div>

        {/* Album Type */}
        <div>
          <Label htmlFor="album-type">Album Type</Label>
          <Select value={albumType} onValueChange={(value) => setAlbumType(value as PhotoAlbumType)} defaultValue="other">
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALBUM_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="album-description">Description (optional)</Label>
          <Textarea
            id="album-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Spring 2025 Club Photoshoot"
            className="mt-1"
            rows={2}
          />
        </div>

        {/* Preview Link */}
        {albumUrl && (
          <a
            href={albumUrl.startsWith("http") ? albumUrl : `https://${albumUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Preview album in new tab
          </a>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Adding..." : "Add Album"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
