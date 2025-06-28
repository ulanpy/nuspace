"use client";

import { useState } from "react";
import { mockClubs } from "../../data/events/mock-events-data";
import { LoginModal } from "../../components/molecules/login-modal";
import { NavTabs } from "../../components/molecules/nav-tabs";
import { SearchInput } from "../../components/molecules/search-input";

import { CategorySlider } from "../../components/organisms/category-slider";
import { useSearchLogic } from "@/hooks/use-search-logic";
import { eventCategories } from "@/data/events/event-categories";
import { useCommunities } from "@/modules/nu-events/clubs/api/hooks/use-communities";
import { SliderContainer } from "@/components/molecules/slider-container";
import { EventCard } from "@/components/molecules/cards/event-card";
import { eventSections } from "@/data/events/event-sections";
import { CommunityCard } from "@/components/molecules/cards/community-card";
import { GeneralSection } from "@/components/molecules/general-section";
import { navTabs } from "@/data/events/nav-tabs";
import { eventPolicies } from "@/data/events/event-policies";
import { ConditionGroup } from "@/components/molecules/condition-group";

// Main component
export default function NUEventsPage() {
  const [selectedCategory, setSelectedCategory] = useState<
    NuEvents.ClubType | ""
  >("");
  const [selectedPolicy, setSelectedPolicy] = useState<string>("all");
  const [showLoginModal, setShowLoginModal] = useState(false);

  const { setKeyword } = useCommunities();
  // Search logic using the custom hook

  const { inputValue, setInputValue, handleSearch, preSearchedProducts } =
    useSearchLogic<NuEvents.ClubType>({
      setKeyword,
      baseRoute: "/apps/nu-events",
      searchParam: "search",
      setSelectedCategory,
    });

  return (
    <div className="space-y-4 pb-20">
      {/* Navigation Tabs */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm -mx-3 sm:-mx-4">
        <NavTabs tabs={navTabs} />
      </div>

      <div className="flex flex-col space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold">NU Events</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Discover events at Nazarbayev University
        </p>
      </div>

      {/* Search and filter */}
      <div className="flex flex-col gap-3">
        <div className="relative flex-1 mb-1">
          <SearchInput
            setKeyword={setKeyword}
            inputValue={inputValue}
            setInputValue={setInputValue}
            preSearchedProducts={preSearchedProducts}
            handleSearch={handleSearch}
            setSelectedCondition={
              setSelectedPolicy as (condition: string) => void
            }
          />
        </div>

        <ConditionGroup
          conditions={eventPolicies}
          selectedCondition={selectedPolicy}
          setSelectedCondition={setSelectedPolicy}
        />
        <CategorySlider
          categories={eventCategories}
          selectedCategory={selectedCategory}
          setSelectedCategory={() => {}}
          setInputValue={setInputValue}
          setSelectedCondition={
            setSelectedPolicy as (condition: string) => void
          }
        />
      </div>

      {eventSections.map((section) => (
        <div key={section.title} className="mt-4">
          <SliderContainer
            itemWidth={180}
            title={section.title}
            link={section.link}
          >
            {section.events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </SliderContainer>
        </div>
      ))}

      {/* Popular clubs section */}
      <GeneralSection title="Popular Clubs" link="/apps/nu-events/clubs">
        {mockClubs.slice(0, 4).map((club) => (
          <CommunityCard key={club.id} club={club} />
        ))}
      </GeneralSection>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={() => {}}
        title="Login Required"
        message="You need to be logged in to add events to your Google Calendar."
      />
    </div>
  );
}
