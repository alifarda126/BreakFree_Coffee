'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

type ToastTone = 'success' | 'warning' | 'danger' | 'info';

interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
}

interface ToastContextVal {
  pushToast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextVal>({ pushToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ pushToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 md:bottom-5 md:right-5 no-print"
      >
        {toasts.map((t) => {
          const Icon =
            t.tone === 'success' ? CheckCircle2 : t.tone === 'info' ? Info : AlertTriangle;
          const border =
            t.tone === 'danger'
              ? 'border-[#E5B8B3] bg-[#F8E3E0] text-[#B23A2E]'
              : t.tone === 'warning'
                ? 'border-[#E6E0D8] bg-[#FBF0DC] text-[#A86A12]'
                : t.tone === 'info'
                  ? 'border-[#E6E0D8] bg-[#E3EEF5] text-[#3B6C8F]'
                  : 'border-[#E6E0D8] bg-[#E6F1E8] text-[#3F7A4F]';
          return (
            <div
              key={t.id}
              className={`flex items-center gap-2.5 rounded-[10px] border px-3.5 py-2.5 text-sm font-semibold shadow-[0_8px_24px_-8px_rgba(61,52,44,0.18)] transition-all duration-150 ${border}`}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span>{t.message}</span>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="ml-1 rounded p-0.5 opacity-70 hover:opacity-100"
                aria-label="Tutup notifikasi"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
