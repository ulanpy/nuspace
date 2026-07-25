"use client";

import { toast as sonnerToast } from "sonner";

type ToastType = "default" | "success" | "error" | "warning" | "destructive";

interface ToastProps {
  title?: string;
  description?: string;
  variant?: ToastType;
  duration?: number;
}

export function toast({
  title,
  description,
  variant = "default",
  duration = 5000,
}: ToastProps) {
  const options = { description, duration };

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
