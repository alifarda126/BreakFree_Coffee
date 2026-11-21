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
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileClock,
  PackageX,
  Percent,
  Printer,
  RotateCcw,
  Trash2,
  Wallet,
} from 'lucide-react';
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
  const laporanKosong = useBreakfreeStore((s) => s.laporanKosong);
  const purchaseOrders = useBreakfreeStore((s) => s.purchaseOrders);
  const bahan = useBreakfreeStore((s) => s.bahan);
  const suppliers = useBreakfreeStore((s) => s.suppliers);
  const pegawai = useBreakfreeStore((s) => s.pegawai);
  const activityLogs = useBreakfreeStore((s) => s.activityLogs);
  const stockMovements = useBreakfreeStore((s) => s.stockMovements);
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

  // Logistics & Stock Health metrics
  const kritisCount = bahan.filter((b) => {
    const lvl = evaluasiStatusStok(hitungStokSaatIni(b.id, stockMovements), b.stokMinimum);
    return lvl === 'kritis' || lvl === 'habis';
  }).length;

  const pendingVerifCount = laporanStok.filter((l) => l.status === 'terkirim').length;
  const activeReturCount = returs.filter((r) => r.status !== 'pengganti_diterima').length;
  const activeKosongCount = laporanKosong.filter(
    (l) => l.status === 'aktif' || l.status === 'dikonfirmasi'
  ).length;

  const isLogistikNormal =
    kritisCount === 0 && pendingVerifCount === 0 && activeReturCount === 0 && activeKosongCount === 0;

  const getPoRequester = (poNomor: string) => {
    const log = activityLogs.find(
      (l) => l.entitas === 'purchaseOrder' && l.entitasId === poNomor
    );
    if (log) {
      const p = pegawai.find((x) => x.id === log.petugasId);
      if (p) return p.nama;
    }
    return 'Tim Logistik';
  };

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
    <AppShell pageTitle="Dashboard & Laporan Manajemen">
      {/* Toolbar: Segmented Period Control + Action Buttons */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex rounded-lg border border-[#E2E8F0] bg-[#F1F5F9] p-1"
          role="tablist"
          aria-label="Filter periode laporan"
        >
          {([7, 30] as const).map((d) => (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={daysWindow === d}
              onClick={() => setDaysWindow(d)}
              className={`rounded-md px-3.5 py-1.5 text-[13px] transition-all ${
                daysWindow === d
                  ? 'bg-white font-semibold text-[#2563EB] shadow-[0_1px_2px_rgba(15,23,42,0.08)]'
                  : 'font-medium text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              {d} Hari Terakhir
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleExportCSV}>
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Export CSV
          </Button>
          <Button variant="primary" size="sm" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            Cetak Laporan
          </Button>
        </div>
      </div>

      {/* KPI Row: Asymmetric 5-col grid (2fr Hero + 1fr + 1fr + 1fr) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          className="sm:col-span-2"
          hero
          label={`Omzet Tervalidasi (${daysWindow} Hari)`}
          value={formatRp(totalOmzet)}
          subtext={`Cash ${formatRp(totalCash)} (${cashPct}%) · QRIS ${formatRp(totalQris)} (${qrisPct}%) · ${totalTransaksi} transaksi`}
          icon={<Wallet className="h-[18px] w-[18px]" strokeWidth={1.85} />}
          iconTone="primary"
        />
        <KpiCard
          label={`Nilai Spoil / Waste (${daysWindow}H)`}
          value={formatRp(totalWasteNilai)}
          subtext={`${wastePeriod.length} item tercatat rusak / basi`}
          tone={totalWasteNilai > 0 ? 'danger' : 'neutral'}
          icon={<Trash2 className="h-[18px] w-[18px]" strokeWidth={1.85} />}
          iconTone={totalWasteNilai > 0 ? 'danger' : 'neutral'}
        />
        <KpiCard
          label="Rasio Waste / Omzet"
          value={`${rasioWaste.toFixed(2).replace('.', ',')}%`}
          subtext="Target efisiensi outlet < 3,00%"
          tone={rasioWaste > 3 ? 'danger' : 'success'}
          icon={<Percent className="h-[18px] w-[18px]" strokeWidth={1.85} />}
          iconTone={rasioWaste > 3 ? 'danger' : 'success'}
        />
        <KpiCard
          label="PO Menunggu Persetujuan"
          value={`${pendingPOs.length} PO`}
          subtext={`Total pengajuan ${formatRp(totalPendingPO)}`}
          tone={pendingPOs.length > 0 ? 'warning' : 'neutral'}
          icon={<FileClock className="h-[18px] w-[18px]" strokeWidth={1.85} />}
          iconTone={pendingPOs.length > 0 ? 'warning' : 'neutral'}
        />
      </div>

      {/* Main Content 8 / 4 Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left 8 Cols: Daily Revenue Chart + Top 5 Waste */}
        <div className="flex flex-col gap-6 lg:col-span-8">
          <Card className="flex flex-col gap-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-[17px] font-semibold leading-[1.3] text-[#0F172A]">
                  Omzet Harian 7 Hari Terakhir (Cash vs QRIS)
                </h2>
                <p className="mt-0.5 text-[13px] font-normal leading-[1.5] text-[#64748B]">
                  Rekapitulasi langsung dari laporan Closing Kasir POS Pawoon per shift
                </p>
              </div>
              <div className="flex items-center gap-4 text-[13px] font-medium text-[#475569]">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-[3px] bg-[#1E40AF]" aria-hidden="true" />
                  Cash
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-[3px] bg-[#60A5FA]" aria-hidden="true" />
                  QRIS
                </span>
              </div>
            </div>

            {totalOmzet === 0 ? (
              <EmptyState
                title="Belum ada rekap omzet masuk pada periode ini"
                description="Buka workspace Kasir untuk menginput rekap closing shift POS Pawoon agar grafik omzet harian terisi otomatis."
                action={
                  <Link href="/kasir/omzet">
                    <Button size="sm">Buka Input Kasir</Button>
                  </Link>
                }
              />
            ) : (
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: '#64748B', fontSize: 12, fontWeight: 400 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#64748B', fontSize: 12, fontWeight: 400 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) =>
                        v >= 1_000_000
                          ? `${(v / 1_000_000).toFixed(1)} jt`
                          : `${Math.round(v / 1000)} rb`
                      }
                    />
                    <Tooltip
                      cursor={{ fill: '#F1F5F9' }}
                      formatter={(val, name) => [
                        formatRp(Number(val ?? 0)),
                        name === 'cash' ? 'Cash' : 'QRIS',
                      ]}
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#E2E8F0',
                        borderRadius: 10,
                        boxShadow: '0 10px 28px -8px rgba(15,23,42,0.14)',
                        fontSize: 13,
                        fontWeight: 500,
                        color: '#0F172A',
                      }}
                    />
                    <Bar dataKey="cash" stackId="a" fill="#1E40AF" radius={[0, 0, 4, 4]} maxBarSize={42} />
                    <Bar dataKey="qris" stackId="a" fill="#60A5FA" radius={[4, 4, 0, 0]} maxBarSize={42} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-[17px] font-semibold leading-[1.3] text-[#0F172A]">
                  Top 5 Bahan Nilai Waste Tertinggi ({daysWindow} Hari)
                </h2>
                <p className="mt-0.5 text-[13px] font-normal leading-[1.5] text-[#64748B]">
                  Akumulasi kerugian bahan tidak layak dari shift Barista &amp; Kitchen
                </p>
              </div>
              <Link href="/logistik">
                <Button variant="secondary" size="sm">
                  Lihat di Logistik
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </Link>
            </div>

            {topWaste.length === 0 ? (
              <EmptyState
                icon={<PackageX className="h-5 w-5" strokeWidth={1.85} />}
                title="Belum ada catatan spoil / waste pada periode ini"
                description="Semua bahan baku dalam kondisi terjaga. Catatan bahan rusak atau basi dari laporan Barista dan Kitchen akan muncul otomatis di tabel ini."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[12px] font-semibold uppercase tracking-normal text-[#64748B]">
                      <th className="rounded-l-lg px-3 py-2.5">Bahan Baku</th>
                      <th className="px-3 py-2.5">Divisi</th>
                      <th className="px-3 py-2.5 text-right">Qty Waste</th>
                      <th className="px-3 py-2.5 text-right">Nilai Kerugian</th>
                      <th className="rounded-r-lg px-3 py-2.5">Status Retur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {topWaste.map((item) => {
                      const b = item.bahan!;
                      const retur = item.returId
                        ? returs.find((r) => r.id === item.returId)
                        : undefined;
                      return (
                        <tr key={b.id} className="transition-colors hover:bg-[#F8FAFC]">
                          <td className="px-3 py-3 font-normal text-[#0F172A]">{b.nama}</td>
                          <td className="px-3 py-3 font-normal capitalize text-[#64748B]">{b.divisi}</td>
                          <td className="tabular-mono px-3 py-3 text-right font-normal text-[#334155]">
                            {formatQty(item.qty, b.satuan)}
                          </td>
                          <td className="tabular-mono px-3 py-3 text-right font-semibold text-[#DC2626]">
                            {formatRp(item.nilai)}
                          </td>
                          <td className="px-3 py-3">
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

        {/* Right 4 Cols: PO Approval Queue + Logistics Health */}
        <div className="flex flex-col gap-6 lg:col-span-4">
          <Card className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[15px] font-semibold leading-[1.3] text-[#0F172A]">Antrean Persetujuan PO</h2>
              <Badge tone={pendingPOs.length > 0 ? 'warning' : 'success'}>
                {pendingPOs.length} Menunggu
              </Badge>
            </div>

            {pendingPOs.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-7 text-center">
                <CheckCircle2 className="h-6 w-6 text-[#16A34A]" strokeWidth={1.75} aria-hidden="true" />
                <p className="text-[13px] font-semibold text-[#0F172A]">Antrean persetujuan bersih</p>
                <p className="text-[12px] font-normal leading-[1.5] text-[#64748B]">
                  Tidak ada Purchase Order yang menunggu persetujuan Manajemen saat ini.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {pendingPOs.map((po) => {
                  const sup = suppliers.find((s) => s.id === po.supplierId);
                  return (
                    <div
                      key={po.id}
                      className="flex flex-col gap-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 transition-colors hover:border-[#CBD5E1]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="tabular-mono text-[13px] font-semibold text-[#2563EB]">
                            {po.nomor}
                          </span>
                          <p className="mt-0.5 truncate text-[13px] font-medium text-[#0F172A]">
                            {sup?.nama ?? 'Supplier'}
                          </p>
                        </div>
                        <Badge tone="warning" dot={false}>
                          Menunggu
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between border-t border-[#E2E8F0] pt-2 text-[12px]">
                        <div className="font-normal text-[#64748B]">
                          <div>{formatTanggal(po.tanggal)}</div>
                          <div>
                            Pengaju: {getPoRequester(po.nomor)} · {po.items.length} bahan
                          </div>
                        </div>
                        <span className="tabular-mono text-[15px] font-bold text-[#0F172A]">
                          {formatRp(po.total)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-0.5">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            ubahStatusPO(po.id, 'disetujui');
                            pushToast(`${po.nomor} disetujui`, 'success');
                          }}
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
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

          <Card className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold leading-[1.3] text-[#0F172A]">
                Kesehatan Stok &amp; Logistik
              </h2>
              <Badge tone={isLogistikNormal ? 'success' : 'warning'}>
                {isLogistikNormal ? 'Terkendali' : 'Perlu Pantauan'}
              </Badge>
            </div>

            <div className="flex flex-col gap-2.5 text-[13px]">
              <div className="flex items-center justify-between gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle
                    className={`h-4 w-4 shrink-0 ${kritisCount > 0 ? 'text-[#DC2626]' : 'text-[#64748B]'}`}
                    aria-hidden="true"
                  />
                  <span className="font-normal text-[#334155]">Bahan Stok Kritis / Habis</span>
                </div>
                <span
                  className={`tabular-mono text-[13px] font-semibold ${
                    kritisCount > 0 ? 'text-[#DC2626]' : 'text-[#15803D]'
                  }`}
                >
                  {kritisCount} bahan
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <ClipboardCheck
                    className={`h-4 w-4 shrink-0 ${pendingVerifCount > 0 ? 'text-[#D97706]' : 'text-[#64748B]'}`}
                    aria-hidden="true"
                  />
                  <span className="font-normal text-[#334155]">Laporan Stok Menunggu Verifikasi</span>
                </div>
                <span
                  className={`tabular-mono text-[13px] font-semibold ${
                    pendingVerifCount > 0 ? 'text-[#B45309]' : 'text-[#15803D]'
                  }`}
                >
                  {pendingVerifCount} laporan
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <RotateCcw
                    className={`h-4 w-4 shrink-0 ${activeReturCount > 0 ? 'text-[#2563EB]' : 'text-[#64748B]'}`}
                    aria-hidden="true"
                  />
                  <span className="font-normal text-[#334155]">Retur BOP Aktif (H+1)</span>
                </div>
                <span
                  className={`tabular-mono text-[13px] font-semibold ${
                    activeReturCount > 0 ? 'text-[#2563EB]' : 'text-[#15803D]'
                  }`}
                >
                  {activeReturCount} dokumen
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <PackageX
                    className={`h-4 w-4 shrink-0 ${activeKosongCount > 0 ? 'text-[#DC2626]' : 'text-[#64748B]'}`}
                    aria-hidden="true"
                  />
                  <span className="font-normal text-[#334155]">Bahan / Menu Kosong Aktif</span>
                </div>
                <span
                  className={`tabular-mono text-[13px] font-semibold ${
                    activeKosongCount > 0 ? 'text-[#DC2626]' : 'text-[#15803D]'
                  }`}
                >
                  {activeKosongCount} aktif
                </span>
              </div>
            </div>

            <div className="border-t border-[#E2E8F0] pt-2.5 text-[12px] font-normal text-[#64748B]">
              Tanggal operasional aktif: {formatTanggal(todayISO())}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
