"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/atoms/modal";
import { Badge } from "@/components/atoms/badge";
import { Skeleton } from "@/components/atoms/skeleton";
import { cn } from "@/utils/utils";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ScheduleResponse } from "../types";
import { Button } from "@/components/atoms/button";
import { gradeStatisticsApi } from '../api/grade-statistics-api';
import { useToast } from "@/hooks/use-toast";
import GoogleCalendarIcon from "@/assets/svg/google_calendar_icon.svg";

interface ScheduleDialogProps {
  open: boolean;
  onClose: () => void;
  schedule: ScheduleResponse | null;
  meta: {
    term_label: string | null;
    term_value: string | null;
    last_synced_at: string | null;
  } | null;
  isLoading: boolean;
}

const WEEKDAYS = [
  { label: "Monday", index: 0 },
  { label: "Tuesday", index: 1 },
  { label: "Wednesday", index: 2 },
  { label: "Thursday", index: 3 },
  { label: "Friday", index: 4 },
  { label: "Saturday", index: 5 },
];

const ROW_HEIGHT_PX = 96;

function formatTime(hh: number, mm: number) {
  const hours = hh.toString().padStart(2, "0");
  const minutes = mm.toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatSlotLabel(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return formatTime(hours, minutes);
}

function toMinutes(time: { hh: number; mm: number }) {
  return time.hh * 60 + time.mm;
}

export function ScheduleDialog({ open, onClose, schedule, meta, isLoading }: ScheduleDialogProps) {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [showReauth, setShowReauth] = useState(false);
  const timetable = useMemo(() => {
    const days = WEEKDAYS.map(({ label, index }) => {
      const dayItems = schedule?.data?.[index] ?? [];
      const uniqueMap = new Map<string, typeof dayItems[number]>();

      dayItems.forEach((item) => {
        const key = [
          item.course_code,
          item.label,
          item.title,
          item.teacher,
          item.cab,
          item.time.start.hh,
          item.time.start.mm,
          item.time.end.hh,
          item.time.end.mm,
        ].join("|");
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, item);
        }
      });

      const sorted = Array.from(uniqueMap.values()).sort((a, b) => {
        const aMinutes = a.time.start.hh * 60 + a.time.start.mm;
        const bMinutes = b.time.start.hh * 60 + b.time.start.mm;
        return aMinutes - bMinutes;
      });
      return { label, index, items: sorted };
    });

    return days.map(({ label, index, items }) => ({ label, index, items }));
  }, [schedule]);

  const hasItems = timetable.some((day) => day.items.length > 0);

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await gradeStatisticsApi.exportScheduleToGoogle();
      if (res.google_errors?.includes("insufficient_google_scope")) {
        setShowReauth(true);
        return;
      }
      if (res.google_errors?.length) {
        toast({
          title: "Google Calendar sync completed with issues",
          description: "Some events failed to sync. Please try again.",
          variant: "warning",
        });
      } else {
        toast({
          title: "Synced to Google Calendar",
          description: "Your schedule is up to date.",
          variant: "success",
        });
      }
      if (res.google_errors?.length) {
        console.error("Google calendar export errors", res.google_errors);
      }
    } catch (err: unknown) {
      // If Keycloak/Google token exchange fails (e.g., expired Google consent), we receive a 403.
      // In that case prompt the user to re-authenticate instead of only showing a toast.
      const status = (err as any)?.response?.status ?? (err as any)?.status;
      if (status === 401 || status === 403) {
        setShowReauth(true);
        toast({
          title: "Sign in again required",
          description: "We need fresh permission to sync your calendar.",
          variant: "warning",
        });
        return;
      }

      let detail = "Failed to export";
      if (err instanceof Error) {
        detail = err.message;
      }
      toast({ title: "Export failed", description: detail, variant: "error" });
    } finally {
      setExporting(false);
    }
  };

  const timeSlots = useMemo(() => {
    const MIN_TIME = 6 * 60;
    const MAX_TIME = 22 * 60;
    const DEFAULT_START = 8 * 60;
    const DEFAULT_END = 18 * 60;

    let earliest = Infinity;
    let latest = -Infinity;

    timetable.forEach((day) => {
      day.items.forEach((item) => {
        const start = toMinutes(item.time.start);
        const end = toMinutes(item.time.end);
        if (start < earliest) earliest = start;
        if (end > latest) latest = end;
      });
    });

    if (!Number.isFinite(earliest) || !Number.isFinite(latest)) {
      earliest = DEFAULT_START;
      latest = DEFAULT_END;
    }

    const start = Math.max(MIN_TIME, Math.floor(earliest / 60) * 60);
    const end = Math.max(
      start + 60,
      Math.min(MAX_TIME, Math.ceil(latest / 60) * 60),
    );

    const slots: number[] = [];
    for (let current = start; current < end; current += 60) {
      slots.push(current);
    }

    return slots.length > 0 ? slots : [DEFAULT_START];
  }, [timetable]);

  const columnTemplate = useMemo(
    () => `96px repeat(${timetable.length || WEEKDAYS.length}, minmax(240px, 1fr))`,
    [timetable.length],
  );

  const lastSyncedText = useMemo(() => {
    if (!meta?.last_synced_at) return null;
    try {
      // Convert UTC datetime from database to local time
      const utcDate = parseISO(meta.last_synced_at + 'Z'); // Add 'Z' to ensure it's treated as UTC
      return formatDistanceToNow(utcDate, { addSuffix: true });
    } catch (error) {
      return null;
    }
  }, [meta?.last_synced_at]);

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Weekly timetable"
      className="max-w-5xl"
      contentClassName="rounded-3xl"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {meta?.term_label ?? "Current term"}
            </p>
            <p className="text-xs text-muted-foreground">
              Synced {lastSyncedText ?? "just now"}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="rounded-full px-4 font-medium gap-2"
            onClick={handleExport}
            disabled={exporting || isLoading || !hasItems}
          >
            <img 
              src={typeof GoogleCalendarIcon === 'string' ? GoogleCalendarIcon : GoogleCalendarIcon.src} 
              alt="" 
              className="h-4 w-4" 
            />
            {exporting ? "Exporting…" : "Import to Google Calendar"}
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-6">
            {WEEKDAYS.map(({ label }) => (
              <div key={label} className="space-y-3 rounded-2xl border border-border/60 bg-muted/30 p-4">
                <Skeleton className="h-4 w-24" />
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : hasItems ? (
          <div className="overflow-x-auto rounded-3xl border border-border/60 bg-muted/15">
            <div className="min-w-[960px] divide-y divide-border/30 text-sm">
              <div
                className="grid border-b border-border/30 bg-background/80 text-xs uppercase tracking-wide text-muted-foreground"
                style={{ gridTemplateColumns: columnTemplate }}
              >
                <div className="px-4 py-3 text-[11px] font-semibold">Time</div>
                {timetable.map(({ label, items }) => (
                  <div key={`${label}-header`} className="border-l border-border/15 px-4 py-3 text-left">
                    <p className="text-sm font-semibold text-foreground">{label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {items.length ? `${items.length} classes` : "—"}
                    </p>
                  </div>
                ))}
              </div>

              <div
                className="grid bg-background/50"
                style={{ gridTemplateColumns: columnTemplate }}
              >
                <div className="border-r border-border/20 bg-background/60">
                  {timeSlots.map((slot, slotIndex) => (
                    <div
                      key={`time-${slot}`}
                      className={cn(
                        "flex items-center px-4 py-2",
                        slotIndex !== timeSlots.length - 1 && "border-b border-border/15",
                      )}
                      style={{ height: ROW_HEIGHT_PX }}
                    >
                      <span className="text-xs font-semibold text-muted-foreground">{formatSlotLabel(slot)}</span>
                    </div>
                  ))}
                </div>

                {timetable.map((day, dayIdx) => {
                  const timelineStart = timeSlots[0];
                  const totalTimelineMinutes = timeSlots.length * 60;
                  const timelineEnd = timelineStart + totalTimelineMinutes;

                  return (
                    <div
                      key={`${day.label}-timeline`}
                      className={cn(
                        "relative bg-background/40",
                        dayIdx !== timetable.length - 1 && "border-r border-border/20",
                      )}
                      style={{ height: ROW_HEIGHT_PX * timeSlots.length }}
                    >
                      <div className="absolute inset-0">
                        {timeSlots.map((slot, index) => (
                          <div
                            key={`${day.label}-grid-${slot}`}
                            className={cn(
                              "border-border/15",
                              index !== timeSlots.length - 1 ? "border-b border-dashed" : "",
                            )}
                            style={{ height: ROW_HEIGHT_PX }}
                          />
                        ))}
                      </div>

                      <div className="absolute inset-0 w-full h-full px-3">
                        {day.items.map((item, index) => {
                          const color = schedule?.preferences?.colors?.[item.course_code] ?? "#6366f1";
                          const originalStart = toMinutes(item.time.start);
                          const originalEnd = toMinutes(item.time.end);
                          const clampedStart = Math.max(timelineStart, Math.min(originalStart, timelineEnd));
                          const clampedEnd = Math.max(clampedStart + 15, Math.min(originalEnd, timelineEnd));
                          const offsetMinutes = clampedStart - timelineStart;
                          const durationMinutes = Math.max(clampedEnd - clampedStart, 30);
                          const topPercent = (offsetMinutes / totalTimelineMinutes) * 100;
                          const heightPercent = Math.max(
                            (durationMinutes / totalTimelineMinutes) * 100,
                            (45 / totalTimelineMinutes) * 100,
                          );

                          return (
                            <div
                              key={`${item.course_code}-${index}-${clampedStart}`}
                              className="absolute left-3 right-3 space-y-1 overflow-hidden rounded-2xl border bg-background/80 p-3 text-xs shadow-sm"
                              style={{
                                top: `${topPercent}%`,
                                height: `calc(${heightPercent}% - 6px)`,
                                borderColor: `${color}40`,
                                backgroundColor: `${color}1a`,
                              }}
                            >
                              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "w-fit border-[1.5px] px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                    "bg-background/80",
                                  )}
                                  style={{ borderColor: color, color }}
                                >
                                  {item.course_code}
                                </Badge>
                                <span className="text-[10px] font-medium text-muted-foreground sm:text-right">
                                  {formatTime(item.time.start.hh, item.time.start.mm)} —{" "}
                                  {formatTime(item.time.end.hh, item.time.end.mm)}
                                </span>
                              </div>
                              <p className="text-[10px] font-semibold text-foreground line-clamp-3 break-words">
                                {item.label || item.title}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 text-[9px] text-muted-foreground">
                                {item.teacher && <span className="truncate">{item.teacher}</span>}
                                {item.cab && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-background/70 px-2 py-0.5">
                                    <span
                                      className="h-1.5 w-1.5 rounded-full"
                                      style={{ backgroundColor: color }}
                                    />
                                    {item.cab}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 rounded-2xl border border-dashed border-border/60 bg-muted/20 p-12 text-center">
            <p className="text-sm font-semibold text-foreground">No schedule synced yet</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Use the sync button to import your registrar schedule. We will display it here as soon as it is available.
            </p>
          </div>
        )}
      </div>

      <Modal
        isOpen={showReauth}
        onClose={() => setShowReauth(false)}
        title="Sign in again for Google Calendar"
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            We couldn’t access your Google Calendar. Please sign in again so the updated calendar permission applies.
            This is a one-time step.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowReauth(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                const url = new URL("/api/login", window.location.origin);
                url.searchParams.set("reauth", "1");
                window.location.href = url.toString();
              }}
            >
              Sign in again
            </Button>
          </div>
        </div>
      </Modal>
    </Modal>
  );
}

