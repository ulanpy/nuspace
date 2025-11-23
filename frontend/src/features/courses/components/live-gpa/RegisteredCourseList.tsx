import { RegisteredCourseCard } from "../RegisteredCourseCard";
import type { BaseCourseItem, RegisteredCourse } from "../../types";
import type { LiveGpaViewModel } from "../../hooks/useLiveGpaViewModel";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/atoms/accordion";
import { calculateCourseGPA, formatGPA, getGPAColorClass } from "../../utils/gradeUtils";

interface RegisteredCourseListProps {
  courses: RegisteredCourse[];
  withdraw: LiveGpaViewModel["withdraw"];
  onAddItem: (courseId: number) => void;
  onDeleteItem: (item: BaseCourseItem) => void;
  onEditItem: (item: BaseCourseItem) => void;
  onShareTemplate: (course: RegisteredCourse) => void;
  onOpenTemplates: (course: RegisteredCourse) => Promise<void>;
}

export function RegisteredCourseList({
  courses,
  withdraw,
  onAddItem,
  onDeleteItem,
  onEditItem,
  onShareTemplate,
  onOpenTemplates,
}: RegisteredCourseListProps) {
  return (
    <Accordion type="single" collapsible className="space-y-2">
      {courses.map((registeredCourse) => {
        const course = registeredCourse.course;
        const label = `${course.course_code}${registeredCourse.section ? ` · ${registeredCourse.section}` : ""}`;
        const courseGPA = calculateCourseGPA(registeredCourse.items);
        const gpaDisplay = formatGPA(courseGPA);
        const gpaColor = getGPAColorClass(courseGPA);

        return (
          <AccordionItem
            key={registeredCourse.id}
            value={registeredCourse.id.toString()}
            className="rounded-2xl border border-border/50 bg-background/70 px-2"
          >
            <AccordionTrigger className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left hover:no-underline">
              <div className="flex flex-1 items-center gap-3">
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-foreground">{label}</span>
                </div>
                <span className="rounded-full bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
                  {registeredCourse.items.length} items
                </span>
                <span className={`ml-auto text-sm font-semibold ${gpaColor}`}>GPA {gpaDisplay}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 pt-0">
              {(course.title || course.term || course.department || course.level || course.credits) && (
                <div className="mb-3 space-y-1 rounded-xl border border-dashed border-border/40 bg-muted/30 p-3">
                  {course.title && <p className="break-words text-sm font-medium text-foreground">{course.title}</p>}
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {course.term && <span>Term: {course.term}</span>}
                    {course.department && <span>Department: {course.department}</span>}
                    {course.level && <span>Level: {course.level}</span>}
                    {course.credits && <span>Credits: {course.credits}</span>}
                  </div>
                </div>
              )}
              <RegisteredCourseCard
                registeredCourse={registeredCourse}
                onAddItem={onAddItem}
                onDeleteItem={onDeleteItem}
                onEditItem={onEditItem}
                onShareTemplate={onShareTemplate}
                onOpenTemplates={onOpenTemplates}
                isWithdrawn={withdraw.ids.has(registeredCourse.id)}
                onToggleWithdraw={withdraw.toggle}
                showHeader={false}
                className="border-0 bg-transparent shadow-none"
              />
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

