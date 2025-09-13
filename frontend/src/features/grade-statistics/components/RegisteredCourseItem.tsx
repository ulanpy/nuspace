import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { BaseCourseItem } from "../types";
import { Trash2, Pencil } from "lucide-react";

interface RegisteredCourseItemProps {
  item: BaseCourseItem;
  onDelete?: () => void;
  onEdit?: () => void;
}

export function RegisteredCourseItem({ item, onDelete, onEdit }: RegisteredCourseItemProps) {
  const score = item.obtained_score_pct || 0;
  const weight = item.total_weight_pct || 0;
  const contribution = (score / 100) * weight;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <span className="font-medium text-gray-900 dark:text-gray-100 flex-1 min-w-0 break-words sm:break-normal sm:truncate" title={item.item_name}>
            {item.item_name}
          </span>
          <Badge variant="outline" className="text-xs">
            {weight.toFixed(1)}% Weight
          </Badge>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Score: {score.toFixed(1)}%
        </div>
      </div>
      
      <div className="flex items-center gap-3 mt-3 sm:mt-0 shrink-0 w-full sm:w-auto">
        <div className="text-left sm:text-right">
          <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
            +{contribution.toFixed(2)}%
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Contribution
          </div>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="p-1 h-8 w-8 shrink-0"
              aria-label="Edit item"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="text-red-600 hover:text-red-700 p-1 h-8 w-8 shrink-0"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
