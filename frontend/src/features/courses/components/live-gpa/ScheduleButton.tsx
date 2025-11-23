import { CalendarDays } from "lucide-react";
import { Button } from "@/components/atoms/button";
import type { LiveGpaViewModel } from "../../hooks/useLiveGpaViewModel";

interface ScheduleButtonProps {
  schedule: LiveGpaViewModel["schedule"];
}

export function ScheduleButton({ schedule }: ScheduleButtonProps) {
  const subtitle =
    schedule.meta?.term_label ??
    (schedule.lastSyncedText ? `Updated ${schedule.lastSyncedText}` : "Stay in sync with your registrar");

  return (
    <div className="rounded-2xl border border-border/40 bg-muted/15 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-foreground">Your schedule</span>
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="gap-2"
          onClick={schedule.open}
          disabled={schedule.loading}
        >
          <CalendarDays className="h-4 w-4" />
          {schedule.loading ? "Opening…" : "Open"}
        </Button>
      </div>
    </div>
  );
}

