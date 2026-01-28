import { BindTelegramButton } from "@/components/molecules/buttons/bind-telegram-button";
import { cn } from "@/utils/utils";
import { FaTelegram } from "react-icons/fa";

interface TelegramConnectCardProps {
  user: {
    tg_id?: string | null;
  } | null;
  className?: string;
}

export function TelegramConnectCard({ user, className }: TelegramConnectCardProps) {
  if (!user || user.tg_id) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-lg border border-blue-200 bg-blue-50/80 p-4 text-blue-950 shadow-sm",
        "dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-50",
        "sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
      data-bind-telegram
    >
      <div className="flex flex-1 items-start gap-3">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/60 dark:text-blue-300">
          <FaTelegram className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-semibold">Connect Telegram to stay updated</h2>
          <p className="text-sm text-blue-900/80 dark:text-blue-100/80">
            Link your Telegram account to receive updates about your non-anonymous appeals directly from nuspacebot
          </p>
        </div>
      </div>

      <div className="flex flex-shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <BindTelegramButton />
      </div>
    </div>
  );
}

