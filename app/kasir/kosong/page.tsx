'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Plus, RotateCcw } from 'lucide-react';
import { useBreakfreeStore } from '@/lib/store/useBreakfreeStore';
import { formatRp, formatTanggal, formatWaktu } from '@/lib/domain/calculations';
import { AppShell } from '@/components/layout/AppShell';
import { Badge, Button, Card, EmptyState } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/ToastProvider';

export default function KasirKosongRiwayatPage() {
  const laporanKosong = useBreakfreeStore((s) => s.laporanKosong);
  const rekapOmzet = useBreakfreeStore((s) => s.rekapOmzet);
  const bahan = useBreakfreeStore((s) => s.bahan);
  const pegawai = useBreakfreeStore((s) => s.pegawai);
  const shifts = useBreakfreeStore((s) => s.shifts);
  const updateStatusKosong = useBreakfreeStore((s) => s.updateStatusKosong);
  const { pushToast } = useToast();

  const [filterShift, setFilterShift] = useState<string>('all');
  const [filterTanggal, setFilterTanggal] = useState<string>('');

  const filteredOmzet = useMemo(() => {
    return rekapOmzet.filter((r) => {
      if (filterShift !== 'all' && r.shiftId !== filterShift) return false;
      if (filterTanggal && r.tanggal !== filterTanggal) return false;
      return true;
    });
  }, [rekapOmzet, filterShift, filterTanggal]);

  const activeCount = laporanKosong.filter(
    (l) => l.status === 'aktif' || l.status === 'dikonfirmasi'
  ).length;

  return (
    <AppShell pageTitle="Manajemen Menu Kosong & Riwayat Omzet POS">
      {/* Card 1: Menu Kosong Real-time */}
      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-[16px] font-semibold text-[#0F172A]">
              Daftar Laporan Bahan / Menu Tidak Tersedia (Real-time)
            </h2>
            <p className="text-xs text-[#64748B]">
              Alur BPMN: Terima laporan Barista/Kitchen → Konfirmasi → Sampaikan ke pelanggan jika
              dipesan
            </p>
          </div>
          <Badge tone={activeCount > 0 ? 'danger' : 'success'}>
            {activeCount} Menunggu Penyampaian
          </Badge>
        </div>

        {laporanKosong.length === 0 ? (
          <EmptyState
            title="Belum ada laporan bahan/menu kosong"
            description="Saat Barista atau Kitchen melaporkan bahan baku habis, pemberitahuan langsung tampil di layar ini secara real-time."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {laporanKosong.map((lk) => {
              const b = bahan.find((x) => x.id === lk.bahanId);
              const pelapor = pegawai.find((p) => p.id === lk.pelaporId);
              const isAlert = lk.status === 'aktif' || lk.status === 'dikonfirmasi';
              return (
                <div
                  key={lk.id}
                  className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border p-3.5 ${
                    isAlert
                      ? 'border-[#FECACA] bg-[#FEF2F2]'
                      : 'border-[#E2E8F0] bg-[#F8FAFC]'
                  }`}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-[#0F172A]">
                        {b?.nama ?? 'Bahan'}
                      </span>
                      <Badge
                        tone={
                          lk.status === 'tersedia_kembali'
                            ? 'success'
                            : lk.status === 'disampaikan'
                              ? 'info'
                              : 'danger'
                        }
                      >
                        {lk.status === 'aktif'
                          ? 'Aktif (Belum Konfirmasi)'
                          : lk.status === 'dikonfirmasi'
                            ? 'Dikonfirmasi Kasir'
                            : lk.status === 'disampaikan'
                              ? 'Sudah Disampaikan'
                              : 'Tersedia Kembali'}
                      </Badge>
                    </div>
                    <p className="text-xs text-[#334155]">
                      Menu terdampak:{' '}
                      {lk.menuTerdampak.length > 0 ? lk.menuTerdampak.join(', ') : '-'} · Pelapor:{' '}
                      {lk.divisi} ({pelapor?.nama ?? '-'}) · {formatWaktu(lk.createdAt)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {lk.status === 'aktif' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => updateStatusKosong(lk.id, 'dikonfirmasi')}
                      >
                        Konfirmasi
                      </Button>
                    )}
                    {(lk.status === 'aktif' || lk.status === 'dikonfirmasi') && (
                      <Button
                        variant="dangerSolid"
                        size="sm"
                        onClick={() => {
                          updateStatusKosong(lk.id, 'disampaikan');
                          pushToast('Sudah disampaikan ke pelanggan', 'success');
                        }}
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        Sudah Disampaikan
                      </Button>
                    )}
                    {lk.status !== 'tersedia_kembali' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          updateStatusKosong(lk.id, 'tersedia_kembali');
                          pushToast('Ditandai tersedia kembali', 'success');
                        }}
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                        Tersedia Kembali
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Card 2: Riwayat Omzet Table */}
      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[16px] font-semibold text-[#0F172A]">
            Riwayat Rekap Omzet Per Shift (Tersimpan Lokal)
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={filterTanggal}
              onChange={(e) => setFilterTanggal(e.target.value)}
              aria-label="Filter tanggal"
              className="tabular-mono h-8 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
            />
            <select
              value={filterShift}
              onChange={(e) => setFilterShift(e.target.value)}
              aria-label="Filter shift"
              className="h-8 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-xs text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
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
                Buat Rekap Shift Baru
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
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  <th className="rounded-l-lg px-3 py-2.5">Tanggal &amp; Shift</th>
                  <th className="px-3 py-2.5">Petugas</th>
                  <th className="px-3 py-2.5 text-right">Cash</th>
                  <th className="px-3 py-2.5 text-right">QRIS</th>
                  <th className="px-3 py-2.5 text-right">POS Pawoon</th>
                  <th className="px-3 py-2.5 text-right">Selisih</th>
                  <th className="rounded-r-lg px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredOmzet.map((r) => {
                  const sh = shifts.find((s) => s.id === r.shiftId);
                  const peg = pegawai.find((p) => p.id === r.petugasId);
                  return (
                    <tr key={r.id} className="transition-colors hover:bg-[#F8FAFC]">
                      <td className="px-3 py-3 font-semibold text-[#0F172A]">
                        {formatTanggal(r.tanggal)} · {sh?.nama ?? r.shiftId}
                        {r.versi > 1 && (
                          <span className="ml-1.5 text-xs text-[#2563EB]">(v{r.versi})</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-[#334155]">{peg?.nama ?? '-'}</td>
                      <td className="tabular-mono px-3 py-3 text-right">{formatRp(r.cash)}</td>
                      <td className="tabular-mono px-3 py-3 text-right text-[#2563EB]">
                        {formatRp(r.qris)}
                      </td>
                      <td className="tabular-mono px-3 py-3 text-right font-semibold text-[#0F172A]">
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
