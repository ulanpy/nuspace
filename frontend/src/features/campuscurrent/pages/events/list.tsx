import MotionWrapper from "@/components/atoms/motion-wrapper";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/atoms/tabs";
import { EventCard } from "@/features/campuscurrent/components/EventCard";
import { Pagination } from "@/components/molecules/pagination";
import { useEvents } from "@/features/campuscurrent/hooks/events/useEvents";
import { Event } from "@/features/campuscurrent/types/types";
import { useState } from "react";
import { Calendar, Plus } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { EventModalProvider } from "@/features/campuscurrent/components/EventModalProvider";
import { useNavigate } from "react-router-dom";

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
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-6">
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
  const navigate = useNavigate();
  const { events, isLoading, isError } = useEvents(dateFilter);

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
          0,
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
  return (
    <>
      {/* Hero Section */}
      <MotionWrapper>
        <section className="py-12 md:py-20 bg-purple-600 text-white">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
              <div className="space-y-4">
                <h1 className="text-3xl md:text-5xl font-bold">
                  Events you don't want to miss
                </h1>
                <p className="text-lg md:text-xl text-white/90">
                  Discover exciting events happening around campus, from
                  academic talks to cultural celebrations.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    asChild
                    size="lg"
                    className="bg-yellow-500 text-black hover:bg-yellow-600"
                    onClick={() =>
                      document
                        .getElementById("events-section")
                        ?.scrollIntoView({ behavior: "smooth" })
                    }
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
        <div className="flex flex-col min-h-screen" id="events-section">
          <main className="flex-grow">
            {/* Header with Create Event Button */}
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">Events</h1>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Event
              </Button>
            </div>

            <Tabs
              value={activeTab}
              className="mb-6"
              onValueChange={(value) => setFilter(value)}
            >
              <TabsList>
                <TabsTrigger value="all">All Events</TabsTrigger>
                <TabsTrigger value="today">Today</TabsTrigger>
                <TabsTrigger value="thisWeek">This Week</TabsTrigger>
                <TabsTrigger value="thisMonth">This Month</TabsTrigger>
              </TabsList>
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
                length={events?.num_of_pages || 1}
                currentPage={1}
                onChange={() => {}}
              />
            )}
          </main>

          {/* Create Event Modal */}
          <EventModalProvider
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
          />
        </div>
      </MotionWrapper>
    </>
  );
}