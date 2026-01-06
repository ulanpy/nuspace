import { Bug } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { useTheme } from '@/context/theme-provider-context';

export function ReportButton({
  className,
  text = "Report Bug",
}: {
  className?: string;
  text?: string;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Button
      variant="ghost"
      size="sm"
      asChild
      className={`
        group
        relative
        flex
        items-center
        gap-2
        rounded-full
        transition-all
        hover:bg-muted
        ${className || ""}
      `}
    >
      <a
        href="https://t.me/kamikadze24"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2"
      >
        <Bug className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        <span className="text-sm font-medium">{text}</span>
      </a>
    </Button>
  );
}
