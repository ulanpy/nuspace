import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { IoMdClose } from "react-icons/io";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);
  useEffect(() => {
    if (!isOpen) return;

    previousFocus.current = document.activeElement as HTMLElement;

    if (modalRef.current) {
      modalRef.current.focus();
    }
    return () => {
      if (previousFocus.current) {
        previousFocus.current.focus();
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (overlayRef.current === e.target) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        className="bg-gray-900 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 id="modal-title" className="text-xl font-semibold text-white">
            {title || "Dialog"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white rounded-full p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Close"
          >
            <IoMdClose size={24} />
          </button>
        </div>

        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body
  );
}
