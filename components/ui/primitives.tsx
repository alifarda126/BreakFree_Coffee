'use client';

import React from 'react';
import { Minus, Plus, X, ClipboardList } from 'lucide-react';
import type { StatusStokLevel } from '@/lib/domain/calculations';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'neutral';

const BADGE_CLASSES: Record<BadgeTone, string> = {
  success: 'bg-[#E6F1E8] text-[#3F7A4F]',
  warning: 'bg-[#FBF0DC] text-[#A86A12]',
  danger: 'bg-[#F8E3E0] text-[#B23A2E]',
  info: 'bg-[#E3EEF5] text-[#3B6C8F]',
  primary: 'bg-[#F4E8DD] text-[#9C5B2E]',
  neutral: 'bg-[#F3EFE9] text-[#8A7F73]',
};

const DOT_CLASSES: Record<BadgeTone, string> = {
  success: 'bg-[#3F7A4F]',
  warning: 'bg-[#A86A12]',
  danger: 'bg-[#B23A2E]',
  info: 'bg-[#3B6C8F]',
  primary: 'bg-[#9C5B2E]',
  neutral: 'bg-[#8A7F73]',
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
      className={`inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap ${BADGE_CLASSES[tone]} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${DOT_CLASSES[tone]}`} />}
      {children}
    </span>
  );
}

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'dangerSolid' | 'ghost';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-[#9C5B2E] text-white hover:bg-[#84491F] border border-transparent',
  secondary: 'bg-white text-[#3D342C] border border-[#E6E0D8] hover:bg-[#F3EFE9]',
  danger: 'bg-white text-[#B23A2E] border border-[#B23A2E] hover:bg-[#F8E3E0]',
  dangerSolid: 'bg-[#B23A2E] text-white hover:bg-[#922F25] border border-transparent',
  ghost: 'bg-[#F4E8DD] text-[#9C5B2E] border border-transparent hover:bg-[#ECD8C7]',
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
  const heightCls = size === 'sm' ? 'h-8 px-3 text-xs' : size === 'lg' ? 'h-11 px-4 text-sm' : 'h-10 px-4 text-[13px]';
  return (
    <button
      type={type}
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-[10px] font-semibold whitespace-nowrap transition-all duration-150 active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9C5B2E] ${heightCls} ${BUTTON_VARIANTS[variant]} ${className}`}
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
      className={`rounded-[14px] border border-[#E6E0D8] bg-white p-5 ${className}`}
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
  className = '',
}: {
  label: string;
  value: string;
  subtext?: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
  hero?: boolean;
  className?: string;
}) {
  const valColor =
    tone === 'danger'
      ? 'text-[#B23A2E]'
      : tone === 'warning'
        ? 'text-[#A86A12]'
        : tone === 'success'
          ? 'text-[#3F7A4F]'
          : 'text-[#221C17]';

  return (
    <div
      className={`flex flex-col gap-1.5 rounded-[14px] border bg-white p-5 ${
        hero ? 'border-[#D4CBBF]' : 'border-[#E6E0D8]'
      } ${className}`}
    >
      <span className="text-[13px] font-medium text-[#8A7F73]">{label}</span>
      <span
        className={`tabular-mono font-bold tracking-tight ${
          hero ? 'text-[28px] leading-[34px]' : 'text-[24px] leading-[30px]'
        } ${valColor}`}
      >
        {value}
      </span>
      {subtext && <span className="text-xs text-[#8A7F73]">{subtext}</span>}
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
  const pct = min > 0 ? Math.min(100, Math.max(8, Math.round((current / (min * 2)) * 100))) : current > 0 ? 100 : 8;
  const barColor =
    status === 'aman'
      ? 'bg-[#3F7A4F]'
      : status === 'menipis'
        ? 'bg-[#A86A12]'
        : status === 'kritis'
          ? 'bg-[#B23A2E]'
          : 'bg-[#D4CBBF]';

  return (
    <div className="h-[5px] w-24 overflow-hidden rounded-full bg-[#F3EFE9]">
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
        className={`flex shrink-0 items-center justify-center rounded-[6px] border border-[#E6E0D8] bg-[#F3EFE9] text-[#221C17] transition hover:border-[#D4CBBF] active:translate-y-[1px] ${btnCls}`}
      >
        <Minus className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      <div
        className={`flex items-center gap-1 rounded-[6px] border border-[#E6E0D8] bg-white px-2 focus-within:border-[#9C5B2E] ${inputH}`}
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
          className="tabular-mono w-14 bg-transparent text-right text-sm font-bold text-[#221C17] focus:outline-none"
        />
        <span className="tabular-mono text-xs text-[#8A7F73]">{unit}</span>
      </div>
      <button
        type="button"
        onClick={() => adjust(step)}
        aria-label={`Tambah ${ariaLabel ?? 'jumlah'}`}
        className={`flex shrink-0 items-center justify-center rounded-[6px] border border-[#E6E0D8] bg-[#F3EFE9] text-[#221C17] transition hover:border-[#D4CBBF] active:translate-y-[1px] ${btnCls}`}
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2} />
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
      <label htmlFor={id} className="text-[13px] font-semibold text-[#221C17]">
        {label}
      </label>
      <div
        className={`flex h-10 items-center justify-between gap-2 rounded-[10px] border bg-white px-3 transition focus-within:ring-2 focus-within:ring-[#9C5B2E]/25 ${
          error ? 'border-[#B23A2E]' : 'border-[#E6E0D8] focus-within:border-[#9C5B2E]'
        }`}
      >
        {prefix && <span className="tabular-mono text-[13px] font-semibold text-[#8A7F73]">{prefix}</span>}
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
          className="tabular-mono w-full bg-transparent text-right text-sm font-bold text-[#221C17] focus:outline-none"
        />
        {suffix && <span className="tabular-mono text-xs font-medium text-[#8A7F73]">{suffix}</span>}
      </div>
      {error ? (
        <span className="text-xs text-[#B23A2E]">{error}</span>
      ) : helper ? (
        <span className="text-xs text-[#8A7F73]">{helper}</span>
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
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#221C17]/35 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[540px] rounded-[14px] border border-[#D4CBBF] bg-white p-6 shadow-[0_24px_48px_-12px_rgba(61,52,44,0.28)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-[#221C17]">{title}</h2>
            {badgeEl}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#8A7F73] hover:bg-[#F3EFE9] hover:text-[#221C17]"
            aria-label="Tutup dialog"
          >
            <X className="h-4 w-4" />
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
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[14px] border border-dashed border-[#D4CBBF] bg-[#FBF9F6] px-6 py-10 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E6E0D8] bg-white text-[#8A7F73]">
        <ClipboardList className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <div className="max-w-md space-y-1">
        <p className="text-sm font-bold text-[#221C17]">{title}</p>
        <p className="text-xs leading-relaxed text-[#8A7F73]">{description}</p>
      </div>
      {action}
    </div>
  );
}
