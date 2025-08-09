"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/atoms/button";

import { LoginModal } from "@/components/molecules/login-modal";
import { CommunityCard } from "@/features/campuscurrent/communities/components/CommunityCard";
import { useCommunities } from "@/features/campuscurrent/communities/hooks/use-communities";
import {
  Community,
  CommunityCategory,
} from "@/features/campuscurrent/types/types";
import { ConditionDropdown } from "@/components/molecules/condition-dropdown";

import MotionWrapper from "@/components/atoms/motion-wrapper";

export default function CommunitiesPage() {
  const { communities, isLoading, isError } = useCommunities();

  const [currentPage] = useState(1);
  const [totalPages] = useState(1);
  const [selectedCommunityCategory, setSelectedCommunityCategory] =
    useState<string>("All");
  const [showLoginModal] = useState(false);

  const [filteredCommunities, setFilteredCommunities] = useState<Community[]>(
    []
  );
  const categoryOptions = useMemo(
    () => ["All", ...Object.values(CommunityCategory)],
    []
  );

  useEffect(() => {
    if (!communities?.communities) return;

    if (selectedCommunityCategory === "All") {
      setFilteredCommunities(communities.communities);
      return;
    }

    const filtered = communities.communities.filter(
      (community) =>
        community.category === (selectedCommunityCategory as CommunityCategory)
    );
    setFilteredCommunities(filtered);
  }, [selectedCommunityCategory, communities]);

  const handleCategoryChange = (category: string) => {
    setSelectedCommunityCategory(category);
  };

  return (
    <MotionWrapper>
        <div className="w-full max-w-none">
          {/* Centered Filter Dropdown */}
          <div className="mb-6 flex justify-center">
            <ConditionDropdown
              conditions={categoryOptions}
              selectedCondition={selectedCommunityCategory}
              setSelectedCondition={handleCategoryChange}
              disableNavigation={true}
            />
          </div>
      <div className="w-full overflow-x-hidden" id="communities-section">
          {/* Communities Grid */}
          <div className="w-full">
            {isLoading ? (
              <div className="text-center py-12">Loading...</div>
            ) : isError ? (
              <div className="text-center py-12">
                Error loading communities.
              </div>
            ) : filteredCommunities.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {selectedCommunityCategory === "All"
                    ? "No communities found"
                    : `No ${selectedCommunityCategory} communities found`}
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  There are no {selectedCommunityCategory} communities available
                  at the moment.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {filteredCommunities.map((community) => (
                  <CommunityCard key={community.id} community={community} />
                ))}
              </div>
            )}
          </div>

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
        </div>

        {/* Login Modal */}
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => {}}
          onSuccess={() => {}}
          title="Login Required"
          message="You need to be logged in to follow communities."
        />
      </div>
    </MotionWrapper>
  );
}
