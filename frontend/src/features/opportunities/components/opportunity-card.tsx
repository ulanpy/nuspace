"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Opportunity,
  OpportunityEligibility,
  formatEducationLevel,
  formatOpportunityType,
  normalizeOpportunityMajors,
} from "../types";
import { Calendar, MapPin, Link2, Bookmark, Building2, GraduationCap, Wallet } from "lucide-react";
import { MarkdownContent } from '@/components/molecules/markdown-content';
import { Button } from "@/components/atoms/button";
import { useToast } from "@/hooks/use-toast";
import { addOpportunityToCalendar } from "../api";
import GoogleCalendarIcon from "@/assets/svg/google_calendar_icon.svg";
const formatEligibility = (eligibility?: OpportunityEligibility[] | null) => {
  if (!eligibility || eligibility.length === 0) return null;
  return eligibility
    .map((item) => {
      const level = formatEducationLevel(item.education_level);
      if (item.education_level === "PhD") {
        return level;
      }
      const range =
        item.min_year && item.max_year
          ? `Year ${item.min_year}${item.max_year !== item.min_year ? `-${item.max_year}` : ""}`
          : "";
      return range ? `${level} · ${range}` : level;
    })
    .join(" • ");
};

import { motion } from "framer-motion";

const badgeColors = ["bg-blue-100 text-blue-800", "bg-emerald-100 text-emerald-800", "bg-amber-100 text-amber-800", "bg-indigo-100 text-indigo-800"];

const pickBadge = (seed: string | undefined | null) => {
  if (!seed) return badgeColors[0];
  const hash = seed.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return badgeColors[hash % badgeColors.length];
};

const formatDeadline = (deadline?: string | null) => {
  if (!deadline) return "Year-round";
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return "Year-round";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const deadlineStatus = (deadline?: string | null) => {
  if (!deadline) return "Year-round";
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return "Year-round";
  const now = new Date();
  if (date < new Date(now.toDateString())) {
    return "Expired";
  }
  return "Open";
};

type Props = {
  opportunity: Opportunity;
  canManage?: boolean;
  onEdit?: (opp: Opportunity) => void;
};

export const OpportunityCard = ({ opportunity, canManage = false, onEdit }: Props) => {
  const [expanded, setExpanded] = useState(false);
  const [showAllMajors, setShowAllMajors] = useState(false);
  const showToggle = useMemo(() => (opportunity.description?.length || 0) > 320, [opportunity.description]);
  const status = deadlineStatus(opportunity.deadline);
  const deadlineLabel =
    status === "Year-round"
      ? "Year-round"
      : formatDeadline(opportunity.deadline);
  const eligibilityText = formatEligibility(opportunity.eligibility);
  const majors = normalizeOpportunityMajors(opportunity.majors);
  const displayedMajors = showAllMajors ? majors : majors.slice(0, 5);
  const hasMoreMajors = majors.length > 5;
  const { toast } = useToast();

  const calendarMutation = useMutation({
    mutationFn: () => addOpportunityToCalendar(opportunity.id),
    onSuccess: (res) => {
      const googleErrors = res.google_errors || [];
      const hasInsufficientScope = googleErrors.includes("insufficient_google_scope");
      if (hasInsufficientScope) {
        toast({
          title: "Additional permissions required",
          description: "Please sign in again to grant calendar permissions.",
          variant: "warning",
        });
        return;
      }

      const hasGoogleErrors = googleErrors.length > 0;
      toast({
        title: "Added to Google Calendar",
        description: hasGoogleErrors
          ? `Event created, but Google reported: ${googleErrors.join(", ")}`
          : "Check your Google Calendar for the deadline event.",
        variant: hasGoogleErrors ? "warning" : "success",
      });
    },
    onError: (err: any) => {
      const status = err?.response?.status;
      const description =
        status === 401
          ? "Please sign in to add events to your calendar."
          : "Could not add this opportunity to your calendar.";
      toast({
        title: "Failed to add to calendar",
        description,
        variant: "error",
      });
    },
  });

  const handleAddToCalendar = () => {
    if (!opportunity.deadline) {
      toast({
        title: "Deadline missing",
        description: "This opportunity has no deadline to place on the calendar.",
        variant: "warning",
      });
      return;
    }
    calendarMutation.mutate();
  };

  return (
    <article
      className="rounded-2xl border border-gray-200 bg-white/90 backdrop-blur shadow-sm hover:shadow-lg transition-all duration-200 dark:border-border/60 dark:bg-background/70"
    >
      <div className="p-4 space-y-3">
        <div className="flex flex-col gap-2 lg:gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              {opportunity.type && (
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${pickBadge(opportunity.type)} shadow-sm`}>
                  {formatOpportunityType(opportunity.type)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-3 text-sm text-gray-600 dark:text-gray-300 flex-shrink-0 whitespace-nowrap">
              <Calendar className="h-4 w-4" />
              <span>{deadlineLabel}</span>
              <span
                className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  status === "Expired"
                    ? "bg-red-100 text-red-800"
                    : status === "Year-round"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {status}
              </span>
            </div>
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 leading-tight">
              {opportunity.name}
            </h3>
            {opportunity.host && (
              <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300 leading-snug min-w-0">
                <Building2 className="h-4 w-4" />
                <span className="break-words">{opportunity.host}</span>
              </div>
            )}
          </div>
        </div>

        {opportunity.description && (
          <div className="space-y-2">
            <div className={expanded ? "" : "line-clamp-4"}>
              <MarkdownContent
                content={opportunity.description}
                className="prose prose-sm dark:prose-invert max-w-none [&_*]:text-gray-700 dark:[&_*]:text-gray-200"
              />
            </div>
            {showToggle && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
              >
                {expanded ? "Show less" : "Show more"}
              </button>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-300">
          {displayedMajors.map((m, idx) => (
            <span
              key={`${m}-${idx}`}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
            >
              <GraduationCap className="h-3 w-3" />
              {m}
            </span>
          ))}
          {hasMoreMajors && (
            <button
              type="button"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-xs font-medium text-blue-700 dark:text-blue-200 dark:bg-gray-800"
              onClick={() => setShowAllMajors((v) => !v)}
            >
              {showAllMajors ? "Show less" : `Show ${majors.length - 5} more`}
            </button>
          )}
          {opportunity.location && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-50 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200">
              <MapPin className="h-3 w-3" />
              {opportunity.location}
            </span>
          )}
          {opportunity.funding && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
              <Wallet className="h-3 w-3" />
              Funding: {opportunity.funding}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:flex-nowrap pt-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            {opportunity.link ? (
              <a
                href={opportunity.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200 whitespace-nowrap"
              >
                <Link2 className="h-4 w-4" />
                Application link
              </a>
            ) : (
              <span className="text-sm text-gray-500">No application link</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddToCalendar}
              disabled={calendarMutation.isPending}
              className="whitespace-nowrap gap-2"
            >
              <img 
                src={typeof GoogleCalendarIcon === 'string' ? GoogleCalendarIcon : GoogleCalendarIcon.src} 
                alt="" 
                className="h-4 w-4" 
              />
              {calendarMutation.isPending ? "Adding..." : "Add to Google Calendar"}
            </Button>
          </div>
          {canManage && onEdit && (
            <button
              onClick={() => onEdit(opportunity)}
              className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              Edit
            </button>
          )}
        </div>
        {eligibilityText && (
          <div className="pt-2 text-xs text-gray-600 dark:text-gray-300">
            Eligibility: {eligibilityText}
          </div>
        )}
      </div>
    </article>
  );
};
