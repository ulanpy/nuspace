"use client";

import { useState } from "react";
import { EventCard } from "../../components/organisms/campuscurrent/EventCard";
import { mockClubs, mockEvents } from "../../data/events/mock-events-data";
import { LoginModal } from "../../components/molecules/login-modal";
import { useCommunities } from "@/features/campuscurrent/communities/hooks/use-communities";
import { SliderContainer } from "@/components/molecules/slider-container";
import { BaseCard } from "@/components/organisms/campuscurrent/BaseCard";
import { eventSections } from "@/data/events/event-sections";
import { CommunityCard } from "@/components/organisms/campuscurrent/CommunityCard";
import { GeneralSection } from "@/components/molecules/general-section";
import { ROUTES } from "@/data/routes";

// Main component
export default function NUEventsPage() {
  const [selectedCategory, setSelectedCategory] = useState<
    NuEvents.ClubType | ""
  >("");
  const [selectedPolicy, setSelectedPolicy] = useState<string>("all");
  const [showLoginModal, setShowLoginModal] = useState(false);

  const { setKeyword } = useCommunities();
  // Search logic using the custom hook

  return (
    <>
      {/* Popular clubs section */}
      <GeneralSection
        title="Popular Clubs"
        link={ROUTES.APPS.CAMPUS_CURRENT.COMMUNITIES}
      >
        {mockClubs.slice(0, 4).map((club) => (
          <CommunityCard key={club.id} club={club} />
        ))}
      </GeneralSection>
      {eventSections.map((section) => (
        <div key={section.title} className="mt-4">
          <SliderContainer
            title={section.title}
            link={section.link}
          >
            {mockEvents.map((event) => (
              <EventCard key={event.id} {...event} />
            ))}
          </SliderContainer>
        </div>
      ))}

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={() => {}}
        title="Login Required"
        message="You need to be logged in to add events to your Google Calendar."
      />
    </>
  );
}
