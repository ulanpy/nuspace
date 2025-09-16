import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Modal } from "@/components/atoms/modal";
import { RegisteredCourse } from "../types";
import { 
  calculateCourseGPA,
  calculateCourseScore,
  scoreToGPA,
  scoreToGrade,
  formatGPA, 
  getGPAColorClass,
} from "../utils/gradeUtils";
import { RegisteredCourseItem } from "./RegisteredCourseItem";
import { User, BookOpen, Trash2, Plus, Info } from "lucide-react";
import { useState } from "react";
import { BaseCourseItem } from "../types";

interface RegisteredCourseCardProps {
  registeredCourse: RegisteredCourse;
  onDeleteCourse?: (courseId: number) => void;
  onAddItem?: (courseId: number) => void;
  onDeleteItem?: (item: BaseCourseItem) => void;
  onEditItem?: (item: BaseCourseItem) => void;
}

export function RegisteredCourseCard({ 
  registeredCourse, 
  onDeleteCourse, 
  onAddItem,
  onDeleteItem,
  onEditItem,
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
  ].filter(Boolean).join(' · ');

  // Parse multiple faculty names from a single string (comma/semicolon/slash/& separated)
  const facultyList = (course.faculty || '')
    .split(/[;,|&\/]+/g)
    .map((s) => s.trim())
    .filter(Boolean);

  // Maximum possible score if the student aces all remaining weight
  const totalWeight = registeredCourse.items.reduce((acc, it) => acc + (it.total_weight_pct || 0), 0);
  const remainingWeight = Math.max(0, 100 - totalWeight);
  const maxPossibleScore = Math.min(100, courseScore + remainingWeight);
  const maxPossibleGrade = scoreToGrade(maxPossibleScore);
  const maxPossibleGPA = scoreToGPA(maxPossibleScore);

  // Projected score based on mean of entered item scores applied to remaining weight
  const obtainedScores = registeredCourse.items
    .map((it) => it.obtained_score_pct)
    .filter((s): s is number => s !== null && s !== undefined);
  const meanItemScore = obtainedScores.length > 0
    ? obtainedScores.reduce((acc, s) => acc + s, 0) / obtainedScores.length
    : 0;
  const projectedScore = Math.min(100, courseScore + (meanItemScore / 100) * remainingWeight);
  const projectedGrade = scoreToGrade(projectedScore);
  const projectedGPA = scoreToGPA(projectedScore);

  return (
    <Card className="w-full hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="pb-4 relative">
        {onDeleteCourse && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDeleteCourse(registeredCourse.id)}
            className="absolute top-2 right-2 text-gray-400 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        <div className="flex flex-col gap-4">
          <div className="flex-1 pr-8">
            <div className="flex flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-xl font-bold text-gray-800 dark:text-gray-200">
                {course.course_code}
              </CardTitle>
              {onAddItem && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAddItem(registeredCourse.id)}
                  className="flex items-center gap-2 w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4" />
                  Add Assignment
                </Button>
              )}
            </div>
            {courseDetails && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {courseDetails}
              </p>
            )}
            
            {/* Faculty Info */}
            {facultyList.length > 0 && (
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-4 w-4" />
                  <span className="font-medium">Faculty</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {facultyList.map((name, idx) => (
                    <Badge key={`${name}-${idx}`} variant="outline" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Badge variant="outline" className="text-xs">
                {course.school}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {course.level}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {credits} Credits
              </Badge>
            </div>
          </div>
          
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-row flex-wrap items-center gap-x-4 gap-y-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAssignments(!showAssignments)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <BookOpen className="h-4 w-4" />
            {showAssignments ? 'Hide Assignments' : 'Show Assignments'} ({registeredCourse.items.length})
          </Button>
          {registeredCourse.class_average !== null && registeredCourse.class_average !== undefined && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClassAverageModal(true)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Info className="h-4 w-4" />
              Class Avg
            </Button>
          )}
        </div>
        
        {/* Course GPA Summary */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-center">
            <div className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-gray-200">
              {courseScore.toFixed(1)}%
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Current Score</div>
          </div>
          <div className="text-center">
            <div className={`text-lg sm:text-2xl font-bold ${getGPAColorClass(courseGPA)}`}>
              {courseGrade}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Letter Grade</div>
          </div>
          <div className="text-center">
            <div className={`text-lg sm:text-2xl font-bold ${getGPAColorClass(courseGPA)}`}>
              {formatGPA(courseGPA)}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Current GPA</div>
          </div>
        </div>

        {/* Max possible if acing remaining work */}
        <div className="mt-2 grid grid-cols-3 gap-2 sm:gap-4 p-3 border rounded-lg">
          <div className="text-center">
            <div className="text-base sm:text-xl font-semibold text-gray-800 dark:text-gray-200">
              {maxPossibleScore.toFixed(1)}%
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Max Possible</div>
          </div>
          <div className="text-center">
            <div className="text-base sm:text-xl font-semibold">
              {maxPossibleGrade}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Max Grade</div>
          </div>
          <div className="text-center">
            <div className="text-base sm:text-xl font-semibold">
              {formatGPA(maxPossibleGPA)}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Max GPA</div>
          </div>
        </div>

        {/* Projected based on average of entered assignments */}
        <div className="mt-2 grid grid-cols-3 gap-2 sm:gap-4 p-3 border rounded-lg">
          <div className="text-center">
            <div className="text-base sm:text-xl font-semibold text-gray-800 dark:text-gray-200">
              {projectedScore.toFixed(1)}%
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Projected</div>
          </div>
          <div className="text-center">
            <div className="text-base sm:text-xl font-semibold">
              {projectedGrade}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Projected Grade</div>
          </div>
          <div className="text-center">
            <div className="text-base sm:text-xl font-semibold">
              {formatGPA(projectedGPA)}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Projected GPA</div>
          </div>
        </div>

        

        {/* Course Assignments */}
        {showAssignments && (
          <div className="space-y-4">
            <h4 className="text-base font-semibold text-gray-700 dark:text-gray-300">
              Course Assignments ({registeredCourse.items.length})
            </h4>
            {registeredCourse.items.length > 0 ? (
              <div className="space-y-3">
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
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No assignments added yet</p>
                <p className="text-sm">Add assignments to track your progress</p>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Class Average Modal */}
      <Modal
        isOpen={showClassAverageModal}
        onClose={() => setShowClassAverageModal(false)}
        title="Class Average"
        className="max-w-sm"
      >
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
              {registeredCourse.class_average?.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Average GPA of the group
            </div>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <p className="font-medium mb-1">Remember:</p>
                <p>Everyone has their own pace and priorities. Focus on your personal growth and learning journey.</p>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
