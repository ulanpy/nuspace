import { Badge } from "@/components/atoms/badge";
import { Card, CardContent, CardHeader } from "@/components/atoms/card";
import { formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";
import { toLocalDate } from "../utils/date";
import { MessageCircle, Clock, Lock } from "lucide-react";

export interface TicketCardProps {
  id: string;
  title: string;
  category: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  createdAt: Date;
  messageCount?: number;
  isEncrypted?: boolean;
  onClick?: () => void;
  className?: string;
  variant?: "card" | "flat"; // visual variant
}

const getStatusBadge = (status: TicketCardProps["status"]) => {
  switch (status) {
    case "open":
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300 text-[10px] sm:text-xs whitespace-nowrap">Pending</Badge>;
    case "in_progress":
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 text-[10px] sm:text-xs whitespace-nowrap">Progress</Badge>;
    case "resolved":
      return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 text-[10px] sm:text-xs whitespace-nowrap">Resolved</Badge>;
    case "closed":
      return <Badge variant="secondary" className="bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300 text-[10px] sm:text-xs whitespace-nowrap">Closed</Badge>;
    default:
      return <Badge variant="secondary" className="text-[10px] sm:text-xs whitespace-nowrap">Unknown</Badge>;
  }
};

export function TicketCard({ 
  title, 
  category, 
  status, 
  createdAt, 
  messageCount = 0,
  isEncrypted = false,
  onClick,
  className,
  variant = "card",
}: TicketCardProps) {
  const Content = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 line-clamp-2 text-sm sm:text-[15px] leading-snug pr-2">
            {title}
          </h3>
          <div className="flex-shrink-0">{getStatusBadge(status)}</div>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] sm:text-xs text-gray-600 dark:text-gray-400">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
            {category}
          </span>
          {isEncrypted && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
              <Lock className="h-3 w-3" />
              Encrypted
            </span>
          )}
          <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <Clock className="h-3 w-3 flex-shrink-0" />
            <span>{formatDistanceToNow(toLocalDate(createdAt), { addSuffix: true, locale: enUS })}</span>
          </span>
        </div>
      </div>
      {messageCount > 0 && (
        <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400 pl-2">
          <MessageCircle className="h-3 w-3 flex-shrink-0" />
          <span className="text-[12px] sm:text-xs">{messageCount}</span>
        </div>
      )}
    </div>
  );

  if (variant === "flat") {
    return (
      <div
        className={`relative cursor-pointer py-2 sm:py-2.5 ${className || ""}`}
        onClick={onClick}
      >
        {Content}
      </div>
    );
  }

  // Default: card variant, with reduced vertical paddings to make it denser
  return (
    <Card 
      className={`cursor-pointer hover:shadow-md transition-shadow ${className || ""}`}
      onClick={onClick}
    >
      <CardHeader className="py-2">
        {Content}
      </CardHeader>
      <CardContent className="pt-0 pb-2" />
    </Card>
  );
}