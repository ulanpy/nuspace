"use client";

import { useState, useEffect, useMemo } from "react";
import { Calendar } from "lucide-react";

import { LoginModal } from "@/components/molecules/login-modal";
import { CommunityCard } from "@/features/campuscurrent/communities/components/CommunityCard";
import { useCommunities } from "@/features/campuscurrent/communities/hooks/use-communities";
import { Community, CommunityCategory } from "@/features/campuscurrent/types/types";
import { ConditionDropdown } from "@/components/molecules/condition-dropdown";
import { SearchInput } from "@/components/molecules/search-input";
import { useSearchLogic } from "@/hooks/use-search-logic";
import { usePreSearchCommunities } from "@/features/campuscurrent/communities/api/hooks/usePreSearchCommunities";
import { ROUTES } from "@/data/routes";
// import { useLocation } from "react-router-dom";
// import { Button } from "@/components/atoms/button";
// import { useUser } from "@/hooks/use-user";

import MotionWrapper from "@/components/atoms/motion-wrapper";
import { Pagination } from "@/components/molecules/pagination";
import { FilterContainer } from "@/components/organisms/filter-container";
import { Badge } from "@/components/atoms/badge";

export default function CommunitiesPage() {
  // const location = useLocation();
  // const { user } = useUser();
  const [selectedCommunityCategory, setSelectedCommunityCategory] =
    useState<string>("All");
  // const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Open-only filter toggle
  const [isWifiFilterActive, setIsWifiFilterActive] = useState<boolean>(false);

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

    let next = communities.communities as Community[];

    if (selectedCommunityCategory !== "All") {
      const normalizedSelected = alias(normalize(selectedCommunityCategory));
      next = next.filter((community: Community) => {
        const normalizedCommunityCategory = alias(normalize(community.category));
        return normalizedCommunityCategory === normalizedSelected;
      });
    }

    if (isWifiFilterActive) {
      next = next.filter(
        (community: Community) => normalize(community.recruitment_status) === "open"
      );
    }

    setFilteredCommunities(next);
  }, [selectedCommunityCategory, isWifiFilterActive, communities]);

  const handleCategoryChange = (category: string) => {
    setSelectedCommunityCategory(category);
    // Reset to first page on filter change to avoid empty results on later pages
    setPage(1);
  };

  // removed dropdown handler

  const handleWifiButtonClick = () => {
    setIsWifiFilterActive((prev) => !prev);
    setPage(1);
  };

  // Also reset page when communities data changes and current page exceeds total pages
  useEffect(() => {
    if (communities?.total_pages && page > communities.total_pages) {
      setPage(1);
    }
  }, [communities?.total_pages, page, setPage]);

  // Removed auto-scroll on navigation to prevent jumping down to communities list by default

  return (
    <MotionWrapper>
        <div className="w-full max-w-none">
          {/* Search + Category Filter in one row */}
          <FilterContainer className="z-[5] mb-6">
            <style>
              {`
              @keyframes wifiPulse {
                0%, 100% { stroke-opacity: 0.4; }
                50% { stroke-opacity: 1; }
              }
            `}
            </style>
            <div className="flex w-full gap-4 items-center">
              <div className="flex flex-1 gap-2">
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleWifiButtonClick}
                  className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
                    isWifiFilterActive
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                      : "border-muted bg-background"
                  }`}
                  aria-pressed={isWifiFilterActive}
                  aria-label="Toggle open-only communities"
                  title={isWifiFilterActive ? "Showing open-only" : "Show open-only"}
                >
                  {/* WiFi arcs icon */}
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path
                      d="M1.42 9a16 16 0 0 1 21.16 0"
                      style={{
                        animation: isWifiFilterActive
                          ? "wifiPulse 1.2s ease-in-out infinite"
                          : undefined,
                        animationDelay: isWifiFilterActive ? "0.3s" : undefined,
                      }}
                    />
                    <path
                      d="M5 12.55a11 11 0 0 1 14 0"
                      style={{
                        animation: isWifiFilterActive
                          ? "wifiPulse 1.2s ease-in-out infinite"
                          : undefined,
                        animationDelay: isWifiFilterActive ? "0.15s" : undefined,
                      }}
                    />
                    <path
                      d="M8.53 16.11a6 6 0 0 1 6.95 0"
                      style={{
                        animation: isWifiFilterActive
                          ? "wifiPulse 1.2s ease-in-out infinite"
                          : undefined,
                        animationDelay: isWifiFilterActive ? "0s" : undefined,
                      }}
                    />
                    <circle cx="12" cy="20" r="1.5" fill="currentColor" />
                  </svg>
                  <span
                    className={`${
                      isWifiFilterActive
                        ? "absolute inset-0 rounded-full ring-2 ring-blue-400/60"
                        : ""
                    }`}
                    aria-hidden
                  />
                </button>
              </div>
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
