"use client";

import { useState, useEffect, useMemo } from "react";
import { Calendar } from "lucide-react";

import { LoginModal } from "@/components/molecules/login-modal";
import { CommunityCard } from "@/features/campuscurrent/communities/components/CommunityCard";
import { useCommunities } from "@/features/campuscurrent/communities/hooks/use-communities";
import {
  Community,
  CommunityCategory,
} from "@/features/campuscurrent/types/types";
import { ConditionDropdown } from "@/components/molecules/condition-dropdown";
import { SearchInput } from "@/components/molecules/search-input";
import { useSearchLogic } from "@/hooks/use-search-logic";
import { usePreSearchCommunities } from "@/features/campuscurrent/communities/api/hooks/usePreSearchCommunities";
import { ROUTES } from "@/data/routes";
import { useLocation } from "react-router-dom";

import MotionWrapper from "@/components/atoms/motion-wrapper";
import { Pagination } from "@/components/molecules/pagination";
import { FilterContainer } from "@/components/organisms/filter-container";

export default function CommunitiesPage() {
  const location = useLocation();
  const [selectedCommunityCategory, setSelectedCommunityCategory] =
    useState<string>("All");

  const normalize = (value: unknown) =>
    String(value ?? "").trim().toLowerCase();
  const alias = (value: string) => {
    switch (value) {
      case "sport":
        return "sports";
      case "arts":
        return "art";
      case "recreation":
        return "recreational";
      case "tech":
        return "technology";
      case "culture":
        return "cultural";
      case "prof":
        return "professional";
      default:
        return value;
    }
  };

  const selectedCategoryParam =
    selectedCommunityCategory === "All"
      ? null
      : alias(normalize(selectedCommunityCategory));

  const { communities, isLoading, isError, page, setPage, setKeyword } = useCommunities({
    category: selectedCategoryParam,
  });
  const [showLoginModal] = useState(false);

  const [filteredCommunities, setFilteredCommunities] = useState<Community[]>(
    []
  );
  const categoryOptions = useMemo(
    () => ["All", ...Object.values(CommunityCategory)],
    []
  );

  const { inputValue, setInputValue, preSearchedItems, handleSearch } =
    useSearchLogic({
      setKeyword,
      setPage,
      baseRoute: ROUTES.APPS.CAMPUS_CURRENT.COMMUNITIES,
      searchParam: "text",
      usePreSearch: usePreSearchCommunities,
      scrollTargetId: "communities-section",
    });

  useEffect(() => {
    if (!communities || !Array.isArray(communities.communities)) return;

    if (selectedCommunityCategory === "All") {
      setFilteredCommunities(communities.communities);
      return;
    }

    const normalizedSelected = alias(normalize(selectedCommunityCategory));
    const filtered = communities.communities.filter((community: Community) => {
      const normalizedCommunityCategory = alias(normalize(community.category));
      return normalizedCommunityCategory === normalizedSelected;
    });
    setFilteredCommunities(filtered);
  }, [selectedCommunityCategory, communities]);

  const handleCategoryChange = (category: string) => {
    setSelectedCommunityCategory(category);
    // Reset to first page on filter change to avoid empty results on later pages
    setPage(1);
  };

  // Also reset page when communities data changes and current page exceeds total pages
  useEffect(() => {
    if (communities?.total_pages && page > communities.total_pages) {
      setPage(1);
    }
  }, [communities?.total_pages, page, setPage]);

  // Ensure list is focused after navigation (e.g., pressing Enter or selecting a suggestion)
  useEffect(() => {
    const timer = setTimeout(() => {
      document
        .getElementById("communities-section")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
    return () => clearTimeout(timer);
  }, [location.search]);

  return (
    <MotionWrapper>
        <div className="w-full max-w-none">
          {/* Search + Category Filter in one row */}
          <FilterContainer className="z-[5] mb-6">
            <div className="flex w-full">
              <ConditionDropdown
                conditions={categoryOptions}
                selectedCondition={selectedCommunityCategory}
                setSelectedCondition={handleCategoryChange}
                disableNavigation={true}
              />
              <SearchInput
                inputValue={inputValue}
                setInputValue={setInputValue}
                preSearchedItems={preSearchedItems}
                handleSearch={handleSearch}
                setKeyword={setKeyword}
              />
            </div>
          </FilterContainer>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 items-stretch">
                {filteredCommunities.map((community) => (
                  <div key={community.id} className="h-full">
                    <CommunityCard community={community} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {communities && (communities as any).total_pages > 1 && (
            <Pagination
              length={(communities as any).total_pages}
              currentPage={page}
              onChange={setPage}
            />
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
