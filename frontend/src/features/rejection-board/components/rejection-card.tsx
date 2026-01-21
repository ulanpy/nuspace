"use client";

import { useMemo, useState } from "react";
import { Flag, Link as LinkIcon } from "lucide-react";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { useToast } from "@/hooks/use-toast";
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
  isHighlighted?: boolean;
};

export const RejectionCard = ({ post, isHighlighted = false }: Props) => {
  const [expanded, setExpanded] = useState(false);
  const shouldTruncate = (post.reflection?.length || 0) > 320;
  const createdLabel = useMemo(() => formatDate(post.created_at), [post.created_at]);
  const outcomeLabel = formatOutcome(post.is_accepted);
  const stillTryingLabel = formatStillTrying(post.still_trying);
  const { toast } = useToast();

  const outcomeClass =
    post.is_accepted === "YES"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-200"
      : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-200";

  const tryingClass =
    post.still_trying === "YES"
      ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-200"
      : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-200";

  const handleCopyLink = async () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/rejection-board#post-${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copied",
        description: "Share this post with others.",
        variant: "success",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: url,
        variant: "warning",
      });
    }
  };

  return (
    <article
      id={`post-${post.id}`}
      className={cn(
        "rounded-2xl border border-border/50 bg-background shadow-none transition-all hover:border-primary/30",
        isHighlighted && "border-primary/60 shadow-sm ring-1 ring-primary/20",
      )}
    >
      <div className="space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {createdLabel ? (
            <span className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">
              {createdLabel}
            </span>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleCopyLink}
              aria-label="Copy link to this post"
            >
              <LinkIcon className="mr-1 h-3.5 w-3.5" />
              Link
            </Button>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <a href="https://t.me/kamikadze24" target="_blank" rel="noreferrer">
                <Flag className="mr-1 h-3.5 w-3.5" />
                Report
              </a>
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <h3 className="text-base font-semibold text-foreground leading-tight">{post.title}</h3>
          <p
            className={cn(
              "text-sm leading-relaxed text-muted-foreground",
              !expanded && shouldTruncate && "line-clamp-3",
            )}
          >
            {post.reflection}
          </p>
          {shouldTruncate ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-0 text-xs text-primary hover:bg-transparent hover:underline font-medium"
              onClick={() => setExpanded((prev) => !prev)}
            >
              {expanded ? "Show less" : "Read more"}
            </Button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <Badge variant="outline" className="rounded-full border-border/60 bg-transparent text-[10px] uppercase font-bold tracking-tight">
            {formatRejectionType(post.rejection_opportunity_type)}
          </Badge>
          <Badge variant="outline" className={cn("rounded-full text-[10px] uppercase font-bold tracking-tight", outcomeClass)}>
            {outcomeLabel}
          </Badge>
          <Badge variant="outline" className={cn("rounded-full text-[10px] uppercase font-bold tracking-tight", tryingClass)}>
            {stillTryingLabel}
          </Badge>
        </div>
      </div>
    </article>
  );
};
