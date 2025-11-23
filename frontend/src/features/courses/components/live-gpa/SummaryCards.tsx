import type { LiveGpaViewModel } from "../../hooks/useLiveGpaViewModel";

interface SummaryCardsProps {
  metrics: LiveGpaViewModel["metrics"];
}

export function SummaryCards({ metrics }: SummaryCardsProps) {
  const summaryData = [
    { label: "Total GPA", value: metrics.totalGPA.toFixed(2), helper: "All courses" },
    { label: "Max potential", value: metrics.maxPotentialGPA.toFixed(2), helper: "If perfect" },
    { label: "Projected", value: metrics.projectedGPA.toFixed(2), helper: "Current trend" },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 rounded-xl border border-border/40 bg-muted/20 p-2.5">
      {summaryData.map((summary) => (
        <div key={summary.label} className="flex flex-col items-center text-center">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{summary.label}</p>
          <p className="mt-1 text-xl font-semibold text-foreground">{summary.value}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{summary.helper}</p>
        </div>
      ))}
    </div>
  );
}

