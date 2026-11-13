"use client";

import { toast as sonnerToast } from "sonner";

type ToastType = "default" | "success" | "error" | "warning" | "destructive";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastProps {
  title?: string;
  description?: string;
  variant?: ToastType;
  duration?: number;
  action?: ToastAction;
}

export function toast({
  title,
  description,
  variant = "default",
  duration = 5000,
  action,
}: ToastProps) {
  const options = { description, duration, action };

  switch (variant) {
    case "success":
      return sonnerToast.success(title, options);
    case "error":
    case "destructive":
      return sonnerToast.error(title, options);
    case "warning":
      return sonnerToast.warning(title, options);
    default:
      return sonnerToast(title, options);
  }
}
