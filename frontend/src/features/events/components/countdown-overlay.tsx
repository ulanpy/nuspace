"use client";

import { useMemo } from "react";
import { useGlobalSecondTicker } from '@/hooks/use-global-second-ticker';

interface CountdownOverlayProps {
  eventDateIso: string;
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

export function CountdownOverlay({ eventDateIso, className = "" }: CountdownOverlayProps) {
  const nowMs = useGlobalSecondTicker();

  const { remainingMs, bgClass, textClass, ringClass, show } = useMemo(() => {
    const eventTimeMs = new Date(eventDateIso).getTime();
    const remaining = eventTimeMs - nowMs;

    const fifteenMinMs = 15 * 60 * 1000;
    const oneHourMs = 60 * 60 * 1000;
    const fiveHoursMs = 5 * oneHourMs;

    if (remaining <= 0) {
      return { remainingMs: remaining, bgClass: "", textClass: "", ringClass: "", show: false };
    }

    if (remaining <= fifteenMinMs) {
      return {
        remainingMs: remaining,
        bgClass: "bg-rose-600/75",
        textClass: "text-white",
        ringClass: "ring-rose-300/30",
        show: true,
      };
    }
    if (remaining <= oneHourMs) {
      return {
        remainingMs: remaining,
        bgClass: "bg-amber-400/80",
        textClass: "text-black",
        ringClass: "ring-amber-200/30",
        show: true,
      };
    }
    if (remaining <= fiveHoursMs) {
      return {
        remainingMs: remaining,
        bgClass: "bg-emerald-600/75",
        textClass: "text-white",
        ringClass: "ring-emerald-300/30",
        show: true,
      };
    }

    return {
      remainingMs: remaining,
      bgClass: "bg-black/40",
      textClass: "text-white",
      ringClass: "ring-white/10",
      show: true,
    };
  }, [eventDateIso, nowMs]);

  if (!show) return null;

  const timeText = formatRemaining(remainingMs);

  return (
    <div
      className={`absolute top-1 left-1 z-10 px-2.5 py-1.5 rounded-lg backdrop-blur-sm shadow-md ring-1 ${bgClass} ${ringClass} ${className}`}
    >
      <div className={`flex items-center gap-1.5 ${textClass}`}>
        <span className="text-[10px] opacity-90">Starts in</span>
        <span className="text-xs font-semibold leading-none">{timeText}</span>
      </div>
    </div>
  );
}
