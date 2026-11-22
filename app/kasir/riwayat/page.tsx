'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useBreakfreeStore } from '@/lib/store/useBreakfreeStore';
import { formatRp, formatTanggal } from '@/lib/domain/calculations';
import { AppShell } from '@/components/layout/AppShell';
import { Badge, Button, Card, EmptyState } from '@/components/ui/primitives';

export default function KasirRiwayatPage() {
  const rekapOmzet = useBreakfreeStore((s) => s.rekapOmzet);
  const pegawai = useBreakfreeStore((s) => s.pegawai);
  const shifts = useBreakfreeStore((s) => s.shifts);

  const [filterShift, setFilterShift] = useState<string>('all');
  const [filterTanggal, setFilterTanggal] = useState<string>('');

  const filteredOmzet = useMemo(() => {
    return rekapOmzet.filter((r) => {
      if (filterShift !== 'all' && r.shiftId !== filterShift) return false;
      if (filterTanggal && r.tanggal !== filterTanggal) return false;
      return true;
    });
  }, [rekapOmzet, filterShift, filterTanggal]);

  return (
    <AppShell pageTitle="Riwayat Rekap Omzet">
      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[17px] font-semibold text-[#111111]">
              Daftar Rekap Omzet Per Shift (POS Pawoon)
            </h2>
            <p className="mt-0.5 text-[13px] font-normal text-[#737373]">
              Seluruh laporan closing kasir yang tersimpan dan terkirim ke sistem.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={filterTanggal}
              onChange={(e) => setFilterTanggal(e.target.value)}
              aria-label="Filter tanggal"
              className="tabular-mono h-9 rounded-lg border border-[#E5E5E5] bg-white px-2.5 text-[13px] font-normal text-[#111111] focus:border-[#111111] focus:outline-none"
            />
            <select
              value={filterShift}
              onChange={(e) => setFilterShift(e.target.value)}
              aria-label="Filter shift"
              className="h-9 rounded-lg border border-[#E5E5E5] bg-white px-2.5 text-[13px] font-normal text-[#111111] focus:border-[#111111] focus:outline-none"
            >
              <option value="all">Semua Shift</option>
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama}
                </option>
              ))}
            </select>
            <Link href="/kasir/omzet">
              <Button size="sm">
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Input Rekap Baru
              </Button>
            </Link>
          </div>
        </div>

        {filteredOmzet.length === 0 ? (
          <EmptyState
            title="Belum ada riwayat rekap omzet"
            description="Setiap rekap closing kasir yang disimpan atau dikirim akan muncul di tabel ini."
            action={
              <Link href="/kasir/omzet">
                <Button size="sm">Input Rekap Pertama</Button>
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[12px] font-semibold uppercase text-[#737373]">
                  <th className="rounded-l-lg px-3 py-2.5">Tanggal &amp; Shift</th>
                  <th className="px-3 py-2.5">Kasir</th>
                  <th className="px-3 py-2.5 text-right">Cash</th>
                  <th className="px-3 py-2.5 text-right">QRIS</th>
                  <th className="px-3 py-2.5 text-right">Total POS</th>
                  <th className="px-3 py-2.5 text-right">Selisih</th>
                  <th className="rounded-r-lg px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {filteredOmzet.map((r) => {
                  const sh = shifts.find((s) => s.id === r.shiftId);
                  const peg = pegawai.find((p) => p.id === r.petugasId);
                  return (
                    <tr key={r.id} className="transition-colors hover:bg-[#FAFAFA]">
                      <td className="px-3 py-3 font-normal text-[#111111]">
                        {formatTanggal(r.tanggal)} · {sh?.nama ?? r.shiftId}
                        {r.versi > 1 && (
                          <span className="ml-1.5 text-[12px] font-medium text-[#737373]">(v{r.versi})</span>
                        )}
                      </td>
                      <td className="px-3 py-3 font-normal text-[#262626]">{peg?.nama ?? '-'}</td>
                      <td className="tabular-mono px-3 py-3 text-right font-normal text-[#262626]">{formatRp(r.cash)}</td>
                      <td className="tabular-mono px-3 py-3 text-right font-normal text-[#737373]">
                        {formatRp(r.qris)}
                      </td>
                      <td className="tabular-mono px-3 py-3 text-right font-semibold text-[#111111]">
                        {formatRp(r.totalPOS)}
                      </td>
                      <td
                        className={`tabular-mono px-3 py-3 text-right font-semibold ${
                          r.selisih === 0 ? 'text-[#15803D]' : 'text-[#B45309]'
                        }`}
                      >
                        {formatRp(r.selisih)}
                      </td>
                      <td className="px-3 py-3">
                        <Badge
                          tone={
                            r.status === 'terkirim' || r.status === 'revisi'
                              ? 'success'
                              : r.status === 'perlu_cek'
                                ? 'warning'
                                : 'info'
                          }
                        >
                          {r.status.replace('_', ' ')}
                        </Badge>
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
