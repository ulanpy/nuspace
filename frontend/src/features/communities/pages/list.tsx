"use client";

import { useState, useMemo } from "react";
import { Calendar, Plus } from "lucide-react";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";

import { AuthWallModal } from "@/components/molecules/auth-wall-modal";
import { useAuthGate } from "@/hooks/use-auth-gate";
import { CommunityCard, CommunityCardSkeleton } from '@/features/communities/components/community-card';
import { InfiniteList } from '@/components/virtual/infinite-list';
import { Community, CommunityCategory } from "@/features/shared/campus/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CommunityModal } from '@/features/communities/components/community-modal';
import { useDebounce } from '@/hooks/use-debounce';
import MotionWrapper from "@/components/shared/motion-wrapper";

export default function CommunitiesPage() {
  const { requireAuth, isModalOpen, closeModal } = useAuthGate();
  const [selectedCommunityCategory, setSelectedCommunityCategory] =
    useState<string>("All");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const debouncedKeyword = useDebounce(searchKeyword, 300);

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

  const categoryOptions = useMemo(
    () => ["All", ...Object.values(CommunityCategory)],
    []
  );

  const handleCategoryChange = (category: string) => {
    setSelectedCommunityCategory(category);
  };

  return (
    <MotionWrapper>
      <PageContainer padding="default">
        <div className="flex items-center justify-between mb-6">
          <PageHeader title="Communities" subtitle="Join communities and connect with like-minded people" className="mb-0" />
            <Button
              onClick={() => requireAuth(() => setIsCreateModalOpen(true))}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create Community</span>
              <span className="sm:hidden">Create</span>
            </Button>
          </div>

        <div className="mb-4">
          <Input
            type="text"
            placeholder="Search communities..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0 h-8 px-3 text-xs sm:h-10 sm:px-4 sm:text-sm justify-between bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  <span className="hidden sm:inline capitalize">{selectedCommunityCategory}</span>
                  <span className="sm:hidden capitalize">{selectedCommunityCategory === "All" ? "All" : selectedCommunityCategory.slice(0, 8) + (selectedCommunityCategory.length > 8 ? "..." : "")}</span>
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
                        text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 capitalize
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
          </div>
        </div>

        <div className="w-full overflow-x-hidden" id="communities-section">
          <InfiniteList
            queryKey={["campusCurrent", "communities", debouncedKeyword, selectedCategoryParam ?? ""]}
            apiEndpoint="/communities"
            size={12}
            keyword={debouncedKeyword}
            additionalParams={{
              community_category: selectedCategoryParam,
            }}
            renderItem={(community: Community, index: number) => (
              <div key={community.id} className="h-full">
                <CommunityCard community={community} priorityImage={index < 3} />
              </div>
            )}
            renderLoading={() => (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                {Array.from({ length: 6 }, (_, i) => (
                  <CommunityCardSkeleton key={i} />
                ))}
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
            showSearch={false}
            title=""
            itemCountPlaceholder=""
            gridLayout={{
              mobile: 2,
              tablet: 2,
              desktop: 3
            }}
          />
        </div>

        <CommunityModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          isEditMode={false}
        />

        <AuthWallModal
          isOpen={isModalOpen}
          onClose={closeModal}
          message="You need to be logged in to create communities."
        />
      </PageContainer>
    </MotionWrapper>
  );
}
