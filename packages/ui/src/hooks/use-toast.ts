"use client";

import { useState, useCallback } from "react";

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: "default" | "success" | "error" | "warning";
  duration?: number;
}

export interface ToastState extends ToastOptions {
  id: string;
  open: boolean;
}

let toastIdCounter = 0;

/**
 * Hook for managing toast notifications.
 * Pair with <ToastProvider> and <ToastViewport> in your layout.
 */
export function useToast() {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  const toast = useCallback((options: ToastOptions) => {
    const id = String(++toastIdCounter);
    setToasts((prev) => [...prev, { ...options, id, open: true }]);

    const duration = options.duration ?? 4000;
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, open: false } : t)),
      );
    }, duration);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, open: false } : t)));
  }, []);

  return { toast, toasts, dismiss };
}
