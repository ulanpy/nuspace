import { GradeStatistics, GradeDistribution } from "../types";

export const getGradeDistribution = (stats: GradeStatistics): GradeDistribution[] => {
  const gradeColors = {
    A: "#22c55e", // green-500
    B: "#3b82f6", // blue-500
    C: "#f59e0b", // amber-500
    D: "#ef4444", // red-500
    F: "#991b1b", // red-800
    P: "#8b5cf6", // violet-500
    I: "#6b7280", // gray-500
    AU: "#64748b", // slate-500
    "W/AW": "#374151", // gray-700
  };

  const grades = [
    { grade: "A", percentage: stats.pct_A, count: Math.round((stats.pct_A / 100) * stats.grades_count) },
    { grade: "B", percentage: stats.pct_B, count: Math.round((stats.pct_B / 100) * stats.grades_count) },
    { grade: "C", percentage: stats.pct_C, count: Math.round((stats.pct_C / 100) * stats.grades_count) },
    { grade: "D", percentage: stats.pct_D, count: Math.round((stats.pct_D / 100) * stats.grades_count) },
    { grade: "F", percentage: stats.pct_F, count: Math.round((stats.pct_F / 100) * stats.grades_count) },
  ];

  // Add non-letter grades if they exist
  if (stats.pct_P > 0) {
    grades.push({ grade: "P", percentage: stats.pct_P, count: Math.round((stats.pct_P / 100) * stats.grades_count) });
  }
  if (stats.pct_I > 0) {
    grades.push({ grade: "I", percentage: stats.pct_I, count: Math.round((stats.pct_I / 100) * stats.grades_count) });
  }
  if (stats.pct_AU > 0) {
    grades.push({ grade: "AU", percentage: stats.pct_AU, count: Math.round((stats.pct_AU / 100) * stats.grades_count) });
  }
  if (stats.pct_W_AW > 0) {
    grades.push({ grade: "W/AW", percentage: stats.pct_W_AW, count: Math.round((stats.pct_W_AW / 100) * stats.grades_count) });
  }

  return grades
    .filter(grade => grade.percentage > 0)
    .map(grade => ({
      ...grade,
      color: gradeColors[grade.grade as keyof typeof gradeColors] || "#6b7280"
    }));
};

export const formatGPA = (gpa: number): string => {
  return gpa.toFixed(2);
};

export const formatPercentage = (percentage: number): string => {
  return `${percentage.toFixed(1)}%`;
};

export const getGPAColorClass = (gpa: number): string => {
  if (gpa >= 3.7) return "text-green-600 dark:text-green-400";
  if (gpa >= 3.0) return "text-blue-600 dark:text-blue-400";
  if (gpa >= 2.5) return "text-amber-600 dark:text-amber-400";
  if (gpa >= 2.0) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
};

export const getGPABadgeClass = (gpa: number): string => {
  if (gpa >= 3.7) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  if (gpa >= 3.0) return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
  if (gpa >= 2.5) return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
  if (gpa >= 2.0) return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
  return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
};

export const getDifficultyLevel = (averageGPA: number, stdDeviation: number): string => {
  if (averageGPA >= 3.5 && stdDeviation <= 0.5) return "Easy";
  if (averageGPA <= 2.0 || stdDeviation >= 1.0) return "Very Hard";
  if (averageGPA <= 2.5 || stdDeviation >= 0.8) return "Hard";
  if (averageGPA >= 3.0 && stdDeviation <= 0.6) return "Moderate";
  return "Moderate";
};

export const getDifficultyColorClass = (difficulty: string): string => {
  switch (difficulty) {
    case "Easy": return "text-green-600 dark:text-green-400";
    case "Moderate": return "text-blue-600 dark:text-blue-400";
    case "Hard": return "text-orange-600 dark:text-orange-400";
    case "Very Hard": return "text-red-600 dark:text-red-400";
    default: return "text-gray-600 dark:text-gray-400";
  }
};

// GPA calculation utilities for live GPA calculator
export const scoreToGPA = (score: number): number => {
  if (score >= 95) return 4.0;
  if (score >= 90) return 3.67;
  if (score >= 85) return 3.33;
  if (score >= 80) return 3.0;
  if (score >= 75) return 2.67;
  if (score >= 70) return 2.33;
  if (score >= 65) return 2.0;
  if (score >= 60) return 1.67;
  if (score >= 55) return 1.33;
  if (score >= 50) return 1.0;
  return 0.0;
};

export const scoreToGrade = (score: number): string => {
  if (score >= 95) return "A";
  if (score >= 90) return "A-";
  if (score >= 85) return "B+";
  if (score >= 80) return "B";
  if (score >= 75) return "B-";
  if (score >= 70) return "C+";
  if (score >= 65) return "C";
  if (score >= 60) return "C-";
  if (score >= 55) return "D+";
  if (score >= 50) return "D";
  return "F";
};

export const calculateSemesterCourseScore = (items: Array<{ total_weight_pct: number | null; obtained_score_pct: number | null }>): number => {
  if (!items || items.length === 0) {
    return 0;
  }
  // This calculates the student's current total score out of 100 for the course,
  // assuming a score of 0 for any assignments not yet entered.
  return items.reduce((acc, item) => {
    const weight = item.total_weight_pct || 0;
    const score = item.obtained_score_pct || 0;
    return acc + (score / 100) * weight;
  }, 0);
};

