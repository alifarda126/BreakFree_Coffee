'use client';

import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Banknote, CreditCard, Download, Printer, ReceiptText, Wallet } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Badge, Button, Card, EmptyState, KpiCard } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/ToastProvider';
import { useBreakfreeStore } from '@/lib/store/useBreakfreeStore';
import { addDaysISO, formatRp, formatTanggal, todayISO } from '@/lib/domain/calculations';

export default function LaporanPenjualanPage() {
  const { pushToast } = useToast();
  const rekapOmzet = useBreakfreeStore((s) => s.rekapOmzet);
  const shifts = useBreakfreeStore((s) => s.shifts);
  const pegawai = useBreakfreeStore((s) => s.pegawai);

  const [daysWindow, setDaysWindow] = useState<7 | 30>(7);
  const startDate = addDaysISO(todayISO(), -(daysWindow - 1));

  const omzetPeriod = useMemo(
    () =>
      rekapOmzet
        .filter((r) => r.tanggal >= startDate && (r.status === 'terkirim' || r.status === 'revisi'))
        .sort((a, b) => b.tanggal.localeCompare(a.tanggal)),
    [rekapOmzet, startDate]
  );

  const totalCash = omzetPeriod.reduce((a, b) => a + b.cash, 0);
  const totalQris = omzetPeriod.reduce((a, b) => a + b.qris, 0);
  const totalOmzet = totalCash + totalQris;
  const totalTrx = omzetPeriod.reduce((a, b) => a + b.jumlahTransaksi, 0);

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
      rows.push({ label, cash, qris });
    }
    return rows;
  }, [omzetPeriod]);

  const handleExportCSV = () => {
    const lines = [
      'Tanggal,Shift,Kasir,Cash,QRIS,TotalPOS,Selisih,Status',
      ...omzetPeriod.map(
        (r) =>
          `${r.tanggal},${r.shiftId},${r.petugasId},${r.cash},${r.qris},${r.totalPOS},${r.selisih},${r.status}`
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-penjualan-breakfree-${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast('CSV laporan penjualan diunduh.', 'success');
  };

  return (
    <AppShell pageTitle="Laporan Penjualan">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-[#E2E8F0] bg-[#F1F5F9] p-1">
          {([7, 30] as const).map((d) => (
            <button
              key={d}
              type="button"
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

      {/* 4 Sales KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          hero
          label={`Total Omzet (${daysWindow}H)`}
          value={formatRp(totalOmzet)}
          subtext="Tervalidasi POS Pawoon"
          icon={<Wallet className="h-[18px] w-[18px]" strokeWidth={1.75} />}
          iconTone="primary"
        />
        <KpiCard
          label="Total Omzet Cash"
          value={formatRp(totalCash)}
          subtext={totalOmzet > 0 ? `${Math.round((totalCash / totalOmzet) * 100)}% dari total` : '0%'}
          icon={<Banknote className="h-[18px] w-[18px]" strokeWidth={1.75} />}
          iconTone="primary"
        />
        <KpiCard
          label="Total Omzet QRIS"
          value={formatRp(totalQris)}
          subtext={totalOmzet > 0 ? `${Math.round((totalQris / totalOmzet) * 100)}% dari total` : '0%'}
          icon={<CreditCard className="h-[18px] w-[18px]" strokeWidth={1.75} />}
          iconTone="primary"
        />
        <KpiCard
          label="Jumlah Transaksi"
          value={`${totalTrx} Struk`}
          subtext={`${omzetPeriod.length} laporan shift tervalidasi`}
          icon={<ReceiptText className="h-[18px] w-[18px]" strokeWidth={1.75} />}
          iconTone="neutral"
        />
      </div>

      {/* Daily Chart */}
      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[17px] font-semibold text-[#0F172A]">
            Grafik Omzet Harian 7 Hari Terakhir (Cash vs QRIS)
          </h2>
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
            title="Belum ada data penjualan pada periode ini"
            description="Data omzet dari rekap closing Kasir POS Pawoon akan muncul otomatis di sini."
          />
        ) : (
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: '#64748B', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) =>
                    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)} jt` : `${Math.round(v / 1000)} rb`
                  }
                />
                <Tooltip
                  cursor={{ fill: '#F1F5F9' }}
                  formatter={(val, name) => [formatRp(Number(val ?? 0)), name === 'cash' ? 'Cash' : 'QRIS']}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    borderRadius: 10,
                    fontSize: 13,
                  }}
                />
                <Bar dataKey="cash" stackId="a" fill="#1E40AF" radius={[0, 0, 4, 4]} maxBarSize={42} />
                <Bar dataKey="qris" stackId="a" fill="#60A5FA" radius={[4, 4, 0, 0]} maxBarSize={42} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Sales Table */}
      <Card className="flex flex-col gap-4">
        <h2 className="text-[17px] font-semibold text-[#0F172A]">
          Rincian Rekap Omzet Shift ({daysWindow} Hari Terakhir)
        </h2>

        {omzetPeriod.length === 0 ? (
          <EmptyState
            title="Belum ada rekap omzet tervalidasi"
            description="Laporan penjualan akan terisi setelah Kasir mengirimkan rekap closing shift."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[12px] font-semibold uppercase text-[#64748B]">
                  <th className="rounded-l-lg px-3 py-2.5">Tanggal &amp; Shift</th>
                  <th className="px-3 py-2.5">Kasir</th>
                  <th className="px-3 py-2.5 text-right">Cash</th>
                  <th className="px-3 py-2.5 text-right">QRIS</th>
                  <th className="px-3 py-2.5 text-right">Total POS</th>
                  <th className="rounded-r-lg px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {omzetPeriod.map((r) => {
                  const sh = shifts.find((s) => s.id === r.shiftId);
                  const peg = pegawai.find((p) => p.id === r.petugasId);
                  return (
                    <tr key={r.id} className="hover:bg-[#F8FAFC]">
                      <td className="px-3 py-3 text-[#0F172A]">
                        {formatTanggal(r.tanggal)} · {sh?.nama ?? r.shiftId}
                      </td>
                      <td className="px-3 py-3 text-[#334155]">{peg?.nama ?? '-'}</td>
                      <td className="tabular-mono px-3 py-3 text-right">{formatRp(r.cash)}</td>
                      <td className="tabular-mono px-3 py-3 text-right text-[#2563EB]">
                        {formatRp(r.qris)}
                      </td>
                      <td className="tabular-mono px-3 py-3 text-right font-semibold text-[#0F172A]">
                        {formatRp(r.totalPOS)}
                      </td>
                      <td className="px-3 py-3">
                        <Badge tone="success">{r.status.replace('_', ' ')}</Badge>
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
