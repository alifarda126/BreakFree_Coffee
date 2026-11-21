'use client';

import React, { useEffect, useState } from 'react';
import { STORAGE_KEY, useBreakfreeStore } from '@/lib/store/useBreakfreeStore';
import { ToastProvider } from '@/components/ui/ToastProvider';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);

    // Cross-tab localStorage sync (PRD §11 scenario 4: Menu kosong real-time antar tab)
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        useBreakfreeStore.persist.rehydrate();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen bg-[#F8FAFC]" aria-busy="true" aria-label="Memuat Breakfree Coffee SI">
        <div className="hidden w-[256px] border-r border-[#E2E8F0] bg-white p-5 lg:block">
          <div className="h-9 w-40 rounded-lg bg-[#F1F5F9]" />
          <div className="mt-6 flex flex-col gap-2">
            <div className="h-10 rounded-lg bg-[#EFF6FF]" />
            <div className="h-10 rounded-lg bg-[#F1F5F9]" />
            <div className="h-10 rounded-lg bg-[#F1F5F9]" />
          </div>
        </div>
        <div className="flex-1 p-7">
          <div className="flex items-center gap-3">
            <div className="h-8 w-56 rounded-lg bg-[#E2E8F0]" />
            <span className="text-xs font-medium text-[#64748B]">Memuat workspace Breakfree Coffee SI...</span>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="h-28 rounded-xl border border-[#E2E8F0] bg-white md:col-span-2" />
            <div className="h-28 rounded-xl border border-[#E2E8F0] bg-white" />
            <div className="h-28 rounded-xl border border-[#E2E8F0] bg-white" />
          </div>
        </div>
      </div>
    );
  }

  return <ToastProvider>{children}</ToastProvider>;
}
