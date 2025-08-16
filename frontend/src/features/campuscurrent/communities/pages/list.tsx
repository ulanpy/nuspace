"use client";

import { useState, useEffect, useMemo } from "react";
import { Calendar } from "lucide-react";

import { LoginModal } from "@/components/molecules/login-modal";
import { CommunityCard } from "@/features/campuscurrent/communities/components/CommunityCard";
import { InfiniteList } from "@/components/virtual/InfiniteList";
import { Community, CommunityCategory } from "@/features/campuscurrent/types/types";
import { ConditionDropdown } from "@/components/molecules/condition-dropdown";
import { ROUTES } from "@/data/routes";
// import { useLocation } from "react-router-dom";
// import { Button } from "@/components/atoms/button";
// import { useUser } from "@/hooks/use-user";

import MotionWrapper from "@/components/atoms/motion-wrapper";
import { FilterContainer } from "@/components/organisms/filter-container";
// import { Badge } from "@/components/atoms/badge";

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

  const [showLoginModal] = useState(false);

  const categoryOptions = useMemo(
    () => ["All", ...Object.values(CommunityCategory)],
    []
  );



  const handleCategoryChange = (category: string) => {
    setSelectedCommunityCategory(category);
  };

  // removed dropdown handler

  const handleWifiButtonClick = () => {
    setIsWifiFilterActive((prev) => !prev);
  };

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
        {/* Infinite List for Communities */}
        <InfiniteList
          queryKey={["campusCurrent", "communities"]}
          apiEndpoint="/communities"
          size={12}
          additionalParams={{
            category: selectedCategoryParam,
            recruitment_status: isWifiFilterActive ? 'open' : null,
          }}
          renderItem={(community: Community, index: number) => (
            <div key={community.id} className="h-full">
              <CommunityCard community={community} />
            </div>
          )}
          renderEmpty={() => (
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
          )}
          showSearch={true}
          searchPlaceholder="Search communities..."
        />
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
