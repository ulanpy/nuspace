"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import {
  computeScheduleQuality,
  formatDuration,
  formatHoursTotal,
  formatMinutesClock,
  lunchKindLabel,
  type DayLunchWindow,
  type ScheduleQuality,
  type SectionLike,
} from "../utils/schedule-quality";

type Props = {
  sections: SectionLike[];
  className?: string;
};

function getQuality(sections: SectionLike[]): ScheduleQuality | null {
  if (!sections.length) return null;
  return computeScheduleQuality(sections);
}

/** Fit / Clash status — keep next to plan name. */
export function ScheduleFitBadge({ sections, className }: Props) {
  const q = getQuality(sections);
  if (!q) return null;
  if (q.campusDays === 0 && !q.hasClash) {
    return (
      <Badge variant="secondary" className={cn("h-6 px-1.5 text-[11px] font-medium", className)}>
        No times
      </Badge>
    );
  }
  return (
    <Badge
      variant={q.hasClash ? "destructive" : "secondary"}
      className={cn("h-6 px-1.5 text-[11px] font-semibold", className)}
    >
      {q.hasClash ? "Clash" : "Fit"}
    </Badge>
  );
}

/** Compact insights trigger — place next to Copy. */
export function ScheduleInsightsButton({ sections, className }: Props) {
  const q = getQuality(sections);
  if (!q || (q.campusDays === 0 && !q.hasClash)) return null;

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className={cn("size-7 text-muted-foreground", className)}
              aria-label="Schedule insights"
            >
              <Info className="size-3.5" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Insights</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-80 p-3">
        <div className="space-y-3">
          <p className="text-sm font-medium">Schedule insights</p>

          <div className="grid grid-cols-2 gap-2">
            <Metric label="Class hours" value={formatHoursTotal(q.totalClassMinutes)} />
            <Metric
              label="Longest gap"
              value={
                q.longestGapMinutes != null && q.longestGapDay
                  ? `${q.longestGapDay.dayLabel} · ${formatDuration(q.longestGapMinutes)}`
                  : q.longestGapMinutes != null
                    ? formatDuration(q.longestGapMinutes)
                    : "—"
              }
            />
            <Metric
              label="Earliest start"
              value={q.earliestStart != null ? formatMinutesClock(q.earliestStart) : "—"}
            />
            <Metric
              label="Latest start"
              value={q.latestStart != null ? formatMinutesClock(q.latestStart) : "—"}
            />
            <Metric
              label="Heaviest day"
              value={
                q.heaviestDay
                  ? `${q.heaviestDay.dayLabel} · ${formatDuration(q.heaviestDay.minutes)}`
                  : "—"
              }
            />
            <Metric
              label="Lightest day"
              value={
                q.lightestDay
                  ? `${q.lightestDay.dayLabel} · ${formatDuration(q.lightestDay.minutes)}`
                  : "—"
              }
            />
          </div>

          <Separator />

          <div className="space-y-1.5">
            <p className="text-xs font-medium">Lunch availability</p>
            <ul className="space-y-1">
              {q.lunch.byDay.map((day) => (
                <LunchDayRow key={day.day} day={day} />
              ))}
            </ul>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** @deprecated Prefer ScheduleFitBadge + ScheduleInsightsButton */
export function ScheduleQualitySummary(props: Props) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <ScheduleFitBadge {...props} />
      <ScheduleInsightsButton {...props} />
    </div>
  );
}

function LunchDayRow({ day }: { day: DayLunchWindow }) {
  const kindClass =
    day.kind === "lunch"
      ? "text-foreground"
      : day.kind === "quick"
        ? "text-amber-700 dark:text-amber-400"
        : "text-destructive";

  return (
    <li className="rounded-md bg-muted/40 px-2 py-1.5 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="w-8 font-medium tabular-nums">{day.dayLabel}</span>
        <span className={cn("min-w-0 flex-1 truncate font-medium", kindClass)}>
          {lunchKindLabel(day.kind)}
        </span>
        {day.kind !== "none" && day.durationMinutes > 0 ? (
          <span className={cn("shrink-0 tabular-nums", kindClass)}>
            {formatDuration(day.durationMinutes)}
          </span>
        ) : null}
      </div>
      {day.kind !== "none" && day.start != null && day.end != null ? (
        <p className="mt-0.5 pl-8 text-[11px] text-muted-foreground tabular-nums">
          {formatMinutesClock(day.start)}–{formatMinutesClock(day.end)}
        </p>
      ) : null}
      {day.kind === "none" && day.durationMinutes > 0 && day.start != null && day.end != null ? (
        <p className="mt-0.5 pl-8 text-[11px] text-muted-foreground tabular-nums">
          {formatMinutesClock(day.start)}–{formatMinutesClock(day.end)} ·{" "}
          {formatDuration(day.durationMinutes)}
        </p>
      ) : null}
      {day.kind === "none" && day.durationMinutes === 0 ? (
        <p className="mt-0.5 pl-8 text-[11px] text-muted-foreground">None 12–3</p>
      ) : null}
    </li>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium tabular-nums leading-tight">{value}</p>
    </div>
  );
}
