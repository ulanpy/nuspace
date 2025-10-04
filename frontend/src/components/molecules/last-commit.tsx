"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Github, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type GitHubCommit = {
  sha: string;
  html_url?: string;
  commit: {
    author?: { date?: string; name?: string; email?: string };
    committer?: { date?: string; name?: string; email?: string };
    message?: string;
  };
  author?: { login?: string; html_url?: string; avatar_url?: string };
  committer?: { login?: string; html_url?: string; avatar_url?: string };
};

async function fetchLastCommit(): Promise<GitHubCommit | null> {
  const res = await fetch(
    "https://api.github.com/repos/ulanpy/nuspace/commits?sha=main&per_page=1",
    {
      headers: {
        Accept: "application/vnd.github+json",
      },
      cache: "no-store",
    },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as GitHubCommit[];
  return Array.isArray(data) && data.length > 0 ? data[0] ?? null : null;
}

export function LastCommitBadge() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["github", "lastCommit", "ulanpy", "nuspace", "main"],
    queryFn: fetchLastCommit,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const dateIso =
    data?.commit?.committer?.date || data?.commit?.author?.date || undefined;
  const lastUpdated = dateIso
    ? formatDistanceToNow(new Date(dateIso), { addSuffix: true })
    : null;
  // Prioritize author over committer to show original contributor for merged PRs
  const actorLogin = data?.author?.login || data?.committer?.login || null;
  const actorNameFallback =
    data?.commit?.author?.name || data?.commit?.committer?.name || null;
  const actorName = actorLogin || actorNameFallback;
  const actorUrl = data?.author?.html_url || data?.committer?.html_url || undefined;
  const actorAvatar = data?.author?.avatar_url || data?.committer?.avatar_url || undefined;
  const commitMessage = data?.commit?.message || undefined;

  return (
    <div className="w-full mb-4">
      <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm sm:text-base">
        <Github className="h-4 w-4 sm:h-5 sm:w-5" />
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate">Repo</span>
          <a
            href="https://github.com/ulanpy/nuspace"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline-offset-4 hover:underline truncate"
          >
            ulanpy/nuspace
          </a>
          <span className="text-muted-foreground">•</span>
          <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
          {isLoading ? (
            <span className="text-muted-foreground">Checking updates…</span>
          ) : isError || !lastUpdated ? (
            <span className="text-muted-foreground">Last update unknown</span>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <span className="truncate">
                Updated {lastUpdated}
                {actorName ? (
                  <>
                    {" "}by {actorUrl ? (
                      <a
                        href={actorUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-4 hover:no-underline"
                      >
                        {actorName}
                      </a>
                    ) : (
                      <span>{actorName}</span>
                    )}
                  </>
                ) : null}
              </span>
              {actorAvatar && (
                <img
                  src={actorAvatar}
                  alt={`${actorName || 'User'} avatar`}
                  className="h-4 w-4 rounded-full"
                  loading="lazy"
                />
              )}
              {commitMessage && (
                <span className="text-muted-foreground text-xs truncate max-w-32" title={commitMessage}>
                  • {commitMessage.split('\n')[0]}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function LastCommitInline({ rightElement }: { rightElement?: React.ReactNode }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["github", "lastCommit", "ulanpy", "nuspace", "main", "inline"],
    queryFn: fetchLastCommit,
    staleTime: 1000 * 60 * 5,
  });

  const dateIso =
    data?.commit?.committer?.date || data?.commit?.author?.date || undefined;
  const lastUpdated = dateIso
    ? formatDistanceToNow(new Date(dateIso), { addSuffix: true })
    : null;
  // Prioritize author over committer to show original contributor for merged PRs
  const actorLogin = data?.author?.login || data?.committer?.login || null;
  const actorNameFallback =
    data?.commit?.author?.name || data?.commit?.committer?.name || null;
  const actorName = actorLogin || actorNameFallback;
  const actorUrl = data?.author?.html_url || data?.committer?.html_url || undefined;
  const actorAvatar = data?.author?.avatar_url || data?.committer?.avatar_url || undefined;
  const commitMessage = data?.commit?.message || undefined;

  return (
    <div className="flex items-start gap-2 min-w-0">
      <div className="flex items-start gap-1.5 text-xs sm:text-sm text-blue-700 dark:text-blue-300 min-w-0 flex-1">
        <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0 mt-0.5" />
        {isLoading ? (
          <span className="text-inherit">Checking updates…</span>
        ) : isError || !lastUpdated ? (
          <span className="text-inherit">Last update unknown</span>
        ) : (
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-inherit whitespace-nowrap">Updated {lastUpdated}</span>
              {actorAvatar && (
                <img
                  src={actorAvatar}
                  alt={`${actorName || 'User'} avatar`}
                  className="h-3 w-3 rounded-full flex-shrink-0"
                  loading="lazy"
                />
              )}
              {actorName && (
                <>
                  {actorUrl ? (
                    <a
                      href={actorUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline text-inherit flex-shrink-0"
                    >
                      {actorName}
                    </a>
                  ) : (
                    <span className="text-inherit flex-shrink-0">{actorName}</span>
                  )}
                </>
              )}
            </div>
            {commitMessage && (
              <div className="min-w-0">
                <span
                  className="text-inherit text-xs sm:text-[0.95em] truncate block"
                  title={commitMessage}
                >
                  — {commitMessage.split('\n')[0]}
                </span>
              </div>
            )}
          </div>
        )}
        <a
          href="https://github.com/ulanpy/nuspace"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline flex-shrink-0"
          aria-label="Open repository"
        >
          <span className="sr-only">View repository</span>
        </a>
      </div>
      {rightElement && (
        <div className="flex-shrink-0">
          {rightElement}
        </div>
      )}
    </div>
  );
}


