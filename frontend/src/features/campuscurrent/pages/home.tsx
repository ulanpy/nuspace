"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { ROUTES } from "@/data/routes";

import { LoginModal } from "@/components/molecules/login-modal";
import { SliderContainer } from "@/components/molecules/slider-container";
import { GeneralSection } from "@/components/molecules/general-section";
import { Button } from "@/components/atoms/button";
import Footer from "@/components/molecules/footer";


import { EventCard } from "@/features/campuscurrent/components/EventCard";
import {
  mockClubs,
  mockEvents,
} from "@/features/campuscurrent/types/events/mock-events-data";
import { useCommunities } from "@/features/campuscurrent/hooks/communities/use-communities";
import { eventSections } from "@/features/campuscurrent/types/events/event-sections";
import { CommunityCard } from "@/features/campuscurrent/components/CommunityCard";
// import { BaseCard } from "@/features/campuscurrent/components/BaseCard";

// Main component
export default function NUEventsPage() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] = useState<
    CampusCurrent.ClubType | ""
  >("");
  const [selectedPolicy, setSelectedPolicy] = useState<string>("all");
  const { setKeyword } = useCommunities();

  return (
    <>
      {/* Hero Section */}
      <section className="py-12 md:py-20 bg-blue-700 text-white">
        <div className="container px-4 md:px-6">
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
            <div className="space-y-4">
              <h1 className="text-3xl md:text-5xl font-bold">
                Discover NU Campus Life
              </h1>
              <p className="text-lg md:text-xl text-white/90">
                Find events, join clubs, and connect with the Nazarbayev
                University community.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  asChild
                  size="lg"
                  className="bg-yellow-500 text-black hover:bg-yellow-600"
                  onClick={() => navigate("events")}
                >
                  <Button>Explore Events</Button>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("communities")}
                  className="border-whitebg-yellow-500 text-black hover:bg-white/10"
                >
                  <Button>Discover Clubs</Button>
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
          <SliderContainer title={section.title} link={section.link}>
            {mockEvents.map((event) => (
              <EventCard key={event.id} {...event} />
            ))}
          </SliderContainer>
        </div>
      ))}

      {/* Join as a Club Section */}
      <section className="py-12">
        <div className="container px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h2 className="text-2xl md:text-3xl font-bold">
              Are you a student club?
            </h2>
            <p className="text-muted-foreground">
              Sign up to create your club profile, post events, and connect with
              students.
            </p>
            <Button size="lg">Register Your Club</Button>
          </div>
        </div>
      </section>


      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={() => {}}
        title="Login Required"
        message="You need to be logged in to add events to your Google Calendar."
      />
      <Footer />
    </>
  );
}
