"use client";

import { useState } from "react";
import { Calendar, Plus, Users, X } from "lucide-react";
import MotionWrapper from "@/components/shared/motion-wrapper";
import { EventCard, EventCardSkeleton } from "@/features/events/components/event-card";
import { InfiniteList } from "@/components/virtual/infinite-list";
import { Event } from "@/features/shared/campus/types";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { EventModal } from "@/features/events/components/event-modal";
import { TimeFilter } from "@/features/events/api/events-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Separator } from "@/components/ui/separator";
import { TelegramConnectCard } from "@/features/sgotinish/components/telegram-connect-card";
import { useUser } from "@/hooks/use-user";
import { useAuthGate } from "@/hooks/use-auth-gate";
import { AuthWallModal } from "@/components/molecules/auth-wall-modal";
import { cn } from "@/lib/utils";

const filterOptions: { value: TimeFilter; label: string; shortLabel: string }[] = [
  { value: "upcoming", label: "Upcoming", shortLabel: "All" },
  { value: "today", label: "Today", shortLabel: "Today" },
  { value: "week", label: "This Week", shortLabel: "Week" },
  { value: "month", label: "This Month", shortLabel: "Month" },
];

const emptyCopy = (
  filterType: TimeFilter,
  eventTypeFilter: string | null,
): { title: string; description: string } => {
  if (eventTypeFilter === "recruitment") {
    switch (filterType) {
      case "today":
        return {
          title: "No recruitment today",
          description: "Nothing recruiting today — try a wider time range.",
        };
      case "week":
        return {
          title: "No recruitment this week",
          description: "Check next month or clear filters to browse all openings.",
        };
      case "month":
        return {
          title: "No recruitment this month",
          description: "There are no recruitment posts in this window right now.",
        };
      default:
        return {
          title: "No recruitment right now",
          description: "Clubs and teams will show up here when they open applications.",
        };
    }
  }

  switch (filterType) {
    case "today":
      return {
        title: "Nothing on today",
        description: "No campus events scheduled for today. Peek at this week instead.",
      };
    case "week":
      return {
        title: "Quiet week",
        description: "No events this week yet. Try the full upcoming list.",
      };
    case "month":
      return {
        title: "No events this month",
        description: "Widen the filter or check back later for new posts.",
      };
    default:
      return {
        title: "No upcoming events",
        description: "When something is posted on campus, it will land here.",
      };
  }
};

const renderEmptyEvents =
  (filterType: TimeFilter, eventTypeFilter: string | null, clearFilters: () => void) =>
  () => {
    const { title, description } = emptyCopy(filterType, eventTypeFilter);
    const hasActiveFilters = Boolean(eventTypeFilter) || filterType !== "upcoming";

    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-6 py-16 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Calendar className="h-6 w-6" aria-hidden="true" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">{title}</h3>
        <p className="mb-5 max-w-[48ch] text-sm text-muted-foreground">{description}</p>
        {hasActiveFilters ? (
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        ) : null}
      </div>
    );
  };

export default function Events() {
  const { user } = useUser();
  const { requireAuth, isModalOpen, closeModal } = useAuthGate();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("upcoming");
  const [eventTypeFilter, setEventTypeFilter] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const clearFilters = () => {
    setTimeFilter("upcoming");
    setEventTypeFilter(null);
  };

  const renderEventCard = (event: Event, index: number) => (
    <EventCard {...event} priorityImage={index < 4} />
  );

  const renderEventsLoading = () => (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );

  return (
    <MotionWrapper>
      <PageContainer maxWidth="wide" padding="default">
        <div className="mb-4 flex items-start justify-between gap-3 sm:mb-8">
          <PageHeader
            title="Events"
            subtitle="Posters, dates, and campus happenings — browse what’s next."
            className="mb-0 min-w-0"
          />
          <Button
            onClick={() => requireAuth(() => setIsCreateModalOpen(true))}
            size="sm"
            className="shrink-0 gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Create Event</span>
            <span className="sm:hidden">Create</span>
          </Button>
        </div>

        <main className="space-y-4 sm:space-y-6">
          {user && !user.tg_id ? (
            <TelegramConnectCard
              user={user}
              title="Connect Telegram to publish instantly"
              description="Create and publish campus events through nuspacebot without extra steps."
              dismissKey="nuspace_events_tg_banner_dismissed"
            />
          ) : null}

          <div className="space-y-2.5 sm:space-y-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
              <ButtonGroup className="min-w-max">
                {filterOptions.map((option) => {
                  const active = timeFilter === option.value;
                  return (
                    <Button
                      key={option.value}
                      variant={active ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTimeFilter(option.value)}
                      className={cn(
                        "px-2.5 text-xs sm:px-3 sm:text-sm",
                        !active && "bg-background",
                      )}
                      aria-pressed={active}
                    >
                      <span className="hidden sm:inline">{option.label}</span>
                      <span className="sm:hidden">{option.shortLabel}</span>
                    </Button>
                  );
                })}
              </ButtonGroup>

              <Button
                variant={eventTypeFilter === "recruitment" ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  setEventTypeFilter(eventTypeFilter === "recruitment" ? null : "recruitment")
                }
                className={cn(
                  "shrink-0 gap-1.5 px-2.5 text-xs sm:px-3 sm:text-sm",
                  eventTypeFilter !== "recruitment" && "bg-background",
                )}
                aria-pressed={eventTypeFilter === "recruitment"}
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Club Recruitments</span>
                <span className="sm:hidden">Recruiting</span>
              </Button>
            </div>

            {eventTypeFilter === "recruitment" ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="gap-1.5 pr-1">
                  <Users className="h-3 w-3" />
                  Recruiting
                  <button
                    type="button"
                    onClick={() => setEventTypeFilter(null)}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Remove recruiting filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
                <Separator orientation="vertical" className="h-4" />
                <Button variant="ghost" size="xs" onClick={clearFilters}>
                  Clear all
                </Button>
              </div>
            ) : null}
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
            renderEmpty={renderEmptyEvents(timeFilter, eventTypeFilter, clearFilters)}
            showSearch={false}
            gridLayout={{
              mobile: 2,
              tablet: 3,
              desktop: 4,
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
