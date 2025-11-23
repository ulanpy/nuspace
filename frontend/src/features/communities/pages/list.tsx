"use client";

import { useState, useMemo } from "react";
import { Calendar, Plus } from "lucide-react";

import { LoginModal } from "@/components/molecules/login-modal";
import { CommunityCard } from "@/features/communities/components/CommunityCard";
import { InfiniteList } from "@/components/virtual/InfiniteList";
import { Community, CommunityCategory } from "@/features/shared/campus/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/atoms/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { CommunityModal } from "@/features/communities/components/CommunityModal";
import { useDebounce } from "@/hooks/useDebounce";

// import { useLocation } from "react-router-dom";
// import { useUser } from "@/hooks/use-user";

import MotionWrapper from "@/components/atoms/motion-wrapper";
// import { Badge } from "@/components/atoms/badge";

export default function CommunitiesPage() {
  // const location = useLocation();
  // const { user } = useUser();
  const [selectedCommunityCategory, setSelectedCommunityCategory] =
    useState<string>("All");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const debouncedKeyword = useDebounce(searchKeyword, 300);

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
          {/* Page Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="pr-4 sm:pr-0">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Communities</h1>
                <p className="text-gray-600 dark:text-gray-400">Join communities and connect with like-minded people</p>
              </div>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Create Community</span>
                <span className="sm:hidden">Create</span>
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-4">
            <Input
              type="text"
              placeholder="Search communities..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Optimized mobile filter section */}
          <div className="mb-6">
            <style>
              {`
              @keyframes wifiPulse {
                0%, 100% { stroke-opacity: 0.4; }
                50% { stroke-opacity: 1; }
              }
            `}
            </style>
            <div className="flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible">
              {/* Category filter - compact on mobile */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex-shrink-0 h-8 px-3 text-xs sm:h-10 sm:px-4 sm:text-sm justify-between bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <span className="hidden sm:inline">{selectedCommunityCategory}</span>
                    <span className="sm:hidden">{selectedCommunityCategory === "All" ? "All" : selectedCommunityCategory.slice(0, 8) + (selectedCommunityCategory.length > 8 ? "..." : "")}</span>
                    <ChevronDown className="h-3 w-3 ml-1 sm:h-4 sm:w-4 sm:ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  className="w-48 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  align="start"
                >
                  {categoryOptions.map((option) => (
                    <DropdownMenuItem
                      key={option}
                      onClick={() => handleCategoryChange(option)}
                      className={`
                        text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700
                        ${selectedCommunityCategory === option 
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                          : ''
                        }
                      `}
                    >
                      {option}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Open-only filter - compact on mobile */}
              <Button
                variant={isWifiFilterActive ? "default" : "outline"}
                size="sm"
                onClick={handleWifiButtonClick}
                className={`
                  flex-shrink-0 h-8 px-3 text-xs sm:h-10 sm:px-4 sm:text-sm gap-1 sm:gap-2
                  ${isWifiFilterActive 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-sm' 
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }
                `}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                  className="sm:w-4 sm:h-4"
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
                <span className="hidden sm:inline">Recruitment Open</span>
                <span className="sm:hidden">Recruitment Open</span>
              </Button>
            </div>

            {/* Active filters display - only show if there are active filters */}
            {isWifiFilterActive && (
              <div className="flex flex-wrap gap-2 mt-3">
                <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full text-xs">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
                    <path d="M5 12.55a11 11 0 0 1 14 0"/>
                    <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
                    <circle cx="12" cy="20" r="1.5" fill="currentColor"/>
                  </svg>
                  <span>Open Only</span>
                  <button
                    onClick={() => setIsWifiFilterActive(false)}
                    className="ml-1 hover:text-blue-600 dark:hover:text-blue-300"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Communities List with Search */}
          <div className="w-full overflow-x-hidden" id="communities-section">
          <InfiniteList
            queryKey={["campusCurrent", "communities", debouncedKeyword, selectedCategoryParam ?? "", isWifiFilterActive.toString()]}
            apiEndpoint="/communities"
            size={12}
            keyword={debouncedKeyword}
              additionalParams={{
                community_category: selectedCategoryParam,
                recruitment_status: isWifiFilterActive ? 'open' : null,
              }}
              renderItem={(community: Community) => (
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
              showSearch={false} // Disable built-in search since we have external search
              title="" // Remove the title since we have it in header now
              itemCountPlaceholder="" // Remove the items counter
              gridLayout={{
                mobile: 2,
                tablet: 2,
                desktop: 3
              }}
            />
          </div>

        {/* Create Community Modal */}
        <CommunityModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          isEditMode={false}
        />

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
