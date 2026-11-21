'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ClipboardCheck,
  FileClock,
  ShoppingCart,
  Trash2,
  XCircle,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Badge, Button, Card, EmptyState, KpiCard, Modal } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/ToastProvider';
import { useBreakfreeStore } from '@/lib/store/useBreakfreeStore';
import {
  addDaysISO,
  evaluasiStatusStok,
  formatQty,
  formatRp,
  formatTanggal,
  formatWaktu,
  hitungStokSaatIni,
  todayISO,
} from '@/lib/domain/calculations';
import type { LaporanStok, StatusLaporanStok } from '@/lib/types';

export default function LogistikDashboardPage() {
  const { pushToast } = useToast();
  const {
    bahan,
    shifts,
    pegawai,
    stockMovements,
    laporanStok,
    purchaseOrders,
    activePetugasId,
    verifikasiLaporanStok,
  } = useBreakfreeStore();

  const [filterLap, setFilterLap] = useState<'perlu' | 'semua'>('perlu');
  const [inspectLaporan, setInspectLaporan] = useState<LaporanStok | null>(null);
  const [returnModalLap, setReturnModalLap] = useState<LaporanStok | null>(null);
  const [returnReason, setReturnReason] = useState('');

  const petugasNama = (id: string) => pegawai.find((p) => p.id === id)?.nama || 'Petugas';
  const shiftNama = (id: string) => shifts.find((s) => s.id === id)?.nama || id;
  const activeVerifier =
    pegawai.find((p) => p.id === activePetugasId && p.aktif)?.nama || 'Staf Logistik';

  const kritisBahan = useMemo(() => {
    return bahan
      .map((b) => {
        const stok = hitungStokSaatIni(b.id, stockMovements);
        const status = evaluasiStatusStok(stok, b.stokMinimum);
        return { b, stok, status };
      })
      .filter((x) => x.status === 'kritis' || x.status === 'habis' || x.status === 'menipis');
  }, [bahan, stockMovements]);

  const kritisCount = kritisBahan.filter((x) => x.status === 'kritis' || x.status === 'habis').length;
  const pendingVerifCount = laporanStok.filter((l) => l.status === 'terkirim').length;
  const pendingPOCount = purchaseOrders.filter((p) => p.status === 'diajukan').length;

  const startDate7H = addDaysISO(todayISO(), -6);
  const waste7H = useMemo(() => {
    let total = 0;
    let count = 0;
    for (const lap of laporanStok) {
      if (lap.tanggal >= startDate7H && lap.status !== 'draft') {
        for (const w of lap.waste) {
          total += w.nilai;
          count += 1;
        }
      }
    }
    return { total, count };
  }, [laporanStok, startDate7H]);

  const antreanLaporan = useMemo(() => {
    const sorted = [...laporanStok].sort((a, b) =>
      (b.submittedAt || b.createdAt).localeCompare(a.submittedAt || a.createdAt)
    );
    return filterLap === 'perlu' ? sorted.filter((l) => l.status === 'terkirim') : sorted.slice(0, 10);
  }, [laporanStok, filterLap]);

  const handleVerifikasi = (lap: LaporanStok) => {
    verifikasiLaporanStok(lap.id, 'diverifikasi', activeVerifier, 'Terverifikasi oleh Logistik');
    setInspectLaporan(null);
    pushToast(`Laporan ${lap.divisi} (${formatTanggal(lap.tanggal)}) diverifikasi & stok diperbarui.`, 'success');
  };

  const handleConfirmReturn = () => {
    if (!returnModalLap) return;
    if (!returnReason.trim()) {
      pushToast('Tuliskan alasan pengembalian laporan.', 'warning');
      return;
    }
    verifikasiLaporanStok(returnModalLap.id, 'dikembalikan', activeVerifier, returnReason.trim());
    pushToast('Laporan dikembalikan ke divisi terkait untuk revisi.', 'info');
    setReturnModalLap(null);
    setReturnReason('');
    setInspectLaporan(null);
  };

  const lapStatusTone = (status: StatusLaporanStok) => {
    if (status === 'diverifikasi') return 'success';
    if (status === 'terkirim') return 'warning';
    if (status === 'dikembalikan') return 'danger';
    return 'neutral';
  };

  return (
    <AppShell pageTitle="Dashboard Logistik">
      {/* 4 Core KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Bahan Stok Kritis / Habis"
          value={`${kritisCount} Bahan`}
          subtext={`Dari total ${bahan.length} bahan baku terdaftar`}
          tone={kritisCount > 0 ? 'danger' : 'success'}
          icon={<AlertTriangle className="h-[18px] w-[18px]" strokeWidth={1.75} />}
        />
        <KpiCard
          label="Laporan Menunggu Verifikasi"
          value={`${pendingVerifCount} Laporan`}
          subtext="Kiriman opname Barista & Kitchen"
          tone={pendingVerifCount > 0 ? 'warning' : 'success'}
          icon={<ClipboardCheck className="h-[18px] w-[18px]" strokeWidth={1.75} />}
        />
        <KpiCard
          label="Nilai Spoil / Waste (7H)"
          value={formatRp(waste7H.total)}
          subtext={`${waste7H.count} item rusak / basi tercatat`}
          tone={waste7H.total > 0 ? 'danger' : 'neutral'}
          icon={<Trash2 className="h-[18px] w-[18px]" strokeWidth={1.75} />}
        />
        <KpiCard
          label="PO Menunggu Persetujuan"
          value={`${pendingPOCount} PO`}
          subtext="Menunggu keputusan Manajemen"
          tone={pendingPOCount > 0 ? 'warning' : 'neutral'}
          icon={<FileClock className="h-[18px] w-[18px]" strokeWidth={1.75} />}
        />
      </div>

      {/* Main 8 / 4 Split */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Antrean Verifikasi Laporan Stok */}
        <Card className="flex flex-col gap-4 lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[17px] font-semibold text-[#0F172A]">
                Verifikasi Laporan Stok Barista &amp; Kitchen
              </h2>
              <p className="mt-0.5 text-[13px] font-normal text-[#64748B]">
                Periksa hasil opname fisik dan waste sebelum memperbarui stok sistem.
              </p>
            </div>
            <div className="inline-flex rounded-lg border border-[#E2E8F0] bg-[#F1F5F9] p-1 text-[12px]">
              <button
                type="button"
                onClick={() => setFilterLap('perlu')}
                className={`rounded-md px-3 py-1 transition-all ${
                  filterLap === 'perlu'
                    ? 'bg-white font-semibold text-[#2563EB] shadow-[0_1px_2px_rgba(15,23,42,0.08)]'
                    : 'font-medium text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                Perlu Verifikasi ({pendingVerifCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterLap('semua')}
                className={`rounded-md px-3 py-1 transition-all ${
                  filterLap === 'semua'
                    ? 'bg-white font-semibold text-[#2563EB] shadow-[0_1px_2px_rgba(15,23,42,0.08)]'
                    : 'font-medium text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                Terbaru
              </button>
            </div>
          </div>

          {antreanLaporan.length === 0 ? (
            <EmptyState
              title="Tidak ada laporan menunggu verifikasi"
              description="Semua laporan opname stok dari Barista dan Kitchen sudah diproses."
            />
          ) : (
            <div className="space-y-3">
              {antreanLaporan.map((lap) => {
                const selisihCount = lap.items.filter((i) => i.selisih !== 0).length;
                const totalWaste = lap.waste.reduce((s, w) => s + w.nilai, 0);
                return (
                  <div
                    key={lap.id}
                    className="flex flex-col justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 sm:flex-row sm:items-center"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={lap.divisi === 'barista' ? 'primary' : 'success'}>
                          {lap.divisi === 'barista' ? 'Barista' : 'Kitchen'}
                        </Badge>
                        <Badge tone="neutral" dot={false}>
                          {shiftNama(lap.shiftId)} · {lap.sesi === 'opening' ? 'Opening' : 'Closing'}
                        </Badge>
                        <Badge tone={lapStatusTone(lap.status)}>
                          {lap.status === 'terkirim'
                            ? 'Menunggu Verifikasi'
                            : lap.status === 'diverifikasi'
                              ? 'Diverifikasi'
                              : lap.status === 'dikembalikan'
                                ? 'Dikembalikan'
                                : 'Draft'}
                        </Badge>
                      </div>
                      <p className="text-[14px] font-medium text-[#0F172A]">
                        {formatTanggal(lap.tanggal)} · {petugasNama(lap.petugasId)}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-[12px] font-normal text-[#64748B]">
                        <span>{lap.items.length} bahan diopname</span>
                        <span>·</span>
                        <span className={selisihCount > 0 ? 'font-medium text-[#B45309]' : ''}>
                          {selisihCount} selisih
                        </span>
                        <span>·</span>
                        <span className={lap.waste.length > 0 ? 'font-medium text-[#DC2626]' : ''}>
                          {lap.waste.length} waste ({formatRp(totalWaste)})
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setInspectLaporan(lap)}>
                        Detail
                      </Button>
                      {lap.status === 'terkirim' && (
                        <>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => {
                              setReturnReason('');
                              setReturnModalLap(lap);
                            }}
                          >
                            Kembalikan
                          </Button>
                          <Button variant="primary" size="sm" onClick={() => handleVerifikasi(lap)}>
                            Verifikasi
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Right: Bahan Perlu Perhatian & Aksi Cepat PO */}
        <Card className="flex flex-col gap-4 lg:col-span-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[15px] font-semibold text-[#0F172A]">Bahan Perlu Restock</h2>
            <Link href="/logistik/persediaan">
              <Button variant="ghost" size="sm">
                Semua
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </Link>
          </div>

          {kritisBahan.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-5 text-center">
              <p className="text-[13px] font-medium text-[#0F172A]">Seluruh stok aman</p>
              <p className="mt-1 text-[12px] font-normal text-[#64748B]">
                Belum ada bahan yang menyentuh batas stok minimum.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {kritisBahan.slice(0, 6).map(({ b, stok, status }) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium text-[#0F172A]">{b.nama}</div>
                    <div className="text-[12px] font-normal capitalize text-[#64748B]">
                      {b.divisi} · Min {formatQty(b.stokMinimum, b.satuan)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`tabular-mono text-[13px] font-semibold ${
                        status === 'menipis' ? 'text-[#B45309]' : 'text-[#DC2626]'
                      }`}
                    >
                      {formatQty(stok, b.satuan)}
                    </div>
                    <Badge tone={status === 'menipis' ? 'warning' : 'danger'} dot={false}>
                      {status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Link href="/logistik/po" className="mt-auto">
            <Button className="w-full">
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
              Ajukan Purchase Order
            </Button>
          </Link>
        </Card>
      </div>

      {/* Modal Detail Laporan */}
      <Modal
        open={Boolean(inspectLaporan)}
        onClose={() => setInspectLaporan(null)}
        title="Detail Laporan Stok Divisi"
        badgeEl={
          inspectLaporan && (
            <Badge tone={lapStatusTone(inspectLaporan.status)}>
              {inspectLaporan.status.toUpperCase()}
            </Badge>
          )
        }
      >
        {inspectLaporan && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-[12px] sm:grid-cols-3">
              <div>
                <p className="text-[#64748B]">Tanggal &amp; Shift</p>
                <p className="font-medium text-[#0F172A]">
                  {formatTanggal(inspectLaporan.tanggal)} · {shiftNama(inspectLaporan.shiftId)}
                </p>
              </div>
              <div>
                <p className="text-[#64748B]">Divisi &amp; Sesi</p>
                <p className="font-medium capitalize text-[#0F172A]">
                  {inspectLaporan.divisi} · {inspectLaporan.sesi}
                </p>
              </div>
              <div>
                <p className="text-[#64748B]">Petugas</p>
                <p className="font-medium text-[#0F172A]">{petugasNama(inspectLaporan.petugasId)}</p>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto rounded-xl border border-[#E2E8F0]">
              <table className="w-full border-collapse text-left text-[13px]">
                <thead className="bg-[#F8FAFC] text-[12px] font-semibold text-[#64748B]">
                  <tr>
                    <th className="px-3 py-2">Bahan</th>
                    <th className="px-3 py-2 text-right">Sistem</th>
                    <th className="px-3 py-2 text-right">Fisik</th>
                    <th className="px-3 py-2 text-right">Selisih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {inspectLaporan.items.map((item) => {
                    const b = bahan.find((x) => x.id === item.bahanId);
                    return (
                      <tr key={item.bahanId}>
                        <td className="px-3 py-2 text-[#0F172A]">{b?.nama || item.bahanId}</td>
                        <td className="tabular-mono px-3 py-2 text-right text-[#64748B]">
                          {formatQty(item.stokSistem, b?.satuan || '')}
                        </td>
                        <td className="tabular-mono px-3 py-2 text-right font-medium">
                          {formatQty(item.stokFisik, b?.satuan || '')}
                        </td>
                        <td
                          className={`tabular-mono px-3 py-2 text-right font-semibold ${
                            item.selisih === 0
                              ? 'text-[#15803D]'
                              : item.selisih < 0
                                ? 'text-[#DC2626]'
                                : 'text-[#B45309]'
                          }`}
                        >
                          {item.selisih > 0 ? `+${item.selisih}` : item.selisih}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-[#E2E8F0] pt-3 text-[12px] text-[#64748B]">
              <span>Dikirim: {formatWaktu(inspectLaporan.submittedAt || inspectLaporan.createdAt)}</span>
              {inspectLaporan.status === 'terkirim' && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setReturnReason('');
                      setReturnModalLap(inspectLaporan);
                    }}
                  >
                    <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    Kembalikan
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => handleVerifikasi(inspectLaporan)}>
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Verifikasi
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Alasan Kembalikan */}
      <Modal
        open={Boolean(returnModalLap)}
        onClose={() => setReturnModalLap(null)}
        title="Kembalikan Laporan ke Divisi"
      >
        <div className="space-y-4">
          <p className="text-[13px] font-normal text-[#64748B]">
            Berikan catatan revisi untuk petugas{' '}
            <span className="font-medium capitalize text-[#0F172A]">{returnModalLap?.divisi}</span>.
          </p>
          <textarea
            rows={3}
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
            placeholder="Contoh: Selisih susu UHT belum disertai keterangan waste."
            className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-[14px] text-[#0F172A] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setReturnModalLap(null)}>
              Batal
            </Button>
            <Button variant="dangerSolid" onClick={handleConfirmReturn}>
              Kembalikan Laporan
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
