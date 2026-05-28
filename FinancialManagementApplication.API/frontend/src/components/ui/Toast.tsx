// src/components/ui/Toast.tsx
import React, { createContext, useContext, useState, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastOptions {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number; // auto‑close after ms, default 5000
}

export interface Toast extends ToastOptions {
  id: string;
}

interface ToastContextProps {
  addToast: (options: ToastOptions) => void;
  removeToast: (id: string) => void;
  toasts: Toast[];
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (options: ToastOptions) => {
    const id = crypto.randomUUID();
    const toast: Toast = {
      id,
      title: options.title,
      description: options.description,
      variant: options.variant ?? "info",
      durationMs: options.durationMs ?? 5000,
    };
    setToasts((prev) => [...prev, toast]);
    // auto‑remove after duration
    setTimeout(() => removeToast(id), toast.durationMs);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const variantClasses: Record<ToastVariant, string> = {
    success: "bg-success/10 border-success text-success",
    error: "bg-danger/10 border-danger text-danger",
    warning: "bg-warning/10 border-warning text-warning",
    info: "bg-primary/10 border-primary text-primary",
  };

  const variantIcon: Record<ToastVariant, JSX.Element> = {
    success: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M9 12l2 2 4-4"/></svg>,
    error: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 110 20 10 10 0 010-20zM8 8l8 8M16 8l-8 8"/></svg>,
    warning: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l9 20H3L12 2z"/></svg>,
    info: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-4.418 0-8 1.79-8 4v2h16v-2c0-2.21-3.582-4-8-4z"/></svg>,
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast, toasts }}>
      {children}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center w-full max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20, transition: { duration: 0.2 } }}
              className={`relative w-full p-4 rounded-xl border backdrop-blur-sm ${variantClasses[toast.variant!]}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">{variantIcon[toast.variant!]}</div>
                <div className="flex-1 min-w-0">
                  {toast.title && <p className="font-medium">{toast.title}</p>}
                  {toast.description && <p className="text-sm opacity-80">{toast.description}</p>}
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="p-1 hover:opacity-75"
                >
                  <X size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
