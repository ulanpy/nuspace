"use client";

import type { BaseCourseItem } from "../../types";
import { hasCompleteScore } from "../../utils/grade-utils";
import { coursesChart } from "../../constants/dashboard-theme";

interface CourseTrendSparklineProps {
  items: BaseCourseItem[];
}

export function CourseTrendSparkline({ items }: CourseTrendSparklineProps) {
  const scored = items.filter(hasCompleteScore);
  if (scored.length < 2) {
    return (
      <svg width="56" height="20" viewBox="0 0 56 20" aria-hidden>
        <line x1="4" y1="10" x2="52" y2="10" stroke={coursesChart.muted} strokeWidth="1.5" strokeDasharray="3 3" />
      </svg>
    );
  }

  const points = scored.map((item, index) => {
    const obtained = item.obtained_score ?? 0;
    const max = item.max_score ?? 1;
    const pct = (obtained / max) * 100;
    const x = 4 + (index / (scored.length - 1)) * 48;
    const y = 16 - (pct / 100) * 12;
    return { x, y, pct };
  });

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const stroke = "hsl(var(--foreground))";

  return (
    <svg width="56" height="20" viewBox="0 0 56 20" aria-hidden className="overflow-visible">
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
