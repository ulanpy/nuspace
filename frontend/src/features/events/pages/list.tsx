"use client";

import MotionWrapper from "@/components/atoms/motion-wrapper";
import { EventCard, EventCardSkeleton } from '@/features/events/components/event-card';
import { InfiniteList } from '@/components/virtual/infinite-list';
import { Event } from "@/features/shared/campus/types";
import { useState } from "react";
import { Calendar, ChevronDown, Users, X } from "lucide-react";
import { PageContainer } from "@/components/atoms/page-container";
import { PageHeader } from "@/components/atoms/page-header";
import { EventModal } from '@/features/events/components/event-modal';
import { TimeFilter } from '@/features/events/api/events-api';
import { Button } from "@/components/atoms/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/atoms/dropdown-menu";
import { TelegramConnectCard } from '@/features/sgotinish/components/telegram-connect-card';
import { useUser } from '@/hooks/use-user';
import { useAuthGate } from '@/hooks/use-auth-gate';
import { AuthWallModal } from '@/components/molecules/auth-wall-modal';

const renderEmptyEvents = (
  filterType: string,
  eventTypeFilter: string | null,
  clearFilters: () => void,
) => () => (
  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
      <Calendar className="h-6 w-6" aria-hidden="true" />
    </div>
    <h3 className="mb-2 text-lg font-bold">No events match these filters</h3>
    <p className="mb-5 max-w-[52ch] text-sm text-muted-foreground">
      {eventTypeFilter === "recruitment" && filterType === "upcoming" && "No upcoming recruitment events at the moment."}
      {eventTypeFilter === "recruitment" && filterType === "today" && "No recruitment events scheduled for today."}
      {eventTypeFilter === "recruitment" && filterType === "week" && "No recruitment events scheduled for this week."}
      {eventTypeFilter === "recruitment" && filterType === "month" && "No recruitment events scheduled for this month."}
      {!eventTypeFilter && filterType === "upcoming" && "No upcoming events at the moment."}
      {!eventTypeFilter && filterType === "today" && "No events scheduled for today."}
      {!eventTypeFilter && filterType === "week" && "No events scheduled for this week."}
      {!eventTypeFilter && filterType === "month" && "No events scheduled for this month."}
    </p>
    {(eventTypeFilter || filterType !== "upcoming") && (
      <Button variant="outline" size="sm" onClick={clearFilters}>
        Clear filters
      </Button>
    )}
  </div>
);

const filterOptions = [
  { value: "upcoming", label: "All Upcoming" },
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
];

export default function Events() {
  const { user } = useUser();
  const { requireAuth, isModalOpen, closeModal } = useAuthGate();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("upcoming");
  const [eventTypeFilter, setEventTypeFilter] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const currentFilterLabel = filterOptions.find(option => option.value === timeFilter)?.label || "All Upcoming";

  const clearFilters = () => {
    setTimeFilter("upcoming");
    setEventTypeFilter(null);
  };

  const renderEventCard = (event: Event, index: number) => (
    <EventCard
      {...event}
      priorityImage={index < 4}
    />
  );

  const renderEventsLoading = () => (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );

  return (
    <MotionWrapper>
      <PageContainer padding="default">
        <div className="flex items-center justify-between mb-6">
          <PageHeader title="Events" subtitle="Find what is happening across campus." className="mb-0" />
            <Button
              onClick={() => requireAuth(() => setIsCreateModalOpen(true))}
              size="sm"
              className="flex items-center gap-2 px-4"
            >
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Create Event</span>
              <span className="sm:hidden">Create</span>
            </Button>
          </div>

        <main>
          {user && !user.tg_id && (
            <TelegramConnectCard
              user={user}
              className="mb-6"
              title="Connect Telegram to publish instantly"
              description="Create and publish campus events through nuspacebot without extra steps."
              dismissKey="nuspace_events_tg_banner_dismissed"
            />
          )}

          <div className="mb-6">
            <div className="flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 flex-shrink-0 justify-between px-3 text-xs sm:px-4 sm:text-sm"
                  >
                    <span className="hidden sm:inline">{currentFilterLabel}</span>
                    <span className="sm:hidden">{timeFilter === "upcoming" ? "Upcoming" : timeFilter === "today" ? "Today" : timeFilter === "week" ? "Week" : timeFilter === "month" ? "Month" : "Upcoming"}</span>
                    <ChevronDown className="h-3 w-3 ml-1 sm:h-4 sm:w-4 sm:ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-48"
                  align="start"
                >
                  {filterOptions.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => setTimeFilter(option.value as TimeFilter)}
                      className={timeFilter === option.value ? "bg-primary/10 text-primary" : ""}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant={eventTypeFilter === "recruitment" ? "default" : "outline"}
                size="sm"
                onClick={() => setEventTypeFilter(eventTypeFilter === "recruitment" ? null : "recruitment")}
                className={`
                  h-10 flex-shrink-0 px-3 text-xs sm:px-4 sm:text-sm gap-1 sm:gap-2
                  ${eventTypeFilter === "recruitment"
                    ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
                    : ''
                  }
                `}
              >
                <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Now Recruiting</span>
                <span className="sm:hidden">Recruiting</span>
              </Button>

            </div>

            {eventTypeFilter === "recruitment" && (
              <div className="flex flex-wrap gap-2 mt-3">
                <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                  <Users className="h-3 w-3" />
                  <span>Recruiting</span>
                  <button
                    onClick={() => setEventTypeFilter(null)}
                    className="ml-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Remove recruiting filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <InfiniteList
            queryKey={["campusCurrent", "events", timeFilter, eventTypeFilter ?? ""]}
            apiEndpoint="/events"
            size={12}
            additionalParams={{
              time_filter: timeFilter,
              event_status: "approved",
              event_type: eventTypeFilter,
            }}
            renderItem={renderEventCard}
            renderLoading={renderEventsLoading}
            renderEmpty={renderEmptyEvents(
              timeFilter,
              eventTypeFilter,
              clearFilters,
            )}
            showSearch={false}
            gridLayout={{
              mobile: 2,
              tablet: 3,
              desktop: 4
            }}
          />
        </main>

        <EventModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          isEditMode={false}
        />

        <AuthWallModal
          isOpen={isModalOpen}
          onClose={closeModal}
          message="You need to be logged in to create events."
        />
      </PageContainer>
    </MotionWrapper>
  );
}
