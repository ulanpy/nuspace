"use client";

import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "../../hooks/use-toast";

export function Toasts() {
  const { toasts, dismissToast } = useToast();

  return (
    <div className="fixed bottom-0 right-0 z-[11000] p-4 space-y-2 max-w-md w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
            className="pointer-events-auto"
          >
            <div
              className={`rounded-md border p-4 shadow-md ${
                toast.variant === "destructive"
                  ? "bg-destructive text-destructive-foreground border-destructive/30"
                  : toast.variant === "success"
                    ? "bg-green-50 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900"
                    : toast.variant === "warning"
                      ? "bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-900"
                      : "bg-background text-foreground"
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <div className="grid gap-1">
                  {toast.title && (
                    <div className="font-medium">{toast.title}</div>
                  )}
                  {toast.description && (
                    <div className="text-sm opacity-90">
                      {toast.description}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => dismissToast(toast.id)}
                  className="rounded-md p-1 hover:bg-background/10 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
