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
  }>({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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
      default:
        start_date = undefined;
        end_date = undefined;
    }
    setDateFilter({ start_date, end_date });
  };

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow">
        {/* Header with Create Event Button */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Events</h1>
          <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2">
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
  );
}


