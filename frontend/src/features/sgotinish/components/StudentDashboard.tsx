import { useMemo, useState } from "react";
import { TicketCard } from "./TicketCard";
import { Button } from "@/components/atoms/button";
import { ChevronDown, Filter, Folder, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MotionWrapper from "@/components/atoms/motion-wrapper";
import { ROUTES } from "@/data/routes";
import { useQuery } from "@tanstack/react-query";
import { sgotinishApi } from "../api/sgotinishApi";
import { toLocalDate } from "../utils/date";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/atoms/dropdown-menu";
import { TicketCategory, TicketStatus } from "../types";

interface StudentDashboardProps {
  user: any;
  createAppealButton: React.ReactNode;
}

type StatusFilterValue = TicketStatus | "all";
type CategoryFilterValue = TicketCategory | "all";

export default function StudentDashboard({ user, createAppealButton }: StudentDashboardProps) {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilterValue>("all");

  const statusOptions = useMemo(
    () => [
      { value: "all" as StatusFilterValue, label: "All statuses", mobileLabel: "All" },
      { value: TicketStatus.open as StatusFilterValue, label: "Pending", mobileLabel: "Pending" },
      { value: TicketStatus.in_progress as StatusFilterValue, label: "In Progress", mobileLabel: "In Progress" },
      { value: TicketStatus.resolved as StatusFilterValue, label: "Resolved", mobileLabel: "Resolved" },
      { value: TicketStatus.closed as StatusFilterValue, label: "Closed", mobileLabel: "Closed" },
    ],
    [],
  );

  const categoryOptions = useMemo(
    () => [
      { value: "all" as CategoryFilterValue, label: "All categories", mobileLabel: "All" },
      { value: TicketCategory.academic as CategoryFilterValue, label: "Academic", mobileLabel: "Academic" },
      { value: TicketCategory.administrative as CategoryFilterValue, label: "Administrative", mobileLabel: "Administrative" },
      { value: TicketCategory.technical as CategoryFilterValue, label: "Technical", mobileLabel: "Technical" },
      { value: TicketCategory.complaint as CategoryFilterValue, label: "Complaint", mobileLabel: "Complaint" },
      { value: TicketCategory.suggestion as CategoryFilterValue, label: "Suggestion", mobileLabel: "Suggestion" },
      { value: TicketCategory.other as CategoryFilterValue, label: "Other", mobileLabel: "Other" },
    ],
    [],
  );

  const activeStatusOption = statusOptions.find((option) => option.value === statusFilter) ?? statusOptions[0];
  const activeCategoryOption = categoryOptions.find((option) => option.value === categoryFilter) ?? categoryOptions[0];


  const { data: ticketsResponse, isLoading, isError } = useQuery({
    queryKey: ["tickets", { statusFilter, categoryFilter }],
    queryFn: () => sgotinishApi.getTickets({
      category: categoryFilter === "all" ? undefined : categoryFilter,
      author_sub: "me",
    }),
    enabled: !!user, // Only fetch tickets if user is logged in
    retry: false, // Don't retry if unauthorized
  });

  const filteredTickets = ticketsResponse?.tickets.filter((ticket) => {
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || ticket.category === categoryFilter;
    return matchesStatus && matchesCategory;
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
              {createAppealButton}
            </div>
          </div>
        </div>
        
        {/* Filters */}
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0 h-8 px-3 text-xs sm:h-10 sm:px-4 sm:text-sm justify-between bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <div className="flex items-center gap-2">
                    <Filter className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">{activeStatusOption.label}</span>
                    <span className="sm:hidden">{activeStatusOption.mobileLabel}</span>
                  </div>
                  <ChevronDown className="h-3 w-3 ml-1 sm:h-4 sm:w-4 sm:ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" align="start">
                {statusOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setStatusFilter(option.value)}
                    className={`
                      text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700
                      ${statusFilter === option.value ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300" : ""}
                    `}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0 h-8 px-3 text-xs sm:h-10 sm:px-4 sm:text-sm justify-between bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <div className="flex items-center gap-2">
                    <Folder className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">{activeCategoryOption.label}</span>
                    <span className="sm:hidden">{activeCategoryOption.mobileLabel}</span>
                  </div>
                  <ChevronDown className="h-3 w-3 ml-1 sm:h-4 sm:w-4 sm:ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" align="start">
                {categoryOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setCategoryFilter(option.value)}
                    className={`
                      text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700
                      ${categoryFilter === option.value ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300" : ""}
                    `}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
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
                createdAt={toLocalDate(ticket.created_at)}
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