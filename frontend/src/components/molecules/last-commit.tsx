"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Github, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type GitHubCommit = {
  sha: string;
  html_url?: string;
  commit: {
    author?: { date?: string };
    committer?: { date?: string };
    message?: string;
  };
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
            <span className="truncate">Updated {lastUpdated}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function LastCommitInline() {
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

  return (
    <a
      href="https://github.com/ulanpy/nuspace"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 text-xs sm:text-sm text-blue-700 dark:text-blue-300 hover:underline"
      aria-label="Open repository"
    >
      <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      {isLoading ? (
        <span className="text-inherit">Checking updates…</span>
      ) : isError || !lastUpdated ? (
        <span className="text-inherit">Last update unknown</span>
      ) : (
        <span className="text-inherit">Updated {lastUpdated}</span>
      )}
    </a>
  );
}


