'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  PackagePlus,
  RotateCcw,
  ShoppingCart,
  Truck,
  XCircle,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Badge, Button, Card, EmptyState, Modal, StockBar } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/ToastProvider';
import { useBreakfreeStore } from '@/lib/store/useBreakfreeStore';
import {
  formatQty,
  formatRp,
  formatTanggal,
  formatWaktu,
  hitungRekomendasiBahan,
  isWeekendISO,
  todayISO,
} from '@/lib/domain/calculations';
import type { AlasanWaste, LaporanStok, StatusLaporanStok, StatusRetur } from '@/lib/types';

interface VerifiedWasteCandidate {
  wasteId: string;
  laporanId: string;
  tanggal: string;
  divisi: string;
  bahanId: string;
  bahanNama: string;
  satuan: string;
  sumber: 'internal' | 'eksternal';
  qty: number;
  nilai: number;
  alasan: AlasanWaste;
  catatan: string;
}

export default function LogistikPage() {
  const router = useRouter();
  const { pushToast } = useToast();

  const {
    bahan,
    shifts,
    pegawai,
    suppliers,
    stockMovements,
    laporanStok,
    returs,
    purchaseOrders,
    settings,
    activePetugasId,
    verifikasiLaporanStok,
    buatReturDariWaste,
    updateStatusRetur,
    buatPurchaseOrder,
  } = useBreakfreeStore();

  const [filterLap, setFilterLap] = useState<'perlu' | 'semua'>('perlu');
  const [inspectLaporan, setInspectLaporan] = useState<LaporanStok | null>(null);
  const [returnModalLap, setReturnModalLap] = useState<LaporanStok | null>(null);
  const [returnReason, setReturnReason] = useState('');

  const [selectedWasteIds, setSelectedWasteIds] = useState<Record<string, boolean>>({});

  const [pakemWeekend, setPakemWeekend] = useState<boolean>(() => isWeekendISO(todayISO()));
  const [showAllBahan, setShowAllBahan] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(() => suppliers[0]?.id ?? '');
  const [checkedBahan, setCheckedBahan] = useState<Record<string, boolean>>({});
  const [customQtyMap, setCustomQtyMap] = useState<Record<string, number>>({});
  const [customHargaMap, setCustomHargaMap] = useState<Record<string, number>>({});
  const [poCatatan, setPoCatatan] = useState('');

  const effectiveSupplierId = selectedSupplierId || suppliers[0]?.id || '';

  const petugasNama = (id: string) => pegawai.find((p) => p.id === id)?.nama || 'Petugas';
  const shiftNama = (id: string) => shifts.find((s) => s.id === id)?.nama || id;
  const activeVerifier =
    pegawai.find((p) => p.id === activePetugasId && p.aktif)?.nama || 'Staf Logistik';

  const antreanLaporan = useMemo(() => {
    const sorted = [...laporanStok].sort((a, b) =>
      (b.submittedAt || b.createdAt).localeCompare(a.submittedAt || a.createdAt)
    );
    if (filterLap === 'perlu') {
      return sorted.filter((l) => l.status === 'terkirim');
    }
    return sorted;
  }, [laporanStok, filterLap]);

  const countPerluVerifikasi = useMemo(
    () => laporanStok.filter((l) => l.status === 'terkirim').length,
    [laporanStok]
  );

  const verifiedWasteCandidates = useMemo<VerifiedWasteCandidate[]>(() => {
    const out: VerifiedWasteCandidate[] = [];
    for (const lap of laporanStok) {
      if (lap.status !== 'diverifikasi') continue;
      for (const w of lap.waste) {
        if (w.returId) continue;
        const b = bahan.find((x) => x.id === w.bahanId);
        if (!b) continue;
        out.push({
          wasteId: w.id,
          laporanId: lap.id,
          tanggal: lap.tanggal,
          divisi: lap.divisi,
          bahanId: w.bahanId,
          bahanNama: b.nama,
          satuan: b.satuan,
          sumber: b.sumber,
          qty: w.qty,
          nilai: w.nilai,
          alasan: w.alasan,
          catatan: w.catatan,
        });
      }
    }
    return out;
  }, [laporanStok, bahan]);

  const rekomendasiRows = useMemo(() => {
    return bahan
      .map((b) =>
        hitungRekomendasiBahan(
          b,
          stockMovements,
          laporanStok,
          purchaseOrders,
          settings.faktorAkhirPekan,
          pakemWeekend
        )
      )
      .sort((a, b) => {
        const weight = { habis: 0, kritis: 1, menipis: 2, aman: 3 } as const;
        if (weight[a.status] !== weight[b.status]) {
          return weight[a.status] - weight[b.status];
        }
        return b.rekomendasiQty - a.rekomendasiQty;
      });
  }, [bahan, stockMovements, laporanStok, purchaseOrders, settings.faktorAkhirPekan, pakemWeekend]);

  const visibleRekomendasi = useMemo(() => {
    if (showAllBahan) return rekomendasiRows;
    const needed = rekomendasiRows.filter(
      (r) => r.rekomendasiQty > 0 || r.status !== 'aman'
    );
    return needed.length > 0 ? needed : rekomendasiRows;
  }, [rekomendasiRows, showAllBahan]);

  const selectedPOItems = useMemo(() => {
    return visibleRekomendasi
      .filter((r) => checkedBahan[r.bahan.id])
      .map((r) => {
        const qty = customQtyMap[r.bahan.id] ?? (r.rekomendasiQty > 0 ? r.rekomendasiQty : 1);
        const harga = customHargaMap[r.bahan.id] ?? r.bahan.hargaSatuan;
        return {
          bahan: r.bahan,
          qty: Math.max(1, qty),
          harga: Math.max(0, harga),
        };
      });
  }, [visibleRekomendasi, checkedBahan, customQtyMap, customHargaMap]);

  const totalPOEstimate = useMemo(
    () => selectedPOItems.reduce((acc, item) => acc + item.qty * item.harga, 0),
    [selectedPOItems]
  );

  const handleVerifikasi = (lap: LaporanStok) => {
    verifikasiLaporanStok(lap.id, 'diverifikasi', activeVerifier, 'Terverifikasi oleh Logistik');
    setInspectLaporan(null);
    pushToast(
      `Laporan ${lap.divisi} (${formatTanggal(lap.tanggal)}) diverifikasi & stok diperbarui.`,
      'success'
    );
  };

  const handleConfirmReturn = () => {
    if (!returnModalLap) return;
    if (!returnReason.trim()) {
      pushToast('Tuliskan alasan pengembalian laporan agar petugas tahu perbaikannya.', 'warning');
      return;
    }
    verifikasiLaporanStok(returnModalLap.id, 'dikembalikan', activeVerifier, returnReason.trim());
    pushToast('Laporan dikembalikan ke divisi terkait untuk revisi.', 'info');
    setReturnModalLap(null);
    setReturnReason('');
    setInspectLaporan(null);
  };

  const handleBuatRetur = () => {
    const ids = Object.entries(selectedWasteIds)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (ids.length === 0) {
      pushToast('Pilih minimal 1 item waste terverifikasi untuk dibuatkan Retur H+1.', 'warning');
      return;
    }
    const created = buatReturDariWaste(ids);
    if (created) {
      setSelectedWasteIds({});
      pushToast(
        `Dokumen Retur ${created.nomor} dibuat. Target barang pengganti: ${formatTanggal(
          created.tanggalPengganti
        )} (H+1).`,
        'success'
      );
    }
  };

  const handleBuatPOPenggantiDariRetur = (returId: string) => {
    const ret = returs.find((r) => r.id === returId);
    if (!ret) return;
    if (!effectiveSupplierId) {
      pushToast('Tambahkan minimal 1 Supplier di Master Data terlebih dahulu.', 'warning');
      return;
    }
    const items = ret.ringkasanItem.map((ri) => {
      const b = bahan.find((x) => x.id === ri.bahanId);
      return {
        bahanId: ri.bahanId,
        qty: ri.qty,
        harga: b?.hargaSatuan ?? 0,
      };
    });
    const po = buatPurchaseOrder({
      supplierId: effectiveSupplierId,
      items,
      returId: ret.id,
      catatan: `PO Pengganti Retur BOP ${ret.nomor} (H+1)`,
      ajukanLangsung: true,
    });
    pushToast(`PO Pengganti ${po.nomor} berhasil dibuat & diajukan ke Manajemen.`, 'success');
    router.push(`/logistik/po?id=${po.id}`);
  };

  const handleSelectAllRecommended = () => {
    const next: Record<string, boolean> = {};
    let any = false;
    for (const r of visibleRekomendasi) {
      if (r.rekomendasiQty > 0 || r.status === 'habis' || r.status === 'kritis') {
        next[r.bahan.id] = true;
        any = true;
      }
    }
    if (!any) {
      pushToast('Semua bahan dalam kondisi aman tanpa rekomendasi tambah beli.', 'info');
      return;
    }
    setCheckedBahan(next);
  };

  const handleCreatePO = (ajukanLangsung: boolean) => {
    if (!effectiveSupplierId) {
      pushToast('Pilih supplier terlebih dahulu (atau tambah di Master Data).', 'warning');
      return;
    }
    if (selectedPOItems.length === 0) {
      pushToast('Centang minimal 1 bahan pada tabel Rekomendasi PO.', 'warning');
      return;
    }
    const po = buatPurchaseOrder({
      supplierId: effectiveSupplierId,
      items: selectedPOItems.map((i) => ({
        bahanId: i.bahan.id,
        qty: i.qty,
        harga: i.harga,
      })),
      catatan:
        poCatatan.trim() ||
        (pakemWeekend
          ? `Restock berdasarkan Pakem Akhir Pekan (x${settings.faktorAkhirPekan})`
          : 'Restock reguler berdasarkan stok minimum & rata-rata waste'),
      ajukanLangsung,
    });
    setCheckedBahan({});
    setPoCatatan('');
    pushToast(
      `PO ${po.nomor} ${ajukanLangsung ? 'berhasil diajukan ke Manajemen' : 'disimpan sebagai draft'}.`,
      'success'
    );
    router.push(`/logistik/po?id=${po.id}`);
  };

  const lapStatusTone = (status: StatusLaporanStok) => {
    switch (status) {
      case 'diverifikasi':
        return 'success';
      case 'terkirim':
        return 'warning';
      case 'dikembalikan':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  const returStatusBadge = (status: StatusRetur) => {
    if (status === 'pengganti_diterima') {
      return <Badge tone="success">Pengganti Diterima</Badge>;
    }
    if (status === 'ditarik') {
      return <Badge tone="info">Sudah Ditarik BOP</Badge>;
    }
    return <Badge tone="warning">Diajukan</Badge>;
  };

  return (
    <AppShell pageTitle="Verifikasi, Retur BOP & Rekomendasi PO">
      <div className="space-y-6">
        {/* Ringkasan Operasional Logistik */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium text-[#64748B]">Antrean Verifikasi</p>
              <p className="tabular-mono mt-1 text-2xl font-bold text-[#0F172A]">
                {countPerluVerifikasi}
              </p>
              <p className="text-[11px] text-[#64748B]">Laporan status terkirim</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FFFBEB] text-[#D97706]">
              <ClipboardCheck className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </div>
          </Card>

          <Card className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium text-[#64748B]">Waste Siap Retur BOP</p>
              <p className="tabular-mono mt-1 text-2xl font-bold text-[#0F172A]">
                {verifiedWasteCandidates.length}
              </p>
              <p className="text-[11px] text-[#64748B]">Item waste belum diproses</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FEF2F2] text-[#DC2626]">
              <RotateCcw className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </div>
          </Card>

          <Card className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium text-[#64748B]">Retur Aktif (H+1)</p>
              <p className="tabular-mono mt-1 text-2xl font-bold text-[#0F172A]">
                {returs.filter((r) => r.status !== 'pengganti_diterima').length}
              </p>
              <p className="text-[11px] text-[#64748B]">Menunggu tarik / pengganti</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2563EB]">
              <Truck className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </div>
          </Card>

          <Card className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs font-medium text-[#64748B]">Perlu Restock</p>
              <p className="tabular-mono mt-1 text-2xl font-bold text-[#0F172A]">
                {rekomendasiRows.filter((r) => r.rekomendasiQty > 0).length}
              </p>
              <p className="text-[11px] text-[#64748B]">
                {pakemWeekend ? `Mode Pakem x${settings.faktorAkhirPekan}` : 'Mode Hari Biasa'}
              </p>
            </div>
            <Link
              href="/logistik/po"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] transition-colors hover:border-[#2563EB] hover:bg-[#2563EB] hover:text-white"
              title="Buka Daftar & Detail PO"
              aria-label="Buka Daftar dan Detail PO"
            >
              <ExternalLink className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </Link>
          </Card>
        </div>

        {/* Grid 2 Kolom: Verifikasi Laporan + Retur BOP H+1 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Kolom Kiri (7 col): Antrean Verifikasi Laporan Stok */}
          <Card className="p-5 lg:col-span-7">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[16px] font-semibold text-[#0F172A]">
                  Antrean Verifikasi Laporan Stok Divisi
                </h2>
                <p className="text-xs text-[#64748B]">
                  Verifikasi laporan Barista &amp; Kitchen sebelum stok sistem disesuaikan.
                </p>
              </div>
              <div className="inline-flex rounded-lg border border-[#E2E8F0] bg-[#F1F5F9] p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setFilterLap('perlu')}
                  className={`rounded-md px-3 py-1 transition-all ${
                    filterLap === 'perlu'
                      ? 'bg-white font-semibold text-[#2563EB] shadow-[0_1px_2px_rgba(15,23,42,0.08)]'
                      : 'font-medium text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  Perlu Verifikasi ({countPerluVerifikasi})
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
                  Semua ({laporanStok.length})
                </button>
              </div>
            </div>

            {antreanLaporan.length === 0 ? (
              <EmptyState
                title={
                  filterLap === 'perlu'
                    ? 'Tidak ada laporan menunggu verifikasi'
                    : 'Belum ada laporan stok masuk'
                }
                description={
                  filterLap === 'perlu'
                    ? 'Semua laporan stok yang dikirim Barista dan Kitchen sudah diproses.'
                    : 'Petugas Barista atau Kitchen dapat mengisi rekap stok di halaman masing-masing.'
                }
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
                        <p className="text-sm font-semibold text-[#0F172A]">
                          {formatTanggal(lap.tanggal)} · {petugasNama(lap.petugasId)}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#64748B]">
                          <span>{lap.items.length} item diopname</span>
                          <span>·</span>
                          <span className={selisihCount > 0 ? 'font-semibold text-[#B45309]' : ''}>
                            {selisihCount} selisih stok
                          </span>
                          <span>·</span>
                          <span className={lap.waste.length > 0 ? 'font-semibold text-[#DC2626]' : ''}>
                            {lap.waste.length} waste ({formatRp(totalWaste)})
                          </span>
                        </div>
                        {lap.catatanVerifikasi && lap.status !== 'terkirim' && (
                          <p className="text-xs italic text-[#64748B]">
                            Catatan: {lap.catatanVerifikasi}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setInspectLaporan(lap)}
                        >
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
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleVerifikasi(lap)}
                            >
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

          {/* Kolom Kanan (5 col): Retur BOP & Pengganti H+1 */}
          <Card className="flex flex-col gap-4 p-5 lg:col-span-5">
            <div>
              <h2 className="text-[16px] font-semibold text-[#0F172A]">
                Pelacak Retur BOP &amp; Pengganti H+1
              </h2>
              <p className="text-xs text-[#64748B]">
                Waste terverifikasi ditarik oleh BOP dan diganti keesokan hari (H+1).
              </p>
            </div>

            <div className="space-y-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  Waste Terverifikasi Siap Retur ({verifiedWasteCandidates.length})
                </p>
                {verifiedWasteCandidates.length > 0 && (
                  <Button variant="primary" size="sm" onClick={handleBuatRetur}>
                    Buat Retur H+1
                  </Button>
                )}
              </div>

              {verifiedWasteCandidates.length === 0 ? (
                <p className="py-2 text-xs text-[#64748B]">
                  Belum ada item waste terverifikasi yang menunggu pengajuan retur.
                </p>
              ) : (
                <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                  {verifiedWasteCandidates.map((w) => {
                    const checked = Boolean(selectedWasteIds[w.wasteId]);
                    return (
                      <label
                        key={w.wasteId}
                        className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition-colors ${
                          checked
                            ? 'border-[#2563EB] bg-[#EFF6FF]/40'
                            : 'border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setSelectedWasteIds((prev) => ({
                              ...prev,
                              [w.wasteId]: e.target.checked,
                            }))
                          }
                          className="mt-0.5 h-4 w-4 rounded accent-[#2563EB]"
                        />
                        <div className="min-w-0 flex-1 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate font-semibold text-[#0F172A]">
                              {w.bahanNama}
                            </span>
                            <span className="tabular-mono font-semibold text-[#DC2626]">
                              {formatQty(w.qty, w.satuan)}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#64748B]">
                            {w.alasan} · {formatTanggal(w.tanggal)} ({w.divisi})
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                Dokumen Retur ({returs.length})
              </p>
              {returs.length === 0 ? (
                <EmptyState
                  title="Belum ada dokumen retur"
                  description="Centang item waste terverifikasi di atas untuk membuat dokumen Retur H+1."
                />
              ) : (
                <div className="max-h-80 space-y-2.5 overflow-y-auto pr-1">
                  {returs.map((ret) => (
                    <div
                      key={ret.id}
                      className="space-y-2 rounded-xl border border-[#E2E8F0] bg-white p-3.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="tabular-mono text-xs font-semibold text-[#0F172A]">
                          {ret.nomor}
                        </span>
                        {returStatusBadge(ret.status)}
                      </div>
                      <div className="space-y-0.5 text-xs text-[#334155]">
                        {ret.ringkasanItem.map((ri, idx) => {
                          const b = bahan.find((x) => x.id === ri.bahanId);
                          return (
                            <p key={idx}>
                              · {b?.nama || ri.bahanId}:{' '}
                              <span className="tabular-mono font-semibold text-[#0F172A]">
                                {formatQty(ri.qty, b?.satuan || '')}
                              </span>{' '}
                              <span className="text-[#64748B]">({ri.alasan})</span>
                            </p>
                          );
                        })}
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E2E8F0] pt-2">
                        <span className="text-[11px] text-[#64748B]">
                          Target Pengganti:{' '}
                          <strong className="font-semibold text-[#0F172A]">
                            {formatTanggal(ret.tanggalPengganti)}
                          </strong>
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {ret.status === 'diajukan' && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                updateStatusRetur(ret.id, 'ditarik');
                                pushToast(`Retur ${ret.nomor} ditandai sudah ditarik BOP.`, 'info');
                              }}
                            >
                              Tandai Ditarik
                            </Button>
                          )}
                          {!ret.poId && ret.status !== 'pengganti_diterima' && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleBuatPOPenggantiDariRetur(ret.id)}
                            >
                              Buat PO Pengganti
                            </Button>
                          )}
                          {ret.poId && (
                            <Link
                              href={`/logistik/po?id=${ret.poId}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-2.5 py-1 text-xs font-semibold text-[#2563EB] hover:bg-[#DBEAFE]"
                            >
                              Lihat PO <ExternalLink className="h-3 w-3" aria-hidden="true" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Section 3: Rekomendasi Pembelian (Auto-Order & Pakem Akhir Pekan) */}
        <Card className="space-y-4 p-5">
          <div className="flex flex-col justify-between gap-4 border-b border-[#E2E8F0] pb-4 lg:flex-row lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[16px] font-semibold text-[#0F172A]">
                  Rekomendasi Pembelian Bahan (Auto-Order)
                </h2>
                <Badge tone={pakemWeekend ? 'primary' : 'neutral'} dot={false}>
                  <CalendarClock className="h-3 w-3" aria-hidden="true" />
                  {pakemWeekend
                    ? `Pakem Akhir Pekan Aktif (x${settings.faktorAkhirPekan})`
                    : 'Standar Hari Kerja (x1.0)'}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-[#64748B]">
                Dihitung otomatis dari stok saat ini, batas stok minimum, rata-rata waste 7 hari, dan PO yang sedang berjalan.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs font-medium text-[#0F172A]">
                <input
                  type="checkbox"
                  checked={pakemWeekend}
                  onChange={(e) => setPakemWeekend(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#2563EB]"
                />
                Pakem Sabtu-Minggu (x{settings.faktorAkhirPekan})
              </label>

              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs font-medium text-[#0F172A]">
                <input
                  type="checkbox"
                  checked={showAllBahan}
                  onChange={(e) => setShowAllBahan(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#2563EB]"
                />
                Tampilkan Semua Bahan ({bahan.length})
              </label>

              <Button variant="secondary" size="sm" onClick={handleSelectAllRecommended}>
                Pilih Semua Rekomendasi
              </Button>
            </div>
          </div>

          {bahan.length === 0 ? (
            <EmptyState
              title="Belum ada master bahan"
              description="Tambahkan bahan baku di menu Master Data sebelum membuat Purchase Order."
              action={
                <Link href="/master">
                  <Button variant="primary" size="sm">
                    Buka Master Data
                  </Button>
                </Link>
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      <th className="w-10 rounded-l-lg px-2 py-2.5">Pilih</th>
                      <th className="px-3 py-2.5">Bahan &amp; Sumber</th>
                      <th className="px-3 py-2.5">Status Stok</th>
                      <th className="px-3 py-2.5 text-right">Target</th>
                      <th className="px-3 py-2.5 text-right">Waste 7H</th>
                      <th className="px-3 py-2.5 text-right">PO Aktif</th>
                      <th className="px-3 py-2.5 text-right">Saran Beli</th>
                      <th className="px-3 py-2.5 text-right">Qty PO</th>
                      <th className="rounded-r-lg px-3 py-2.5 text-right">Harga Satuan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-[13px]">
                    {visibleRekomendasi.map((row) => {
                      const isChecked = Boolean(checkedBahan[row.bahan.id]);
                      const qtyVal =
                        customQtyMap[row.bahan.id] ??
                        (row.rekomendasiQty > 0 ? row.rekomendasiQty : 1);
                      const hargaVal = customHargaMap[row.bahan.id] ?? row.bahan.hargaSatuan;

                      return (
                        <tr
                          key={row.bahan.id}
                          className={isChecked ? 'bg-[#EFF6FF]/40' : 'hover:bg-[#F8FAFC]'}
                        >
                          <td className="px-2 py-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) =>
                                setCheckedBahan((prev) => ({
                                  ...prev,
                                  [row.bahan.id]: e.target.checked,
                                }))
                              }
                              className="h-4 w-4 rounded accent-[#2563EB]"
                              aria-label={`Pilih ${row.bahan.nama}`}
                            />
                          </td>
                          <td className="px-3 py-3">
                            <p className="font-semibold text-[#0F172A]">{row.bahan.nama}</p>
                            <div className="mt-0.5 flex items-center gap-1.5">
                              <span className="text-[11px] text-[#64748B]">{row.bahan.kategori}</span>
                              <span className="text-[11px] text-[#CBD5E1]">·</span>
                              <span className="text-[11px] font-medium text-[#2563EB]">
                                {row.bahan.sumber === 'internal' ? 'Internal' : 'Eksternal'}
                              </span>
                            </div>
                          </td>
                          <td className="min-w-[160px] px-3 py-3">
                            <div className="mb-1 flex items-center justify-between text-xs">
                              <span className="tabular-mono font-semibold text-[#0F172A]">
                                {formatQty(row.stokSaatIni, row.bahan.satuan)}
                              </span>
                              <Badge
                                tone={
                                  row.status === 'aman'
                                    ? 'success'
                                    : row.status === 'menipis'
                                      ? 'warning'
                                      : 'danger'
                                }
                              >
                                {row.status.toUpperCase()}
                              </Badge>
                            </div>
                            <StockBar
                              current={row.stokSaatIni}
                              min={row.bahan.stokMinimum}
                              status={row.status}
                            />
                          </td>
                          <td className="tabular-mono px-3 py-3 text-right text-xs text-[#64748B]">
                            {formatQty(row.targetStok, row.bahan.satuan)}
                          </td>
                          <td className="tabular-mono px-3 py-3 text-right text-xs text-[#64748B]">
                            {formatQty(row.totalWaste7H, row.bahan.satuan)}
                          </td>
                          <td className="tabular-mono px-3 py-3 text-right text-xs text-[#64748B]">
                            {row.qtyPOBerjalan > 0
                              ? formatQty(row.qtyPOBerjalan, row.bahan.satuan)
                              : '-'}
                          </td>
                          <td className="tabular-mono px-3 py-3 text-right font-semibold text-[#2563EB]">
                            {row.rekomendasiQty > 0
                              ? formatQty(row.rekomendasiQty, row.bahan.satuan)
                              : 'Cukup'}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <input
                              type="number"
                              min={1}
                              value={qtyVal}
                              onChange={(e) => {
                                const v = Math.max(1, Number(e.target.value) || 1);
                                setCustomQtyMap((prev) => ({ ...prev, [row.bahan.id]: v }));
                                if (!isChecked) {
                                  setCheckedBahan((prev) => ({ ...prev, [row.bahan.id]: true }));
                                }
                              }}
                              aria-label={`Qty PO ${row.bahan.nama}`}
                              className="tabular-mono w-20 rounded-lg border border-[#E2E8F0] bg-white px-2 py-1 text-right text-xs font-normal text-[#0F172A] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                            />
                          </td>
                          <td className="px-3 py-3 text-right">
                            <input
                              type="number"
                              min={0}
                              step={500}
                              value={hargaVal}
                              onChange={(e) => {
                                const v = Math.max(0, Number(e.target.value) || 0);
                                setCustomHargaMap((prev) => ({ ...prev, [row.bahan.id]: v }));
                              }}
                              aria-label={`Harga satuan ${row.bahan.nama}`}
                              className="tabular-mono w-28 rounded-lg border border-[#E2E8F0] bg-white px-2 py-1 text-right text-xs font-normal text-[#0F172A] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Action Bar Buat PO */}
              <div className="flex flex-col justify-between gap-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 lg:flex-row lg:items-center">
                <div className="flex flex-1 flex-wrap items-center gap-3">
                  <div className="min-w-[200px]">
                    <label
                      htmlFor="log-sup-select"
                      className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#64748B]"
                    >
                      Supplier Tujuan
                    </label>
                    <select
                      id="log-sup-select"
                      value={effectiveSupplierId}
                      onChange={(e) => setSelectedSupplierId(e.target.value)}
                      className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-medium text-[#0F172A] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                    >
                      {suppliers.length === 0 && <option value="">Belum ada supplier</option>}
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nama} ({s.kategori})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="min-w-[220px] flex-1">
                    <label
                      htmlFor="log-po-note"
                      className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#64748B]"
                    >
                      Catatan Purchase Order (Opsional)
                    </label>
                    <input
                      id="log-po-note"
                      type="text"
                      value={poCatatan}
                      onChange={(e) => setPoCatatan(e.target.value)}
                      placeholder="Misal: Kirim besok pagi sebelum shift 1 buka..."
                      className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-[#0F172A] placeholder:text-[#64748B] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 lg:justify-end">
                  <div className="text-right">
                    <p className="text-[11px] font-medium text-[#64748B]">
                      {selectedPOItems.length} item dipilih · Estimasi Total
                    </p>
                    <p className="tabular-mono text-lg font-bold text-[#0F172A]">
                      {formatRp(totalPOEstimate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => handleCreatePO(false)}
                      disabled={selectedPOItems.length === 0}
                    >
                      <PackagePlus className="h-4 w-4" aria-hidden="true" />
                      Simpan Draft
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => handleCreatePO(true)}
                      disabled={selectedPOItems.length === 0}
                    >
                      <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                      Buat &amp; Ajukan PO
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Modal Detail Laporan Stok */}
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
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs sm:grid-cols-3">
              <div>
                <p className="text-[#64748B]">Tanggal &amp; Shift</p>
                <p className="font-semibold text-[#0F172A]">
                  {formatTanggal(inspectLaporan.tanggal)} · {shiftNama(inspectLaporan.shiftId)}
                </p>
              </div>
              <div>
                <p className="text-[#64748B]">Divisi &amp; Sesi</p>
                <p className="font-semibold capitalize text-[#0F172A]">
                  {inspectLaporan.divisi} · {inspectLaporan.sesi}
                </p>
              </div>
              <div>
                <p className="text-[#64748B]">Petugas Input</p>
                <p className="font-semibold text-[#0F172A]">{petugasNama(inspectLaporan.petugasId)}</p>
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                Item Stok Opname ({inspectLaporan.items.length})
              </h4>
              <div className="max-h-60 overflow-y-auto rounded-xl border border-[#E2E8F0]">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-[#F8FAFC] text-[#64748B]">
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
                          <td className="px-3 py-2 font-semibold text-[#0F172A]">
                            {b?.nama || item.bahanId}
                            {item.catatan && (
                              <span className="block text-[11px] font-normal text-[#64748B]">
                                {item.catatan}
                              </span>
                            )}
                          </td>
                          <td className="tabular-mono px-3 py-2 text-right">
                            {formatQty(item.stokSistem, b?.satuan || '')}
                          </td>
                          <td className="tabular-mono px-3 py-2 text-right font-semibold">
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
            </div>

            {inspectLaporan.waste.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#B91C1C]">
                  Catatan Waste ({inspectLaporan.waste.length})
                </h4>
                <div className="space-y-1.5">
                  {inspectLaporan.waste.map((w) => {
                    const b = bahan.find((x) => x.id === w.bahanId);
                    return (
                      <div
                        key={w.id}
                        className="flex items-center justify-between rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs"
                      >
                        <div>
                          <span className="font-semibold text-[#0F172A]">{b?.nama || w.bahanId}</span>
                          <span className="text-[#64748B]">
                            {' '}
                            · {w.alasan}
                            {w.catatan ? ` (${w.catatan})` : ''}
                          </span>
                        </div>
                        <span className="tabular-mono font-semibold text-[#DC2626]">
                          {formatQty(w.qty, b?.satuan || '')} · {formatRp(w.nilai)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-[#E2E8F0] pt-3 text-[11px] text-[#64748B]">
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
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleVerifikasi(inspectLaporan)}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Verifikasi &amp; Perbarui Stok
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Alasan Kembalikan Laporan */}
      <Modal
        open={Boolean(returnModalLap)}
        onClose={() => setReturnModalLap(null)}
        title="Kembalikan Laporan ke Divisi"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#64748B]">
            Tuliskan alasan pengembalian agar petugas{' '}
            <strong className="font-semibold capitalize text-[#0F172A]">{returnModalLap?.divisi}</strong> dapat
            memperbaiki input stok fisiknya.
          </p>
          <textarea
            rows={3}
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
            placeholder="Contoh: Selisih susu UHT belum disertai keterangan waste atau foto botol rusak."
            className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
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
