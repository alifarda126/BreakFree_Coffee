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
    <div className="grid min-h-screen grid-cols-1 bg-[#FAF8F5] lg:grid-cols-12">
      {/* Left 55% Visual Outlet Showcase */}
      <div className="flex flex-col justify-between gap-6 border-b border-[#E6E0D8] bg-[#F3EFE9] p-6 lg:col-span-6 lg:border-b-0 lg:border-r lg:p-9">
        <div className="flex items-center gap-3">
          <img
            src="/images/breakfree-logo.png"
            alt="Logo Breakfree Coffee"
            className="h-11 w-11 rounded-full object-cover"
          />
          <div>
            <div className="text-sm font-bold tracking-wider text-[#221C17]">BREAKFREE COFFEE</div>
            <div className="text-xs text-[#8A7F73]">
              Jalan Sunan Pandanaran No. 4, Lowokwaru, Malang
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="overflow-hidden rounded-[14px] border border-[#E6E0D8] bg-white">
            <img
              src="/images/breakfree-outlet.jpg"
              alt="Suasana outlet Breakfree Coffee Malang"
              className="aspect-[16/9] w-full object-cover"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-[#E6E0D8] bg-white px-4 py-3">
            <span className="text-[13px] font-semibold text-[#221C17]">
              12 Karyawan Aktif · 6 Role Operasional
            </span>
            <span className="tabular-mono text-xs font-semibold text-[#9C5B2E]">
              POS: Pawoon (Cash &amp; QRIS) · Retur BOP H+1
            </span>
          </div>
        </div>

        <p className="text-xs leading-relaxed text-[#8A7F73]">
          Penyimpanan lokal browser (<code className="tabular-mono font-semibold">localStorage breakfree-si:v1</code>)
          · Tanpa server atau login · Seluruh input tersimpan nyata di perangkat ini.
        </p>
      </div>

      {/* Right 45% Setup Action Column */}
      <div className="flex flex-col justify-center gap-6 px-6 py-10 lg:col-span-6 lg:px-14">
        <div className="flex flex-col items-start gap-2.5">
          <Badge tone="info">Workspace Lokal Siap Diinisialisasi</Badge>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-[#221C17]">
            Siapkan Sistem Operasional Breakfree Coffee
          </h1>
          <p className="max-w-[60ch] text-sm leading-relaxed text-[#3D342C]">
            Tidak ada data transaksi palsu. Pilih cara memulai master data (bahan baku, menu, resep,
            shift, dan pegawai) untuk mulai mencatat operasional harian:
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {/* Choice 1: Master Data Breakfree */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setMode('master')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setMode('master');
            }}
            className={`cursor-pointer rounded-[14px] border-2 bg-white p-5 transition ${
              mode === 'master'
                ? 'border-[#9C5B2E]'
                : 'border-[#E6E0D8] hover:border-[#D4CBBF]'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-base font-bold text-[#221C17]">
                Isi Master Data Awal Breakfree Coffee
              </span>
              <Badge tone="primary" dot={false}>
                Direkomendasikan
              </Badge>
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#8A7F73]">
              Memuat 10 bahan baku (internal &amp; eksternal), 7 menu + resep standar, 4 supplier
              Malang, 3 shift (08:00–16:00, 16:00–24:00, 18:00–02:00), dan 12 posisi pegawai yang
              bisa langsung diedit.
            </p>

            <label
              onClick={(e) => e.stopPropagation()}
              className="mt-3 flex cursor-pointer items-center gap-2 rounded-[10px] bg-[#FAF8F5] px-3 py-2 text-xs font-semibold text-[#3D342C]"
            >
              <input
                type="checkbox"
                checked={withInitialStock}
                onChange={(e) => setWithInitialStock(e.target.checked)}
                className="h-4 w-4 accent-[#9C5B2E]"
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
              if (e.key === 'Enter' || e.key === ' ') setMode('kosong');
            }}
            className={`cursor-pointer rounded-[14px] border-2 bg-white p-5 transition ${
              mode === 'kosong'
                ? 'border-[#9C5B2E]'
                : 'border-[#E6E0D8] hover:border-[#D4CBBF]'
            }`}
          >
            <span className="text-base font-bold text-[#221C17]">Mulai dari Kosong</span>
            <p className="mt-1 text-[13px] leading-relaxed text-[#8A7F73]">
              Buka workspace kosong (hanya 3 jadwal shift standar) dan input master bahan, supplier,
              menu, dan pegawai secara manual dari nol.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleStart} size="lg" className="flex-1">
            <Check className="h-4 w-4" strokeWidth={2} />
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
            <Upload className="h-4 w-4" strokeWidth={1.75} />
            Import JSON Cadangan
          </Button>
        </div>
      </div>
    </div>
  );
}
