import { useEffect, useState } from "react";

// Module-level singleton ticker to avoid multiple intervals across components
let subscribers = new Set<() => void>();
let intervalId: number | null = null;

function notifyAll(): void {
  for (const subscriber of subscribers) {
    subscriber();
  }
}

function ensureRunning(): void {
  if (intervalId !== null) return;
  intervalId = window.setInterval(() => {
    notifyAll();
  }, 1000);
}

function ensureStopped(): void {
  if (intervalId === null) return;
  if (subscribers.size > 0) return;
  window.clearInterval(intervalId);
  intervalId = null;
}

export function useGlobalSecondTicker(): number {
  const [nowMs, setNowMs] = useState<number>(Date.now());

  useEffect(() => {
    const handleTick = () => setNowMs(Date.now());
    subscribers.add(handleTick);

    // Start ticker if not running
    ensureRunning();

    // Emit an immediate tick so consumers get up-to-date value right away
    handleTick();

    return () => {
      subscribers.delete(handleTick);
      ensureStopped();
    };
  }, []);

  return nowMs;
}
