import { useMemo } from "react";
import { useGlobalSecondTicker } from "@/hooks/useGlobalSecondTicker";

interface CountdownHeaderBarProps {
  eventDateIso: string;
  durationMinutes: number;
  className?: string;
}

function formatRemaining(ms: number): string {
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

export function CountdownHeaderBar({ eventDateIso, durationMinutes, className = "" }: CountdownHeaderBarProps) {
  const nowMs = useGlobalSecondTicker();

  const { remainingMs, bgClass, textClass, show, label, isOngoing, isFinished, animate } = useMemo(() => {
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
        bgClass: "bg-gray-500/80",
        textClass: "text-white",
        show: true,
        label: "Ended",
        isOngoing: false,
        isFinished: true,
        animate: false,
      };
    }

    // Event is ongoing
    if (remaining <= 0 && ongoingRemaining > 0) {
      return {
        remainingMs: ongoingRemaining,
        bgClass: "bg-purple-600/85",
        textClass: "text-white",
        show: true,
        label: "Ongoing",
        isOngoing: true,
        isFinished: false,
        animate: true,
      };
    }

    // Event is upcoming
    if (remaining > 0) {
      let bgClass = "bg-blue-500/20";
      let textClass = "text-blue-900 dark:text-blue-100";

      if (remaining <= fifteenMinMs) {
        bgClass = "bg-rose-600/80";
        textClass = "text-white";
      } else if (remaining <= oneHourMs) {
        bgClass = "bg-amber-400/85";
        textClass = "text-black";
      } else if (remaining <= fiveHoursMs) {
        bgClass = "bg-emerald-600/80";
        textClass = "text-white";
      }

      return {
        remainingMs: remaining,
        bgClass,
        textClass,
        show: true,
        label: "Starts in",
        isOngoing: false,
        isFinished: false,
        animate: false,
      };
    }

    return { remainingMs: 0, bgClass: "", textClass: "", show: false, label: "", isOngoing: false, isFinished: false, animate: false };
  }, [eventDateIso, durationMinutes, nowMs]);

  if (!show) return null;

  const timeText = isOngoing 
    ? formatOngoing(remainingMs)
    : isFinished 
    ? formatPast(nowMs - (new Date(eventDateIso).getTime() + (durationMinutes * 60 * 1000)))
    : formatRemaining(remainingMs);

  return (
    <div className={`rounded-t-lg ${bgClass} ${className} ${animate ? 'animate-pulse' : ''}`}>
      <div className={`px-3 py-1 flex items-center gap-2 ${textClass}`}>
        <span className="text-[10px] uppercase tracking-wide opacity-90">{label}</span>
        <span className="text-xs font-semibold leading-none">{timeText}</span>
      </div>
    </div>
  );
}
