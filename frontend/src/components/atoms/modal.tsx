"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "./button";
import { cn } from "../../utils/utils";
import { createPortal } from "react-dom";
import { useEffect } from "react";
import { useMaybeBackNavigation } from "@/context/BackNavigationContext";
// Removed framer-motion to avoid transformed ancestors affecting fixed elements on Safari

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  className = "max-w-md",
  contentClassName,
}: ModalProps) {

  const backNav = useMaybeBackNavigation();
  useEffect(() => {
    if (!isOpen || !backNav) return;
    // Register modal close to back stack
    const unregister = backNav.register(onClose);
    return unregister;
  }, [isOpen, backNav, onClose]);
  // Close on escape key press
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent background scrolling when modal is open (desktop + mobile)
      const scrollY = window.scrollY;
      // Lock scroll
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";

      // Cleanup: restore scroll position and styles
      return () => {
        document.removeEventListener("keydown", handleEscape);
        document.documentElement.style.overflow = "";
        document.body.style.overflow = "";
        document.body.style.position = "";
        const y = Math.abs(parseInt(document.body.style.top || "0", 10)) || scrollY;
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        document.body.style.width = "";
        window.scrollTo(0, y);
      };
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Use portal to render modal at the document root level
  return createPortal(
    <div className="fixed inset-0 z-[10000]">
      {/* Backdrop without blur to avoid Safari rendering glitches */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      {/* Centered container. Keep it non-transformed (no scale/opacity animations) */}
      <div
        className="fixed inset-0 grid place-items-center px-4"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 2rem)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
        }}
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "relative flex w-full flex-col overflow-hidden rounded-lg bg-background shadow-lg",
            "max-h-[calc(100dvh-4rem)]",
            className,
            contentClassName,
          )}
          style={{
            // Use 100dvh to include iOS dynamic viewport, with fallback to 100vh
            maxHeight:
              "min(calc(100dvh - (env(safe-area-inset-bottom, 0px) + 3rem)), calc(100vh - (env(safe-area-inset-bottom, 0px) + 3rem)))",
          }}
        >
          {/* Sticky header without backdrop blur (Safari bug with overflow containers) */}
          <div className="sticky top-0 z-10 flex justify-between items-center p-4 border-b bg-background">
            <div className="flex items-center gap-2">
              {title && <h2 className="text-lg font-semibold">{title}</h2>}
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="p-4 flex-1 overflow-y-auto overflow-x-hidden">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
