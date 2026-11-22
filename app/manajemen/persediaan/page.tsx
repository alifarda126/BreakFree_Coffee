'use client';

import React, { useMemo, useState } from 'react';
import { AlertTriangle, Boxes, PackageX, Printer, Trash2 } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Badge, Button, Card, EmptyState, KpiCard, StockBar } from '@/components/ui/primitives';
import { useBreakfreeStore } from '@/lib/store/useBreakfreeStore';
import {
  addDaysISO,
  evaluasiStatusStok,
  formatQty,
  formatRp,
  hitungStokSaatIni,
  todayISO,
} from '@/lib/domain/calculations';

export default function LaporanPersediaanWastePage() {
  const bahan = useBreakfreeStore((s) => s.bahan);
  const stockMovements = useBreakfreeStore((s) => s.stockMovements);
  const laporanStok = useBreakfreeStore((s) => s.laporanStok);

  const [daysWindow, setDaysWindow] = useState<7 | 30>(7);
  const startDate = addDaysISO(todayISO(), -(daysWindow - 1));

  const stockRows = useMemo(() => {
    return bahan.map((b) => {
      const stok = hitungStokSaatIni(b.id, stockMovements);
      const status = evaluasiStatusStok(stok, b.stokMinimum);
      return { b, stok, status };
    });
  }, [bahan, stockMovements]);

  const kritisCount = stockRows.filter((x) => x.status === 'kritis' || x.status === 'habis').length;
  const menipisCount = stockRows.filter((x) => x.status === 'menipis').length;

  const wasteSummary = useMemo(() => {
    const map = new Map<string, { qty: number; nilai: number }>();
    let totalNilai = 0;
    let totalItems = 0;

    for (const lap of laporanStok) {
      if (lap.tanggal < startDate || lap.status === 'draft') continue;
      for (const w of lap.waste) {
        totalNilai += w.nilai;
        totalItems += 1;
        const prev = map.get(w.bahanId) ?? { qty: 0, nilai: 0 };
        map.set(w.bahanId, { qty: prev.qty + w.qty, nilai: prev.nilai + w.nilai });
      }
    }

    const top = Array.from(map.entries())
      .map(([id, val]) => ({ bahan: bahan.find((b) => b.id === id), ...val }))
      .filter((x) => x.bahan != null)
      .sort((a, b) => b.nilai - a.nilai);

    return { totalNilai, totalItems, top };
  }, [laporanStok, bahan, startDate]);

  return (
    <AppShell pageTitle="Laporan Persediaan & Waste">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-[#E5E5E5] bg-[#F5F5F5] p-1">
          {([7, 30] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDaysWindow(d)}
              className={`rounded-md px-3.5 py-1.5 text-[13px] transition-all ${
                daysWindow === d
                  ? 'bg-white font-semibold text-[#111111] shadow-[0_1px_2px_rgba(17,17,17,0.06)]'
                  : 'font-medium text-[#737373] hover:text-[#111111]'
              }`}
            >
              {d} Hari Terakhir
            </button>
          ))}
        </div>

        <Button variant="primary" size="sm" onClick={() => window.print()}>
          <Printer className="h-3.5 w-3.5" aria-hidden="true" />
          Cetak Laporan
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Jenis Bahan"
          value={`${bahan.length} Bahan`}
          subtext="Barista & Kitchen terintegrasi"
          icon={<Boxes className="h-[18px] w-[18px]" strokeWidth={1.75} />}
          iconTone="primary"
        />
        <KpiCard
          label="Stok Kritis / Habis"
          value={`${kritisCount} Bahan`}
          subtext={`${menipisCount} bahan dalam status menipis`}
          tone={kritisCount > 0 ? 'danger' : 'success'}
          icon={<AlertTriangle className="h-[18px] w-[18px]" strokeWidth={1.75} />}
        />
        <KpiCard
          label={`Total Nilai Waste (${daysWindow}H)`}
          value={formatRp(wasteSummary.totalNilai)}
          subtext={`${wasteSummary.totalItems} catatan spoil / waste`}
          tone={wasteSummary.totalNilai > 0 ? 'danger' : 'neutral'}
          icon={<Trash2 className="h-[18px] w-[18px]" strokeWidth={1.75} />}
        />
        <KpiCard
          label="Bahan Terdampak Waste"
          value={`${wasteSummary.top.length} Jenis`}
          subtext={`Dalam ${daysWindow} hari terakhir`}
          icon={<PackageX className="h-[18px] w-[18px]" strokeWidth={1.75} />}
          iconTone="neutral"
        />
      </div>

      {/* Top Waste Table */}
      <Card className="flex flex-col gap-4">
        <h2 className="text-[17px] font-semibold text-[#111111]">
          Ringkasan Spoil / Waste Berdasarkan Bahan ({daysWindow} Hari)
        </h2>

        {wasteSummary.top.length === 0 ? (
          <EmptyState
            title="Belum ada catatan spoil / waste pada periode ini"
            description="Laporan bahan tidak layak dari divisi Barista dan Kitchen akan terakumulasi di sini."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[12px] font-semibold uppercase text-[#737373]">
                  <th className="rounded-l-lg px-3 py-2.5">Bahan Baku</th>
                  <th className="px-3 py-2.5">Divisi</th>
                  <th className="px-3 py-2.5 text-right">Total Qty Waste</th>
                  <th className="rounded-r-lg px-3 py-2.5 text-right">Nilai Kerugian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {wasteSummary.top.map((item) => {
                  const b = item.bahan!;
                  return (
                    <tr key={b.id} className="hover:bg-[#FAFAFA]">
                      <td className="px-3 py-3 text-[#111111]">{b.nama}</td>
                      <td className="px-3 py-3 capitalize text-[#737373]">{b.divisi}</td>
                      <td className="tabular-mono px-3 py-3 text-right">
                        {formatQty(item.qty, b.satuan)}
                      </td>
                      <td className="tabular-mono px-3 py-3 text-right font-semibold text-[#DC2626]">
                        {formatRp(item.nilai)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Current Stock Overview (Read-Only for Management) */}
      <Card className="flex flex-col gap-4">
        <h2 className="text-[17px] font-semibold text-[#111111]">
          Kondisi Persediaan Bahan Baku Saat Ini
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[12px] font-semibold uppercase text-[#737373]">
                <th className="rounded-l-lg px-3 py-2.5">Bahan Baku</th>
                <th className="px-3 py-2.5">Divisi</th>
                <th className="px-3 py-2.5 text-right">Stok Saat Ini</th>
                <th className="px-3 py-2.5 text-right">Stok Min</th>
                <th className="rounded-r-lg px-3 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              {stockRows.map(({ b, stok, status }) => (
                <tr key={b.id} className="hover:bg-[#FAFAFA]">
                  <td className="px-3 py-3 text-[#111111]">{b.nama}</td>
                  <td className="px-3 py-3 capitalize text-[#737373]">{b.divisi}</td>
                  <td className="tabular-mono px-3 py-3 text-right font-semibold text-[#111111]">
                    {formatQty(stok, b.satuan)}
                  </td>
                  <td className="tabular-mono px-3 py-3 text-right text-[#737373]">
                    {formatQty(b.stokMinimum, b.satuan)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <StockBar current={stok} min={b.stokMinimum} status={status} />
                      <Badge
                        tone={status === 'aman' ? 'success' : status === 'menipis' ? 'warning' : 'danger'}
                        dot={false}
                      >
                        {status}
                      </Badge>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
