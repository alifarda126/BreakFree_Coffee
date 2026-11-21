'use client';

import React, { useEffect } from 'react';
import { Minus, Plus, X, ClipboardList } from 'lucide-react';
import type { StatusStokLevel } from '@/lib/domain/calculations';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'neutral';

const BADGE_CLASSES: Record<BadgeTone, string> = {
  success: 'bg-[#F0FDF4] text-[#15803D] ring-1 ring-inset ring-[#BBF7D0]',
  warning: 'bg-[#FFFBEB] text-[#B45309] ring-1 ring-inset ring-[#FDE68A]',
  danger: 'bg-[#FEF2F2] text-[#B91C1C] ring-1 ring-inset ring-[#FECACA]',
  info: 'bg-[#EFF6FF] text-[#1E40AF] ring-1 ring-inset ring-[#BFDBFE]',
  primary: 'bg-[#EFF6FF] text-[#2563EB] ring-1 ring-inset ring-[#BFDBFE]',
  neutral: 'bg-[#F1F5F9] text-[#475569] ring-1 ring-inset ring-[#E2E8F0]',
};

const DOT_CLASSES: Record<BadgeTone, string> = {
  success: 'bg-[#16A34A]',
  warning: 'bg-[#F59E0B]',
  danger: 'bg-[#DC2626]',
  info: 'bg-[#2563EB]',
  primary: 'bg-[#2563EB]',
  neutral: 'bg-[#64748B]',
};

