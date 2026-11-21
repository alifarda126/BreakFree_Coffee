'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, CreditCard, Wallet } from 'lucide-react';
import { useBreakfreeStore } from '@/lib/store/useBreakfreeStore';
import {
  detectActiveShiftId,
  formatRp,
  formatWaktu,
  todayISO,
} from '@/lib/domain/calculations';
import { AppShell } from '@/components/layout/AppShell';
import { Badge, Button, Card, KpiCard } from '@/components/ui/primitives';

export default function KasirDashboardPage() {
  const rekapOmzet = useBreakfreeStore((s) => s.rekapOmzet);
  const laporanKosong = useBreakfreeStore((s) => s.laporanKosong);
  const shifts = useBreakfreeStore((s) => s.shifts);
  const bahan = useBreakfreeStore((s) => s.bahan);
  const pegawai = useBreakfreeStore((s) => s.pegawai);

  const today = todayISO();
  const activeShiftId = detectActiveShiftId(shifts);
  const activeShift = shifts.find((s) => s.id === activeShiftId);

  const todayRekap = rekapOmzet.filter((r) => r.tanggal === today);
  const totalHariIni = todayRekap.reduce((a, r) => a + r.cash + r.qris, 0);
  const totalCash = todayRekap.reduce((a, r) => a + r.cash, 0);
  const totalQris = todayRekap.reduce((a, r) => a + r.qris, 0);
  const cashPct = totalHariIni > 0 ? Math.round((totalCash / totalHariIni) * 100) : 0;
  const qrisPct = totalHariIni > 0 ? 100 - cashPct : 0;

  const shiftRekap = todayRekap.find((r) => r.shiftId === activeShiftId);
  const activeKosong = laporanKosong.filter(
    (l) => l.status === 'aktif' || l.status === 'dikonfirmasi'
  );

  return (
    <AppShell pageTitle="Dashboard Kasir">
      {/* Asymmetric KPI Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          className="sm:col-span-2"
          hero
          label="Total Omzet Tervalidasi Hari Ini"
          value={formatRp(totalHariIni)}
          subtext={`${todayRekap.length} shift tercatat hari ini · Sumber POS Pawoon`}
          icon={<Wallet className="h-[18px] w-[18px]" strokeWidth={1.75} />}
          iconTone="primary"
        />
        <KpiCard
          label="Cash vs QRIS Hari Ini"
          value={totalHariIni > 0 ? `${cashPct} / ${qrisPct}%` : '0 / 0%'}
          subtext={`Cash ${formatRp(totalCash)} · QRIS ${formatRp(totalQris)}`}
          icon={<CreditCard className="h-[18px] w-[18px]" strokeWidth={1.75} />}
          iconTone="primary"
        />
        <KpiCard
          label={`Status ${activeShift?.nama ?? 'Shift Aktif'}`}
          value={
            shiftRekap
              ? shiftRekap.status === 'terkirim' || shiftRekap.status === 'revisi'
                ? 'Terkirim'
                : shiftRekap.status === 'perlu_cek'
                  ? 'Perlu Cek'
                  : 'Draft'
              : 'Belum Input'
          }
          subtext={shiftRekap ? `Versi v${shiftRekap.versi}` : 'Segera input saat closing'}
          tone={
            shiftRekap?.status === 'terkirim' || shiftRekap?.status === 'revisi'
              ? 'success'
              : shiftRekap?.status === 'perlu_cek'
                ? 'danger'
                : 'warning'
          }
          icon={<CheckCircle2 className="h-[18px] w-[18px]" strokeWidth={1.75} />}
        />
        <KpiCard
          label="Menu Kosong Aktif"
          value={`${activeKosong.length} Bahan`}
          subtext={
            activeKosong.length > 0
              ? 'Perlu konfirmasi & info pelanggan'
              : 'Seluruh menu tersedia'
          }
          tone={activeKosong.length > 0 ? 'danger' : 'success'}
          icon={<AlertTriangle className="h-[18px] w-[18px]" strokeWidth={1.75} />}
        />
      </div>

      {/* 8 / 4 Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="flex flex-col gap-4 lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[16px] font-semibold text-[#0F172A]">
                Checklist {activeShift?.nama ?? 'Shift Aktif'} ({activeShift?.jamMulai ?? ''}-
                {activeShift?.jamSelesai ?? ''})
              </h2>
              <p className="text-xs text-[#64748B]">
                Pastikan seluruh transaksi POS Pawoon direkap sebelum closing outlet
              </p>
            </div>
            <Link href="/kasir/omzet">
              <Button>
                <Wallet className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                Buka Form Rekap Omzet
              </Button>
            </Link>
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
              <div>
                <div className="text-[13px] font-semibold text-[#0F172A]">
                  1. Cek pemberitahuan Menu Kosong dari Kitchen/Barista
                </div>
                <div className="text-xs text-[#64748B]">
                  {activeKosong.length > 0
                    ? `${activeKosong.length} laporan bahan habis menunggu penyampaian ke pelanggan`
                    : 'Tidak ada laporan bahan habis saat ini'}
                </div>
              </div>
              <Badge tone={activeKosong.length > 0 ? 'danger' : 'success'}>
                {activeKosong.length > 0 ? 'Perlu Aksi' : 'Aman'}
              </Badge>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
              <div>
                <div className="text-[13px] font-semibold text-[#0F172A]">
                  2. Hitung uang laci Cash &amp; settlement mesin QRIS
                </div>
                <div className="text-xs text-[#64748B]">
                  Masukkan nominal cash fisik &amp; rekap transaksi QRIS dari EDC/QRIS
                </div>
              </div>
              <Badge tone={shiftRekap ? 'success' : 'warning'}>
                {shiftRekap ? 'Sudah Diisi' : 'Siap Input'}
              </Badge>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
              <div>
                <div className="text-[13px] font-semibold text-[#0F172A]">
                  3. Cocokkan total terhadap laporan shift POS Pawoon
                </div>
                <div className="text-xs text-[#64748B]">
                  Selisih wajib Rp 0 (atau isi keterangan selisih) sebelum dikirim ke Manajemen
                </div>
              </div>
              <Badge
                tone={
                  shiftRekap?.status === 'terkirim' || shiftRekap?.status === 'revisi'
                    ? 'success'
                    : 'info'
                }
              >
                {shiftRekap?.status === 'terkirim' ? 'Terkirim' : 'Validasi POS'}
              </Badge>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col gap-3 border-[#FECACA] lg:col-span-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-[#B91C1C]">Peringatan Menu Kosong</h2>
            <Badge tone={activeKosong.length > 0 ? 'danger' : 'success'}>
              {activeKosong.length} Aktif
            </Badge>
          </div>

          {activeKosong.length === 0 ? (
            <p className="rounded-xl bg-[#F8FAFC] p-4 text-center text-xs text-[#64748B]">
              Semua bahan baku di Barista &amp; Kitchen tersedia.
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {activeKosong.map((lk) => {
                const b = bahan.find((x) => x.id === lk.bahanId);
                const pelapor = pegawai.find((p) => p.id === lk.pelaporId);
                return (
                  <div key={lk.id} className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3.5">
                    <div className="text-[13px] font-semibold text-[#0F172A]">
                      {b?.nama ?? 'Bahan'} ({lk.divisi})
                    </div>
                    <div className="mt-1 text-xs text-[#334155]">
                      Terdampak:{' '}
                      {lk.menuTerdampak.length > 0
                        ? lk.menuTerdampak.join(', ')
                        : 'Cek ketersediaan manual'}
                    </div>
                    <div className="mt-1 text-[11px] text-[#64748B]">
                      Dilaporkan {pelapor?.nama ?? lk.divisi} · {formatWaktu(lk.createdAt)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Link href="/kasir/kosong" className="mt-auto">
            <Button
              variant={activeKosong.length > 0 ? 'dangerSolid' : 'secondary'}
              className="w-full"
            >
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              Kelola Status Menu Kosong
            </Button>
          </Link>
        </Card>
      </div>
    </AppShell>
  );
}
