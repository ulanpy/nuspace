import { Button } from "@/components/atoms/button";
import { MessageSquare } from "lucide-react";

export function MessageButton() {
  return (
    <div className="flex gap-2">
      <Button
        variant="ghost"
        size="sm"
        className="flex gap-1 text-muted-foreground hover:text-primary"
      >
        <MessageSquare className="h-4 w-4" />
        <span>Message</span>
      </Button>
    </div>
  );
}
