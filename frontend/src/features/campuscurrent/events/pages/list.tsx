import MotionWrapper from "@/components/atoms/motion-wrapper";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/atoms/tabs";
import { EventCard } from "@/features/campuscurrent/events/components/EventCard";
import { Pagination } from "@/components/molecules/pagination";
import { useEvents } from "@/features/campuscurrent/events/hooks/useEvents";
import { Event } from "@/features/campuscurrent/types/types";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePageParam } from "@/hooks/usePageParam";
import { Calendar } from "lucide-react";
import { EventModal } from "@/features/campuscurrent/events/components/EventModal";

// Helper function to check if an event is ongoing or upcoming
const isEventRelevant = (event: Event, filterType: string): boolean => {
  const now = new Date();
  const eventStart = new Date(event.event_datetime);
  const eventEnd = new Date(eventStart.getTime() + event.duration * 60 * 1000);

  // Event is finished if end time has passed
  const isFinished = eventEnd.getTime() < now.getTime();

  // For "all" filter, exclude finished events
  if (filterType === "all") {
    return !isFinished;
  }

  // For date-specific filters, check if event intersects with the date range AND is not finished
  if (filterType === "today") {
    const today = new Date();
    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    // Event is relevant if it intersects with today AND is not finished
    const intersectsToday =
      (eventStart >= todayStart && eventStart < todayEnd) ||
      (eventStart < todayEnd && eventEnd > todayStart);
    return intersectsToday && !isFinished;
  }

  if (filterType === "thisWeek") {
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    // Event is relevant if it intersects with this week AND is not finished
    const intersectsWeek =
      (eventStart >= startOfWeek && eventStart < endOfWeek) ||
      (eventStart < endOfWeek && eventEnd > startOfWeek);
    return intersectsWeek && !isFinished;
  }

  if (filterType === "thisMonth") {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Event is relevant if it intersects with this month AND is not finished
    const intersectsMonth =
      (eventStart >= startOfMonth && eventStart < endOfMonth) ||
      (eventStart < endOfMonth && eventEnd > startOfMonth);
    return intersectsMonth && !isFinished;
  }

  return !isFinished;
};

const EventsGrid = ({
  isLoading,
  isError,
  events,
  filterType = "all",
}: {
  isLoading: boolean;
  isError: boolean;
  events: Types.PaginatedResponse<Event, "events"> | null;
  filterType?: string;
}) => {
  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isError) {
    return <div>Error loading events.</div>;
  }

  // Filter events to show only relevant ones (upcoming/ongoing)
  const filteredEvents =
    events?.events?.filter((event) => isEventRelevant(event, filterType)) || [];

  if (filteredEvents.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No events found</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          There are no{" "}
          {filterType === "all"
            ? "upcoming or ongoing"
            : filterType === "today"
            ? "events for today"
            : "events in this"}{" "}
          events.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 grid grid-cols-2 justify-center gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {filteredEvents.map((event) => (
        <EventCard key={event.id} {...event} />
      ))}
    </div>
  );
};

export default function Events() {
  const [activeTab, setActiveTab] = useState("all");
  const [dateFilter, setDateFilter] = useState<{
    start_date?: string;
    end_date?: string;
    event_status?: string;
  }>({
    start_date: new Date().toISOString().split("T")[0], // Default to show only upcoming events
    event_status: "approved", // Only show approved events for public view
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { events, isLoading, isError } = useEvents(dateFilter);
  const [page, setPage] = usePageParam();
  const navigate = useNavigate();

  const setFilter = (value: string) => {
    setActiveTab(value);
    const now = new Date();
    let start_date;
    let end_date;

    switch (value) {
      case "today":
        // Show events that start today OR are ongoing today
        start_date = now.toISOString().split("T")[0];
        end_date = start_date;
        break;
      case "thisWeek":
        // Calculate week boundaries properly
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday

        start_date = startOfWeek.toISOString().split("T")[0];
        end_date = endOfWeek.toISOString().split("T")[0];
        break;
      case "thisMonth":
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0
        );
        start_date = firstDayOfMonth.toISOString().split("T")[0];
        end_date = lastDayOfMonth.toISOString().split("T")[0];
        break;
      case "all":
        // Show upcoming and ongoing events (exclude past events)
        // Use current date as start to exclude past events
        start_date = now.toISOString().split("T")[0];
        end_date = undefined;
        break;
      default:
        start_date = now.toISOString().split("T")[0];
        end_date = undefined;
    }

    setDateFilter({
      start_date,
      end_date,
      event_status: "approved", // Always filter for approved events in public view
    });
  };
  const location = useLocation();

  useEffect(() => {
    if (location.hash === "#events-section") {
      document
        .getElementById("events-section")
        ?.scrollIntoView({ behavior: "smooth" });
    }
    if (location.hash === "#create-event") {
      setIsCreateModalOpen(true);
    }
    const params = new URLSearchParams(location.search);
    if (params.get("create") === "1") {
      setIsCreateModalOpen(true);
    }
  }, [location]);

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    // Clear modal triggers from URL (hash and ?create)
    const params = new URLSearchParams(location.search);
    params.delete("create");
    const base = location.pathname;
    const search = params.toString();
    const newUrl = search ? `${base}?${search}` : base;
    navigate(newUrl, { replace: true });
  };

  // page is now handled by usePageParam

  return (
    <>
      {/* Hero moved to layout */}

      <MotionWrapper>
        <div
          className="flex flex-col min-h-screen w-full overflow-x-hidden"
          id="events-section"
        >
          <main className="flex-grow w-full max-w-screen-2xl mx-auto px-4 sm:px-6 md:px-8">
            <Tabs
              value={activeTab}
              className="mb-6 w-full"
              onValueChange={(value) => setFilter(value)}
            >
              <div className="w-full overflow-x-auto">
                <TabsList className="min-w-max grid grid-flow-col auto-cols-max gap-2">
                  <TabsTrigger value="all">All Upcoming</TabsTrigger>
                  <TabsTrigger value="today">Today</TabsTrigger>
                  <TabsTrigger value="thisWeek">Week</TabsTrigger>
                  <TabsTrigger value="thisMonth">Month</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="all" className="mt-4">
                <EventsGrid
                  isLoading={isLoading}
                  isError={isError}
                  events={events}
                  filterType="all"
                />
              </TabsContent>
              <TabsContent value="today">
                <EventsGrid
                  isLoading={isLoading}
                  isError={isError}
                  events={events}
                  filterType="today"
                />
              </TabsContent>
              <TabsContent value="thisWeek">
                <EventsGrid
                  isLoading={isLoading}
                  isError={isError}
                  events={events}
                  filterType="thisWeek"
                />
              </TabsContent>
              <TabsContent value="thisMonth">
                <EventsGrid
                  isLoading={isLoading}
                  isError={isError}
                  events={events}
                  filterType="thisMonth"
                />
              </TabsContent>
            </Tabs>

            {events && events.events.length > 0 && (
              <Pagination
                length={events?.total_pages || 1}
                currentPage={page}
                onChange={setPage}
              />
            )}
          </main>

          {/* Create Event Modal */}
          <EventModal
            isOpen={isCreateModalOpen}
            onClose={handleCloseCreateModal}
            isEditMode={false}
          />
        </div>
      </MotionWrapper>
    </>
  );
}
