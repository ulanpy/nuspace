import { Button } from "@/components/atoms/button";
import { Trash2, Pencil } from "lucide-react";
import { BaseCourseItem } from "../types";

interface RegisteredCourseItemProps {
  item: BaseCourseItem;
  onDelete?: () => void;
  onEdit?: () => void;
}

export function RegisteredCourseItem({ item, onDelete, onEdit }: RegisteredCourseItemProps) {
  const weight = item.total_weight_pct || 0;
  const contribution = ((item.obtained_score_pct || 0) / 100) * weight;

  return (
    <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background px-3 py-2 text-sm">
      <div className="flex flex-col">
        <span className="font-medium text-foreground" title={item.item_name}>
          {item.item_name}
        </span>
        <span className="text-xs text-muted-foreground">+{contribution.toFixed(2)}% contribution</span>
      </div>
      <div className="flex items-center gap-2">
        {onEdit && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
            aria-label="Edit assignment"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="h-7 w-7 rounded-full text-destructive hover:text-destructive"
            aria-label="Remove assignment"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
