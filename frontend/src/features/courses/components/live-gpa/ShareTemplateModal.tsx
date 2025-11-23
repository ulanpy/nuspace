import { Button } from "@/components/atoms/button";
import { Modal } from "@/components/atoms/modal";
import { calculateTemplateCoverage, canShareTemplate } from "../../utils/templateUtils";
import type { LiveGpaViewModel } from "../../hooks/useLiveGpaViewModel";

interface ShareTemplateModalProps {
  sharing: LiveGpaViewModel["sharing"];
  onClose: () => void;
}

export function ShareTemplateModal({ sharing, onClose }: ShareTemplateModalProps) {
  const course = sharing.course;
  if (!course) return null;

  return (
    <Modal
      isOpen={sharing.isOpen}
      onClose={onClose}
      title="Share course template"
      className="max-w-md"
      contentClassName="rounded-3xl"
    >
      <div className="space-y-5">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">
            {course.course.course_code}
            {course.section ? ` · ${course.section}` : ""}
          </h3>
          {course.course.title && <p className="text-sm text-muted-foreground">{course.course.title}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3 text-center text-xs">
          <SummaryTile label="Assignments" value={course.items.length} />
          <SummaryTile
            label="Coverage"
            value={`${Math.min(100, Math.max(0, calculateTemplateCoverage(course))).toFixed(1)}%`}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Share your assignment names and weights (not your grades) so peers can set up their course structure.
        </p>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Preview</p>
          {course.items.length > 0 ? (
            <div className="space-y-2">
              {course.items.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-border/40 bg-background/70 px-3 py-2"
                >
                  <span className="text-sm font-medium text-foreground line-clamp-1">{item.item_name}</span>
                  <span className="text-xs text-muted-foreground">{(item.total_weight_pct ?? 0).toFixed(1)}%</span>
                </div>
              ))}
              {course.items.length > 5 && (
                <p className="text-xs text-muted-foreground">
                  +{course.items.length - 5} more assignments included
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-center text-xs text-muted-foreground">
              Add at least one assignment to share a template.
            </div>
          )}
        </div>

        {calculateTemplateCoverage(course) < 100 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            <p className="font-medium">Heads up</p>
            <p>Your template covers less than 100% of the course weight. Peers can add missing items after importing.</p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={sharing.isSubmitting}>
            Cancel
          </Button>
          <Button onClick={sharing.submit} disabled={sharing.isSubmitting || !canShareTemplate(course)}>
            {sharing.isSubmitting ? "Sharing…" : "Share template"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function SummaryTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

