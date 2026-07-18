import { Target, TrendingUp } from "lucide-react";
import type { LiveGpaViewModel } from "../../hooks/use-live-gpa-view-model";
import { coursesSurface } from "../../constants/dashboard-theme";
import { cn } from "@/utils/utils";

const GPA_MAX = 4;

interface SummaryCardsProps {
  metrics: LiveGpaViewModel["metrics"];
}

function clampGpa(value: number) {
  return Math.min(GPA_MAX, Math.max(0, value));
}

function toPercent(value: number) {
  return `${(clampGpa(value) / GPA_MAX) * 100}%`;
}

export function SummaryCards({ metrics }: SummaryCardsProps) {
  const current = clampGpa(metrics.totalGPA);
  const projected = clampGpa(metrics.projectedGPA);
  const maxPossible = clampGpa(metrics.maxPotentialGPA);

  return (
    <div
      className={cn(
        "flex flex-col gap-4 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-6 sm:px-5",
        coursesSurface.cardLg,
      )}
    >
      <div className="flex shrink-0 items-baseline gap-2">
        <p className="text-[2rem] font-semibold leading-none tracking-tight tabular-nums">
          {current.toFixed(2)}
        </p>
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">GPA</span>
      </div>

      <div className="min-w-0 flex-1 sm:min-w-[180px] sm:px-2">
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
          {/* Soft fill up to projected (remaining potential context) */}
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-primary/25"
            style={{ width: toPercent(Math.max(projected, current)) }}
          />
          {/* Solid fill for current GPA */}
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-primary"
            style={{ width: toPercent(current) }}
          />
          <Marker position={projected} label="Projected" />
          <Marker position={maxPossible} label="Max possible" />
        </div>
        <div className="mt-1.5 flex w-full justify-between gap-4 text-[11px] tabular-nums text-muted-foreground">
          <span>0.0</span>
          <span>4.0</span>
        </div>
      </div>

      <div className="flex shrink-0 items-stretch gap-5 sm:gap-6">
        <MetricStack icon={TrendingUp} label="Projected" value={projected.toFixed(2)} />
        <MetricStack icon={Target} label="Max possible" value={maxPossible.toFixed(2)} />
      </div>
    </div>
  );
}

function Marker({ position, label }: { position: number; label: string }) {
  if (position <= 0) return null;

  return (
    <div
      className="absolute top-1/2 z-10 h-3.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground shadow-sm"
      style={{ left: toPercent(position) }}
      title={`${label}: ${position.toFixed(2)}`}
    />
  );
}

function MetricStack({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-[88px]">
      <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
        <span>{label}</span>
      </div>
      <p className="mt-1 text-base font-semibold tabular-nums leading-none">{value}</p>
    </div>
  );
}
