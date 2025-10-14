import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Modal } from "@/components/atoms/modal";
import { RegisteredCourse, BaseCourseItem } from "../types";
import {
  calculateCourseGPA,
  calculateCourseScore,
  calculateMaxPossibleCourseScore,
  calculateProjectedCourseScore,
  hasCompleteScore,
  scoreToGPA,
  scoreToGrade,
  formatGPA,
  getGPAColorClass,
} from "../utils/gradeUtils";
import { RegisteredCourseItem } from "./RegisteredCourseItem";
import { BookOpen, Info, Plus, Trash2, Share2, UsersRound, CircleSlash2, HelpCircle } from "lucide-react";

interface RegisteredCourseCardProps {
  registeredCourse: RegisteredCourse;
  onDeleteCourse?: (courseId: number) => void;
  onAddItem?: (courseId: number) => void;
  onDeleteItem?: (item: BaseCourseItem) => void;
  onEditItem?: (item: BaseCourseItem) => void;
  onShareTemplate?: (course: RegisteredCourse) => void;
  onOpenTemplates?: (course: RegisteredCourse) => void;
  isWithdrawn?: boolean;
  onToggleWithdraw?: (courseId: number) => void;
}

export function RegisteredCourseCard({
  registeredCourse,
  onDeleteCourse,
  onAddItem,
  onDeleteItem,
  onEditItem,
  onShareTemplate,
  onOpenTemplates,
  isWithdrawn = false,
  onToggleWithdraw,
}: RegisteredCourseCardProps) {
  const [showAssignments, setShowAssignments] = useState(false);
  const [showClassAverageModal, setShowClassAverageModal] = useState(false);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const { course } = registeredCourse;
  const courseScore = calculateCourseScore(registeredCourse.items);
  const courseGPA = calculateCourseGPA(registeredCourse.items);
  const courseGrade = scoreToGrade(courseScore);
  const credits = course.credits || 0;
  const courseDetails = [course.term].filter(Boolean).join(" · ");

  const maxPossibleScore = calculateMaxPossibleCourseScore(registeredCourse.items);
  const scoredItems = registeredCourse.items.filter(hasCompleteScore);
  const totalWeight = scoredItems.reduce((acc, it) => acc + (it.total_weight_pct || 0), 0);
  const remainingWeight = scoredItems.length > 0 ? Math.max(0, 100 - totalWeight) : 0;
  const maxPossibleGrade = scoreToGrade(maxPossibleScore);
  const maxPossibleGPA = scoreToGPA(maxPossibleScore);

  const projectedScore = calculateProjectedCourseScore(registeredCourse.items);
  const projectedGrade = scoreToGrade(projectedScore);
  const projectedGPA = scoreToGPA(projectedScore);

  type MetricKey = "current" | "max" | "projected";

  const metricGroups: Record<MetricKey, Array<{ label: string; value: string; tone?: string }>> = {
    current: [
      { label: "Score", value: `${courseScore.toFixed(1)}%` },
      { label: "Grade", value: courseGrade, tone: getGPAColorClass(courseGPA) },
      { label: "GPA", value: formatGPA(courseGPA), tone: getGPAColorClass(courseGPA) },
    ],
    max: [
      { label: "Score", value: `${maxPossibleScore.toFixed(1)}%` },
      { label: "Grade", value: maxPossibleGrade },
      { label: "GPA", value: formatGPA(maxPossibleGPA) },
    ],
    projected: [
      { label: "Score", value: `${projectedScore.toFixed(1)}%` },
      { label: "Grade", value: projectedGrade },
      { label: "GPA", value: formatGPA(projectedGPA) },
    ],
  };

  const metricGroupsOrder: Array<{ key: MetricKey; label: string }> = [
    { key: "current", label: "Current" },
    { key: "max", label: "Max potential" },
    { key: "projected", label: "Projected" },
  ];

  const infoLineParts = [courseDetails];
  if (course.department) infoLineParts.push(course.department);
  if (course.level) infoLineParts.push(course.level);
  const infoLine = infoLineParts.filter(Boolean).join(" • ");

  return (
    <Card
      className={`w-full rounded-2xl border border-border/50 bg-background shadow-none transition ${
        isWithdrawn ? "border-amber-500/50 bg-amber-50/70 dark:bg-amber-500/10" : ""
      }`}
    >
      <CardHeader className="relative gap-2 pb-4 pr-12">
        {onDeleteCourse && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDeleteCourse(registeredCourse.id)}
            className="absolute right-2 top-2 text-muted-foreground hover:text-destructive"
            aria-label="Remove course"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}

        {isWithdrawn && (
          <Badge
            variant="secondary"
            className="absolute right-2 top-2 flex items-center gap-1 rounded-full border border-amber-500/50 bg-amber-100 text-amber-900 shadow-sm dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-100"
          >
            <CircleSlash2 className="h-3.5 w-3.5" />
            Withdrawn
          </Badge>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base font-semibold leading-tight text-foreground">
              {course.course_code}
            </CardTitle>
            {course.description && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={() => setShowDescriptionModal(true)}
                aria-label="Course description"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            )}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              {course.school && (
                <Badge variant="outline" className="rounded-full border-border/60 bg-transparent">
                  {course.school}
                </Badge>
              )}
              <Badge variant="outline" className="rounded-full border-border/60 bg-transparent">
                {credits} Cr
              </Badge>
            </div>
          </div>
          {course.title && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-tight">
              {course.title}
            </p>
          )}
          {infoLine && (
            <p className="text-xs text-muted-foreground line-clamp-2">{infoLine}</p>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex w-full flex-nowrap items-center gap-2 overflow-x-auto pb-2">
          {onAddItem && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddItem(registeredCourse.id)}
              className="flex-shrink-0 h-8 gap-1.5 rounded-full border border-border/60 bg-background px-3 text-xs font-medium text-foreground hover:bg-muted"
              disabled={isWithdrawn}
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="sm:hidden">Add</span>
              <span className="hidden sm:inline">Add assignment</span>
            </Button>
          )}
          {onShareTemplate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onShareTemplate(registeredCourse)}
              className="flex-shrink-0 h-8 gap-1.5 rounded-full border border-border/60 bg-background px-3 text-xs font-medium text-foreground hover:bg-muted"
              disabled={isWithdrawn}
            >
              <Share2 className="h-3.5 w-3.5" />
              Share template
            </Button>
          )}
          {onOpenTemplates && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenTemplates(registeredCourse)}
              className="flex-shrink-0 h-8 gap-1.5 rounded-full border border-border/60 bg-background px-3 text-xs font-medium text-foreground hover:bg-muted"
              disabled={isWithdrawn}
            >
              <UsersRound className="h-3.5 w-3.5" />
              Browse templates
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAssignments(!showAssignments)}
            className="flex-shrink-0 h-8 justify-center gap-1.5 rounded-full border border-border/60 bg-background px-3 text-xs font-medium text-foreground hover:bg-muted"
            disabled={isWithdrawn}
          >
            <BookOpen className="h-3.5 w-3.5" />
            {showAssignments ? "Hide" : "Assignments"} ({registeredCourse.items.length})
          </Button>
          {registeredCourse.class_average !== null && registeredCourse.class_average !== undefined && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClassAverageModal(true)}
              className="flex-shrink-0 h-8 justify-center gap-1.5 rounded-full border border-border/60 bg-background px-3 text-xs font-medium text-foreground hover:bg-muted"
              disabled={isWithdrawn}
            >
              <Info className="h-3.5 w-3.5" />
              Avg
            </Button>
          )}
          <Button
            variant={isWithdrawn ? "default" : "outline"}
            size="sm"
            onClick={() => onToggleWithdraw?.(registeredCourse.id)}
            className={`flex-shrink-0 h-8 gap-1.5 rounded-full px-3 text-xs font-medium transition ${
              isWithdrawn
                ? "bg-amber-500/90 text-amber-50 hover:bg-amber-500"
                : "border border-border/60 bg-background text-foreground hover:bg-muted"
            }`}
          >
            <CircleSlash2 className="h-3.5 w-3.5" />
            {isWithdrawn ? "Undo Withdraw" : "Try Withdraw"}
          </Button>
        </div>
        <div className={`${isWithdrawn ? "opacity-40 pointer-events-none" : ""}`}>
          {showAssignments && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <h4 className="font-semibold text-foreground">Assignments</h4>
                <span className="text-muted-foreground">{registeredCourse.items.length} total</span>
              </div>
              {registeredCourse.items.length > 0 ? (
                <div className="space-y-2.5">
                  {registeredCourse.items.map((item) => (
                    <RegisteredCourseItem
                      key={item.id}
                      item={item}
                      onDelete={onDeleteItem && !isWithdrawn ? () => onDeleteItem(item) : undefined}
                      onEdit={onEditItem && !isWithdrawn ? () => onEditItem(item) : undefined}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-5 text-center text-xs text-muted-foreground">
                  <BookOpen className="mx-auto mb-2 h-5 w-5 text-muted-foreground/80" />
                  No assignments yet
                </div>
              )}
            </div>
          )}

          <div className="mt-4 space-y-2">
            <span className="text-xs font-semibold text-muted-foreground">Course metrics</span>
            <div className="space-y-2 text-xs">
              {metricGroupsOrder.map(({ key, label }) => (
                <div
                  key={key}
                  className="rounded-xl border border-border/50 bg-muted/15 px-3 py-3"
                >
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {metricGroups[key].map((metric) => (
                      <div key={`${key}-${metric.label}`} className="px-2 py-1 text-center">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          {metric.label}
                        </p>
                        <p
                          className={`text-base font-semibold text-foreground ${metric.tone ?? ""}`}
                        >
                          {metric.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>

      <Modal
        isOpen={showClassAverageModal}
        onClose={() => setShowClassAverageModal(false)}
        title="Class average"
        className="max-w-sm"
      >
        <div className="space-y-4">
          <div className="space-y-2 text-center">
            <p className="text-3xl font-semibold text-foreground">
              {registeredCourse.class_average?.toFixed(1)}%
            </p>
            <p className="text-sm text-muted-foreground">Average score across the class. Missing scores are excluded from the average.</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Keep perspective</p>
            <p className="mt-2">
              Everyone moves at a different pace. Use this number as context, not a measure of your worth.
            </p>
          </div>
        </div>
      </Modal>

      {course.description && (
        <Modal
          isOpen={showDescriptionModal}
          onClose={() => setShowDescriptionModal(false)}
          title="Course description"
          className="max-w-lg"
        >
          <div className="space-y-2">
            <p className="text-sm leading-6 text-muted-foreground whitespace-pre-line">
              {course.description}
            </p>
          </div>
        </Modal>
      )}
    </Card>
  );
}
