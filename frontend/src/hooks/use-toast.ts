"use client"

import { useState, useEffect, useCallback } from "react"

type ToastType = "default" | "success" | "error" | "warning" | "destructive"

interface ToastProps {
  title?: string
  description?: string
  variant?: ToastType
  duration?: number
}

interface Toast extends ToastProps {
  id: string
  visible: boolean
}

// Global store for toasts
let toasts: Toast[] = []
let listeners: Array<(toasts: Toast[]) => void> = []

// Notify all listeners when toasts change
const notifyListeners = () => {
  listeners.forEach((listener) => listener([...toasts]))
}

export function useToast() {
  const [localToasts, setLocalToasts] = useState<Toast[]>(toasts)

  // Register listener
  useEffect(() => {
    listeners.push(setLocalToasts)
    return () => {
      listeners = listeners.filter((listener) => listener !== setLocalToasts)
    }
  }, [])

  const toast = useCallback(({ title, description, variant = "default", duration = 5000 }: ToastProps) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast: Toast = {
      id,
      title,
      description,
      variant,
      duration,
      visible: true,
    }

    toasts = [...toasts, newToast]
    notifyListeners()

    // Auto dismiss
    setTimeout(() => {
      dismissToast(id)
    }, duration)

    return id
  }, [])

  const dismissToast = useCallback((id: string) => {
    // First mark as invisible for animation
    toasts = toasts.map((t) => (t.id === id ? { ...t, visible: false } : t))
    notifyListeners()

    // Then remove after animation
    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id)
      notifyListeners()
    }, 300)
  }, [])

  return {
    toast,
    dismissToast,
    toasts: localToasts,
  }
}

