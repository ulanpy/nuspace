"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { cn } from "@/utils/utils";
import {
  RejectionBoardEntry,
  formatOutcome,
  formatRejectionType,
  formatStillTrying,
} from "../types";

const formatDate = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

type Props = {
  post: RejectionBoardEntry;
  onNicknameClick?: (nickname: string) => void;
};

export const RejectionCard = ({ post, onNicknameClick }: Props) => {
  const [expanded, setExpanded] = useState(false);
  const shouldTruncate = (post.reflection?.length || 0) > 320;
  const createdLabel = useMemo(() => formatDate(post.created_at), [post.created_at]);
  const outcomeLabel = formatOutcome(post.is_accepted);
  const stillTryingLabel = formatStillTrying(post.still_trying);

  const outcomeClass =
    post.is_accepted === "YES"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-200"
      : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-200";

  const tryingClass =
    post.still_trying === "YES"
      ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-200"
      : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-200";

  return (
    <article className="rounded-2xl border border-border/70 bg-card/90 shadow-sm backdrop-blur transition-all hover:shadow-md">
      <div className="space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onNicknameClick?.(post.nickname)}
            className="text-xs font-semibold text-primary hover:underline"
          >
            {post.nickname}
          </button>
          {createdLabel ? (
            <span className="text-xs text-muted-foreground">{createdLabel}</span>
          ) : null}
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">{post.title}</h3>
          <p
            className={cn(
              "text-sm leading-relaxed text-muted-foreground",
              !expanded && shouldTruncate && "line-clamp-4",
            )}
          >
            {post.reflection}
          </p>
          {shouldTruncate ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-muted-foreground"
              onClick={() => setExpanded((prev) => !prev)}
            >
              {expanded ? "Show less" : "Read more"}
            </Button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge className="border-transparent bg-primary/10 text-primary">
            {formatRejectionType(post.rejection_opportunity_type)}
          </Badge>
          <Badge className={cn("border", outcomeClass)}>
            {outcomeLabel}
          </Badge>
          <Badge className={cn("border", tryingClass)}>
            {stillTryingLabel}
          </Badge>
        </div>
      </div>
    </article>
  );
};
