import { useState } from "react";
import { X } from "lucide-react";
import { BindTelegramButton } from "@/components/molecules/buttons/bind-telegram-button";
import { cn } from "@/utils/utils";
import { FaTelegram } from "react-icons/fa";

const DISMISS_KEY = "nuspace_tg_banner_dismissed";

interface TelegramConnectCardProps {
  user: {
    tg_id?: string | null;
  } | null;
  className?: string;
  title?: string;
  description?: string;
  dismissKey?: string;
}

export function TelegramConnectCard({
  user,
  className,
  title = "Get appeal updates on Telegram",
  description = "nuspacebot notifies you when your non-anonymous appeals get a response.",
  dismissKey = DISMISS_KEY,
}: TelegramConnectCardProps) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(dismissKey) === "true";
    } catch {
      return false;
    }
  });

  if (!user || user.tg_id || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(dismissKey, "true");
    } catch {}
    setDismissed(true);
  };

  return (
    <div
      className={cn(
        "relative flex flex-col gap-4 overflow-visible rounded-lg border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
      data-bind-telegram
    >
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute -right-2.5 -top-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Dismiss Telegram connect banner"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex flex-1 items-start gap-3">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <FaTelegram className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="flex flex-shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <BindTelegramButton />
      </div>
    </div>
  );
}
