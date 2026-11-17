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
      <div className="flex min-h-screen bg-[#FAF8F5]">
        <div className="hidden w-[240px] border-r border-[#E6E0D8] bg-[#F3EFE9] p-5 lg:block">
          <div className="h-9 w-36 animate-pulse rounded-[10px] bg-[#E6E0D8]" />
          <div className="mt-6 flex flex-col gap-2">
            <div className="h-10 animate-pulse rounded-[10px] bg-[#E6E0D8]" />
            <div className="h-10 animate-pulse rounded-[10px] bg-[#E6E0D8]/70" />
            <div className="h-10 animate-pulse rounded-[10px] bg-[#E6E0D8]/70" />
          </div>
        </div>
        <div className="flex-1 p-7">
          <div className="h-12 w-64 animate-pulse rounded-[10px] bg-[#E6E0D8]" />
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="h-28 animate-pulse rounded-[14px] bg-white md:col-span-2" />
            <div className="h-28 animate-pulse rounded-[14px] bg-white" />
            <div className="h-28 animate-pulse rounded-[14px] bg-white" />
          </div>
        </div>
      </div>
    );
  }

  return <ToastProvider>{children}</ToastProvider>;
}
