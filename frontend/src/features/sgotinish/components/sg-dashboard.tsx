"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TicketCard } from './ticket-card';
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Filter, Folder, CheckCircle, ChevronDown } from "lucide-react";
import { useRouter } from "@/router/navigation";
import MotionWrapper from "@/components/shared/motion-wrapper";
import { ROUTES } from "@/data/routes";
import { useUser } from "@/hooks/use-user";
import { sgotinishApi } from '../api/sgotinish-api';
import { useInfiniteQuery } from "@tanstack/react-query";
import { toLocalDate } from "../utils/date";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TicketCategory, TicketStatus } from "../types";

type StatusFilterValue = TicketStatus | "all";
type CategoryFilterValue = TicketCategory | "all";

export default function SGDashboard() {
  const router = useRouter();
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

  const PAGE_SIZE = 20;

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: [
      "sg-tickets",
      {
        statusFilter,
        categoryFilter,
        userSub: user?.sub ?? null,
      },
    ],
    queryFn: ({ pageParam = 1 }) =>
      sgotinishApi.getTickets({
        page: pageParam,
        size: PAGE_SIZE,
        category: categoryFilter === "all" ? undefined : categoryFilter,
      }),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage) return undefined;
      const currentPage = typeof lastPage.page === "number" ? lastPage.page : allPages.length;
      if (lastPage.has_next === true) return currentPage + 1;
      if (lastPage.has_next === false) return undefined;
      const totalPages = lastPage.total_pages ?? 0;
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!user,
    retry: false,
  });

  useEffect(() => {
    if (!user) return;
    refetch();
  }, [user, refetch]);

  const allTickets = useMemo(
    () => data?.pages.flatMap((page) => page.items ?? []) ?? [],
    [data?.pages],
  );

  useEffect(() => {
    if (
      !isLoading &&
      !isFetchingNextPage &&
      hasNextPage &&
      allTickets.length === 0
    ) {
      fetchNextPage();
    }
  }, [allTickets.length, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading]);

  const filteredTickets = allTickets.filter((ticket) => {
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || ticket.category === categoryFilter;
    return matchesStatus && matchesCategory;
  }) || [];

  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadMoreRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      if (!node || !hasNextPage) {
        return;
      }

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        },
        { rootMargin: "200px" },
      );

      observerRef.current.observe(node);
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  useEffect(() => () => observerRef.current?.disconnect(), []);

  const handleTicketClick = (ticketId: number) => {
    router.push(ROUTES.SGOTINISH.SG.TICKET.DETAIL_FN(String(ticketId)));
  };

  return (
    <MotionWrapper>
      <PageContainer padding="default">
        <PageHeader title="SG Dashboard" subtitle="Manage student appeals and track metrics" />

        {/* Filters */}
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 flex-shrink-0 justify-between px-3 text-xs sm:h-10 sm:px-4 sm:text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Filter className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">{activeStatusOption.label}</span>
                    <span className="sm:hidden">{activeStatusOption.mobileLabel}</span>
                  </div>
                  <ChevronDown className="h-3 w-3 ml-1 sm:h-4 sm:w-4 sm:ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48" align="start">
                {statusOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setStatusFilter(option.value)}
                    className={statusFilter === option.value ? "bg-accent text-accent-foreground" : undefined}
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
                  className="h-8 flex-shrink-0 justify-between px-3 text-xs sm:h-10 sm:px-4 sm:text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Folder className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">{activeCategoryOption.label}</span>
                    <span className="sm:hidden">{activeCategoryOption.mobileLabel}</span>
                  </div>
                  <ChevronDown className="h-3 w-3 ml-1 sm:h-4 sm:w-4 sm:ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="start">
                {categoryOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setCategoryFilter(option.value)}
                    className={categoryFilter === option.value ? "bg-accent text-accent-foreground" : undefined}
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

          {!isLoading && !isError && filteredTickets.length > 0 && (
            <div className="divide-y divide-border">
              {filteredTickets.map((ticket) => (
                <div key={ticket.id}>
                  <TicketCard
                    id={String(ticket.id)}
                    title={ticket.title}
                    category={ticket.category}
                    status={ticket.status}
                    createdAt={toLocalDate(ticket.created_at)}
                    messageCount={ticket.unread_count}
                    isEncrypted={ticket.is_anonymous}
                    onClick={() => handleTicketClick(ticket.id)}
                    variant="flat"
                  />
                </div>
              ))}
              <div ref={loadMoreRef} />
            </div>
          )}

          {isFetchingNextPage && (
            <div className="py-4 text-center text-sm text-muted-foreground">
              Loading more tickets...
            </div>
          )}

          {!isLoading && !isError && filteredTickets.length === 0 && !isFetchingNextPage && (
            <div className="text-center py-8">
              <CheckCircle className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No tickets found</p>
            </div>
          )}
        </div>
      </PageContainer>
    </MotionWrapper>
  );
}
