"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Users, Check } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Modal } from "@/components/atoms/modal";
import { Input } from "@/components/atoms/input";
import { Card } from "@/components/atoms/card";
import { VerificationBadge } from "@/components/molecules/verification-badge";
import { useSearchCommunities } from "@/features/communities/hooks/use-search-communities";
import { Community } from "@/features/shared/campus/types";

const getCommunityProfileImage = (community: Community) =>
  community.media?.find((m) => m.media_format === "profile")?.url ||
  community.media?.[0]?.url ||
  null;

interface CommunitySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (community: Community) => void;
  onClear?: () => void;
  selectedCommunityId?: number;
}

export function CommunitySelectionModal({
  isOpen,
  onClose,
  onSelect,
  onClear,
  selectedCommunityId
}: CommunitySelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 200);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const { communities, isLoading, isError } = useSearchCommunities({
    keyword: debouncedQuery,
    size: debouncedQuery ? 10 : 20,
  });

  const filteredCommunities = useMemo(() => communities ?? [], [communities]);

  const handleSelect = (community: Community) => {
    onSelect(community);
    onClose();
  };

  const CommunityCard = ({ community }: { community: Community }) => {
    const profileImg = getCommunityProfileImage(community);
    const isSelected = selectedCommunityId === community.id;

    return (
      <Card
        className={`p-4 cursor-pointer transition-all hover:bg-accent/50 ${
          isSelected ? 'ring-2 ring-primary bg-accent/30' : ''
        }`}
        onClick={() => handleSelect(community)}
      >
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {profileImg ? (
              <img
                src={profileImg}
                alt={community.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Users className="h-6 w-6 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm mb-1 truncate inline-flex items-center gap-1">
              <span className="truncate">{community.name}</span>
              {community.verified && <VerificationBadge size={13} />}
            </h3>
            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
              {community.description}
            </p>
            <div className="flex items-center gap-2 text-xs">
              <span className="capitalize font-medium bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
                {community.category}
              </span>
              <span className="capitalize text-muted-foreground">
                {community.type}
              </span>
            </div>
          </div>
          {isSelected && (
            <Check className="h-4 w-4 text-primary flex-shrink-0 mt-1" />
          )}
        </div>
      </Card>
    );
  };

  const LoadingSkeleton = () => (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
              <div className="h-3 bg-muted animate-pulse rounded w-full" />
              <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Community"
      className="max-w-2xl max-h-[80vh]"
    >
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="community-search"
            type="text"
            placeholder="Search by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>

        {/* Communities List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {isLoading ? (
            <LoadingSkeleton />
          ) : isError ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Failed to load communities. Please try again.</p>
            </div>
          ) : filteredCommunities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>
                {searchQuery ? "No communities match your search." : "No communities available."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCommunities.map((community) => (
                <CommunityCard key={community.id} community={community} />
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          {selectedCommunityId && onClear ? (
            <Button
              variant="ghost"
              onClick={() => {
                onClear();
                onClose();
              }}
            >
              Clear selection
            </Button>
          ) : (
            <span />
          )}
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}