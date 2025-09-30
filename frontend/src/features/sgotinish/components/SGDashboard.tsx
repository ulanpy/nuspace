import { useState } from "react";
import { TicketCard } from "./TicketCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/atoms/select";
import { Filter, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MotionWrapper from "@/components/atoms/motion-wrapper";
import { ROUTES } from "@/data/routes";
import { useUser } from "@/hooks/use-user";
import { sgotinishApi } from "../api/sgotinishApi";
import { useQuery } from "@tanstack/react-query";
import { toLocalDate } from "../utils/date";

interface SGDashboardProps {
  onBack?: () => void;
}

export default function SGDashboard({}: SGDashboardProps) {
  const navigate = useNavigate();
  const { user } = useUser();
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: ticketsResponse, isLoading, isError } = useQuery({
    queryKey: ["sg-tickets", { categoryFilter }],
    queryFn: () => sgotinishApi.getTickets({
      category: categoryFilter === "all" ? undefined : categoryFilter,
    }),
    enabled: !!user,
    retry: false, // Don't retry if unauthorized
  });

  const handleTicketClick = (ticketId: number) => {
    navigate(ROUTES.APPS.SGOTINISH.SG.TICKET.DETAIL_FN(String(ticketId)));
  };

  const filteredTickets = ticketsResponse?.tickets.filter(ticket =>
    categoryFilter === "all" || ticket.category === categoryFilter
  ) || [];

  return (
    <MotionWrapper>
      <div className="container mx-auto px-4 py-8">
        
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">SG Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400">Manage student appeals and track metrics</p>
            </div>
          </div>
        </div>
        

        {/* Filters */}
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="flex-shrink-0 h-8 px-3 text-xs sm:h-10 sm:px-4 sm:text-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700">
                <Filter className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="Academic">Academic</SelectItem>
                <SelectItem value="Infrastructure">Infrastructure</SelectItem>
                <SelectItem value="Events">Events</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tickets List */}
        <div>
          {isLoading && <p>Loading...</p>}
          {isError && <p>Error loading tickets.</p>}

          {!isLoading && !isError && (
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredTickets.map((ticket) => (
                <div key={ticket.id}>
                  <TicketCard
                    id={String(ticket.id)}
                    title={ticket.title}
                    category={ticket.category}
                    status={ticket.status}
                    createdAt={toLocalDate(ticket.created_at)}
                    messageCount={ticket.unread_count}
                    onClick={() => handleTicketClick(ticket.id)}
                    variant="flat"
                  />
                </div>
              ))}
            </div>
          )}

          {!isLoading && !isError && filteredTickets.length === 0 && (
            <div className="text-center py-8">
              <CheckCircle className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No tickets found</p>
            </div>
          )}
        </div>
      </div>
    </MotionWrapper>
  );
}