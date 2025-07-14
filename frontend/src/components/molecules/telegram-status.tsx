import { FaTelegram } from "react-icons/fa";
import { Badge } from "@/components/atoms/badge";
import { useTheme } from "@/context/theme-provider";

interface TelegramStatusProps {
  isConnected: boolean;
  className?: string;
}

export function TelegramStatus({
  isConnected,
  className = "",
}: TelegramStatusProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  if (!isConnected) return null;

  return (
    <Badge
      variant="outline"
      className={`
        flex 
        items-center 
        gap-1.5 
        py-1.5 
        px-2.5
        bg-primary/5
        border-primary/20
        text-primary
        transition-all
        hover:bg-primary/10
        ${className}
      `}
    >
      <FaTelegram className="h-3.5 w-3.5" />
      <span className="text-xs font-medium">Connected</span>
    </Badge>
  );
}
