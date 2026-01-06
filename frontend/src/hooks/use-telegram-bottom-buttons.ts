import { useEffect } from "react";

type Options = {
  enabled: boolean;
  text: string;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  show?: boolean;
  showProgress?: boolean;
};

// Minimal wrapper that uses Telegram WebApp MainButton (fallbacks to BottomButton when present)
export function useTelegramBottomButtons(options: Options) {
  const { enabled, text, onClick, disabled = false, show = true, showProgress = false } = options;

  useEffect(() => {
    const w: any = window as any;
    const tg: any = w?.Telegram?.WebApp;
    const modalOpen = Boolean(w?.__modalOpenCount && w.__modalOpenCount > 0);

    if (!tg) return;
    // If disabled or a modal is open, ensure the button is hidden and bail
    if (!enabled || modalOpen) {
      try {
        const main: any = tg?.MainButton ?? tg?.BottomButton;
        if (main) {
          if (typeof main.hide === "function") main.hide();
          if (typeof main.setParams === "function") main.setParams({ is_visible: false });
        }
      } catch {}
      return;
    }

    const main: any = tg.MainButton ?? tg.BottomButton;
    if (!main) return;

    try {
      // Configure button
      if (typeof main.setText === "function") main.setText(text);
      if (typeof main.setParams === "function") {
        main.setParams({ text, is_active: !disabled, is_visible: !!show });
      } else {
        if (disabled && typeof main.disable === "function") main.disable();
        if (!disabled && typeof main.enable === "function") main.enable();
        if (show && typeof main.show === "function") main.show();
        if (!show && typeof main.hide === "function") main.hide();
      }

      const handler = async () => {
        try {
          if (showProgress && typeof main.showProgress === "function") main.showProgress(true);
          await onClick();
        } finally {
          if (showProgress && typeof main.hideProgress === "function") main.hideProgress();
        }
      };

      // Wire click handler
      if (typeof main.onClick === "function") {
        main.onClick(handler);
      } else if (typeof tg.onEvent === "function") {
        tg.onEvent("mainButtonClicked", handler);
      }

      return () => {
        try {
          if (typeof main.hide === "function") main.hide();
          if (typeof main.offClick === "function") {
            main.offClick(handler);
          } else if (typeof tg.offEvent === "function") {
            tg.offEvent("mainButtonClicked", handler);
          }
        } catch {
          // ignore
        }
      };
    } catch {
      // ignore
    }
  }, [enabled, text, onClick, disabled, show, showProgress]);
}


