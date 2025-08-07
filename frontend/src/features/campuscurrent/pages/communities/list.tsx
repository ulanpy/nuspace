"use client";

import { useState } from "react";
import { Users, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Card } from "@/components/atoms/card";
import { LoginModal } from "@/components/molecules/login-modal";
import { CommunityCard } from "@/features/campuscurrent/components/CommunityCard";
import { useCommunities } from "@/features/campuscurrent/hooks/communities/use-communities";
import { Community, CommunityCategory } from "@/features/campuscurrent/types/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/atoms/tabs";
import { useNavigate } from "react-router-dom";
import MotionWrapper from "@/components/atoms/motion-wrapper";

const CommuntiesGrid = ({
  isLoading,
  isError,
  communities,
  category,
}: {
  isLoading: boolean;
  isError: boolean;
  communities: Types.PaginatedResponse<Community, "communities"> | null;
  category: CommunityCategory;
}) => {
  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isError) {
    return <div>Error loading communities.</div>;
  }

  // Filter communities by category
  const filteredCommunities = communities?.communities?.filter(
    (community) => community.category === category
  ) || [];

  if (filteredCommunities.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No {category} communities found</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          There are no {category} communities available at the moment.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-6">
      {filteredCommunities.map((community) => (
        <CommunityCard key={community.id} community={community} />
      ))}
    </div>
  );
};

export default function CommunitiesPage() {
  const { communities, isLoading, isError } = useCommunities();
  const [searchQuery] = useState("");
  const [currentPage] = useState(1);
  const [totalPages] = useState(1);
  const [selectedCommunityCategory, setSelectedCommunityCategory] = useState<CommunityCategory>(CommunityCategory.academic);
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
  
  const navigate = useNavigate();
  
  return (
    <>
      {/* Hero Section */}
      <MotionWrapper>
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
                    onClick={() => document.getElementById('communities-section')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    <Button>View Communities</Button>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    onClick={() => navigate("create-community")}
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
      </MotionWrapper>

      <MotionWrapper>
        {/* Header with Create Community Button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold">Communities</h1>
          <Button
            onClick={() => window.open('https://forms.google.com/your-form-url', '_blank')}
            className="flex items-center gap-2 bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 text-sm px-3 py-2 w-full sm:w-auto"
          >
            <img src="/src/assets/images/google_form.png" alt="Google Forms" className="h-4 w-4 object-contain" />
            <span className="hidden sm:inline">Submit Community Form</span>
            <span className="sm:hidden">Submit Form</span>
          </Button>
        </div>

        {/* Responsive Tabs */}
        <div className="mb-6" id="communities-section">
          <Tabs
            value={selectedCommunityCategory}
            className="w-full"
            onValueChange={(value) => setSelectedCommunityCategory(value as CommunityCategory)}
          >
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6 h-auto p-1 bg-muted/20">
              <TabsTrigger 
                value={CommunityCategory.academic}
                className="text-xs md:text-sm px-2 py-2 data-[state=active]:bg-background data-[state=active]:text-foreground"
              >
                Academic
              </TabsTrigger>
              <TabsTrigger 
                value={CommunityCategory.professional}
                className="text-xs md:text-sm px-2 py-2 data-[state=active]:bg-background data-[state=active]:text-foreground"
              >
                Professional
              </TabsTrigger>
              <TabsTrigger 
                value={CommunityCategory.recreational}
                className="text-xs md:text-sm px-2 py-2 data-[state=active]:bg-background data-[state=active]:text-foreground"
              >
                Recreational
              </TabsTrigger>
              <TabsTrigger 
                value={CommunityCategory.cultural}
                className="text-xs md:text-sm px-2 py-2 data-[state=active]:bg-background data-[state=active]:text-foreground"
              >
                Cultural
              </TabsTrigger>
              <TabsTrigger 
                value={CommunityCategory.sports}
                className="text-xs md:text-sm px-2 py-2 data-[state=active]:bg-background data-[state=active]:text-foreground"
              >
                Sports
              </TabsTrigger>
              <TabsTrigger 
                value={CommunityCategory.art}
                className="text-xs md:text-sm px-2 py-2 data-[state=active]:bg-background data-[state=active]:text-foreground"
              >
                Art
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value={CommunityCategory.academic} className="mt-4">
              <CommuntiesGrid
                isLoading={isLoading}
                isError={isError}
                communities={communities}
                category={CommunityCategory.academic}
              />
            </TabsContent>
            <TabsContent value={CommunityCategory.professional} className="mt-4">
              <CommuntiesGrid
                isLoading={isLoading}
                isError={isError}
                communities={communities}
                category={CommunityCategory.professional}
              />
            </TabsContent>
            <TabsContent value={CommunityCategory.recreational} className="mt-4">
              <CommuntiesGrid
                isLoading={isLoading}
                isError={isError}
                communities={communities}
                category={CommunityCategory.recreational}
              />
            </TabsContent>
            <TabsContent value={CommunityCategory.cultural} className="mt-4">
              <CommuntiesGrid
                isLoading={isLoading}
                isError={isError}
                communities={communities}
                category={CommunityCategory.cultural}
              />
            </TabsContent>
            <TabsContent value={CommunityCategory.sports} className="mt-4">
              <CommuntiesGrid
                isLoading={isLoading}
                isError={isError}
                communities={communities}
                category={CommunityCategory.sports}
              />
            </TabsContent>
            <TabsContent value={CommunityCategory.art} className="mt-4">
              <CommuntiesGrid
                isLoading={isLoading}
                isError={isError}
                communities={communities}
                category={CommunityCategory.art}
              />
            </TabsContent>
          </Tabs>
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

        {/* Login Modal */}
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => {}}
          onSuccess={() => {}}
          title="Login Required"
          message="You need to be logged in to follow communities."
        />
      </MotionWrapper>
    </>
  );
}
