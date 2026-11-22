'use client';

import React, { useMemo } from 'react';
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
import type { Divisi } from '@/lib/types';

export function DivisiDashboardView({ divisi }: { divisi: Divisi }) {
  const bahan = useBreakfreeStore((s) => s.bahan);
  const stockMovements = useBreakfreeStore((s) => s.stockMovements);
  const laporanStok = useBreakfreeStore((s) => s.laporanStok);
  const shifts = useBreakfreeStore((s) => s.shifts);

  const divTitle = divisi === 'barista' ? 'Barista' : 'Kitchen';
  const divDesc = divisi === 'barista' ? 'Minuman Panas & Dingin' : 'Makanan & Camilan';
  const basePath = `/${divisi}`;
  const today = todayISO();
  const activeShiftId = detectActiveShiftId(shifts);

  // Strict role-based material boundary: Barista only sees Barista, Kitchen only sees Kitchen
  const divBahan = useMemo(
    () => bahan.filter((b) => b.divisi === divisi),
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
    <AppShell pageTitle={`Dashboard ${divTitle}`}>
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
              : 'Lakukan opname awal/akhir shift & catat spoil/waste bahan'
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
            <h2 className="text-[17px] font-semibold text-[#111111]">
              Persediaan Bahan Baku {divTitle} ({divDesc})
            </h2>
            <p className="mt-0.5 text-[13px] font-normal text-[#737373]">
              Pantau stok saat ini terhadap stok minimum sebelum melakukan rekap opname shift.
            </p>
          </div>
          <Link href={`${basePath}/rekap`}>
            <Button>
              <ClipboardCheck className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              Rekap Stok &amp; Waste
            </Button>
          </Link>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title={`Belum ada bahan baku untuk divisi ${divTitle}`}
            description="Hubungi Logistik atau Manajemen untuk menambahkan master bahan baku divisi ini."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[12px] font-semibold uppercase text-[#737373]">
                  <th className="rounded-l-lg px-3 py-2.5">Nama Bahan</th>
                  <th className="px-3 py-2.5">Kategori</th>
                  <th className="px-3 py-2.5 text-right">Stok Saat Ini</th>
                  <th className="px-3 py-2.5 text-right">Stok Minimum</th>
                  <th className="rounded-r-lg px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
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
                    <tr key={b.id} className="transition-colors hover:bg-[#FAFAFA]">
                      <td className="px-3 py-3 font-normal text-[#111111]">{b.nama}</td>
                      <td className="px-3 py-3">
                        <Badge tone="neutral" dot={false}>
                          {b.kategori}
                        </Badge>
                      </td>
                      <td className={`tabular-mono px-3 py-3 text-right font-semibold ${clr}`}>
                        {formatQty(cur, b.satuan)}
                      </td>
                      <td className="tabular-mono px-3 py-3 text-right font-normal text-[#737373]">
                        {formatQty(b.stokMinimum, b.satuan)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <StockBar current={cur} min={b.stokMinimum} status={st} />
                          <span className={`text-[12px] font-medium ${clr}`}>{label}</span>
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
    </AppShell>
  );
}
