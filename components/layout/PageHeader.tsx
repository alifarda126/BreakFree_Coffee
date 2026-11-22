'use client';

import React from 'react';
import { CalendarDays } from 'lucide-react';

export function PageHeader({
  title,
  subtitle,
  showCalendarIcon = true,
  actions,
  className = '',
}: {
  title: string;
  subtitle?: string;
  showCalendarIcon?: boolean;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex min-w-0 flex-1 items-center justify-between gap-4 ${className}`}>
      <div className="flex min-w-0 flex-col gap-1.5">
        <h1 className="truncate text-[20px] font-bold leading-[1.3] tracking-[-0.02em] text-[#111111] sm:text-[24px]">
          {title}
        </h1>
        {subtitle && (
          <div className="flex items-center gap-1.5 truncate text-[12.5px] font-normal leading-[1.5] text-[#737373] sm:text-[13px]">
            {showCalendarIcon && (
              <CalendarDays className="hidden h-3.5 w-3.5 shrink-0 text-[#737373] sm:inline" aria-hidden="true" />
            )}
            <span className="truncate">{subtitle}</span>
          </div>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
