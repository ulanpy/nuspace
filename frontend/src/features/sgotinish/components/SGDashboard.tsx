import { useMemo, useState } from "react";
import { TicketCard } from "./TicketCard";
import { Button } from "@/components/atoms/button";
import { ArrowLeft, Filter, Folder, CheckCircle, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MotionWrapper from "@/components/atoms/motion-wrapper";
import { ROUTES } from "@/data/routes";
import { useUser } from "@/hooks/use-user";
import { sgotinishApi } from "../api/sgotinishApi";
import { useQuery } from "@tanstack/react-query";
import { toLocalDate } from "../utils/date";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/atoms/dropdown-menu";
import { TicketCategory, TicketStatus } from "../types";

interface SGDashboardProps {
  onBack?: () => void;
}

type StatusFilterValue = TicketStatus | "all";
type CategoryFilterValue = TicketCategory | "all";

export default function SGDashboard({ onBack }: SGDashboardProps) {
  const navigate = useNavigate();
  const { user } = useUser();
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
    queryKey: ["sg-tickets", { statusFilter, categoryFilter }],
    queryFn: () => sgotinishApi.getTickets({
      category: categoryFilter === "all" ? undefined : categoryFilter,
    }),
    enabled: !!user,
    retry: false, // Don't retry if unauthorized
  });

  const handleTicketClick = (ticketId: number) => {
    navigate(ROUTES.APPS.SGOTINISH.SG.TICKET.DETAIL_FN(String(ticketId)));
  };

  const filteredTickets = ticketsResponse?.tickets.filter((ticket) => {
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || ticket.category === categoryFilter;
    return matchesStatus && matchesCategory;
  }) || [];

  return (
    <MotionWrapper>
      <div className="container mx-auto px-4 py-8">
        
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">SG Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400">Manage student appeals and track metrics</p>
            </div>
            {onBack && (
              <Button
                variant="outline"
                size="sm"
                className="self-start"
                onClick={onBack}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Student
              </Button>
            )}
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