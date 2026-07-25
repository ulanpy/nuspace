"use client";

import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Modal } from "@/components/shared/modal";
import { calculateTemplateCoverage, canShareTemplate } from "../../utils/template-utils";
import type { LiveGpaViewModel } from "../../hooks/use-live-gpa-view-model";

interface ShareTemplateModalProps {
  sharing: LiveGpaViewModel["sharing"];
  onClose: () => void;
}

export function ShareTemplateModal({ sharing, onClose }: ShareTemplateModalProps) {
  const course = sharing.course;
  if (!course) return null;

  const coverage = Math.min(100, Math.max(0, calculateTemplateCoverage(course)));
  const canShare = canShareTemplate(course);
  const previewItems = course.items.slice(0, 6);
  const remainingCount = Math.max(0, course.items.length - previewItems.length);

  return (
    <Modal
      isOpen={sharing.isOpen}
      onClose={onClose}
      title="Share grading setup"
      description={`${course.course.course_code}${course.section ? ` · ${course.section}` : ""}`}
      className="max-w-md"
    >
      <div className="space-y-5">
        <div className="flex gap-3 rounded-lg border border-border bg-muted/40 px-3.5 py-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground">
            <Lock className="h-4 w-4" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <p className="text-[14px] font-medium leading-snug text-foreground">
              Assignment structure only
            </p>
            <p className="text-[13px] leading-snug text-muted-foreground">
              Names and weights are shared. Your scores and GPA stay private.
            </p>
          </div>
        </div>

        {canShare ? (
          <div className="space-y-2.5">
            <p className="text-[12px] font-medium text-muted-foreground">What gets shared</p>
            <ul className="space-y-2">
              {previewItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-baseline justify-between gap-3 text-[13px]"
                >
                  <span className="min-w-0 truncate font-medium text-foreground">
                    {item.item_name}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {(item.total_weight_pct ?? 0).toFixed(0)}%
                  </span>
                </li>
              ))}
            </ul>
            {remainingCount > 0 && (
              <p className="text-[12px] text-muted-foreground">+{remainingCount} more</p>
            )}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-baseline justify-between gap-2 text-[12px]">
                <span className="text-muted-foreground">Weight coverage</span>
                <span className="tabular-nums font-medium text-foreground">
                  {coverage.toFixed(0)}%
                </span>
              </div>
              <Progress value={coverage} className="h-1.5" />
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-muted-foreground">
            Add at least one assignment before sharing.
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={sharing.isSubmitting}>
            Cancel
          </Button>
          <Button onClick={sharing.submit} disabled={sharing.isSubmitting || !canShare}>
            {sharing.isSubmitting ? "Sharing…" : "Share setup"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
