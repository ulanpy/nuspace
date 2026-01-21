"use client";

import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { MessageSquarePlus, Info } from "lucide-react";
import MotionWrapper from "@/components/atoms/motion-wrapper";
import { Button } from "@/components/atoms/button";
import { Label } from "@/components/atoms/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card";
import { Modal } from "@/components/atoms/modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/utils/query-client";
import { createRejectionPost, fetchRejectionBoard } from "../api";
import {
  REJECTION_TYPES,
  RejectionBoardCreatePayload,
  RejectionBoardEntry,
  RejectionBoardFilters,
  RejectionBoardListResponse,
  formatRejectionType,
} from "../types";
import { RejectionBoardForm } from "../components/rejection-form";
import { RejectionCard } from "../components/rejection-card";

const PAGE_SIZE = 12;

export default function RejectionBoardPage() {
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const [targetPostId, setTargetPostId] = useState<number | null>(null);
  const [autoScrollDone, setAutoScrollDone] = useState(false);

  const [filters, setFilters] = useState<RejectionBoardFilters>({
    size: PAGE_SIZE,
    rejection_opportunity_type: undefined,
    is_accepted: undefined,
    still_trying: undefined,
  });

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<RejectionBoardListResponse>({
    queryKey: [
      "rejection-board",
      {
        size: filters.size,
        rejection_opportunity_type: filters.rejection_opportunity_type,
        is_accepted: filters.is_accepted,
        still_trying: filters.still_trying,
      },
    ],
    queryFn: ({ pageParam = 1 }) =>
      fetchRejectionBoard({ ...filters, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage) return undefined;
      return lastPage.has_next ? (lastPage.page ?? 1) + 1 : undefined;
    },
  });

  const posts = useMemo<RejectionBoardEntry[]>(
    () => data?.pages.flatMap((page) => page.items || []) ?? [],
    [data],
  );

  const totalPosts = data?.pages?.[0]?.total ?? posts.length;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const match = window.location.hash.match(/post-(\d+)/);
    if (match) {
      setTargetPostId(Number(match[1]));
    }
  }, []);

  useEffect(() => {
    if (!targetPostId || autoScrollDone) return;
    const exists = posts.some((post) => post.id === targetPostId);
    if (exists) {
      const element = document.getElementById(`post-${targetPostId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        setAutoScrollDone(true);
      }
      return;
    }
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
      return;
    }
    setAutoScrollDone(true);
  }, [
    targetPostId,
    autoScrollDone,
    posts,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  ]);

  const createMutation = useMutation({
    mutationFn: createRejectionPost,
    onSuccess: () => {
      setResetToken((prev) => prev + 1);
      queryClient.invalidateQueries({ queryKey: ["rejection-board"] });
      toast({
        title: "Story shared",
        description: "Your story has been posted anonymously.",
        variant: "success",
      });
    },
    onError: () => {
      toast({
        title: "Could not share",
        description: "Please try again in a moment.",
        variant: "error",
      });
    },
  });

  const handleSubmit = (payload: RejectionBoardCreatePayload) => {
    createMutation.mutate(payload, {
      onSuccess: () => {
        setIsFormOpen(false);
      },
    });
  };

  return (
    <MotionWrapper>
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Rejection Board
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Share your rejection stories anonymously and what they taught you.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsFormOpen(true)}
              className="rounded-full px-6 gap-2"
            >
              <MessageSquarePlus className="h-4 w-4" />
              Share Story
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {totalPosts} anonymous posts.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
                <div className="space-y-1 w-full sm:w-auto">
                  <Label className="text-[11px] text-muted-foreground">Opportunity</Label>
                  <Select
                    value={filters.rejection_opportunity_type ?? "all"}
                    onValueChange={(value) =>
                      setFilters((prev) => ({
                        ...prev,
                        rejection_opportunity_type: value === "all" ? undefined : value,
                      }))
                    }
                  >
                    <SelectTrigger className="h-8 w-full rounded-full text-xs sm:w-[160px]">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      {REJECTION_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {formatRejectionType(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 w-full sm:w-auto">
                  <Label className="text-[11px] text-muted-foreground">Outcome</Label>
                  <Select
                    value={filters.is_accepted ?? "all"}
                    onValueChange={(value) =>
                      setFilters((prev) => ({
                        ...prev,
                        is_accepted: value === "all" ? undefined : value,
                      }))
                    }
                  >
                    <SelectTrigger className="h-8 w-full rounded-full text-xs sm:w-[130px]">
                      <SelectValue placeholder="Any outcome" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any outcome</SelectItem>
                      <SelectItem value="NO">Rejected</SelectItem>
                      <SelectItem value="YES">Accepted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 w-full sm:w-auto">
                  <Label className="text-[11px] text-muted-foreground">Status</Label>
                  <Select
                    value={filters.still_trying ?? "all"}
                    onValueChange={(value) =>
                      setFilters((prev) => ({
                        ...prev,
                        still_trying: value === "all" ? undefined : value,
                      }))
                    }
                  >
                    <SelectTrigger className="h-8 w-full rounded-full text-xs sm:w-[130px]">
                      <SelectValue placeholder="Any status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any status</SelectItem>
                      <SelectItem value="YES">Still trying</SelectItem>
                      <SelectItem value="NO">Moved on</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full sm:w-auto">
                  <div className="h-[14px] sm:h-[14px]" />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-full rounded-full px-3 text-[11px] sm:w-auto"
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        rejection_opportunity_type: undefined,
                        is_accepted: undefined,
                        still_trying: undefined,
                      }))
                    }
                  >
                    Clear filters
                  </Button>
                </div>
              </div>
            </div>

            {targetPostId ? (
              <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <div>
                  You are viewing a linked story. All posts are still below.
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-full px-3 text-xs"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.history.replaceState({}, "", window.location.pathname);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                    setTargetPostId(null);
                    setAutoScrollDone(true);
                  }}
                >
                  Back to latest
                </Button>
              </div>
            ) : null}

            <div className="grid gap-4">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={`skeleton-${idx}`}
                    className="h-40 rounded-2xl border border-border/60 bg-muted/40 animate-pulse"
                  />
                ))
              ) : isError ? (
                <div className="rounded-2xl border border-border/60 bg-muted/30 p-6 text-sm text-muted-foreground">
                  <p>We could not load the board right now.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 rounded-full"
                    onClick={() => refetch()}
                  >
                    Retry
                  </Button>
                </div>
              ) : posts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/60 bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                  No stories yet. Be the first to share.
                </div>
              ) : (
                posts.map((post) => (
                  <RejectionCard
                    key={post.id}
                    post={post}
                    isHighlighted={post.id === targetPostId}
                  />
                ))
              )}
            </div>

            {hasNextPage ? (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="rounded-full"
                >
                  {isFetchingNextPage ? "Loading..." : "Load more"}
                </Button>
              </div>
            ) : null}
          </div>

          <aside className="space-y-4">
            <Card className="border-border/60 shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  How it works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  LinkedIn is full of highlight reels. This board is the other half of the story.
                </p>
                <div className="flex items-start gap-2">
                  <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
                  <span>Posts are completely anonymous. We don't link them to your account.</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
                  <span>Share your experience to help others see that success is built on many no's.</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
                  <span>Be kind and respectful. Focus on the lesson, not the entity that rejected you.</span>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>

      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Share your story"
        description="Tell the truth about the outcome and what you learned. Absolute anonymity guaranteed."
        className="max-w-xl"
      >
        <div className="pt-2">
          <RejectionBoardForm
            onSubmit={handleSubmit}
            isSubmitting={createMutation.isPending}
            disabled={createMutation.isPending}
            resetToken={resetToken}
          />
        </div>
      </Modal>
    </MotionWrapper>
  );
}
