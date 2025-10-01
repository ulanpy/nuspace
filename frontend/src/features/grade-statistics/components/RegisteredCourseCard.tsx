import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Modal } from "@/components/atoms/modal";
import { RegisteredCourse, BaseCourseItem } from "../types";
import {
  calculateCourseGPA,
  calculateCourseScore,
  scoreToGPA,
  scoreToGrade,
  formatGPA,
  getGPAColorClass,
} from "../utils/gradeUtils";
import { RegisteredCourseItem } from "./RegisteredCourseItem";
import { BookOpen, Info, Plus, Trash2, Share2, UsersRound } from "lucide-react";

interface RegisteredCourseCardProps {
  registeredCourse: RegisteredCourse;
  onDeleteCourse?: (courseId: number) => void;
  onAddItem?: (courseId: number) => void;
  onDeleteItem?: (item: BaseCourseItem) => void;
  onEditItem?: (item: BaseCourseItem) => void;
  onShareTemplate?: (course: RegisteredCourse) => void;
  onOpenTemplates?: (course: RegisteredCourse) => void;
}

export function RegisteredCourseCard({
  registeredCourse,
  onDeleteCourse,
  onAddItem,
  onDeleteItem,
  onEditItem,
  onShareTemplate,
  onOpenTemplates,
}: RegisteredCourseCardProps) {
  const [showAssignments, setShowAssignments] = useState(false);
  const [showClassAverageModal, setShowClassAverageModal] = useState(false);
  const { course } = registeredCourse;
  const courseGPA = calculateCourseGPA(registeredCourse.items);
  const courseScore = calculateCourseScore(registeredCourse.items);
  const courseGrade = scoreToGrade(courseScore);
  const credits = course.credits || 0;
  const courseDetails = [
    course.section ? `Section ${course.section}` : null,
    course.term,
  ]
    .filter(Boolean)
    .join(" · ");

  const facultyList = (course.faculty || "")
    .split(/[;,|&\/]+/g)
    .map((s) => s.trim())
    .filter(Boolean);

  const totalWeight = registeredCourse.items.reduce(
    (acc, it) => acc + (it.total_weight_pct || 0),
    0,
  );
  const remainingWeight = Math.max(0, 100 - totalWeight);
  const maxPossibleScore = Math.min(100, courseScore + remainingWeight);
  const maxPossibleGrade = scoreToGrade(maxPossibleScore);
  const maxPossibleGPA = scoreToGPA(maxPossibleScore);

  const obtainedScores = registeredCourse.items
    .map((it) => it.obtained_score_pct)
    .filter((s): s is number => s !== null && s !== undefined);
  const meanItemScore =
    obtainedScores.length > 0
      ? obtainedScores.reduce((acc, s) => acc + s, 0) / obtainedScores.length
      : 0;
  const projectedScore = Math.min(
    100,
    courseScore + (meanItemScore / 100) * remainingWeight,
  );
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

  const infoLine = [courseDetails, facultyList.join(" · ")]
    .filter(Boolean)
    .join(" • ");

  return (
    <Card className="w-full rounded-2xl border border-border/50 bg-background shadow-none">
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

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base font-semibold leading-tight text-foreground">
              {course.course_code}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              {course.school && (
                <Badge variant="outline" className="rounded-full border-border/60 bg-transparent">
                  {course.school}
                </Badge>
              )}
              {course.level && (
                <Badge variant="secondary" className="rounded-full">
                  {course.level}
                </Badge>
              )}
              <Badge variant="outline" className="rounded-full border-border/60 bg-transparent">
                {credits} Cr
              </Badge>
            </div>
          </div>
          {course.course_title && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-tight">
              {course.course_title}
            </p>
          )}
          {infoLine && (
            <p className="text-xs text-muted-foreground line-clamp-2">{infoLine}</p>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {onAddItem && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddItem(registeredCourse.id)}
              className="flex-shrink-0 h-8 gap-1.5 rounded-full border border-border/60 bg-background px-3 text-xs font-medium text-foreground hover:bg-muted"
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
            >
              <Info className="h-3.5 w-3.5" />
              Avg
            </Button>
          )}
        </div>

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
                    onDelete={onDeleteItem ? () => onDeleteItem(item) : undefined}
                    onEdit={onEditItem ? () => onEditItem(item) : undefined}
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

        <div className="space-y-2">
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
            <p className="text-sm text-muted-foreground">Average score across the class</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Keep perspective</p>
            <p className="mt-2">
              Everyone moves at a different pace. Use this number as context, not a measure of your worth.
            </p>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
