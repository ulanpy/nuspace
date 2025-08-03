"use client";

import { useState } from "react";
import { Users, ChevronLeft, ChevronRight, Calendar, Plus } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Card } from "@/components/atoms/card";
import { LoginModal } from "@/components/molecules/login-modal";
import { CommunityCard } from "@/features/campuscurrent/components/CommunityCard";
import { useCommunities } from "@/features/campuscurrent/hooks/communities/use-communities";
import { Community, CommunityCategory } from "@/features/campuscurrent/types/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/atoms/tabs";
import { useNavigate } from "react-router-dom";

const CommuntiesGrid = ({
  isLoading,
  isError,
  communities,
}: {
  isLoading: boolean;
  isError: boolean;
  communities: Types.PaginatedResponse<Community, "communities"> | null;
}) => {
  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isError) {
    return <div>Error loading communities.</div>;
  }

  if (!communities || communities.communities.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No communities found</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          There are no communities available at the moment.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-6">
      {(communities?.communities || []).map((community) => (
        <CommunityCard key={community.id} community={community} />
      ))}
    </div>
  );
};

export default function CommunitiesPage() {
  const { communities, isLoading, isError } = useCommunities();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage] = useState(1);
  const [totalPages] = useState(1);
  const [selectedCommunityCategory, setSelectedCommunityCategory] = useState<string>("");
  const [showLoginModal] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
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
  const navigate = useNavigate();
  return (
    <>
          {/* Hero Section */}
          <section className="py-12 md:py-20 bg-orange-700 text-white">
        <div className="container px-4 md:px-6">
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
            <div className="space-y-4">
              <h1 className="text-3xl md:text-5xl font-bold">
                Be part of the community
              </h1>
              <p className="text-lg md:text-xl text-white/90">
                Connect with like-minded peers and make lifelong memories through student clubs and organizations.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  asChild
                  size="lg"
                  className="bg-yellow-500 text-black hover:bg-yellow-600"
                  onClick={() => navigate("communities")}
                >
                  <Button>View Communities</Button>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("events")}
                  className="border-whitebg-yellow-500 text-black hover:bg-white/10"
                >
                  <Button>Or create your own</Button>
                </Button>
              </div>
            </div>
            <div className="lg:flex hidden justify-end">
              <div className="w-full max-w-md aspect-video bg-white/10 rounded-lg overflow-hidden">
                <img
                  src="/placeholder.svg"
                  alt="Campus events"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

    {/* Header with Create Community Button */}
    <div className="flex justify-between items-center mb-6">
    <h1 className="text-2xl font-bold">Communities</h1>
    <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2">
      <Plus className="h-4 w-4" />
      Create Community
    </Button>
  </div>


          <Tabs
          value={selectedCommunityCategory}
          className="mb-6"
          onValueChange={(value) => setSelectedCommunityCategory(value)}
        >
          <TabsList>
            <TabsTrigger value={CommunityCategory.academic}>Academic</TabsTrigger>
            <TabsTrigger value={CommunityCategory.professional}>Professional</TabsTrigger>
            <TabsTrigger value={CommunityCategory.recreational}>Recreational</TabsTrigger>
            <TabsTrigger value={CommunityCategory.cultural}>Cultural</TabsTrigger>
            <TabsTrigger value={CommunityCategory.sports}>Sports</TabsTrigger>
            <TabsTrigger value={CommunityCategory.art}>Art</TabsTrigger>
          </TabsList>
          <TabsContent value={CommunityCategory.academic} className="mt-4">
            <CommuntiesGrid
              isLoading={isLoading}
              isError={isError}
              communities={communities}
            />
          </TabsContent>
          <TabsContent value={CommunityCategory.professional}>
            <CommuntiesGrid
              isLoading={isLoading}
              isError={isError}
              communities={communities}
            />
          </TabsContent>
          <TabsContent value={CommunityCategory.recreational}>
            <CommuntiesGrid
              isLoading={isLoading}
              isError={isError}
              communities={communities}
            />
          </TabsContent>
          <TabsContent value={CommunityCategory.cultural}>
            <CommuntiesGrid
              isLoading={isLoading}
              isError={isError}
              communities={communities}
            />
          </TabsContent>
          <TabsContent value={CommunityCategory.sports}>
            <CommuntiesGrid
              isLoading={isLoading}
              isError={isError}
              communities={communities}
            />
          </TabsContent>
          <TabsContent value={CommunityCategory.art}>
            <CommuntiesGrid
              isLoading={isLoading}
              isError={isError}
              communities={communities}
            />
          </TabsContent>
        </Tabs>


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
