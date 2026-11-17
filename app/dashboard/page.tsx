'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Check, Download, Printer } from 'lucide-react';
import { useBreakfreeStore } from '@/lib/store/useBreakfreeStore';
import {
  addDaysISO,
  evaluasiStatusStok,
  formatQty,
  formatRp,
  formatTanggal,
  hitungStokSaatIni,
  todayISO,
} from '@/lib/domain/calculations';
import { AppShell } from '@/components/layout/AppShell';
import { Badge, Button, Card, EmptyState, KpiCard } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/ToastProvider';

export default function ManajemenDashboardPage() {
  const rekapOmzet = useBreakfreeStore((s) => s.rekapOmzet);
  const laporanStok = useBreakfreeStore((s) => s.laporanStok);
  const purchaseOrders = useBreakfreeStore((s) => s.purchaseOrders);
  const bahan = useBreakfreeStore((s) => s.bahan);
  const suppliers = useBreakfreeStore((s) => s.suppliers);
  const stockMovements = useBreakfreeStore((s) => s.stockMovements);
  const qcLogs = useBreakfreeStore((s) => s.qcLogs);
  const keluhan = useBreakfreeStore((s) => s.keluhan);
  const returs = useBreakfreeStore((s) => s.returs);
  const ubahStatusPO = useBreakfreeStore((s) => s.ubahStatusPO);
  const { pushToast } = useToast();

  const [daysWindow, setDaysWindow] = useState<7 | 30>(7);

  const startDate = addDaysISO(todayISO(), -(daysWindow - 1));

  // Real aggregations over selected range
  const omzetPeriod = useMemo(
    () =>
      rekapOmzet.filter(
        (r) => r.tanggal >= startDate && (r.status === 'terkirim' || r.status === 'revisi')
      ),
    [rekapOmzet, startDate]
  );

  const totalCash = omzetPeriod.reduce((a, b) => a + b.cash, 0);
  const totalQris = omzetPeriod.reduce((a, b) => a + b.qris, 0);
  const totalOmzet = totalCash + totalQris;
  const totalTransaksi = omzetPeriod.reduce((a, b) => a + b.jumlahTransaksi, 0);

  const cashPct = totalOmzet > 0 ? Math.round((totalCash / totalOmzet) * 100) : 0;
  const qrisPct = totalOmzet > 0 ? 100 - cashPct : 0;

  const wastePeriod = useMemo(() => {
    const items: { bahanId: string; qty: number; nilai: number; returId?: string }[] = [];
    for (const lap of laporanStok) {
      if (lap.tanggal >= startDate && lap.status !== 'draft') {
        for (const w of lap.waste) items.push(w);
      }
    }
    return items;
  }, [laporanStok, startDate]);

  const totalWasteNilai = wastePeriod.reduce((a, b) => a + b.nilai, 0);
  const rasioWaste = totalOmzet > 0 ? (totalWasteNilai / totalOmzet) * 100 : 0;

  const pendingPOs = purchaseOrders.filter((p) => p.status === 'diajukan');
  const totalPendingPO = pendingPOs.reduce((a, b) => a + b.total, 0);

  // Daily chart series over last 7 days
  const chartData = useMemo(() => {
    const rows = [];
    for (let i = 6; i >= 0; i--) {
      const iso = addDaysISO(todayISO(), -i);
      const dayItems = omzetPeriod.filter((r) => r.tanggal === iso);
      const cash = dayItems.reduce((a, b) => a + b.cash, 0);
      const qris = dayItems.reduce((a, b) => a + b.qris, 0);
      const label = new Intl.DateTimeFormat('id-ID', {
        weekday: 'short',
        day: '2-digit',
      }).format(new Date(`${iso}T00:00:00`));
      rows.push({ date: iso, label, cash, qris, total: cash + qris });
    }
    return rows;
  }, [omzetPeriod]);

  // Top 5 Waste Bahan aggregated
  const topWaste = useMemo(() => {
    const map = new Map<string, { qty: number; nilai: number; returId?: string }>();
    for (const w of wastePeriod) {
      const prev = map.get(w.bahanId) ?? { qty: 0, nilai: 0, returId: w.returId };
      map.set(w.bahanId, {
        qty: prev.qty + w.qty,
        nilai: prev.nilai + w.nilai,
        returId: w.returId ?? prev.returId,
      });
    }
    return Array.from(map.entries())
      .map(([bahanId, val]) => ({
        bahan: bahan.find((b) => b.id === bahanId),
        ...val,
      }))
      .filter((x) => x.bahan != null)
      .sort((a, b) => b.nilai - a.nilai)
      .slice(0, 5);
  }, [wastePeriod, bahan]);

  const kritisCount = bahan.filter((b) => {
    const lvl = evaluasiStatusStok(hitungStokSaatIni(b.id, stockMovements), b.stokMinimum);
    return lvl === 'kritis' || lvl === 'habis';
  }).length;

  const openKeluhan = keluhan.filter((k) => k.status !== 'selesai').length;
  const avgQcMenit =
    qcLogs.length > 0
      ? (qcLogs.reduce((a, b) => a + b.durasiPerbaikanMenit, 0) / qcLogs.length).toFixed(1)
      : '0';

  const handleExportCSV = () => {
    const lines = [
      'Tanggal,Shift,Petugas,Cash,QRIS,TotalPOS,Selisih,Status',
      ...omzetPeriod.map(
        (r) =>
          `${r.tanggal},${r.shiftId},${r.petugasId},${r.cash},${r.qris},${r.totalPOS},${r.selisih},${r.status}`
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-omzet-breakfree-${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast('CSV laporan omzet diunduh', 'success');
  };

  return (
    <AppShell pageTitle="Dashboard Manajemen & Laporan Terintegrasi">
      {/* Filter Controls */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-[10px] bg-[#F3EFE9] p-1">
          {([7, 30] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDaysWindow(d)}
              className={`rounded-[6px] px-3 py-1.5 text-xs font-bold transition ${
                daysWindow === d
                  ? 'bg-white text-[#9C5B2E] shadow-xs'
                  : 'text-[#8A7F73] hover:text-[#221C17]'
              }`}
            >
              {d} Hari Terakhir
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleExportCSV}>
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5" />
            Cetak Laporan
          </Button>
        </div>
      </div>

      {/* Asymmetric KPI Grid (2fr + 1fr + 1fr + 1fr) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <KpiCard
          className="md:col-span-2"
          hero
          label={`Omzet Tervalidasi (${daysWindow} Hari Terakhir)`}
          value={formatRp(totalOmzet)}
          subtext={`Cash ${formatRp(totalCash)} (${cashPct}%) · QRIS ${formatRp(totalQris)} (${qrisPct}%) · ${totalTransaksi} transaksi POS Pawoon`}
        />
        <KpiCard
          label={`Nilai Spoil / Waste (${daysWindow}H)`}
          value={formatRp(totalWasteNilai)}
          subtext={`${wastePeriod.length} item tercatat rusak / basi`}
          tone={totalWasteNilai > 0 ? 'danger' : 'neutral'}
        />
        <KpiCard
          label="Rasio Waste / Omzet"
          value={`${rasioWaste.toFixed(2).replace('.', ',')}%`}
          subtext="Target efisiensi outlet < 3,00%"
          tone={rasioWaste > 3 ? 'danger' : 'success'}
        />
        <KpiCard
          label="PO Menunggu Persetujuan"
          value={`${pendingPOs.length} PO`}
          subtext={`Total pengajuan ${formatRp(totalPendingPO)}`}
          tone={pendingPOs.length > 0 ? 'warning' : 'neutral'}
        />
      </div>

      {/* Main 8 / 4 Content Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left 8 Cols: Chart + Top 5 Waste */}
        <div className="flex flex-col gap-5 lg:col-span-8">
          <Card className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-[#221C17]">
                  Omzet Harian 7 Hari (Cash vs QRIS POS Pawoon)
                </h2>
                <p className="text-xs text-[#8A7F73]">
                  Rekapitulasi langsung dari laporan Closing Kasir per shift
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-[3px] bg-[#9C5B2E]" />
                  Cash
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-[3px] bg-[#3B6C8F]" />
                  QRIS
                </span>
              </div>
            </div>

            {totalOmzet === 0 ? (
              <EmptyState
                title="Belum ada rekap omzet masuk"
                description="Pindah ke role Kasir untuk menginput rekap shift POS Pawoon agar grafik omzet langsung terisi."
                action={
                  <Link href="/kasir/omzet">
                    <Button size="sm">Buka Input Kasir</Button>
                  </Link>
                }
              />
            ) : (
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#EEE8E0" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: '#8A7F73', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#8A7F73', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) =>
                        v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)} jt` : `${Math.round(v / 1000)} rb`
                      }
                    />
                    <Tooltip
                      formatter={(val, name) => [
                        formatRp(Number(val ?? 0)),
                        name === 'cash' ? 'Cash' : 'QRIS',
                      ]}
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#E6E0D8',
                        borderRadius: 10,
                        boxShadow: '0 8px 24px -8px rgba(61,52,44,0.18)',
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="cash" stackId="a" fill="#9C5B2E" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="qris" stackId="a" fill="#3B6C8F" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-[#221C17]">
                Top 5 Bahan Nilai Waste Tertinggi ({daysWindow} Hari)
              </h2>
              <Link href="/logistik">
                <Button variant="secondary" size="sm">
                  Lihat Semua di Logistik
                </Button>
              </Link>
            </div>

            {topWaste.length === 0 ? (
              <EmptyState
                title="Belum ada catatan spoil/waste"
                description="Catatan bahan tidak layak dari shift Barista & Kitchen akan terakumulasi otomatis di sini."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#E6E0D8] bg-[#F3EFE9] text-[11px] font-bold uppercase tracking-wider text-[#8A7F73]">
                      <th className="rounded-l-[6px] px-3 py-2.5">Bahan Baku</th>
                      <th className="px-3 py-2.5">Divisi</th>
                      <th className="px-3 py-2.5 text-right">Qty Waste</th>
                      <th className="px-3 py-2.5 text-right">Nilai Kerugian</th>
                      <th className="rounded-r-[6px] px-3 py-2.5">Status Retur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topWaste.map((item) => {
                      const b = item.bahan!;
                      const retur = item.returId
                        ? returs.find((r) => r.id === item.returId)
                        : undefined;
                      return (
                        <tr key={b.id} className="border-b border-[#E6E0D8] hover:bg-[#FBF9F6]">
                          <td className="px-3 py-2.5 font-semibold text-[#221C17]">{b.nama}</td>
                          <td className="px-3 py-2.5 capitalize text-[#8A7F73]">{b.divisi}</td>
                          <td className="tabular-mono px-3 py-2.5 text-right">
                            {formatQty(item.qty, b.satuan)}
                          </td>
                          <td className="tabular-mono px-3 py-2.5 text-right font-bold text-[#B23A2E]">
                            {formatRp(item.nilai)}
                          </td>
                          <td className="px-3 py-2.5">
                            {retur ? (
                              <Badge
                                tone={
                                  retur.status === 'pengganti_diterima'
                                    ? 'success'
                                    : retur.status === 'ditarik'
                                      ? 'warning'
                                      : 'info'
                                }
                              >
                                {retur.status.replace('_', ' ')}
                              </Badge>
                            ) : (
                              <Badge tone="neutral">Belum Retur</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Right 4 Cols: PO Approval Queue + Outlet Operational Health */}
        <div className="flex flex-col gap-5 lg:col-span-4">
          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-[#221C17]">Antrean Persetujuan PO</h2>
              <Badge tone={pendingPOs.length > 0 ? 'warning' : 'success'}>
                {pendingPOs.length} Menunggu
              </Badge>
            </div>

            {pendingPOs.length === 0 ? (
              <p className="rounded-[10px] bg-[#FBF9F6] p-4 text-center text-xs text-[#8A7F73]">
                Tidak ada Purchase Order yang menunggu persetujuan Owner/Manajemen.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {pendingPOs.map((po) => {
                  const sup = suppliers.find((s) => s.id === po.supplierId);
                  return (
                    <div
                      key={po.id}
                      className="flex flex-col gap-2 rounded-[10px] border border-[#E6E0D8] bg-[#FBF9F6] p-3.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="tabular-mono text-[13px] font-bold text-[#9C5B2E]">
                          {po.nomor}
                        </span>
                        <span className="tabular-mono text-sm font-bold text-[#221C17]">
                          {formatRp(po.total)}
                        </span>
                      </div>
                      <p className="text-xs text-[#8A7F73]">
                        {sup?.nama ?? 'Supplier'} · {po.items.length} bahan
                        {po.returId ? ' · Pengganti Retur H+1' : ''}
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            ubahStatusPO(po.id, 'disetujui');
                            pushToast(`${po.nomor} disetujui`, 'success');
                          }}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Setujui PO
                        </Button>
                        <Link href={`/logistik/po?id=${po.id}`}>
                          <Button variant="secondary" size="sm">
                            Detail
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="flex flex-col gap-3">
            <h2 className="text-[15px] font-bold text-[#221C17]">
              Kesehatan Operasional Hari Ini
            </h2>
            <div className="flex flex-col gap-2.5 text-[13px]">
              <div className="flex items-center justify-between border-b border-[#E6E0D8] pb-2">
                <span className="text-[#3D342C]">Pesanan Dikembalikan (Log QC)</span>
                <span className="tabular-mono font-bold text-[#A86A12]">
                  {qcLogs.length} kasus (avg {avgQcMenit} mnt)
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-[#E6E0D8] pb-2">
                <span className="text-[#3D342C]">Keluhan Pelanggan Terbuka</span>
                <span className="tabular-mono font-bold text-[#B23A2E]">
                  {openKeluhan} terbuka
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#3D342C]">Bahan Stok Kritis / Habis</span>
                <span className="tabular-mono font-bold text-[#B23A2E]">
                  {kritisCount} bahan
                </span>
              </div>
            </div>
            <div className="pt-1 text-[11px] text-[#8A7F73]">
              Tanggal operasional aktif: {formatTanggal(todayISO())}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
