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
import { useLocation } from "react-router-dom";
import { usePageParam } from "@/hooks/usePageParam";
import { Calendar } from "lucide-react";
import { EventModal } from "@/features/campuscurrent/events/components/EventModal";

const EventsGrid = ({
  isLoading,
  isError,
  events,
}: {
  isLoading: boolean;
  isError: boolean;
  events: Types.PaginatedResponse<Event, "events"> | null;
}) => {
  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isError) {
    return <div>Error loading events.</div>;
  }

  if (!events || events.events.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No events found</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          There are no events scheduled for this date range.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3 sm:gap-4 md:gap-6">
      {(events?.events || []).map((event) => (
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
  }>({
    start_date: new Date().toISOString().split("T")[0], // Default to show only upcoming events
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { events, isLoading, isError } = useEvents(dateFilter);
  const [page, setPage] = usePageParam();

  const setFilter = (value: string) => {
    setActiveTab(value);
    const now = new Date();
    let start_date;
    let end_date;

    switch (value) {
      case "today":
        start_date = now.toISOString().split("T")[0];
        end_date = start_date;
        break;
      case "thisWeek":
        const firstDay = new Date(now.setDate(now.getDate() - now.getDay()));
        const lastDay = new Date(now.setDate(now.getDate() - now.getDay() + 6));
        start_date = firstDay.toISOString().split("T")[0];
        end_date = lastDay.toISOString().split("T")[0];
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
        // Show only upcoming events (from today onwards)
        start_date = new Date().toISOString().split("T")[0];
        end_date = undefined;
        break;
      default:
        start_date = new Date().toISOString().split("T")[0];
        end_date = undefined;
    }
    setDateFilter({ start_date, end_date });
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
                />
              </TabsContent>
              <TabsContent value="today">
                <EventsGrid
                  isLoading={isLoading}
                  isError={isError}
                  events={events}
                />
              </TabsContent>
              <TabsContent value="thisWeek">
                <EventsGrid
                  isLoading={isLoading}
                  isError={isError}
                  events={events}
                />
              </TabsContent>
              <TabsContent value="thisMonth">
                <EventsGrid
                  isLoading={isLoading}
                  isError={isError}
                  events={events}
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
            onClose={() => setIsCreateModalOpen(false)}
            isEditMode={false}
          />
        </div>
      </MotionWrapper>
    </>
  );
}
