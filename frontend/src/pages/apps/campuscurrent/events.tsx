import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/atoms/tabs";
import { EventCard } from "@/components/organisms/campuscurrent/EventCard";
import { FilterBar } from "@/components/molecules/filter-bar";
import { Pagination } from "@/components/molecules/pagination";
import { useEvents } from "@/modules/campuscurrent/events/hooks/useEvents";


export default function Events() {
  const { events, isLoading, isError } = useEvents();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isError) {
    return <div>Error loading events.</div>;
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow">
        <Tabs defaultValue="all" className="mb-6">
          <TabsList>
            <TabsTrigger value="all">All Events</TabsTrigger>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="thisWeek">This Week</TabsTrigger>
            <TabsTrigger value="thisMonth">This Month</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            <FilterBar />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-6">
              {(events?.events || []).map((event) => (
                <EventCard key={event.id} {...event} />
              ))}
            </div>
          </TabsContent>
          <TabsContent value="today">
            <FilterBar />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-6">
              {(events?.events || []).slice(0, 3).map((event) => (
                <EventCard key={event.id} {...event} />
              ))}
            </div>
          </TabsContent>
          <TabsContent value="thisWeek">
            <FilterBar />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-6">
              {(events?.events || []).slice(0, 6).map((event) => (
                <EventCard key={event.id} {...event} />
              ))}
            </div>
          </TabsContent>
          <TabsContent value="thisMonth">
            <FilterBar />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-6">
              {(events?.events || []).map((event) => (
                <EventCard key={event.id} {...event} />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <Pagination length={events?.num_of_pages || 1} currentPage={1} onChange={() => {}} />
      </main>
    </div>
  );
}
