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
