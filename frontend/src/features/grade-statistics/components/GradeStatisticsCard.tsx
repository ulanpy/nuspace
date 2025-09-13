import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card";
import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { GradeStatistics } from "../types";
import { 
  formatGPA, 
  formatPercentage, 
  getGradeDistribution,
  getGPAColorClass,
  getDifficultyLevel,
  getDifficultyColorClass
} from "../utils/gradeUtils";
import { GradeDistributionChart } from "./GradeDistributionChart";
import { Users, TrendingUp, BarChart3, User, PieChart, EyeOff } from "lucide-react";
import { useState } from "react";

interface GradeStatisticsCardProps {
  statistics: GradeStatistics;
  showChart?: boolean;
  onToggleSelect?: (statistics: GradeStatistics) => void;
  isSelected?: boolean;
  disableAdd?: boolean;
}

export function GradeStatisticsCard({ statistics, showChart = true, onToggleSelect, isSelected = false, disableAdd = false }: GradeStatisticsCardProps) {
  const [showPieChart, setShowPieChart] = useState(false);
  const gradeDistribution = getGradeDistribution(statistics);
  const difficulty = getDifficultyLevel(statistics.avg_gpa, statistics.std_dev);

  return (
    <Card className="w-full hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="pb-4 relative">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1">
            <CardTitle className="text-xl font-bold text-gray-800 dark:text-gray-200">
              {statistics.course_code}
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
              {statistics.course_title}
            </p>
            
            {/* Faculty Info - moved above badges */}
            {statistics.faculty && (
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-600 dark:text-gray-400">
                <User className="h-4 w-4" />
                <span className="font-medium">Faculty:</span>
                <span>{statistics.faculty}</span>
              </div>
            )}
            
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                Section {statistics.section}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {statistics.term}
              </Badge>
              <Badge 
                variant="outline" 
                className={`text-xs ${getDifficultyColorClass(difficulty)}`}
              >
                {difficulty}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
              {statistics.grades_count}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Students</div>
          </div>

          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div className={`text-lg font-semibold ${getGPAColorClass(statistics.avg_gpa)}`}>
              {formatGPA(statistics.avg_gpa)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Avg GPA</div>
          </div>

          <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <BarChart3 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-lg font-semibold text-purple-600 dark:text-purple-400">
              {formatGPA(statistics.median_gpa)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Median</div>
          </div>

          <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <BarChart3 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="text-lg font-semibold text-orange-600 dark:text-orange-400">
              ±{statistics.std_dev.toFixed(2)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Std Dev</div>
          </div>
        </div>

        {/* Withdrawal Rate */}
        <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <div className="flex items-center justify-center mb-1">
            <Users className="h-4 w-4 text-red-600 dark:text-red-400" />
          </div>
          <div className="text-lg font-semibold text-red-600 dark:text-red-400">
            {formatPercentage(statistics.pct_W_AW)}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Withdrawal Rate</div>
        </div>

        {/* Grade Percentages */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Grade Distribution</h4>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPieChart(!showPieChart)}
              className="flex items-center gap-2 text-xs"
            >
              {showPieChart ? (
                <>
                  <EyeOff className="h-3 w-3" />
                  Hide Chart
                </>
              ) : (
                <>
                  <PieChart className="h-3 w-3" />
                  Show Chart
                </>
              )}
            </Button>
          </div>
          <div className="grid grid-cols-5 gap-2 text-center">
            {[
              { grade: 'A', percent: statistics.pct_A, color: 'text-green-600 dark:text-green-400' },
              { grade: 'B', percent: statistics.pct_B, color: 'text-blue-600 dark:text-blue-400' },
              { grade: 'C', percent: statistics.pct_C, color: 'text-amber-600 dark:text-amber-400' },
              { grade: 'D', percent: statistics.pct_D, color: 'text-orange-600 dark:text-orange-400' },
              { grade: 'F', percent: statistics.pct_F, color: 'text-red-600 dark:text-red-400' },
            ].map(({ grade, percent, color }) => (
              <div key={grade} className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <div className={`text-sm font-semibold ${color}`}>{grade}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {formatPercentage(percent)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart - now controlled by showPieChart state */}
        {showPieChart && showChart && gradeDistribution.length > 0 && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <GradeDistributionChart data={gradeDistribution} title="" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
