"use client";

import { useMemo, useState } from "react";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { FileX, Search, Sparkles, Users } from "lucide-react";
import MotionWrapper from "@/components/atoms/motion-wrapper";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Label } from "@/components/atoms/label";
import { Badge } from "@/components/atoms/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card";
import { LoginModal } from "@/components/molecules/login-modal";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { queryClient } from "@/utils/query-client";
import { createRejectionPost, fetchRejectionBoard } from "../api";
import {
  RejectionBoardCreatePayload,
  RejectionBoardEntry,
  RejectionBoardFilters,
  RejectionBoardListResponse,
} from "../types";
import { RejectionBoardForm } from "../components/rejection-form";
import { RejectionCard } from "../components/rejection-card";

const PAGE_SIZE = 12;

export default function RejectionBoardPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");
  const [latestNickname, setLatestNickname] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState(0);

  const [filters, setFilters] = useState<RejectionBoardFilters>({
    page: 1,
    size: PAGE_SIZE,
    nickname: undefined,
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
    queryKey: ["rejection-board", { nickname: filters.nickname, size: filters.size }],
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
  const uniqueNicknames = useMemo(
    () => new Set(posts.map((post) => post.nickname)).size,
    [posts],
  );

  const createMutation = useMutation({
    mutationFn: createRejectionPost,
    onSuccess: (post) => {
      setLatestNickname(post.nickname);
      setResetToken((prev) => prev + 1);
      queryClient.invalidateQueries({ queryKey: ["rejection-board"] });
      toast({
        title: "Story shared",
        description: `Your anonymous nickname is ${post.nickname}.`,
        variant: "success",
      });
    },
    onError: (err: any) => {
      const status = err?.response?.status;
      if (status === 401) {
        setLoginModalOpen(true);
        return;
      }
      toast({
        title: "Could not share",
        description: "Please try again in a moment.",
        variant: "error",
      });
    },
  });

  const handleSubmit = (payload: RejectionBoardCreatePayload) => {
    if (!user) {
      setLoginModalOpen(true);
      return;
    }
    createMutation.mutate(payload);
  };

  const applyNicknameFilter = () => {
    const next = nicknameInput.trim();
    setFilters((prev) => ({
      ...prev,
      nickname: next.length ? next : undefined,
    }));
  };

  const clearNicknameFilter = () => {
    setNicknameInput("");
    setFilters((prev) => ({ ...prev, nickname: undefined }));
  };

  const handleNicknameClick = (nickname: string) => {
    setNicknameInput(nickname);
    setFilters((prev) => ({ ...prev, nickname }));
  };

  const handleLogin = () => {
    setLoginModalOpen(false);
  };

  const hasNicknameFilter = Boolean(filters.nickname);

  return (
    <MotionWrapper>
      <div className="space-y-8">
        <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/5 via-background to-rose-500/10 p-6 sm:p-8">
          <div className="absolute -top-16 right-10 h-44 w-44 rounded-full bg-rose-500/10 blur-3xl" />
          <div className="absolute -bottom-16 left-6 h-44 w-44 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="relative space-y-4">
            <Badge className="w-fit bg-background/80 text-foreground border border-border/60">
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              Community space
            </Badge>
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-bold">
                Rejection Board
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                LinkedIn is full of highlight reels. This board is the other half of the story:
                internship, research, and job attempts that did not work out, plus what they taught
                you. Share the effort, the rejection, and the lesson so others see that success is
                built on many no's. Anonymous by default.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1">
                <FileX className="h-3.5 w-3.5 text-rose-500" />
                Internship + job realities
              </div>
              <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1">
                <Users className="h-3.5 w-3.5 text-emerald-500" />
                Find threads by nickname
              </div>
              <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1">
                Anonymous by design
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <Card className="border-primary/20 shadow-sm">
            <CardHeader>
              <CardTitle>Share your story</CardTitle>
              <CardDescription>
                Tell the truth about the outcome and what you learned. We keep it anonymous.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RejectionBoardForm
                onSubmit={handleSubmit}
                isSubmitting={createMutation.isPending}
                disabled={createMutation.isPending}
                resetToken={resetToken}
              />
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-lg">How it works</CardTitle>
                <CardDescription>
                  We hash your user id into a nickname. The same nickname is used for every post.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary/70" />
                  Posts are public, but usernames are never exposed.
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary/70" />
                  Click a nickname to see all posts from the same person.
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-primary/70" />
                  Keep it kind. Share what you learned, not who rejected you.
                </div>
              </CardContent>
            </Card>

            <Card className="border-dashed border-border/60 bg-muted/40">
              <CardHeader>
                <CardTitle className="text-lg">Your anonymous nickname</CardTitle>
                <CardDescription>
                  We show this after you share your first post.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2">
                {latestNickname ? (
                  <>
                    <Badge className="bg-foreground/5 text-foreground border border-border/60">
                      {latestNickname}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleNicknameClick(latestNickname)}
                    >
                      View my posts
                    </Button>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Share a post to reveal your nickname.
                  </span>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">Latest stories</h2>
              <p className="text-sm text-muted-foreground">
                {totalPosts} posts from {uniqueNicknames} anonymous threads.
              </p>
            </div>

            <form
              className="flex w-full flex-col gap-2 sm:flex-row sm:items-end lg:w-auto"
              onSubmit={(event) => {
                event.preventDefault();
                applyNicknameFilter();
              }}
            >
              <div className="space-y-2 sm:min-w-[240px]">
                <Label>Filter by nickname</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={nicknameInput}
                    onChange={(event) => setNicknameInput(event.target.value)}
                    placeholder="anon-xxxxxxxxxx"
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" type="submit">
                  Apply
                </Button>
                {hasNicknameFilter ? (
                  <Button variant="ghost" type="button" onClick={clearNicknameFilter}>
                    Clear
                  </Button>
                ) : null}
              </div>
            </form>
          </div>

          {hasNicknameFilter ? (
            <div className="flex items-center gap-2 text-xs">
              <Badge className="bg-primary/10 text-primary">
                Filtered: {filters.nickname}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground"
                onClick={clearNicknameFilter}
              >
                Clear filter
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
                <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
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
                  onNicknameClick={handleNicknameClick}
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
              >
                {isFetchingNextPage ? "Loading..." : "Load more"}
              </Button>
            </div>
          ) : null}
        </section>
      </div>

      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onSuccess={handleLogin}
        title="Login required"
        message="Please sign in to share your story."
      />
    </MotionWrapper>
  );
}
