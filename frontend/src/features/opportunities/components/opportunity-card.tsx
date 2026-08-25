"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Opportunity,
  OpportunityEligibility,
  formatEducationLevel,
  formatOpportunityType,
  normalizeOpportunityMajors,
} from "../types";
import { Calendar, MapPin, Link2, Building2, GraduationCap, Wallet } from "lucide-react";
import { MarkdownContent } from '@/components/molecules/markdown-content';
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/toast";
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
  onDelete?: (opp: Opportunity) => void;
  isDeleting?: boolean;
};

export const OpportunityCard = ({
  opportunity,
  canManage = false,
  onEdit,
  onDelete,
  isDeleting = false,
}: Props) => {
  const [expanded, setExpanded] = useState(false);
  const status = deadlineStatus(opportunity.deadline);
  const deadlineLabel =
    status === "Year-round"
      ? "Year-round"
      : formatDeadline(opportunity.deadline);
  const eligibilityText = formatEligibility(opportunity.eligibility);
  const majors = normalizeOpportunityMajors(opportunity.majors);
  const displayedMajors = expanded ? majors : majors.slice(0, 3);
  const hasMoreDetails = Boolean(
    opportunity.description || opportunity.location || opportunity.funding || majors.length > 3,
  );

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
      className="rounded-lg border border-border bg-card transition-colors hover:bg-muted/20"
    >
      <div className="space-y-3 p-4 sm:p-5">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              {opportunity.type && (
                <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {formatOpportunityType(opportunity.type)}
                </span>
              )}
              <h3 className="text-lg font-semibold leading-tight text-foreground">{opportunity.name}</h3>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground sm:text-sm">
              <Calendar className="h-4 w-4" />
              <span>{deadlineLabel}</span>
              <span
                className={`hidden rounded-full px-2 py-0.5 text-xs font-medium sm:inline-flex ${
                  status === "Expired"
                    ? "bg-destructive/10 text-destructive"
                    : status === "Year-round"
                    ? "bg-muted text-muted-foreground"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {status}
              </span>
            </div>
          </div>
          {opportunity.host && (
            <div className="flex min-w-0 items-start gap-2 text-sm leading-snug text-muted-foreground">
              <Building2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="break-words">{opportunity.host}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {eligibilityText && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 font-medium text-primary">
              {eligibilityText}
            </span>
          )}
          {displayedMajors.map((m, idx) => (
            <span
              key={`${m}-${idx}`}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1"
            >
              <GraduationCap className="h-3 w-3" />
              {m}
            </span>
          ))}
          {!expanded && majors.length > 3 && (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-medium text-primary"
              onClick={() => setExpanded(true)}
            >
              +{majors.length - 3} more
            </button>
          )}
          {expanded && opportunity.location && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1">
              <MapPin className="h-3 w-3" />
              {opportunity.location}
            </span>
          )}
          {expanded && opportunity.funding && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1">
              <Wallet className="h-3 w-3" />
              Funding: {opportunity.funding}
            </span>
          )}
        </div>

        {expanded && opportunity.description && (
          <div className="border-t border-border pt-3">
            <MarkdownContent
              content={opportunity.description}
              className="prose prose-sm max-w-none text-muted-foreground dark:prose-invert [&_*]:text-muted-foreground"
            />
          </div>
        )}

        <div className="flex flex-col gap-2 border-t border-border pt-3 md:flex-row md:items-center md:justify-between md:flex-nowrap">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            {opportunity.link ? (
              <a
                href={opportunity.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 whitespace-nowrap text-sm font-medium text-primary hover:underline"
              >
                <Link2 className="h-4 w-4" />
                Application link
              </a>
            ) : (
              <span className="text-sm text-muted-foreground">No application link</span>
            )}
            {hasMoreDetails && (
              <Button variant="ghost" size="sm" className="h-auto justify-start px-0 text-primary hover:text-primary" onClick={() => setExpanded((value) => !value)}>
                {expanded ? "Hide details" : "Details"}
              </Button>
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
            {canManage && onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(opportunity)}
                className="whitespace-nowrap"
              >
                Edit
              </Button>
            )}
            {canManage && onDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(opportunity)}
                disabled={isDeleting}
                className="whitespace-nowrap"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
