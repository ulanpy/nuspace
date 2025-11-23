import { CalendarClock, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card";
import { Button } from "@/components/atoms/button";
import type { LiveGpaViewModel } from "../../hooks/useLiveGpaViewModel";

interface ScheduleCardProps {
  schedule: LiveGpaViewModel["schedule"];
}

export function ScheduleCard({ schedule }: ScheduleCardProps) {
  return (
    <Card className="rounded-2xl border border-border/50 bg-muted/30">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-1">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold text-foreground">Weekly timetable</CardTitle>
        </div>
        <CalendarClock className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {schedule.meta?.term_label ? `Current term: ${schedule.meta.term_label}` : "No schedule synced yet"}
          </span>
          {schedule.meta?.last_synced_at && (
            <span>
              {schedule.lastSyncedText
                ? `Last synced ${schedule.lastSyncedText}`
                : `Last synced ${new Date(`${schedule.meta.last_synced_at}Z`).toLocaleString()}`}
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-2"
          onClick={schedule.open}
          disabled={schedule.loading}
        >
          <CalendarDays className="h-4 w-4" />
          {schedule.loading ? "Loading schedule…" : "View schedule"}
        </Button>
      </CardContent>
    </Card>
  );
}

