"use client";

import { useState } from "react";
import { Card } from "@/components/atoms/card";
import { Badge } from "@/components/atoms/badge";
import { ExternalLink, Image, Calendar, Edit2 } from "lucide-react";
import { PhotoAlbum, PhotoAlbumType } from '../hooks/use-infinite-photo-albums';

interface PhotoAlbumCardProps {
  album: PhotoAlbum;
  communityId: number;
  canEdit?: boolean;
  onEdit?: (album: PhotoAlbum) => void;
}

const ALBUM_TYPE_LABELS: Record<PhotoAlbumType, string> = {
  event_photos: "Event Photos",
  club_photoshoot: "Club Photoshoot",
  other: "Other",
};

const ALBUM_TYPE_COLORS: Record<PhotoAlbumType, string> = {
  event_photos: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  club_photoshoot: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  other: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

export function PhotoAlbumCard({ album, communityId, canEdit = false, onEdit }: PhotoAlbumCardProps) {
  const [imageError, setImageError] = useState(false);

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onEdit?.(album);
  };

  const thumbnail = album.album_thumbnail_url;
  
  // Use album_date if available, otherwise fall back to created_at
  const displayDate = album.album_date || album.created_at;
  const formattedDate = new Date(displayDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const handleClick = () => {
    window.open(
      album.album_url.startsWith("http") ? album.album_url : `https://${album.album_url}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 group"
      onClick={handleClick}
    >
      {/* Thumbnail / Placeholder */}
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {thumbnail && !imageError ? (
          <img
            src={thumbnail}
            alt={album.album_title || album.description || "Photo album"}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10">
            <Image className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}
        
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
          <ExternalLink className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        </div>

        {/* Album Type Badge */}
        <div className="absolute top-2 left-2">
          <Badge
            variant="outline"
            className={`${ALBUM_TYPE_COLORS[album.album_type]} backdrop-blur-sm bg-opacity-90`}
          >
            {ALBUM_TYPE_LABELS[album.album_type]}
          </Badge>
        </div>

        {/* Action Buttons (for community heads) */}
        {canEdit && (
          <div className="absolute top-2 right-2">
            <button
              onClick={handleEdit}
              className="p-1.5 bg-white/90 backdrop-blur-sm rounded-md shadow-sm hover:bg-white transition-colors"
              title="Edit album"
            >
              <Edit2 className="h-3.5 w-3.5 text-gray-700" />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        {/* Title */}
        <div className="min-h-[1.25rem]">
          <p className="text-sm font-medium line-clamp-1">
            {album.album_title || "Google Photos Album"}
          </p>
        </div>

        {/* Custom Description (if provided) */}
        {album.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {album.description}
          </p>
        )}

        {/* Date */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{album.album_date ? formattedDate : `Added ${formattedDate}`}</span>
        </div>

        {/* View Link */}
        <div className="pt-2 border-t">
          <span className="inline-flex items-center gap-1 text-xs text-primary font-medium group-hover:underline">
            <ExternalLink className="h-3 w-3" />
            View Album
          </span>
        </div>
      </div>
    </Card>
  );
}
