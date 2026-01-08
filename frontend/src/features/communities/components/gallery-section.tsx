"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/atoms/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select";
import { Image, Plus, Loader2 } from "lucide-react";
import { useInfinitePhotoAlbums, PhotoAlbumType, PhotoAlbum } from '../hooks/use-infinite-photo-albums';
import { Card } from "@/components/atoms/card";
import { PhotoAlbumCard } from './photo-album-card';
import { AddAlbumModal } from './add-album-modal';
import { EditAlbumModal } from './edit-album-modal';

interface GallerySectionProps {
  communityId: number;
  canEdit: boolean;
}

const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All Albums" },
  { value: "event_photos", label: "Event Photos" },
  { value: "club_photoshoot", label: "Club Photoshoot" },
  { value: "other", label: "Other" },
];

export function GallerySection({ communityId, canEdit }: GallerySectionProps) {
  const [filterType, setFilterType] = useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<PhotoAlbum | null>(null);

  const {
    albums,
    isLoading,
    isError,
    isFetchingNextPage,
    hasNextPage,
    loadMoreRef,
  } = useInfinitePhotoAlbums({
    communityId,
    size: 20,
    albumType: filterType === "all" ? null : (filterType as PhotoAlbumType),
  });

  const handleFilterChange = (value: string) => {
    setFilterType(value);
  };

  const handleEditAlbum = useCallback((album: PhotoAlbum) => {
    setEditingAlbum(album);
  }, []);

  const handleCloseAddModal = useCallback(() => {
    setIsAddModalOpen(false);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setEditingAlbum(null);
  }, []);

  return (
      <Card className="p-0 overflow-hidden">
      {/* Header with Filter and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-b">
        <div className="flex items-center gap-2">
          <Image className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Gallery</h3>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Filter Dropdown */}
          <Select value={filterType} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              {FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Action Buttons */}
          {canEdit && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Album
            </Button>
          )}
        </div>
      </div>

      {/* Albums Grid */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <div className="text-center py-12">
            <Image className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h3 className="text-lg font-medium mb-2">Error loading albums</h3>
            <p className="text-sm text-muted-foreground">
              There was a problem loading the photo albums. Please try again.
            </p>
          </div>
        ) : albums.length === 0 ? (
          <div className="text-center py-12">
            <Image className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No photo albums yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
              {filterType !== "all"
                ? `No ${FILTER_OPTIONS.find((o) => o.value === filterType)?.label.toLowerCase()} albums have been added.`
                : "This community hasn't added any photo albums yet."}
            </p>
            {canEdit && filterType === "all" && (
              <Button
                variant="outline"
                onClick={() => setIsAddModalOpen(true)}
                className="mt-2"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Album
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Albums Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {albums.map((album) => (
                <PhotoAlbumCard
                  key={album.id}
                  album={album}
                  communityId={communityId}
                  canEdit={canEdit}
                  onEdit={handleEditAlbum}
                />
              ))}
            </div>

            {/* Load More / Infinite Scroll Trigger */}
            {hasNextPage && (
              <div
                ref={loadMoreRef}
                className="flex items-center justify-center py-8"
              >
                {isFetchingNextPage ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading more albums...</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Scroll to load more
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Album Modal */}
      <AddAlbumModal
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        communityId={communityId}
      />

      {/* Edit Album Modal */}
      {editingAlbum && (
        <EditAlbumModal
          isOpen={!!editingAlbum}
          onClose={handleCloseEditModal}
          communityId={communityId}
          album={editingAlbum}
        />
      )}
    </Card>
  );
}
