import { ServerCrash } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { cn } from "@/utils/utils";

interface ServerErrorProps {
  /** HTTP status if known (500/502/503/504). Only changes copy, not layout. */
  status?: number;
  /** Correlation/request id for support tickets, shown small and muted. */
  requestId?: string;
  onRetry?: () => void;
  className?: string;
}

const STATUS_COPY: Record<number, string> = {
  502: "Server got a bad response upstream.",
  503: "Service is temporarily unavailable, probably maintenance.",
  504: "Server took too long to respond.",
};

function ServerError({ status, requestId, onRetry, className }: ServerErrorProps) {
  const subtitle = (status && STATUS_COPY[status]) || "We couldn't complete your request. Please try again in a few moments.";

  return (
    <div
      className={cn(
        "flex min-h-[50vh] w-full flex-col items-center justify-center gap-4 px-4 py-12 text-center",
        className,
      )}
    >
      <ServerCrash className="h-10 w-10 text-muted-foreground" aria-hidden />

      <div className="max-w-sm space-y-1">
        <h2 className="text-xl font-semibold text-foreground">
          Server error
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {subtitle} Your data is safe, try again in a moment.
        </p>
      </div>

      <div className="flex items-center gap-3 pt-2">
        {onRetry && (
          <Button variant="default" onClick={onRetry}>
            Retry
          </Button>
        )}
        <Button variant="outline" onClick={() => (window.location.href = "/")}>
          Go home
        </Button>
      </div>

      {requestId && (
        <p className="pt-2 text-xs text-muted-foreground/70">
          Reference: {requestId}
        </p>
      )}
    </div>
  );
}

export { ServerError };
