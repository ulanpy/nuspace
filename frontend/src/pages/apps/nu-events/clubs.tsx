"use client";

import { useState, useEffect } from "react";
import { Users, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Card } from "@/components/atoms/card";
import { LoginModal } from "@/components/molecules/login-modal";
import { ConditionGroup } from "@/components/molecules/condition-group";
import { clubCategories } from "@/data/clubs/club-categories";
import { SearchInput } from "@/components/molecules/search-input";
import { CommunityCard } from "@/components/molecules/cards/community-card";
import { useCommunities } from "@/modules/nu-events/clubs/api/hooks/use-communities";
// Helper function to get club type display text
const getClubCategoryDisplay = (type: string) => {
  return type.charAt(0).toUpperCase() + type.slice(1);
};

export default function ClubsPage() {
  const { communities, isLoading } = useCommunities();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedClubCategory, setSelectedClubCategory] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    clubId: number;
    action: () => void;
  } | null>(null);

  // Loading skeleton
  const ClubSkeleton = () => (
    <Card className="overflow-hidden h-full">
      <div className="aspect-square bg-muted animate-pulse" />
      <div className="p-4">
        <div className="h-5 bg-muted animate-pulse rounded w-3/4 mb-2" />
        <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
      </div>
    </Card>
  );
  return (
    <>
      {/* Search and filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchInput
            setKeyword={(query) => setSearchQuery(query)}
            inputValue={searchQuery}
            setInputValue={setSearchQuery}
            preSearchedProducts={[]}
            handleSearch={() => {}}
            setSelectedCondition={setSelectedClubCategory}
          />
        </div>
      </div>

      <ConditionGroup
        conditions={clubCategories}
        selectedCondition={selectedClubCategory}
        setSelectedCondition={setSelectedClubCategory}
      />

      {/* Clubs Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <ClubSkeleton key={index} />
          ))}
        </div>
      ) : communities?.communities.length || 0 > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {communities?.communities.map((club) => (
            <CommunityCard key={club.id} club={club} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No clubs found</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {searchQuery
              ? "No clubs match your search criteria. Try a different search term."
              : selectedClubCategory
              ? `No ${selectedClubCategory} clubs found. Try a different filter.`
              : "There are no clubs available at the moment."}
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {}}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="flex items-center text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {}}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => {}}
        onSuccess={() => {}}
        title="Login Required"
        message="You need to be logged in to follow clubs."
      />
    </>
  );
}
