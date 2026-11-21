'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Upload } from 'lucide-react';
import { useBreakfreeStore } from '@/lib/store/useBreakfreeStore';
import { BreakfreeBackupSchema } from '@/lib/schema/backup';
import { Badge, Button } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/ToastProvider';

export default function SetupPage() {
  const router = useRouter();
  const initMasterBreakfree = useBreakfreeStore((s) => s.initMasterBreakfree);
  const initKosong = useBreakfreeStore((s) => s.initKosong);
  const importBackup = useBreakfreeStore((s) => s.importBackup);
  const { pushToast } = useToast();

  const [mode, setMode] = useState<'master' | 'kosong'>('master');
  const [withInitialStock, setWithInitialStock] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleStart = () => {
    if (mode === 'master') {
      initMasterBreakfree(withInitialStock);
      pushToast('Master data Breakfree Coffee dimuat (0 transaksi dummy)', 'success');
    } else {
      initKosong();
      pushToast('Workspace kosong siap diisi master data manual', 'info');
    }
    router.push('/dashboard');
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const result = BreakfreeBackupSchema.safeParse(parsed);
      if (!result.success) {
        pushToast('Format JSON tidak valid sesuai skema breakfree-si:v1', 'danger');
        return;
      }
      importBackup(result.data as Parameters<typeof importBackup>[0]);
      pushToast('Data cadangan JSON berhasil dipulihkan', 'success');
      router.push('/dashboard');
    } catch {
      pushToast('Gagal membaca file JSON', 'danger');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 bg-[#F8FAFC] lg:grid-cols-12">
      {/* Left 50% Visual Outlet Showcase */}
      <div className="flex flex-col justify-between gap-6 border-b border-[#E2E8F0] bg-white p-6 lg:col-span-6 lg:border-b-0 lg:border-r lg:p-10">
        <div className="flex items-center gap-3">
          <img
            src="/images/breakfree-logo.png"
            alt="Logo Breakfree Coffee"
            width={44}
            height={44}
            className="h-11 w-11 rounded-xl border border-[#E2E8F0] object-cover"
          />
          <div>
            <div className="text-sm font-bold tracking-tight text-[#0F172A]">
              Breakfree Coffee SI
            </div>
            <div className="text-xs text-[#64748B]">
              Jalan Sunan Pandanaran No. 4, Lowokwaru, Malang
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <img
              src="/images/breakfree-outlet.jpg"
              alt="Suasana outlet Breakfree Coffee Malang"
              width={960}
              height={540}
              fetchPriority="high"
              className="aspect-[16/9] w-full object-cover"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
            <span className="text-[13px] font-bold text-[#0F172A]">
              11 Karyawan Aktif · 5 Role Operasional
            </span>
            <span className="tabular-mono text-xs font-bold text-[#2563EB]">
              POS: Pawoon (Cash &amp; QRIS) · Retur BOP H+1
            </span>
          </div>
        </div>

        <p className="text-xs leading-relaxed text-[#64748B]">
          Penyimpanan lokal browser (
          <code className="tabular-mono font-semibold text-[#0F172A]">
            localStorage breakfree-si:v1
          </code>
          ) · Tanpa server atau login · Seluruh input tersimpan nyata di perangkat ini.
        </p>
      </div>

      {/* Right 50% Setup Action Column */}
      <main className="flex flex-col justify-center gap-6 px-6 py-10 lg:col-span-6 lg:px-14">
        <div className="flex flex-col items-start gap-2.5">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-[#0F172A] sm:text-[28px]">
            Siapkan Sistem Operasional Breakfree Coffee
          </h1>
          <p className="max-w-[58ch] text-sm leading-relaxed text-[#64748B]">
            Workspace lokal siap diinisialisasi tanpa data transaksi palsu. Pilih cara memulai master
            data (bahan baku, menu, resep, shift, dan pegawai) untuk mulai mencatat operasional
            harian:
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {/* Choice 1: Master Data Breakfree */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setMode('master')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setMode('master');
              }
            }}
            className={`rounded-xl border-2 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition focus-visible:outline-2 focus-visible:outline-[#2563EB] ${
              mode === 'master'
                ? 'border-[#2563EB] bg-[#EFF6FF]/30'
                : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[15px] font-semibold text-[#0F172A]">
                Isi Master Data Awal Breakfree Coffee
              </span>
              <Badge tone="primary" dot={false}>
                Direkomendasikan
              </Badge>
            </div>
            <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-[#64748B]">
              Memuat 10 bahan baku (internal &amp; eksternal), 7 menu + resep standar, 4 supplier
              Malang, 3 shift (08:00-16:00, 16:00-24:00, 18:00-02:00), dan 11 posisi pegawai yang
              bisa langsung diedit.
            </p>

            <label
              onClick={(e) => e.stopPropagation()}
              className="mt-3 flex cursor-pointer items-center gap-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-xs font-medium text-[#334155]"
            >
              <input
                type="checkbox"
                checked={withInitialStock}
                onChange={(e) => setWithInitialStock(e.target.checked)}
                className="h-4 w-4 rounded accent-[#2563EB]"
              />
              <span>
                Isi saldo stok awal master (atau hapus centang untuk mulai stok 0 dan input saat
                Opening Shift)
              </span>
            </label>
          </div>

          {/* Choice 2: Blank */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setMode('kosong')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setMode('kosong');
              }
            }}
            className={`rounded-xl border-2 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition focus-visible:outline-2 focus-visible:outline-[#2563EB] ${
              mode === 'kosong'
                ? 'border-[#2563EB] bg-[#EFF6FF]/30'
                : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
            }`}
          >
            <span className="text-[15px] font-semibold text-[#0F172A]">Mulai dari Kosong</span>
            <p className="mt-1 text-[13px] leading-relaxed text-[#64748B]">
              Buka workspace kosong (hanya 3 jadwal shift standar) dan input master bahan, supplier,
              menu, dan pegawai secara manual dari nol.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleStart} size="lg" className="flex-1">
            <Check className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            {mode === 'master'
              ? 'Muat Master Data & Buka Dashboard'
              : 'Buka Workspace Kosong'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleImportFile}
            className="hidden"
          />
          <Button
            variant="secondary"
            size="lg"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            Import JSON Cadangan
          </Button>
        </div>
      </main>
    </div>
  );
}
