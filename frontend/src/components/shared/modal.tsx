"use client";

import { useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useMaybeBackNavigation } from "@/context/back-navigation-context";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  bodyClassName?: string;
  hideHeader?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  className = "max-w-md",
  contentClassName,
  bodyClassName,
  hideHeader = false,
}: ModalProps) {
  const backNav = useMaybeBackNavigation();

  useEffect(() => {
    if (!isOpen || !backNav) return;
    return backNav.register(onClose);
  }, [isOpen, backNav, onClose]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) onClose();
    },
    [onClose],
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={!hideHeader}
        className={cn(
          "flex max-h-[min(calc(100dvh-3rem),calc(100vh-3rem))] flex-col gap-0 overflow-hidden rounded-lg border bg-background p-0 text-foreground shadow-lg ring-0 sm:max-w-md",
          className,
          contentClassName,
        )}
      >
        {!hideHeader && (title || description) && (
          <DialogHeader className="sticky top-0 z-10 space-y-0 border-b bg-background p-4 text-left">
            <div className="flex items-start gap-2 pr-8">
              <div className="flex flex-col gap-1">
                {title && (
                  <DialogTitle className="text-lg font-semibold leading-none">
                    {title}
                  </DialogTitle>
                )}
                {description && <DialogDescription>{description}</DialogDescription>}
              </div>
            </div>
          </DialogHeader>
        )}
        <div
          className={cn(
            "flex-1 overflow-y-auto overflow-x-hidden",
            hideHeader ? (bodyClassName ?? "p-0") : cn("p-4", bodyClassName),
          )}
        >
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