// Back-compat: alias for semester-based total course score (0-100)
export const calculateCourseScore = (
  items: Array<{ total_weight_pct: number | null; obtained_score_pct: number | null }>
): number => {
  return calculateSemesterCourseScore(items);
};

export const calculatePointInTimeCourseScore = (items: Array<{ total_weight_pct: number | null; obtained_score_pct: number | null }>): number => {
  if (!items || items.length === 0) {
    return 0;
  }
  
  const totalWeightSubmitted = items.reduce((acc, item) => acc + (item.total_weight_pct || 0), 0);
  
  if (totalWeightSubmitted === 0) {
    return 0;
  }

  const totalContribution = items.reduce((acc, item) => {
    const weight = item.total_weight_pct || 0;
    const score = item.obtained_score_pct || 0;
    return acc + (score / 100) * weight;
  }, 0);

  return (totalContribution / totalWeightSubmitted) * 100;
};


export const calculateCourseGPA = (items: Array<{ total_weight_pct: number | null; obtained_score_pct: number | null }>): number => {
  const finalPercentage = calculateSemesterCourseScore(items);
  return scoreToGPA(finalPercentage);
};

// Maximum possible course score if acing all remaining weight
export const calculateMaxPossibleCourseScore = (
  items: Array<{ total_weight_pct: number | null; obtained_score_pct: number | null }>
): number => {
  const current = calculateSemesterCourseScore(items);
  const totalWeight = items.reduce((acc, it) => acc + (it.total_weight_pct || 0), 0);
  const remaining = Math.max(0, 100 - totalWeight);
  return Math.min(100, current + remaining);
};

export const calculateTotalGPA = (courses: Array<{ course: { credits: number | null }; items: Array<{ total_weight_pct: number | null; obtained_score_pct: number | null }> }>): number => {
  if (!courses || courses.length === 0) return 0;
  
  let totalWeightedGPA = 0;
  let totalCredits = 0;
  
  for (const registeredCourse of courses) {
    const courseGPA = calculateCourseGPA(registeredCourse.items);
    const credits = registeredCourse.course.credits || 0;
    
    if (credits > 0) {
      totalWeightedGPA += courseGPA * credits;
      totalCredits += credits;
    }
  }
  
  return totalCredits > 0 ? totalWeightedGPA / totalCredits : 0;
};

export const calculatePointInTimeTotalGPA = (courses: Array<{ course: { credits: number | null }; items: Array<{ total_weight_pct: number | null; obtained_score_pct: number | null }> }>): number => {
  if (!courses || courses.length === 0) return 0;
  
  let totalWeightedGPA = 0;
  let totalCredits = 0;
  
  for (const registeredCourse of courses) {
    const courseScore = calculatePointInTimeCourseScore(registeredCourse.items);
    const courseGPA = scoreToGPA(courseScore);
    const credits = registeredCourse.course.credits || 0;
    
    if (credits > 0) {
      totalWeightedGPA += courseGPA * credits;
      totalCredits += credits;
    }
  }
  
  return totalCredits > 0 ? totalWeightedGPA / totalCredits : 0;
};

// Maximum possible total GPA across courses if acing remaining work (credit-weighted)
export const calculateMaxPossibleTotalGPA = (courses: Array<{ course: { credits: number | null }; items: Array<{ total_weight_pct: number | null; obtained_score_pct: number | null }> }>): number => {
  if (!courses || courses.length === 0) return 0;
  let totalWeightedGPA = 0;
  let totalCredits = 0;
  for (const registeredCourse of courses) {
    const maxScore = calculateMaxPossibleCourseScore(registeredCourse.items);
    const courseGPA = scoreToGPA(maxScore);
    const credits = registeredCourse.course.credits || 0;
    if (credits > 0) {
      totalWeightedGPA += courseGPA * credits;
      totalCredits += credits;
    }
  }
  return totalCredits > 0 ? totalWeightedGPA / totalCredits : 0;
};

// Projected score for a course based on mean of entered item scores
export const calculateProjectedCourseScore = (
  items: Array<{ total_weight_pct: number | null; obtained_score_pct: number | null }>
): number => {
  const currentScore = calculateSemesterCourseScore(items);
  const totalWeight = items.reduce((acc, it) => acc + (it.total_weight_pct || 0), 0);
  const remainingWeight = Math.max(0, 100 - totalWeight);
  const obtainedScores = items
    .map((it) => it.obtained_score_pct)
    .filter((s): s is number => s !== null && s !== undefined);
  const meanScore = obtainedScores.length > 0
    ? obtainedScores.reduce((acc, s) => acc + s, 0) / obtainedScores.length
    : 0;
  const projected = Math.min(100, currentScore + (meanScore / 100) * remainingWeight);
  return projected;
};

// Credit-weighted projected total GPA across courses
export const calculateProjectedTotalGPA = (courses: Array<{ course: { credits: number | null }; items: Array<{ total_weight_pct: number | null; obtained_score_pct: number | null }> }>): number => {
  if (!courses || courses.length === 0) return 0;
  let totalWeightedGPA = 0;
  let totalCredits = 0;
  for (const registeredCourse of courses) {
    const projectedScore = calculateProjectedCourseScore(registeredCourse.items);
    const courseGPA = scoreToGPA(projectedScore);
    const credits = registeredCourse.course.credits || 0;
    if (credits > 0) {
      totalWeightedGPA += courseGPA * credits;
      totalCredits += credits;
    }
  }
  return totalCredits > 0 ? totalWeightedGPA / totalCredits : 0;
};
