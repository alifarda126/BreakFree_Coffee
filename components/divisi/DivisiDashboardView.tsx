'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, ClipboardCheck, PackageMinus, Trash2 } from 'lucide-react';
import { useBreakfreeStore } from '@/lib/store/useBreakfreeStore';
import {
  detectActiveShiftId,
  evaluasiStatusStok,
  formatQty,
  formatRp,
  hitungStokSaatIni,
  todayISO,
} from '@/lib/domain/calculations';
import { AppShell } from '@/components/layout/AppShell';
import { Badge, Button, Card, EmptyState, KpiCard, StockBar } from '@/components/ui/primitives';
import { LaporKosongModal } from '@/components/modals/LaporKosongModal';
import type { Divisi } from '@/lib/types';

export function DivisiDashboardView({ divisi }: { divisi: Divisi }) {
  const bahan = useBreakfreeStore((s) => s.bahan);
  const stockMovements = useBreakfreeStore((s) => s.stockMovements);
  const laporanStok = useBreakfreeStore((s) => s.laporanStok);
  const shifts = useBreakfreeStore((s) => s.shifts);

  const [kosongOpen, setKosongOpen] = useState(false);

  const divTitle = divisi === 'barista' ? 'Barista' : 'Kitchen';
  const basePath = `/${divisi}`;
  const today = todayISO();
  const activeShiftId = detectActiveShiftId(shifts);

  const divBahan = useMemo(
    () => bahan.filter((b) => b.divisi === divisi || b.divisi === 'bersama'),
    [bahan, divisi]
  );

  const rows = useMemo(() => {
    return divBahan.map((b) => {
      const cur = hitungStokSaatIni(b.id, stockMovements);
      const st = evaluasiStatusStok(cur, b.stokMinimum);
      return { b, cur, st };
    });
  }, [divBahan, stockMovements]);

  const kritisRows = rows.filter((r) => r.st === 'kritis' || r.st === 'habis');
  const menipisRows = rows.filter((r) => r.st === 'menipis');

  const todayReports = laporanStok.filter(
    (l) => l.tanggal === today && l.divisi === divisi && l.status !== 'draft'
  );
  const openingDone = todayReports.some((l) => l.sesi === 'opening');
  const closingDone = todayReports.some((l) => l.sesi === 'closing');

  const wasteHariIni = todayReports.reduce(
    (acc, lap) => acc + lap.waste.reduce((wAcc, w) => wAcc + w.nilai, 0),
    0
  );

  return (
    <AppShell pageTitle={`Dashboard & Stok Divisi ${divTitle}`}>
      {/* Asymmetric KPI Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          className="sm:col-span-2"
          hero
          label={`Status Shift ${divTitle} (${shifts.find((s) => s.id === activeShiftId)?.nama ?? 'Aktif'})`}
          value={
            closingDone
              ? 'Closing Terkirim'
              : openingDone
                ? 'Opening Selesai'
                : 'Belum Opening'
          }
          subtext={
            closingDone
              ? 'Opening dan closing shift ini sudah tercatat & divalidasi'
              : 'Lakukan opname stok fisik & pencatatan spoil/waste sebelum ganti shift'
          }
          tone={closingDone ? 'success' : openingDone ? 'primary' : 'warning'}
          icon={<CheckCircle2 className="h-[18px] w-[18px]" strokeWidth={1.75} />}
        />
        <KpiCard
          label="Bahan Kritis / Habis"
          value={`${kritisRows.length} Bahan`}
          subtext={kritisRows[0]?.b.nama ?? 'Tidak ada stok kritis'}
          tone={kritisRows.length > 0 ? 'danger' : 'success'}
          icon={<AlertTriangle className="h-[18px] w-[18px]" strokeWidth={1.75} />}
        />
        <KpiCard
          label="Bahan Menipis"
          value={`${menipisRows.length} Bahan`}
          subtext={menipisRows[0]?.b.nama ?? 'Persediaan aman'}
          tone={menipisRows.length > 0 ? 'warning' : 'success'}
          icon={<PackageMinus className="h-[18px] w-[18px]" strokeWidth={1.75} />}
        />
        <KpiCard
          label="Total Waste Hari Ini"
          value={formatRp(wasteHariIni)}
          subtext={`${todayReports.reduce((a, l) => a + l.waste.length, 0)} item tidak layak`}
          tone={wasteHariIni > 0 ? 'danger' : 'neutral'}
          icon={<Trash2 className="h-[18px] w-[18px]" strokeWidth={1.75} />}
        />
      </div>

      {/* Main Stock Table */}
      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-semibold text-[#0F172A]">
              Daftar Stok Aktif Divisi {divTitle} (
              {divisi === 'barista' ? 'Minuman Panas & Dingin' : 'Makanan & Camilan'})
            </h2>
            <p className="text-xs text-[#64748B]">
              Cek ketersediaan bahan saat membaca struk POS Pawoon. Stok dihitung dari ledger keluar-masuk.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button variant="danger" onClick={() => setKosongOpen(true)}>
              <AlertTriangle className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              Lapor Bahan Kosong
            </Button>
            <Link href={`${basePath}/rekap`}>
              <Button>
                <ClipboardCheck className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                Mulai Rekap Stok Shift
              </Button>
            </Link>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title={`Belum ada master bahan untuk divisi ${divTitle}`}
            description="Tambahkan bahan baku di halaman Master Bahan atau muat master awal dari Setup."
            action={
              <Link href="/master">
                <Button size="sm">Kelola Master Bahan</Button>
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  <th className="rounded-l-lg px-3 py-2.5">Nama Bahan</th>
                  <th className="px-3 py-2.5">Sumber</th>
                  <th className="px-3 py-2.5 text-right">Stok Saat Ini</th>
                  <th className="px-3 py-2.5 text-right">Stok Min</th>
                  <th className="rounded-r-lg px-3 py-2.5">Indikator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {rows.map(({ b, cur, st }) => {
                  const label =
                    st === 'habis'
                      ? 'Habis'
                      : st === 'kritis'
                        ? 'Kritis'
                        : st === 'menipis'
                          ? 'Menipis'
                          : 'Aman';
                  const clr =
                    st === 'habis' || st === 'kritis'
                      ? 'text-[#DC2626]'
                      : st === 'menipis'
                        ? 'text-[#B45309]'
                        : 'text-[#15803D]';
                  return (
                    <tr key={b.id} className="transition-colors hover:bg-[#F8FAFC]">
                      <td className="px-3 py-3">
                        <div className="font-semibold text-[#0F172A]">{b.nama}</div>
                        <div className="text-[11px] text-[#64748B]">{b.kategori}</div>
                      </td>
                      <td className="px-3 py-3">
                        <Badge tone={b.sumber === 'internal' ? 'primary' : 'neutral'} dot={false}>
                          {b.sumber === 'internal' ? 'Internal' : 'Eksternal'}
                        </Badge>
                      </td>
                      <td className={`tabular-mono px-3 py-3 text-right font-semibold ${clr}`}>
                        {formatQty(cur, b.satuan)}
                      </td>
                      <td className="tabular-mono px-3 py-3 text-right text-[#64748B]">
                        {formatQty(b.stokMinimum, b.satuan)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <StockBar current={cur} min={b.stokMinimum} status={st} />
                          <span className={`text-xs font-semibold ${clr}`}>{label}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <LaporKosongModal open={kosongOpen} onClose={() => setKosongOpen(false)} divisi={divisi} />
    </AppShell>
  );
}
