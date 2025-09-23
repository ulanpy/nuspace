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
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300 text-xs whitespace-nowrap">Pending</Badge>;
    case "in_progress":
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 text-xs whitespace-nowrap">Progress</Badge>;
    case "resolved":
      return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 text-xs whitespace-nowrap">Resolved</Badge>;
    case "closed":
      return <Badge variant="secondary" className="bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300 text-xs whitespace-nowrap">Closed</Badge>;
    default:
      return <Badge variant="secondary" className="text-xs whitespace-nowrap">Unknown</Badge>;
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
      className={`cursor-pointer hover:shadow-md transition-shadow ${className}`}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2 min-h-[2.5rem]">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 text-sm sm:text-base leading-tight flex-1 pr-2">{title}</h3>
          <div className="flex-shrink-0">
            {getStatusBadge(status)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
              {category}
            </span>
            {messageCount > 0 && (
              <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                <MessageCircle className="h-3 w-3 flex-shrink-0" />
                <span className="text-xs">{messageCount}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Clock className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{formatDistanceToNow(createdAt, { addSuffix: true, locale: enUS })}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}