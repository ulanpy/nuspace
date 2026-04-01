"use client";

import { useElectionCountdown } from "@/features/elections/hooks/use-election-countdown";

export function ElectionCountdown() {
  const { days, hours, minutes, seconds, isElectionEnded, isClient } = useElectionCountdown();

  if (!isClient) {
    return null;
  }

  if (isElectionEnded) {
    return <div className="text-center text-2xl mt-4">The election has ended.</div>;
  }

  return (
    <div className="text-center">
      <div className="grid grid-flow-col gap-5 text-center auto-cols-max mt-4 justify-center">
        <div className="flex flex-col p-2">
          <span className="text-5xl">
            <span>{days}</span>
          </span>
          days
        </div>
        <div className="flex flex-col p-2">
          <span className="text-5xl">
            <span>{hours}</span>
          </span>
          hours
        </div>
        <div className="flex flex-col p-2">
          <span className="text-5xl">
            <span>{minutes}</span>
          </span>
          min
        </div>
        <div className="flex flex-col p-2">
          <span className="text-5xl">
            <span>{seconds}</span>
          </span>
          sec
        </div>
      </div>
    </div>
  );
}
