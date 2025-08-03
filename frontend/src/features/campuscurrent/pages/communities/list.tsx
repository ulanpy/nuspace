"use client";

import { useState } from "react";
import { Users, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Card } from "@/components/atoms/card";
import { LoginModal } from "@/components/molecules/login-modal";
import { ConditionGroup } from "@/components/molecules/condition-group";
import { SearchInput } from "@/components/molecules/search-input";
import { CommunityCard } from "@/features/campuscurrent/components/CommunityCard";
import { useCommunities } from "@/features/campuscurrent/hooks/communities/use-communities";
import { CommunityCategory } from "@/features/campuscurrent/types/types";

export default function CommunitiesPage() {
  const { communities, isLoading } = useCommunities();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage] = useState(1);
  const [totalPages] = useState(1);
  const [selectedCommunityCategory, setSelectedCommunityCategory] = useState<string>("");
  const [showLoginModal] = useState(false);

  // Loading skeleton
  const CommunitySkeleton = () => (
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
            setSelectedCondition={setSelectedCommunityCategory}
          />
        </div>
      </div>

      <ConditionGroup
        conditions={Object.values(CommunityCategory)}
        selectedCondition={selectedCommunityCategory}
        setSelectedCondition={setSelectedCommunityCategory}
      />

      {/* Communities Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <CommunitySkeleton key={index} />
          ))}
        </div>
      ) : communities?.communities.length || 0 > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {communities?.communities.map((community) => (
            <CommunityCard key={community.id} community={community} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No communities found</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {searchQuery
              ? "No communities match your search criteria. Try a different search term."
              : selectedCommunityCategory
              ? `No ${selectedCommunityCategory} communities found. Try a different filter.`
              : "There are no communities available at the moment."}
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
        message="You need to be logged in to follow communities."
      />
    </>
  );
}
