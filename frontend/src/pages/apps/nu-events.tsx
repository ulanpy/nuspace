"use client";

import { useState } from "react";
import { mockClubs } from "../../data/events/mock-events-data";
import { LoginModal } from "../../components/molecules/login-modal";
import { useCommunities } from "@/modules/nu-events/clubs/api/hooks/use-communities";
import { SliderContainer } from "@/components/molecules/slider-container";
import { BaseCard } from "@/components/molecules/cards/base-card";
import { eventSections } from "@/data/events/event-sections";
import { CommunityCard } from "@/components/molecules/cards/community-card";
import { GeneralSection } from "@/components/molecules/general-section";

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
      {eventSections.map((section) => (
        <div key={section.title} className="mt-4">
          <SliderContainer
            itemWidth={180}
            title={section.title}
            link={section.link}
          >
            {section.events.map((event) => (
              <BaseCard key={event.id} event={event} />
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
    </>
  );
}
