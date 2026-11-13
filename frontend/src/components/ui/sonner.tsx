"use client";

import { useTheme } from "@/context/theme-provider-context";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme === "dark" ? "dark" : theme === "light" ? "light" : "system"}
      className="toaster group"
      position="bottom-right"
      offset={{ bottom: "1rem", right: "1rem" }}
      mobileOffset={{
        bottom: "calc(3.5rem + env(safe-area-inset-bottom, 0px))",
        left: "0.75rem",
        right: "0.75rem",
      }}
      gap={10}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "items-start",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
