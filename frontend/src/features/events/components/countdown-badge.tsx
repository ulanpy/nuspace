"use client";

import { useMemo } from "react";
import { Badge } from "@/components/atoms/badge";
import { useGlobalSecondTicker } from '@/hooks/use-global-second-ticker';

interface CountdownBadgeProps {
  eventDateIso: string;
  durationMinutes: number;
  className?: string;
}

function formatPast(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}d${hours > 0 ? ` ${hours}h` : ''} ago`;
  if (hours > 0) return `${hours}h ${minutes}m ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `just now`;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return "Started";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function formatOngoing(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

export function CountdownBadge({ eventDateIso, durationMinutes, className = "" }: CountdownBadgeProps) {
  const nowMs = useGlobalSecondTicker();

  const { remainingMs, tone, label, isOngoing, isFinished, animate } = useMemo(() => {
    const eventTimeMs = new Date(eventDateIso).getTime();
    const eventEndMs = eventTimeMs + (durationMinutes * 60 * 1000);
    const remaining = eventTimeMs - nowMs;
    const ongoingRemaining = eventEndMs - nowMs;

    const fifteenMinMs = 15 * 60 * 1000;
    const oneHourMs = 60 * 60 * 1000;
    const fiveHoursMs = 5 * oneHourMs;

    // Event is finished
    if (ongoingRemaining <= 0) {
      return {
        remainingMs: 0,
        tone: "bg-gray-500 text-white",
        label: "Finished",
        isOngoing: false,
        isFinished: true,
        animate: false,
      };
    }

    // Event is ongoing
    if (remaining <= 0 && ongoingRemaining > 0) {
      return {
        remainingMs: ongoingRemaining,
        tone: "bg-purple-600 text-white",
        label: "Ongoing",
        isOngoing: true,
        isFinished: false,
        animate: true,
      };
    }

    // Event is upcoming
    if (remaining > 0) {
      let tone = "bg-blue-100 text-blue-900";

      if (remaining <= fifteenMinMs) {
        tone = "bg-red-500 text-white";
      } else if (remaining <= oneHourMs) {
        tone = "bg-yellow-500 text-black";
      } else if (remaining <= fiveHoursMs) {
        tone = "bg-green-600 text-white";
      }

      return {
        remainingMs: remaining,
        tone,
        label: "Starts in",
        isOngoing: false,
        isFinished: false,
        animate: false,
      };
    }

    return { remainingMs: 0, tone: "", label: "", isOngoing: false, isFinished: false, animate: false };
  }, [eventDateIso, durationMinutes, nowMs]);

  if (!label) return null;

  const timeText = isOngoing
    ? formatOngoing(remainingMs)
    : isFinished
    ? `Ended ${formatPast(nowMs - (new Date(eventDateIso).getTime() + durationMinutes * 60 * 1000))}`
    : formatRemaining(remainingMs);

  return (
    <Badge className={`${tone} ${className} ${animate ? 'animate-pulse' : ''}`}>
      {timeText}
    </Badge>
  );
}
