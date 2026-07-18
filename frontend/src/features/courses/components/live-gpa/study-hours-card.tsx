"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { coursesSurface } from "../../constants/dashboard-theme";
import { sumDayHours, type WeekDayHours } from "../../utils/mock-study-hours";
import { cn } from "@/utils/utils";

interface StudyHoursCardProps {
  courseId: number;
  days: WeekDayHours[];
  target: number;
  onAdjustDay: (dayIndex: number, delta: number) => void;
}

export function StudyHoursCard({ courseId, days, target, onAdjustDay }: StudyHoursCardProps) {
  // Default to "today" (last column in the mock strip); reset when switching courses.
  const [selectedDay, setSelectedDay] = useState(Math.max(0, days.length - 1));

  useEffect(() => {
    setSelectedDay(Math.max(0, days.length - 1));
  }, [courseId, days.length]);

  const safeIndex = Math.min(selectedDay, days.length - 1);
  const active = days[safeIndex];
  const total = sumDayHours(days);
  const maxDay = Math.max(...days.map((day) => day.hours), 0.5);
  const progress = Math.min(100, Math.round((total / target) * 100));

  return (
    <div className={cn("p-4", coursesSurface.cardMd)}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Study time
            </p>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">This week · mock data</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold tabular-nums leading-none">
            {total}
            <span className="text-sm font-medium text-muted-foreground">h</span>
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">of {target}h goal</p>
        </div>
      </div>

      <div className="mb-2 space-y-1">
        <div className="flex h-10 items-end gap-1">
          {days.map((day, index) => {
            const selected = index === safeIndex;
            return (
              <button
                key={day.key}
                type="button"
                onClick={() => setSelectedDay(index)}
                className={cn(
                  "min-w-0 flex-1 rounded-sm transition-opacity",
                  selected ? "bg-foreground" : "bg-foreground/35 hover:bg-foreground/55",
                )}
                style={{ height: `${Math.max(4, (day.hours / maxDay) * 40)}px` }}
                aria-pressed={selected}
                aria-label={`${day.label}, ${day.hours} hours`}
                title={`${day.label}: ${day.hours}h`}
              />
            );
          })}
        </div>
        <div className="flex gap-1">
          {days.map((day, index) => (
            <button
              key={`${day.key}-label`}
              type="button"
              onClick={() => setSelectedDay(index)}
              className={cn(
                "min-w-0 flex-1 text-center text-[10px] transition-colors",
                index === safeIndex ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between gap-2 text-[12px]">
        <span className="text-muted-foreground">
          Logging to <span className="font-medium text-foreground">{active?.label}</span>
        </span>
        <span className="tabular-nums text-muted-foreground">{active?.hours ?? 0}h that day</span>
      </div>

      <div className="mb-3 space-y-1.5">
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-muted-foreground">Weekly pace</span>
          <span className="font-medium tabular-nums">{progress}%</span>
        </div>
        <div className={cn("h-1.5 overflow-hidden rounded-full", coursesSurface.progressTrack)}>
          <div className="h-full rounded-full bg-foreground/70 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="flex gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 rounded-lg px-2.5 text-[12px]"
          disabled={!active || active.hours <= 0}
          onClick={() => onAdjustDay(safeIndex, -0.5)}
        >
          −30m
        </Button>
        {[
          { label: "+30m", amount: 0.5 },
          { label: "+1h", amount: 1 },
        ].map((action) => (
          <Button
            key={action.label}
            type="button"
            size="sm"
            variant="outline"
            className="h-8 flex-1 rounded-lg text-[12px]"
            onClick={() => onAdjustDay(safeIndex, action.amount)}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
