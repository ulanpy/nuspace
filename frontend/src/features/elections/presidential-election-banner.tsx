"use client";

import { BarChart3 } from "lucide-react";
import { cn } from "@/utils/utils";
import { ElectionCounter } from "@/features/elections/ElectionCounter";
import { ElectionCountdown } from "@/features/elections/election-countdown";
import { useElectionCountdown } from "@/features/elections/hooks/use-election-countdown";

export type PresidentialElectionBannerProps = {
  className?: string;
};

/** Eligible voters (denominator for turnout); keep in sync with campaign comms. */
const ELECTORATE_TOTAL = 7618;

export function PresidentialElectionBanner({ className }: PresidentialElectionBannerProps) {
  const { isElectionStarted, isElectionEnded } = useElectionCountdown();

  /** Before polls open: no live number (counter + SSE stay unmounted). */
  const showLiveTurnout = isElectionStarted || isElectionEnded;

  const countdownTitle = (() => {
    if (isElectionEnded) return "Election has ended";
    if (isElectionStarted) return "Election ends in";
    return "Election starts in";
  })();

  return (
    <div
      className={cn(
        "p-6 rounded-xl border bg-card text-card-foreground shadow-sm",
        className,
      )}
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start text-center">
        <div className="md:col-span-1">
          <h3 className="text-lg font-semibold text-foreground">Voter Turnout</h3>
          <div className="flex flex-col mt-6">
            {showLiveTurnout ? (
              <>
                <span className="text-5xl tabular-nums">
                  <ElectionCounter />
                </span>
                <span className="text-sm mt-0.5 text-muted-foreground">
                  out of {ELECTORATE_TOTAL.toLocaleString()}
                </span>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 px-1">
                <div className="rounded-full bg-muted p-3 ring-1 ring-border/60">
                  <BarChart3 className="h-7 w-7 text-muted-foreground" aria-hidden />
                </div>
                <p className="text-sm text-muted-foreground leading-snug max-w-[12rem] mx-auto">
                  Live turnout updates here when voting starts.
                </p>
                <p className="text-xs text-muted-foreground/90 mt-2 tabular-nums">
                  {ELECTORATE_TOTAL.toLocaleString()} eligible voters
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-2">
          <h3 className="text-lg font-semibold text-foreground">{countdownTitle}</h3>
          <ElectionCountdown />
        </div>

        <div className="md:col-span-1">
          <h3 className="text-lg font-semibold text-foreground">Election Date</h3>
          <div className="mt-4 pt-4 tabular-nums">
            <p className="text-5xl">April 6</p>
            <p className="text-lg font-medium text-muted-foreground mt-1">10:00</p>
          </div>
        </div>
      </div>
    </div>
  );
}
