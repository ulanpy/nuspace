import { useState } from "react";
import { TicketCard } from "./TicketCard";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/atoms/select";
import { Plus, Search, Filter, ArrowLeft, Shield, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MotionWrapper from "@/components/atoms/motion-wrapper";
import { ROUTES } from "@/data/routes";
import { useQuery } from "@tanstack/react-query";
import { sgotinishApi } from "../api/sgotinishApi";
import { useUser } from "@/hooks/use-user";
import { LoginModal } from "@/components/molecules/login-modal";
// Mock data
const mockTickets = [
  {
    id: "1",
    title: "Class schedule issue",
    category: "Academic",
    status: "open" as const,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    messageCount: 0,
  },
  {
    id: "2", 
    title: "Wi-Fi not working in dormitory",
    category: "Infrastructure",
    status: "in_progress" as const,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    messageCount: 3,
  },
  {
    id: "3",
    title: "Event organization question",
    category: "Events", 
    status: "resolved" as const,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    messageCount: 5,
  },
];

interface StudentDashboardProps {
  user: any;
  sgDashboardButton?: React.ReactNode;
  createAppealButton: React.ReactNode;
}

export default function StudentDashboard({ user, sgDashboardButton, createAppealButton }: StudentDashboardProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: ticketsResponse, isLoading, isError } = useQuery({
    queryKey: ["tickets", { statusFilter, categoryFilter }],
    queryFn: () => sgotinishApi.getTickets({
      category: categoryFilter === "all" ? undefined : categoryFilter,
      author_sub: "me",
    }),
    enabled: !!user, // Only fetch tickets if user is logged in
  });

  const filteredTickets = ticketsResponse?.tickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const handleTicketClick = (ticketId: number) => {
    navigate(ROUTES.APPS.SGOTINISH.STUDENT.TICKET.DETAIL_FN(String(ticketId)));
  };

  return (
    <MotionWrapper>
      <div className="container mx-auto px-4 py-8">
        
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Appeals</h1>
              <p className="text-gray-600 dark:text-gray-400">Track and manage your student appeals</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 items-center">
              {sgDashboardButton}
              {createAppealButton}
            </div>
          </div>
        </div>
        
        {/* Search and Filters */}
        <div className="mb-6">
          <div className="mb-4">
            <Input
              type="text"
              placeholder="Search appeals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          
          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="flex-shrink-0 h-8 px-3 text-xs sm:h-10 sm:px-4 sm:text-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700">
                <Filter className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="open">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="flex-shrink-0 h-8 px-3 text-xs sm:h-10 sm:px-4 sm:text-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700">
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

        {/* Appeals Grid */}
        {isLoading && <div>Loading tickets...</div>}
        {isError && <div>Error fetching tickets.</div>}
        {!isLoading && !isError && filteredTickets.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                id={String(ticket.id)}
                title={ticket.title}
                category={ticket.category}
                status={ticket.status}
                createdAt={new Date(ticket.created_at)}
                messageCount={ticket.unread_count}
                onClick={() => handleTicketClick(ticket.id)}
              />
            ))}
          </div>
        ) : !isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No appeals found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Try changing search parameters or create a new appeal
            </p>
            {createAppealButton}
          </div>
        )}
      </div>
    </MotionWrapper>
  );
}