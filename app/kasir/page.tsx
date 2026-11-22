'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle2, CreditCard, History, Wallet } from 'lucide-react';
import { useBreakfreeStore } from '@/lib/store/useBreakfreeStore';
import {
  detectActiveShiftId,
  formatRp,
  formatTanggal,
  todayISO,
} from '@/lib/domain/calculations';
import { AppShell } from '@/components/layout/AppShell';
import { Badge, Button, Card, KpiCard } from '@/components/ui/primitives';

export default function KasirDashboardPage() {
  const rekapOmzet = useBreakfreeStore((s) => s.rekapOmzet);
  const shifts = useBreakfreeStore((s) => s.shifts);

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

  return (
    <AppShell pageTitle="Dashboard Kasir">
      {/* Focused 3-Card KPI Row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <KpiCard
          className="md:col-span-2"
          hero
          label="Total Omzet Tervalidasi Hari Ini"
          value={formatRp(totalHariIni)}
          subtext={`${todayRekap.length} shift tercatat hari ini · Sumber POS Pawoon`}
          icon={<Wallet className="h-[18px] w-[18px]" strokeWidth={1.75} />}
          iconTone="primary"
        />
        <KpiCard
          label="Proporsi Cash vs QRIS"
          value={totalHariIni > 0 ? `${cashPct}% / ${qrisPct}%` : '0% / 0%'}
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
          subtext={shiftRekap ? `Versi v${shiftRekap.versi}` : 'Input saat closing shift'}
          tone={
            shiftRekap?.status === 'terkirim' || shiftRekap?.status === 'revisi'
              ? 'success'
              : shiftRekap?.status === 'perlu_cek'
                ? 'danger'
                : 'warning'
          }
          icon={<CheckCircle2 className="h-[18px] w-[18px]" strokeWidth={1.75} />}
        />
      </div>

      {/* Main 8 / 4 Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="flex flex-col gap-4 lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[17px] font-semibold text-[#111111]">
                Alur Closing {activeShift?.nama ?? 'Shift Aktif'} ({activeShift?.jamMulai ?? ''}-
                {activeShift?.jamSelesai ?? ''})
              </h2>
              <p className="mt-0.5 text-[13px] font-normal text-[#737373]">
                Transaksi pelanggan dicatat di POS Pawoon, lalu rekapitulasi shift divalidasi di sini.
              </p>
            </div>
            <Link href="/kasir/omzet">
              <Button>
                <Wallet className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                Input Rekap Omzet
              </Button>
            </Link>
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] p-3.5">
              <div>
                <div className="text-[13.5px] font-medium text-[#111111]">
                  1. Hitung total uang tunai (Cash) &amp; settlement QRIS
                </div>
                <div className="text-[12px] font-normal text-[#737373]">
                  Siapkan angka rekapitulasi akhir shift dari laci kasir dan mesin QRIS.
                </div>
              </div>
              <Badge tone={shiftRekap ? 'success' : 'warning'}>
                {shiftRekap ? 'Sudah Diisi' : 'Siap Input'}
              </Badge>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] p-3.5">
              <div>
                <div className="text-[13.5px] font-medium text-[#111111]">
                  2. Validasi terhadap total omzet POS Pawoon
                </div>
                <div className="text-[12px] font-normal text-[#737373]">
                  Pastikan selisih Rp 0 (atau sertakan keterangan bila ada selisih).
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

        <Card className="flex flex-col gap-3 lg:col-span-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-[#111111]">Rekap Omzet Terakhir</h2>
            <Link href="/kasir/riwayat">
              <Button variant="ghost" size="sm">
                <History className="h-3.5 w-3.5" aria-hidden="true" />
                Semua
              </Button>
            </Link>
          </div>

          {rekapOmzet.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#E5E5E5] bg-[#FAFAFA] p-5 text-center text-[12px] font-normal text-[#737373]">
              Belum ada rekap omzet tersimpan.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-[#E5E5E5]">
              {rekapOmzet.slice(0, 4).map((r) => {
                const sh = shifts.find((s) => s.id === r.shiftId);
                return (
                  <div key={r.id} className="flex items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-medium text-[#111111]">
                        {formatTanggal(r.tanggal)} · {sh?.nama ?? r.shiftId}
                      </div>
                      <div className="text-[12px] font-normal text-[#737373]">
                        {r.jumlahTransaksi} transaksi
                      </div>
                    </div>
                    <span className="tabular-mono shrink-0 text-[13px] font-semibold text-[#111111]">
                      {formatRp(r.cash + r.qris)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
