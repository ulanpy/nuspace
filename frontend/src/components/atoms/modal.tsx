"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "./button";
import { cn } from "../../utils/utils";
import { createPortal } from "react-dom";
import { useEffect, MouseEvent } from "react";
import { useMaybeBackNavigation } from "@/context/BackNavigationContext";
import { useTelegramMiniApp } from "@/hooks/useTelegramMiniApp";
import { motion } from "framer-motion";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  className = "max-w-md",
}: ModalProps) {
  
  const backNav = useMaybeBackNavigation();
  const { isMiniApp } = useTelegramMiniApp();
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

  // Hide Telegram MainButton/BottomButton while any modal is open
  React.useEffect(() => {
    if (!isOpen) return;
    try {
      const w: any = window as any;
      w.__modalOpenCount = (w.__modalOpenCount || 0) + 1;
      const tg: any = w?.Telegram?.WebApp;
      const main: any = tg?.MainButton ?? tg?.BottomButton;
      if (main) {
        if (typeof main.hide === "function") main.hide();
        if (typeof main.setParams === "function") main.setParams({ is_visible: false });
      }
      return () => {
        w.__modalOpenCount = Math.max(0, (w.__modalOpenCount || 1) - 1);
      };
    } catch {
      // ignore
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Use portal to render modal at the document root level
  return createPortal(
    // Example structure for animated modal
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1}}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.2, ease: "easeIn" }}
  className="fixed inset-0 bg-black/50 z-50"
>
  <motion.div
    initial={{ scale: 0.95, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    exit={{ scale: 0.95, opacity: 0 }}
    transition={{ duration: 0.2, ease: "easeIn" }}
    className="relative bg-background rounded-lg shadow-lg w-full overflow-hidden"
  >
    <div
      className="fixed inset-0 z-[10000] grid place-items-center px-4"
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + var(--tg-header-offset, 0px) + 2rem)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
      }}
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative bg-background rounded-lg shadow-lg w-full overflow-hidden",
          className,
        )}
      >
        <div className="sticky top-0 z-10 flex justify-between items-center p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
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
        <div className="p-4">{children}</div>
      </div>
    </div>
  </motion.div>
</motion.div>,
    document.body,
  );
}
