import { useState, useEffect } from "react";
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
import { Save, Trash2, ExternalLink, AlertCircle } from "lucide-react";
import { campuscurrentAPI } from "@/features/communities/api/communitiesApi";
import { useQueryClient } from "@tanstack/react-query";
import { PhotoAlbum, PhotoAlbumType } from "../hooks/useInfinitePhotoAlbums";
import { Card } from "@/components/atoms/card";

interface EditAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  communityId: number;
  album: PhotoAlbum;
}

const ALBUM_TYPE_OPTIONS: { value: PhotoAlbumType; label: string }[] = [
  { value: "event_photos", label: "Event Photos" },
  { value: "club_photoshoot", label: "Club Photoshoot" },
  { value: "other", label: "Other" },
];

export function EditAlbumModal({
  isOpen,
  onClose,
  communityId,
  album,
}: EditAlbumModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [albumUrl, setAlbumUrl] = useState("");
  const [description, setDescription] = useState("");
  const [albumType, setAlbumType] = useState<PhotoAlbumType>("other");

  useEffect(() => {
    if (isOpen && album) {
      setAlbumUrl(album.album_url);
      setDescription(album.description || "");
      setAlbumType(album.album_type);
    }
  }, [isOpen, album]);

  const handleSave = async () => {
    if (!albumUrl.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a Google Photos album URL",
        variant: "destructive",
      });
      return;
    }

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
      await campuscurrentAPI.updatePhotoAlbum(communityId, album.id, {
        album_url: albumUrl,
        description: description || undefined,
        album_type: albumType,
      });

      toast({
        title: "Success",
        description: "Photo album updated successfully",
      });

      await queryClient.invalidateQueries({
        queryKey: ["campusCurrent", "community", String(communityId), "albums"],
      });

      onClose();
    } catch (error: any) {
      console.error("Error updating photo album:", error);
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to update photo album",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this album?")) return;

    setIsDeleting(true);
    try {
      await campuscurrentAPI.deletePhotoAlbum(communityId, album.id);

      toast({
        title: "Success",
        description: "Photo album deleted successfully",
      });

      await queryClient.invalidateQueries({
        queryKey: ["campusCurrent", "community", String(communityId), "albums"],
      });

      onClose();
    } catch (error: any) {
      console.error("Error deleting photo album:", error);
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to delete photo album",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Photo Album"
      description="Update album details"
    >
      <div className="space-y-4">
        {/* Info message */}
        <Card className="p-3 bg-muted/50 border-muted">
          <div className="flex gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              If you change the URL, metadata (title, thumbnail, date) will be re-fetched from Google Photos.
            </span>
          </div>
        </Card>

        {/* Current metadata preview */}
        {album.album_thumbnail_url && (
          <div className="flex gap-3 p-3 bg-muted/30 rounded-lg">
            <img
              src={album.album_thumbnail_url}
              alt={album.album_title || "Album thumbnail"}
              className="w-16 h-16 object-cover rounded"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{album.album_title || "Untitled Album"}</p>
              {album.album_date && (
                <p className="text-xs text-muted-foreground">
                  {new Date(album.album_date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Album URL */}
        <div>
          <Label htmlFor="edit-album-url">
            Google Photos Album URL <span className="text-destructive">*</span>
          </Label>
          <Input
            id="edit-album-url"
            value={albumUrl}
            onChange={(e) => setAlbumUrl(e.target.value)}
            placeholder="https://photos.google.com/share/..."
            className="mt-1"
          />
        </div>

        {/* Album Type */}
        <div>
          <Label htmlFor="edit-album-type">Album Type</Label>
          <Select value={albumType} onValueChange={(value) => setAlbumType(value as PhotoAlbumType)}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select type" />
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
          <Label htmlFor="edit-album-description">Description (optional)</Label>
          <Textarea
            id="edit-album-description"
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
            Open album in new tab
          </a>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isSaving || isDeleting}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving || isDeleting}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={isSaving || isDeleting}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
