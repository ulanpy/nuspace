import MotionWrapper from "@/components/atoms/motion-wrapper";
import { EventCard } from "@/features/campuscurrent/events/components/EventCard";
import { InfiniteList } from "@/components/virtual/InfiniteList";
import { Event, Community } from "@/features/campuscurrent/types/types";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, ChevronDown, Users, Building2, X } from "lucide-react";
import { EventModal } from "@/features/campuscurrent/events/components/EventModal";
import { TimeFilter } from "@/features/campuscurrent/events/api/eventsApi";
import { Button } from "@/components/atoms/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/atoms/dropdown-menu";
import { CommunitySelectionModal } from "@/features/campuscurrent/communities/components/CommunitySelectionModal";

const renderEmptyEvents = (filterType: string, eventTypeFilter: string | null, selectedCommunity: Community | null) => () => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <Calendar className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No events found</h3>
    <p className="text-gray-500 dark:text-gray-400 mb-4">
      {selectedCommunity && eventTypeFilter === "recruitment" && filterType === "upcoming" && `No upcoming recruitment events from ${selectedCommunity.name} at the moment.`}
      {selectedCommunity && eventTypeFilter === "recruitment" && filterType === "today" && `No recruitment events from ${selectedCommunity.name} scheduled for today.`}
      {selectedCommunity && eventTypeFilter === "recruitment" && filterType === "week" && `No recruitment events from ${selectedCommunity.name} scheduled for this week.`}
      {selectedCommunity && eventTypeFilter === "recruitment" && filterType === "month" && `No recruitment events from ${selectedCommunity.name} scheduled for this month.`}
      {selectedCommunity && !eventTypeFilter && filterType === "upcoming" && `No upcoming events from ${selectedCommunity.name} at the moment.`}
      {selectedCommunity && !eventTypeFilter && filterType === "today" && `No events from ${selectedCommunity.name} scheduled for today.`}
      {selectedCommunity && !eventTypeFilter && filterType === "week" && `No events from ${selectedCommunity.name} scheduled for this week.`}
      {selectedCommunity && !eventTypeFilter && filterType === "month" && `No events from ${selectedCommunity.name} scheduled for this month.`}
      {!selectedCommunity && eventTypeFilter === "recruitment" && filterType === "upcoming" && "No upcoming recruitment events at the moment."}
      {!selectedCommunity && eventTypeFilter === "recruitment" && filterType === "today" && "No recruitment events scheduled for today."}
      {!selectedCommunity && eventTypeFilter === "recruitment" && filterType === "week" && "No recruitment events scheduled for this week."}
      {!selectedCommunity && eventTypeFilter === "recruitment" && filterType === "month" && "No recruitment events scheduled for this month."}
      {!selectedCommunity && !eventTypeFilter && filterType === "upcoming" && "No upcoming events at the moment."}
      {!selectedCommunity && !eventTypeFilter && filterType === "today" && "No events scheduled for today."}
      {!selectedCommunity && !eventTypeFilter && filterType === "week" && "No events scheduled for this week."}
      {!selectedCommunity && !eventTypeFilter && filterType === "month" && "No events scheduled for this month."}
    </p>
  </div>
);

const filterOptions = [
  { value: "upcoming", label: "All Upcoming" },
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
];

export default function Events() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("upcoming");
  const [eventTypeFilter, setEventTypeFilter] = useState<string | null>(null);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCommunityModalOpen, setIsCommunityModalOpen] = useState(false);
  const navigate = useNavigate();

  const currentFilterLabel = filterOptions.find(option => option.value === timeFilter)?.label || "All Upcoming";

  const handleCommunitySelect = (community: Community) => {
    setSelectedCommunity(community);
  };

  const handleCommunityRemove = () => {
    setSelectedCommunity(null);
  };

  const renderEventCard = (event: Event) => (
    <EventCard
      {...event}
    />
  );

  return (
    <MotionWrapper>
      <div className="container mx-auto px-4 py-8">
        <main>
          {/* Mobile-first filter section */}
          <div className="mb-8 space-y-4">
            {/* Time filter dropdown */}
            <div className="flex flex-col sm:flex-row gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full sm:w-auto justify-between bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <span>{currentFilterLabel}</span>
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  className="w-full sm:w-48 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  align="start"
                >
                  {filterOptions.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => setTimeFilter(option.value as TimeFilter)}
                      className={`
                        text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700
                        ${timeFilter === option.value 
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                          : ''
                        }
                      `}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Community filter button */}
              <Button
                variant={selectedCommunity ? "default" : "outline"}
                onClick={() => setIsCommunityModalOpen(true)}
                className={`
                  w-full sm:w-auto justify-center sm:justify-start gap-2
                  ${selectedCommunity 
                    ? 'bg-green-600 hover:bg-green-700 text-white border-green-600 shadow-sm' 
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm'
                  }
                `}
              >
                <Building2 className="h-4 w-4" />
                <span>{selectedCommunity ? selectedCommunity.name : "Select Community"}</span>
              </Button>

              {/* Recruitment filter button */}
              <Button
                variant={eventTypeFilter === "recruitment" ? "default" : "outline"}
                onClick={() => setEventTypeFilter(eventTypeFilter === "recruitment" ? null : "recruitment")}
                className={`
                  w-full sm:w-auto justify-center sm:justify-start gap-2
                  ${eventTypeFilter === "recruitment" 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-sm' 
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm'
                  }
                `}
              >
                <Users className="h-4 w-4" />
                <span>Now Recruiting</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsCreateModalOpen(true)}
                className={`
                  w-full sm:w-auto justify-center sm:justify-start gap-2
                  bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm
                `}
              >
                <Calendar className="h-4 w-4" />
                <span>Create Event</span>
              </Button>

            </div>

            {/* Active filters display */}
            <div className="flex flex-wrap gap-2">
              {selectedCommunity && (
                <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-full text-sm">
                  <Building2 className="h-3 w-3" />
                  <span>{selectedCommunity.name}</span>
                  <button
                    onClick={handleCommunityRemove}
                    className="ml-1 hover:text-green-600 dark:hover:text-green-300"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              {eventTypeFilter === "recruitment" && (
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full text-sm">
                  <Users className="h-3 w-3" />
                  <span>Now Recruiting</span>
                  <button
                    onClick={() => setEventTypeFilter(null)}
                    className="ml-1 hover:text-blue-600 dark:hover:text-blue-300"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Single InfiniteList that changes based on filter */}
          <InfiniteList
            queryKey={["campusCurrent", "events", timeFilter, eventTypeFilter ?? "", selectedCommunity?.id?.toString() ?? ""]}
            apiEndpoint="/events"
            size={12}
            additionalParams={{
              time_filter: timeFilter,
              event_status: "approved",
              event_type: eventTypeFilter,
              community_id: selectedCommunity?.id || undefined,
            }}
            renderItem={renderEventCard}
            renderEmpty={renderEmptyEvents(timeFilter, eventTypeFilter, selectedCommunity)}
            showSearch={false}
            gridLayout={{
              mobile: 2,
              tablet: 3,
              desktop: 4
            }}
          />
        </main>

        {/* Create Event Modal */}
        <EventModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          isEditMode={false}
        />

        {/* Community Selection Modal */}
        <CommunitySelectionModal
          isOpen={isCommunityModalOpen}
          onClose={() => setIsCommunityModalOpen(false)}
          onSelect={handleCommunitySelect}
          selectedCommunityId={selectedCommunity?.id}
        />
      </div>
    </MotionWrapper>
  );
}
