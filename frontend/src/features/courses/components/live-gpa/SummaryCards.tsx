import { Card, CardContent } from "@/components/atoms/card";
import type { LiveGpaViewModel } from "../../hooks/useLiveGpaViewModel";

interface SummaryCardsProps {
  metrics: LiveGpaViewModel["metrics"];
}

export function SummaryCards({ metrics }: SummaryCardsProps) {
  const summaryData = [
    { label: "Total GPA", value: metrics.totalGPA.toFixed(2), helper: "Across all registered courses" },
    { label: "Max potential", value: metrics.maxPotentialGPA.toFixed(2), helper: "If you ace everything left" },
    { label: "Projected GPA", value: metrics.projectedGPA.toFixed(2), helper: "Based on current trend" },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {summaryData.map((summary) => (
        <Card key={summary.label} className="rounded-2xl border border-border/50 bg-muted/40 p-4">
          <CardContent className="space-y-2 p-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{summary.label}</p>
            <p className="text-3xl font-semibold text-foreground">{summary.value}</p>
            <p className="text-xs text-muted-foreground">{summary.helper}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

