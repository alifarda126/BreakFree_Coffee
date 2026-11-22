'use client';

import React, { useEffect } from 'react';
import { Minus, Plus, X, ClipboardList } from 'lucide-react';
import type { StatusStokLevel } from '@/lib/domain/calculations';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'neutral';

const BADGE_CLASSES: Record<BadgeTone, string> = {
  success: 'text-[#15803D]',
  warning: 'text-[#B45309]',
  danger: 'text-[#DC2626]',
  info: 'text-[#111111]',
  primary: 'text-[#111111]',
  neutral: 'text-[#737373]',
};

export function Badge({
  children,
  tone = 'neutral',
  dot: _dot,
  className = '',
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
}) {
  void _dot;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 text-[12.5px] font-medium leading-[1.4] whitespace-nowrap ${BADGE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'dangerSolid' | 'ghost';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-[#111111] text-white font-semibold hover:bg-[#262626] border border-transparent',
  secondary: 'bg-white text-[#111111] font-medium border border-[#E5E5E5] hover:bg-[#F5F5F5] hover:border-[#D4D4D4]',
  danger: 'bg-white text-[#DC2626] font-medium border border-[#E5E5E5] hover:bg-[#FEF2F2] hover:border-[#FECACA]',
  dangerSolid: 'bg-[#DC2626] text-white font-semibold hover:bg-[#B91C1C] border border-transparent',
  ghost: 'bg-transparent text-[#525252] font-medium border border-transparent hover:bg-[#F5F5F5] hover:text-[#111111]',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
}) {
  const heightCls =
    size === 'sm'
      ? 'h-8 px-3 text-[13px]'
      : size === 'lg'
        ? 'h-11 px-4 text-[14px]'
        : 'h-9 px-3.5 text-[13px]';
  return (
    <button
      type={type}
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-lg whitespace-nowrap transition-colors duration-150 active:scale-[0.99] disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111111] ${heightCls} ${BUTTON_VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-[#E5E5E5] bg-white p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  subtext,
  tone = 'neutral',
  hero = false,
  icon,
  iconTone: _iconTone,
  className = '',
}: {
  label: string;
  value: string;
  subtext?: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'primary';
  hero?: boolean;
  icon?: React.ReactNode;
  iconTone?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  className?: string;
}) {
  void _iconTone;
  const valColor =
    tone === 'danger'
      ? 'text-[#DC2626]'
      : tone === 'success'
        ? 'text-[#15803D]'
        : 'text-[#111111]';

  return (
    <div
      className={`flex flex-col justify-between gap-3 rounded-lg border bg-white p-5 transition-colors ${
        hero ? 'border-[#D4D4D4]' : 'border-[#E5E5E5]'
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[13px] font-medium leading-[1.4] text-[#737373]">{label}</span>
        {icon && (
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#F5F5F5] text-[#111111]"
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <span
          className={`tabular-mono font-bold tracking-[-0.02em] ${
            hero ? 'text-[30px] leading-[1.2] sm:text-[32px]' : 'text-[26px] leading-[1.2] sm:text-[28px]'
          } ${valColor}`}
        >
          {value}
        </span>
        {subtext && (
          <span className="text-[12px] font-normal leading-[1.5] text-[#737373]">{subtext}</span>
        )}
      </div>
    </div>
  );
}

export function StockBar({
  current,
  min,
  status,
}: {
  current: number;
  min: number;
  status: StatusStokLevel;
}) {
  const pct =
    min > 0 ? Math.min(100, Math.max(8, Math.round((current / (min * 2)) * 100))) : current > 0 ? 100 : 8;
  const barColor =
    status === 'aman'
      ? 'bg-[#16A34A]'
      : status === 'menipis'
        ? 'bg-[#737373]'
        : status === 'kritis'
          ? 'bg-[#DC2626]'
          : 'bg-[#D4D4D4]';

  return (
    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#F5F5F5]">
      <div
        className={`h-full rounded-full transition-all duration-150 ${barColor}`}
        style={{ width: `${status === 'habis' ? 6 : pct}%` }}
      />
    </div>
  );
}

export function StepperQty({
  value,
  unit,
  step = 0.5,
  large = false,
  onChange,
  ariaLabel,
}: {
  value: number;
  unit: string;
  step?: number;
  large?: boolean;
  onChange: (next: number) => void;
  ariaLabel?: string;
}) {
  const btnCls = large ? 'h-11 w-11' : 'h-9 w-9';
  const inputH = large ? 'h-11' : 'h-9';
  const adjust = (delta: number) => {
    const next = Math.max(0, Math.round((value + delta) * 100) / 100);
    onChange(next);
  };

  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => adjust(-step)}
        aria-label={`Kurangi ${ariaLabel ?? 'jumlah'}`}
        className={`flex shrink-0 items-center justify-center rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] text-[#111111] transition hover:border-[#D4D4D4] hover:bg-[#F5F5F5] focus-visible:outline-2 focus-visible:outline-[#111111] ${btnCls}`}
      >
        <Minus className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
      </button>
      <div
        className={`flex items-center gap-1 rounded-lg border border-[#E5E5E5] bg-white px-2.5 transition focus-within:border-[#111111] focus-within:ring-2 focus-within:ring-[#111111]/10 ${inputH}`}
      >
        <input
          type="number"
          min={0}
          step="any"
          value={Number.isNaN(value) ? '' : value}
          onChange={(e) => {
            const parsed = Number.parseFloat(e.target.value);
            onChange(Number.isNaN(parsed) ? 0 : Math.max(0, parsed));
          }}
          aria-label={ariaLabel ?? 'Input stok fisik'}
          className="tabular-mono w-14 bg-transparent text-right text-[14px] font-normal text-[#111111] focus:outline-none"
        />
        <span className="tabular-mono text-[12px] font-normal text-[#737373]">{unit}</span>
      </div>
      <button
        type="button"
        onClick={() => adjust(step)}
        aria-label={`Tambah ${ariaLabel ?? 'jumlah'}`}
        className={`flex shrink-0 items-center justify-center rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] text-[#111111] transition hover:border-[#D4D4D4] hover:bg-[#F5F5F5] focus-visible:outline-2 focus-visible:outline-[#111111] ${btnCls}`}
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  );
}

export function CurrencyInput({
  label,
  value,
  onChange,
  helper,
  error,
  prefix = 'Rp',
  suffix,
  id,
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
  helper?: string;
  error?: string;
  prefix?: string | null;
  suffix?: string;
  id?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-[#111111]">
        {label}
      </label>
      <div
        className={`flex h-10 items-center justify-between gap-2 rounded-lg border bg-white px-3 transition focus-within:ring-2 focus-within:ring-[#111111]/10 ${
          error ? 'border-[#DC2626]' : 'border-[#E5E5E5] focus-within:border-[#111111]'
        }`}
      >
        {prefix && <span className="tabular-mono text-[13px] font-normal text-[#737373]">{prefix}</span>}
        <input
          id={id}
          type="number"
          min={0}
          step="any"
          value={value === 0 ? '' : value}
          placeholder="0"
          onChange={(e) => {
            const v = Number.parseFloat(e.target.value);
            onChange(Number.isNaN(v) ? 0 : Math.max(0, v));
          }}
          className="tabular-mono w-full bg-transparent text-right text-[14px] font-normal text-[#111111] focus:outline-none"
        />
        {suffix && <span className="tabular-mono text-[12px] font-normal text-[#737373]">{suffix}</span>}
      </div>
      {error ? (
        <span className="text-[12px] font-normal leading-[1.5] text-[#DC2626]">{error}</span>
      ) : helper ? (
        <span className="text-[12px] font-normal leading-[1.5] text-[#737373]">{helper}</span>
      ) : null}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  badgeEl,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  badgeEl?: React.ReactNode;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-[540px] overflow-y-auto rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-[0_20px_40px_-12px_rgba(17,17,17,0.2)]">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-[#E5E5E5] pb-3.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-[16px] font-semibold leading-[1.3] text-[#111111]">{title}</h2>
            {badgeEl}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#737373] transition hover:bg-[#F5F5F5] hover:text-[#111111] focus-visible:outline-2 focus-visible:outline-[#111111]"
            aria-label="Tutup dialog"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[#D4D4D4] bg-[#FAFAFA] px-6 py-10 text-center">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#E5E5E5] bg-white text-[#737373]"
        aria-hidden="true"
      >
        {icon ?? <ClipboardList className="h-5 w-5" strokeWidth={1.75} />}
      </div>
      <div className="max-w-md space-y-1">
        <p className="text-[14px] font-semibold leading-[1.4] text-[#111111]">{title}</p>
        <p className="text-[13px] font-normal leading-[1.5] text-[#737373]">{description}</p>
      </div>
      {action}
    </div>
  );
}
