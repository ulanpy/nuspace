"use client";

import React, { useState } from "react";
import { Users, ChevronLeft, ChevronRight, Calendar, Plus } from "lucide-react";
import { Button } from "@/components/atoms/button";

import { LoginModal } from "@/components/molecules/login-modal";
import { CommunityCard } from "@/features/campuscurrent/communities/components/CommunityCard";
import { useCommunities } from "@/features/campuscurrent/communities/hooks/use-communities";
import { Community, CommunityCategory } from "@/features/campuscurrent/types/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/atoms/tabs";

import MotionWrapper from "@/components/atoms/motion-wrapper";
import { CommunityModal } from "@/features/campuscurrent/communities/components/CommunityModal";
import { useUser } from "@/hooks/use-user";

const CommunitiesCarousel = ({ 
  communities, 
  isLoading 
}: { 
  communities: Community[]; 
  isLoading: boolean; 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Auto-cycling effect
  React.useEffect(() => {
    if (communities && communities.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % Math.min(communities.length, 3));
      }, 4000); // Change slide every 4 seconds
      
      return () => clearInterval(interval);
    }
  }, [communities]);

  // Helper function to get profile image
  const getProfileImage = (community: Community) => {
    const profileMedia = community.media?.find(
      (media) => 
        media.entity_type === "communities" && 
        media.media_format === "profile"
    );
    return profileMedia?.url || "/placeholder.svg";
  };

  // Helper function to get banner image
  const getBannerImage = (community: Community) => {
    const bannerMedia = community.media?.find(
      (media) => 
        media.entity_type === "communities" && 
        media.media_format === "banner"
    );
    return bannerMedia?.url || "/placeholder.svg";
  };
  
  if (isLoading) {
    return (
      <div className="w-full max-w-md aspect-video bg-white/10 rounded-lg overflow-hidden animate-pulse">
        <div className="w-full h-full bg-white/20"></div>
      </div>
    );
  }

  if (!communities || communities.length === 0) {
    return (
      <div className="w-full max-w-md aspect-video bg-white/10 rounded-lg overflow-hidden flex items-center justify-center">
        <div className="text-center text-white/70">
          <Users className="h-12 w-12 mx-auto mb-2" />
          <p className="text-sm">No communities available</p>
        </div>
      </div>
    );
  }

  // Take first 3 communities
  const displayCommunities = communities.slice(0, 3);
  
  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % displayCommunities.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + displayCommunities.length) % displayCommunities.length);
  };

  return (
    <div className="relative w-full max-w-md aspect-video bg-white/10 rounded-lg overflow-hidden">
      {/* Banner background - positioned behind and at upper side */}
      <div className="absolute inset-0">
        {displayCommunities.map((community, index) => (
          <div
            key={`banner-${community.id}`}
            className={`absolute inset-0 transition-transform duration-700 ease-in-out ${
              index === currentIndex 
                ? 'translate-x-0' 
                : index < currentIndex 
                  ? '-translate-x-full' 
                  : 'translate-x-full'
            }`}
          >
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url(${getBannerImage(community)})`,
              }}
            />
            {/* Subtle gradient overlay for banner */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent" />
          </div>
        ))}
      </div>

      {/* Main carousel content with sliding transitions */}
      <div className="relative w-full h-full">
        {displayCommunities.map((community, index) => (
          <div
            key={community.id}
            className={`absolute inset-0 transition-transform duration-700 ease-in-out ${
              index === currentIndex 
                ? 'translate-x-0' 
                : index < currentIndex 
                  ? '-translate-x-full' 
                  : 'translate-x-full'
            }`}
          >
            {/* Content card with LinkedIn-style design */}
            <div className="relative z-10 w-full h-full p-6 flex flex-col justify-between">
              {/* Header with profile image positioned over banner */}
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0 border-4 border-white shadow-lg">
                  <img
                    src={getProfileImage(community)}
                    alt={`${community.name} profile`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg";
                    }}
                  />
                </div>
                <div className="flex-1 pt-2">
                  <h3 className="text-xl font-bold text-white mb-2 line-clamp-2 drop-shadow-lg">
                    {community.name}
                  </h3>
                  <p className="text-white/90 text-sm line-clamp-3 drop-shadow-md">
                    {community.description}
                  </p>
                </div>
              </div>
              
              {/* Footer with badges and indicators */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-white/25 backdrop-blur-sm text-white text-xs rounded-full capitalize font-medium">
                    {community.category}
                  </span>
                  <span className="px-3 py-1 bg-white/25 backdrop-blur-sm text-white text-xs rounded-full capitalize font-medium">
                    {community.type}
                  </span>
                </div>
                <div className="flex gap-1">
                  {displayCommunities.map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        i === currentIndex ? 'bg-white' : 'bg-white/40'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Navigation arrows */}
      {displayCommunities.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-colors z-20 backdrop-blur-sm"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-colors z-20 backdrop-blur-sm"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
};

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
  const { user } = useUser();

  const [currentPage] = useState(1);
  const [totalPages] = useState(1);
  const [selectedCommunityCategory, setSelectedCommunityCategory] = useState<CommunityCategory>(CommunityCategory.academic);
  const [showLoginModal] = useState(false);
  const [isCreateCommunityModalOpen, setIsCreateCommunityModalOpen] = useState(false);
  

  

  
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
                    onClick={() => window.open('https://forms.google.com/your-form-url', '_blank')}
                    className="border-white text-black hover:bg-white/10 dark:text-white dark:border-white"
                  >
                    <Button className="flex items-center gap-2">
                      <img src="/src/assets/images/google_form.png" alt="Google Forms" className="h-4 w-4 object-contain" />
                      Community Registration Form
                    </Button>
                  </Button>
                </div>
              </div>
              <div className="lg:flex hidden justify-end">
                <div className="w-full max-w-md">
                  <CommunitiesCarousel communities={communities?.communities || []} isLoading={isLoading} />
                </div>
              </div>
            </div>
          </div>
        </section>
      </MotionWrapper>

      <MotionWrapper>
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Communities</h1>
          {user && (
            <Button 
              onClick={() => setIsCreateCommunityModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Community
            </Button>
          )}
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

        {/* Create Community Modal */}
        <CommunityModal
          isOpen={isCreateCommunityModalOpen}
          onClose={() => setIsCreateCommunityModalOpen(false)}
          isEditMode={false}
        />
      </MotionWrapper>
    </>
  );
}
