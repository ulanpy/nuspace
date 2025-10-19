import { useMemo } from "react";
import { Modal } from "@/components/atoms/modal";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Skeleton } from "@/components/atoms/skeleton";
import { cn } from "@/utils/utils";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Download } from "lucide-react";
import { ScheduleResponse } from "../types";

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

function formatTime(hh: number, mm: number) {
  const hours = hh.toString().padStart(2, "0");
  const minutes = mm.toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function ScheduleDialog({ open, onClose, schedule, meta, isLoading }: ScheduleDialogProps) {
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
          {/* Export to iCal button - temporarily hidden */}
          {/* <div className="flex flex-col items-end gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              disabled={!hasItems || isLoading}
              onClick={() => {
                if (!hasItems || isLoading) return;
                const now = new Date();
                const nowStamp = `${now.getUTCFullYear()}${`${now.getUTCMonth() + 1}`.padStart(2, "0")}${`${now.getUTCDate()}`.padStart(2, "0" )}T${`${now.getUTCHours()}`.padStart(2, "0")}${`${now.getUTCMinutes()}`.padStart(2, "0")}${`${now.getUTCSeconds()}`.padStart(2, "0") }Z`;
                let ics = "BEGIN:VCALENDAR\nVERSION:2.0\nCALSCALE:GREGORIAN\nPRODID:-//Nuspace//Registrar Schedule//EN\n";
                timetable.forEach(({ index: dayIndex, items }) => {
                  items.forEach((item, idx) => {
                    const nowLocal = new Date();
                    const startDate = new Date(nowLocal);
                    const currentWeekday = nowLocal.getDay();
                    const targetWeekday = (dayIndex + 1) % 7;
                    let diff = (targetWeekday - currentWeekday + 7) % 7;
                    const candidate = new Date(nowLocal);
                    candidate.setHours(item.time.start.hh, item.time.start.mm, 0, 0);
                    if (diff === 0 && candidate <= nowLocal) {
                      diff = 7;
                    }
                    startDate.setDate(nowLocal.getDate() + diff);
                    startDate.setHours(item.time.start.hh, item.time.start.mm, 0, 0);

                    const endDate = new Date(startDate);
                    endDate.setHours(item.time.end.hh, item.time.end.mm, 0, 0);

                    const startStr = `${startDate.getUTCFullYear()}${`${startDate.getUTCMonth() + 1}`.padStart(2, "0")}${`${startDate.getUTCDate()}`.padStart(2, "0")}T${`${startDate.getUTCHours()}`.padStart(2, "0")}${`${startDate.getUTCMinutes()}`.padStart(2, "0")}${`${startDate.getUTCSeconds()}`.padStart(2, "0")}Z`;
                    const endStr = `${endDate.getUTCFullYear()}${`${endDate.getUTCMonth() + 1}`.padStart(2, "0")}${`${endDate.getUTCDate()}`.padStart(2, "0")}T${`${endDate.getUTCHours()}`.padStart(2, "0")}${`${endDate.getUTCMinutes()}`.padStart(2, "0")}${`${endDate.getUTCSeconds()}`.padStart(2, "0")}Z`;
                    const uid = `${item.course_code}-${dayIndex}-${idx}@nuspace`;
                    const summary = (item.label || item.title || item.course_code).replace(/\n/g, " ");
                    const description = [item.title, item.info, item.teacher]
                      .filter(Boolean)
                      .join("\\n")
                      .replace(/\n/g, "\\n");
                    const location = (item.cab ?? "").replace(/\n/g, " ");
                    ics += `BEGIN:VEVENT\nUID:${uid}\nDTSTAMP:${nowStamp}\nSUMMARY:${summary}\nDESCRIPTION:${description}\nLOCATION:${location}\nDTSTART:${startStr}\nDTEND:${endStr}\nRRULE:FREQ=WEEKLY\nEND:VEVENT\n`;
                  });
                });
                ics += "END:VCALENDAR";

                const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = "nuspace-schedule.ics";
                anchor.rel = "noopener";
                document.body.appendChild(anchor);
                anchor.click();
                document.body.removeChild(anchor);
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="h-4 w-4" />
              Export to iCal
            </Button>
          </div> */}
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
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-6">
            {timetable.map(({ label, index: dayIndex, items }) => (
              <div
                key={label}
                className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                  <span className="text-xs text-muted-foreground">{items.length} classes</span>
                </div>
                <div className="space-y-3">
                  {items.map((item, index) => {
                    const color = schedule?.preferences?.colors?.[item.course_code] ?? "#6366f1";
                    return (
                      <div
                        key={`${item.course_code}-${index}-${formatTime(item.time.start.hh, item.time.start.mm)}`}
                        className="space-y-3 rounded-xl border border-transparent bg-background/80 p-3 shadow-sm"
                        style={{ borderColor: `${color}33`, backgroundColor: `${color}1A` }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Badge
                            variant="outline"
                            className={cn("border-[1.5px] text-xs font-semibold", "bg-background/80")}
                            style={{ borderColor: color, color }}
                          >
                            {item.course_code}
                          </Badge>
                          <span className="text-xs font-medium text-muted-foreground">
                            {formatTime(item.time.start.hh, item.time.start.mm)} — {formatTime(item.time.end.hh, item.time.end.mm)}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground line-clamp-2">
                            {item.label || item.title}
                          </p>
                          {item.info && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{item.info}</p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {item.teacher && <span>{item.teacher}</span>}
                          {item.cab && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-background/70 px-2 py-1">
                              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                              {item.cab}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
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
    </Modal>
  );
}

