"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "./button";
import { cn } from "../../utils/utils";
import { createPortal } from "react-dom";
import { useEffect } from "react";
import { useMaybeBackNavigation } from "@/context/BackNavigationContext";

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
    <div className="fixed inset-0 z-[100] grid place-items-center p-4 bg-black/50 backdrop-blur-sm" onWheel={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
      <div
        className={cn(
          "bg-background rounded-lg shadow-lg w-full overflow-hidden",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <div>
            {title && <h2 className="text-lg font-semibold">{title}</h2>}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
