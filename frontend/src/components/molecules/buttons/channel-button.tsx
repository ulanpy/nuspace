import { Radio } from "lucide-react";
import { Button } from "@/components/atoms/button";

export function ChannelButton({
  className,
  text = "Channel",
}: {
  className?: string;
  text?: string;
}) {
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
        href="https://t.me/nuspacechannel"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2"
      >
        <Radio className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        <span className="text-sm font-medium">{text}</span>
      </a>
    </Button>
  );
}
