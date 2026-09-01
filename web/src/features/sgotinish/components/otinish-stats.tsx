import { useQuery } from "@tanstack/react-query"

import { sgotinishStatsQueryOptions } from "@/features/sgotinish/api"
import { Skeleton } from "@/components/ui/skeleton"

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="min-w-0">
      <p className="text-3xl font-semibold tabular-nums tracking-tight">
        {value}
      </p>
      <p className="mt-1 text-sm leading-snug text-muted-foreground">
        {label}
      </p>
    </div>
  )
}

export function OtinishStats() {
  const { data, isLoading, isError } = useQuery(sgotinishStatsQueryOptions())

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4" aria-hidden>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    )
  }

  if (isError || !data) {
    return null
  }

  const answeredPct =
    data.total_tickets > 0
      ? Math.round((data.answered_tickets / data.total_tickets) * 100)
      : null

  const topCategories = (data.by_category ?? []).slice(0, 4)
  const maxCat = topCategories[0]?.count ?? 0

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium">Already in use</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Real appeals from NU students — always anonymous to Student
          Government.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
        <Stat value={data.total_tickets} label="appeals submitted" />
        <Stat
          value={answeredPct !== null ? `${answeredPct}%` : "—"}
          label="picked up by SG"
        />
        <Stat value={data.closed_tickets} label="closed so far" />
        <Stat value={data.tickets_last_7_days} label="this week" />
      </div>

      {topCategories.length > 0 && maxCat > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Where people write</p>
          <ul className="space-y-2.5">
            {topCategories.map((cat) => (
              <li key={cat.slug}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate text-muted-foreground">
                    {cat.name}
                  </span>
                  <span className="shrink-0 tabular-nums">{cat.count}</span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-foreground/70"
                    style={{
                      width: `${Math.max(8, Math.round((cat.count / maxCat) * 100))}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
