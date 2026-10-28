import { useState } from "react"
import {
  Building2Icon,
  CalendarClockIcon,
  CalendarPlusIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalLinkIcon,
  GraduationCapIcon,
  MapPinIcon,
  PencilIcon,
  Trash2Icon,
  WalletIcon,
} from "lucide-react"

import { ApiError } from "@/api/client"
import { apiErrorMessage } from "@/api/errors"
import { Markdown } from "@/components/shared/markdown/renderer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  OPPORTUNITY_TYPE_LABELS,
  formatEligibilities,
  getDeadlinePresentation,
  normalizeMajors,
  useAddOpportunityToCalendar,
} from "@/lib/opportunities"
import type { Opportunity } from "@/lib/opportunities"
import { toPlainText } from "@/lib/markdown"
import { beginReauthentication } from "@/lib/user"
import { formatCampusDate } from "@/lib/utils"

export function OpportunityCard({
  opportunity,
  onEdit,
  onDelete,
}: {
  opportunity: Opportunity
  /** Both omitted for readers, which is everyone but the digest's authors. */
  onEdit?: () => void
  onDelete?: () => void
}) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const [areMajorsExpanded, setAreMajorsExpanded] = useState(false)
  const calendar = useAddOpportunityToCalendar()
  const majors = normalizeMajors(opportunity.majors)
  const eligibilities = formatEligibilities(opportunity.eligibilities)
  const deadline = getDeadlinePresentation(opportunity.deadline)
  const expired = deadline.kind === "closed"
  const description = opportunity.description
    ? toPlainText(opportunity.description)
    : ""
  const canExpandDescription = description.length > 280
  const visibleMajors = areMajorsExpanded ? majors : majors.slice(0, 5)

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant="secondary">
          {OPPORTUNITY_TYPE_LABELS[opportunity.type]}
        </Badge>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={
              deadline.kind === "closing-soon"
                ? "default"
                : deadline.kind === "closed"
                  ? "outline"
                  : "secondary"
            }
          >
            {deadline.label}
          </Badge>
          {opportunity.deadline && (
            <span className="text-xs text-muted-foreground">
              {formatCampusDate(opportunity.deadline)}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <h3 className="text-lg/snug font-semibold text-balance">
          {opportunity.name}
        </h3>
        {opportunity.host && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2Icon className="size-4 shrink-0" aria-hidden />
            {opportunity.host}
          </p>
        )}
      </div>

      {opportunity.description && (
        <div className="space-y-2">
          {isDescriptionExpanded ? (
            <Markdown className="text-sm text-muted-foreground">
              {opportunity.description}
            </Markdown>
          ) : (
            <p
              className={
                canExpandDescription
                  ? "line-clamp-4 text-sm/relaxed text-muted-foreground"
                  : "text-sm/relaxed text-muted-foreground"
              }
            >
              {description}
            </p>
          )}
          {canExpandDescription && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-3"
              aria-expanded={isDescriptionExpanded}
              onClick={() => {
                setIsDescriptionExpanded((value) => !value)
              }}
            >
              {isDescriptionExpanded ? (
                <ChevronUpIcon aria-hidden />
              ) : (
                <ChevronDownIcon aria-hidden />
              )}
              {isDescriptionExpanded ? "Show less" : "Read full description"}
            </Button>
          )}
        </div>
      )}

      <dl className="flex flex-wrap gap-2 text-xs">
        {opportunity.deadline && (
          <Badge
            variant="secondary"
            className="h-auto px-2.5 py-1 text-muted-foreground"
            render={<div />}
          >
            <dt className="sr-only">Deadline</dt>
            <CalendarClockIcon className="size-3.5 shrink-0" aria-hidden />
            <dd>{deadline.relative}</dd>
          </Badge>
        )}
        {opportunity.location && (
          <Badge
            variant="secondary"
            className="h-auto px-2.5 py-1 text-muted-foreground"
            render={<div />}
          >
            <dt className="sr-only">Location</dt>
            <MapPinIcon className="size-3.5 shrink-0" aria-hidden />
            <dd>{opportunity.location}</dd>
          </Badge>
        )}
        {opportunity.funding && (
          <Badge
            variant="secondary"
            className="h-auto px-2.5 py-1 text-muted-foreground"
            render={<div />}
          >
            <dt className="sr-only">Funding</dt>
            <WalletIcon className="size-3.5 shrink-0" aria-hidden />
            <dd>{opportunity.funding}</dd>
          </Badge>
        )}
      </dl>

      {eligibilities.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Eligibility
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {eligibilities.map((label) => (
              <Badge key={label} variant="outline">
                {label}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {majors.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Eligible majors
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {visibleMajors.map((major) => (
              <Badge key={major} variant="secondary">
                <GraduationCapIcon aria-hidden />
                {major}
              </Badge>
            ))}
            {majors.length > 5 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                aria-expanded={areMajorsExpanded}
                onClick={() => {
                  setAreMajorsExpanded((value) => !value)
                }}
              >
                {areMajorsExpanded
                  ? "Show fewer"
                  : `Show ${String(majors.length - 5)} more`}
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        {opportunity.link ? (
          <Button
            nativeButton={false}
            size="sm"
            render={
              <a
                href={opportunity.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLinkIcon aria-hidden />
                Application link
              </a>
            }
          />
        ) : (
          <span className="text-sm text-muted-foreground">
            No application link provided
          </span>
        )}

        {opportunity.deadline && !expired && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={calendar.isPending}
            onClick={() => {
              calendar.mutate(opportunity.id)
            }}
          >
            <CalendarPlusIcon aria-hidden />
            {calendar.isPending ? "Adding…" : "Add deadline to calendar"}
          </Button>
        )}

        {onEdit && (
          <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
            <PencilIcon aria-hidden />
            Edit
          </Button>
        )}
        {onDelete && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-destructive hover:text-destructive"
          >
            <Trash2Icon aria-hidden />
            Delete
          </Button>
        )}
      </div>

      {opportunity.deadline && !expired && (
        <div>
          {calendar.isSuccess && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span
                className={
                  calendar.data.google_errors.length > 0
                    ? "text-warning"
                    : "text-success"
                }
              >
                {calendar.data.google_errors.includes(
                  "insufficient_google_scope"
                )
                  ? "Google Calendar permission needs to be renewed."
                  : calendar.data.google_errors.length > 0
                    ? "Calendar added with warnings from Google."
                    : "Added to Google Calendar."}
              </span>
              {calendar.data.google_errors.includes(
                "insufficient_google_scope"
              ) && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={beginReauthentication}
                >
                  Sign in again
                </Button>
              )}
            </div>
          )}
          {calendar.isError && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-destructive">
              <span>
                {calendar.error instanceof ApiError &&
                (calendar.error.status === 401 || calendar.error.status === 403)
                  ? "Google permission needs to be renewed."
                  : apiErrorMessage(
                      calendar.error,
                      "Could not add this deadline."
                    )}
              </span>
              {calendar.error instanceof ApiError &&
                (calendar.error.status === 401 ||
                  calendar.error.status === 403) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={beginReauthentication}
                  >
                    Sign in again
                  </Button>
                )}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
