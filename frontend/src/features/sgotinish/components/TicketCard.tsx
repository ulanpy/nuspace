import { Badge } from "@/components/atoms/badge";
import { Card, CardContent, CardHeader } from "@/components/atoms/card";
import { formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";
import { MessageCircle, Clock } from "lucide-react";

export interface TicketCardProps {
  id: string;
  title: string;
  category: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  createdAt: Date;
  messageCount?: number;
  onClick?: () => void;
  className?: string;
}

const getStatusBadge = (status: TicketCardProps["status"]) => {
  switch (status) {
    case "open":
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300">Pending</Badge>;
    case "in_progress":
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">In Progress</Badge>;
    case "resolved":
      return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">Resolved</Badge>;
    case "closed":
      return <Badge variant="secondary" className="bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300">Closed</Badge>;
    default:
      return <Badge variant="secondary">Unknown</Badge>;
  }
};

export function TicketCard({ 
  title, 
  category, 
  status, 
  createdAt, 
  messageCount = 0,
  onClick,
  className 
}: TicketCardProps) {
  return (
    <Card 
      className={`cursor-pointer hover:shadow-card transition-all duration-200 hover:scale-[1.01] ${className}`}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-card-foreground line-clamp-2 text-sm sm:text-base leading-tight">{title}</h3>
          {getStatusBadge(status)}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm text-muted-foreground">
          <div className="flex items-center flex-wrap gap-2 sm:gap-4">
            <span className="text-primary font-medium text-xs sm:text-sm">{category}</span>
            {messageCount > 0 && (
              <div className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3 flex-shrink-0" />
                <span className="text-xs sm:text-sm">{messageCount}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs sm:text-sm">
            <Clock className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{formatDistanceToNow(createdAt, { addSuffix: true, locale: enUS })}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}