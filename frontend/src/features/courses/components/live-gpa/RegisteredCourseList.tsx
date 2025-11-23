import { RegisteredCourseCard } from "../RegisteredCourseCard";
import type { BaseCourseItem, RegisteredCourse } from "../../types";
import type { LiveGpaViewModel } from "../../hooks/useLiveGpaViewModel";

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
    <div className="space-y-3">
      {courses.map((registeredCourse) => (
        <RegisteredCourseCard
          key={registeredCourse.id}
          registeredCourse={registeredCourse}
          onAddItem={onAddItem}
          onDeleteItem={onDeleteItem}
          onEditItem={onEditItem}
          onShareTemplate={onShareTemplate}
          onOpenTemplates={onOpenTemplates}
          isWithdrawn={withdraw.ids.has(registeredCourse.id)}
          onToggleWithdraw={withdraw.toggle}
        />
      ))}
    </div>
  );
}

