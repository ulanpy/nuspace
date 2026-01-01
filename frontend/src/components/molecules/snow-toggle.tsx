import { Snowflake } from "lucide-react";
import { Button } from "../atoms/button";
import { cn } from "@/utils/utils";
import { useSnow } from "@/config/seasonal";

export function SnowToggle() {
  const { enabled, toggle } = useSnow();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label="Toggle snowfall"
      className="h-8 w-8 text-muted-foreground hover:text-foreground"
      title={enabled ? "Disable snowfall" : "Enable snowfall"}
    >
      <Snowflake
        className={cn(
          "h-[1.1rem] w-[1.1rem] transition-colors",
          enabled ? "text-sky-400" : "text-muted-foreground"
        )}
      />
    </Button>
  );
}