export function Badge({
  children,
  tone = 'info',
  dot = true,
  className = '',
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium whitespace-nowrap ${BADGE_CLASSES[tone]} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${DOT_CLASSES[tone]}`} aria-hidden="true" />}
      {children}
    </span>
  );
}

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'dangerSolid' | 'ghost';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-[#2563EB] text-white font-semibold hover:bg-[#1E40AF] border border-transparent shadow-[0_1px_2px_rgba(37,99,235,0.18)]',
  secondary: 'bg-white text-[#0F172A] font-medium border border-[#E2E8F0] hover:bg-[#F8FAFC] hover:border-[#CBD5E1]',
  danger: 'bg-white text-[#DC2626] font-medium border border-[#FECACA] hover:bg-[#FEF2F2] hover:border-[#FCA5A5]',
  dangerSolid: 'bg-[#DC2626] text-white font-semibold hover:bg-[#B91C1C] border border-transparent',
  ghost: 'bg-transparent text-[#475569] font-medium border border-transparent hover:bg-[#F1F5F9] hover:text-[#0F172A]',
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
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-lg whitespace-nowrap transition-colors duration-150 active:scale-[0.99] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] ${heightCls} ${BUTTON_VARIANTS[variant]} ${className}`}
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
      className={`rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}

const KPI_ICON_TONES = {
  primary: 'bg-[#EFF6FF] text-[#2563EB]',
  success: 'bg-[#F0FDF4] text-[#16A34A]',
  warning: 'bg-[#FFFBEB] text-[#D97706]',
  danger: 'bg-[#FEF2F2] text-[#DC2626]',
  neutral: 'bg-[#F1F5F9] text-[#475569]',
};

export function KpiCard({
  label,
  value,
  subtext,
  tone = 'neutral',
  hero = false,
  icon,
  iconTone,
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
  const valColor =
    tone === 'danger'
      ? 'text-[#DC2626]'
      : tone === 'warning'
        ? 'text-[#B45309]'
        : tone === 'success'
          ? 'text-[#15803D]'
          : tone === 'primary'
            ? 'text-[#2563EB]'
            : 'text-[#0F172A]';

  const resolvedIconTone = iconTone ?? (hero ? 'primary' : tone);

  return (
    <div
      className={`flex flex-col justify-between gap-3 rounded-xl border bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors ${
        hero ? 'border-[#BFDBFE] bg-gradient-to-b from-white to-[#F8FAFF]' : 'border-[#E2E8F0]'
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[13px] font-medium leading-[1.4] text-[#64748B]">{label}</span>
        {icon && (
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${KPI_ICON_TONES[resolvedIconTone]}`}
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <span
          className={`tabular-mono font-bold tracking-[-0.02em] ${
            hero ? 'text-[30px] leading-[1.2] sm:text-[32px]' : 'text-[28px] leading-[1.2]'
          } ${valColor}`}
        >
          {value}
        </span>
        {subtext && (
          <span className="text-[12px] font-normal leading-[1.5] text-[#64748B]">{subtext}</span>
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
        ? 'bg-[#F59E0B]'
        : status === 'kritis'
          ? 'bg-[#DC2626]'
          : 'bg-[#CBD5E1]';

  return (
    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#F1F5F9]">
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
        className={`flex shrink-0 items-center justify-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] transition hover:border-[#CBD5E1] hover:bg-[#F1F5F9] focus-visible:outline-2 focus-visible:outline-[#2563EB] ${btnCls}`}
      >
        <Minus className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
      </button>
      <div
        className={`flex items-center gap-1 rounded-lg border border-[#E2E8F0] bg-white px-2.5 transition focus-within:border-[#2563EB] focus-within:ring-2 focus-within:ring-[#2563EB]/15 ${inputH}`}
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
          className="tabular-mono w-14 bg-transparent text-right text-[14px] font-normal text-[#0F172A] focus:outline-none"
        />
        <span className="tabular-mono text-[12px] font-normal text-[#64748B]">{unit}</span>
      </div>
      <button
        type="button"
        onClick={() => adjust(step)}
        aria-label={`Tambah ${ariaLabel ?? 'jumlah'}`}
        className={`flex shrink-0 items-center justify-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] transition hover:border-[#CBD5E1] hover:bg-[#F1F5F9] focus-visible:outline-2 focus-visible:outline-[#2563EB] ${btnCls}`}
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
      <label htmlFor={id} className="text-[13px] font-medium text-[#0F172A]">
        {label}
      </label>
      <div
        className={`flex h-10 items-center justify-between gap-2 rounded-lg border bg-white px-3 transition focus-within:ring-2 focus-within:ring-[#2563EB]/20 ${
          error ? 'border-[#DC2626]' : 'border-[#E2E8F0] focus-within:border-[#2563EB]'
        }`}
      >
        {prefix && <span className="tabular-mono text-[13px] font-normal text-[#64748B]">{prefix}</span>}
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
          className="tabular-mono w-full bg-transparent text-right text-[14px] font-normal text-[#0F172A] focus:outline-none"
        />
        {suffix && <span className="tabular-mono text-[12px] font-normal text-[#64748B]">{suffix}</span>}
      </div>
      {error ? (
        <span className="text-[12px] font-normal leading-[1.5] text-[#DC2626]">{error}</span>
      ) : helper ? (
        <span className="text-[12px] font-normal leading-[1.5] text-[#64748B]">{helper}</span>
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-[540px] overflow-y-auto rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_24px_48px_-12px_rgba(15,23,42,0.22)]">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-[16px] font-semibold leading-[1.3] text-[#0F172A]">{title}</h2>
            {badgeEl}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] transition hover:bg-[#F1F5F9] hover:text-[#0F172A] focus-visible:outline-2 focus-visible:outline-[#2563EB]"
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
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-6 py-10 text-center">
      <div
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-[#64748B] shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
        aria-hidden="true"
      >
        {icon ?? <ClipboardList className="h-5 w-5" strokeWidth={1.75} />}
      </div>
      <div className="max-w-md space-y-1">
        <p className="text-[14px] font-semibold leading-[1.4] text-[#0F172A]">{title}</p>
        <p className="text-[13px] font-normal leading-[1.5] text-[#64748B]">{description}</p>
      </div>
      {action}
    </div>
  );
}
