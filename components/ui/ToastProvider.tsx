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
        className="no-print fixed bottom-20 right-4 z-50 flex flex-col gap-2 md:bottom-5 md:right-5"
      >
        {toasts.map((t) => {
          const Icon =
            t.tone === 'success' ? CheckCircle2 : t.tone === 'info' ? Info : AlertTriangle;
          const toneStyle =
            t.tone === 'danger'
              ? 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]'
              : t.tone === 'warning'
                ? 'border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]'
                : t.tone === 'info'
                  ? 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1E40AF]'
                  : 'border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]';
          return (
            <div
              key={t.id}
              className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-[13px] font-medium shadow-[0_10px_28px_-8px_rgba(15,23,42,0.14)] transition-all duration-150 ${toneStyle}`}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              <span>{t.message}</span>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="ml-1 rounded-md p-0.5 opacity-70 transition hover:opacity-100 focus-visible:outline-2 focus-visible:outline-[#2563EB]"
                aria-label="Tutup notifikasi"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
