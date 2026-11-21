'use client';

import React, { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  PackageCheck,
  Plus,
  Send,
  SlidersHorizontal,
  XCircle,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Badge, Button, Card, EmptyState, Modal, StockBar } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/ToastProvider';
import { useBreakfreeStore } from '@/lib/store/useBreakfreeStore';
import {
  evaluasiStatusStok,
  formatQty,
  formatRp,
  formatTanggal,
  formatWaktu,
  hitungStokSaatIni,
} from '@/lib/domain/calculations';
import type { StatusPO, StockMovementType } from '@/lib/types';

function poStatusTone(status: StatusPO) {
  switch (status) {
    case 'diterima':
      return 'success';
    case 'disetujui':
    case 'diterima_sebagian':
      return 'info';
    case 'diajukan':
      return 'warning';
    case 'ditolak':
    case 'dibatalkan':
      return 'danger';
    default:
      return 'neutral';
  }
}

function poStatusLabel(status: StatusPO) {
  const labels: Record<StatusPO, string> = {
    draft: 'Draft',
    diajukan: 'Menunggu Approval',
    disetujui: 'Disetujui',
    ditolak: 'Ditolak',
    diterima_sebagian: 'Diterima Sebagian',
    diterima: 'Selesai Diterima',
    dibatalkan: 'Dibatalkan',
  };
  return labels[status];
}

function movementBadgeTone(tipe: StockMovementType) {
  switch (tipe) {
    case 'PO_RECEIVE':
    case 'INITIAL':
      return 'success';
    case 'WASTE':
    case 'RETUR_OUT':
      return 'danger';
    case 'OPNAME_ADJUST':
    case 'MANUAL_ADJUST':
      return 'info';
    default:
      return 'neutral';
  }
}

function DetailPOAndKartuStokInner() {
  const searchParams = useSearchParams();
  const queryPoId = searchParams.get('id');
  const { pushToast } = useToast();

  const {
    bahan,
    suppliers,
    returs,
    purchaseOrders,
    stockMovements,
    ubahStatusPO,
    terimaBarangPO,
    buatPurchaseOrder,
    penyesuaianStokManual,
  } = useBreakfreeStore();

  const sortedPOs = useMemo(
    () => [...purchaseOrders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [purchaseOrders]
  );

  const [manualSelectedPoId, setManualSelectedPoId] = useState<string>('');
  const activePoId = manualSelectedPoId || queryPoId || sortedPOs[0]?.id || '';
  const activePO = useMemo(
    () => sortedPOs.find((p) => p.id === activePoId) || sortedPOs[0] || null,
    [sortedPOs, activePoId]
  );

  const [filterStatus, setFilterStatus] = useState<StatusPO | 'semua'>('semua');
  const filteredPOs = useMemo(() => {
    if (filterStatus === 'semua') return sortedPOs;
    return sortedPOs.filter((p) => p.status === filterStatus);
  }, [sortedPOs, filterStatus]);

  const [receiveInputs, setReceiveInputs] = useState<Record<string, number>>({});
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState('');

  const [newPoOpen, setNewPoOpen] = useState(false);
  const [newPoSupplierId, setNewPoSupplierId] = useState(() => suppliers[0]?.id ?? '');
  const [newPoBahanId, setNewPoBahanId] = useState(() => bahan[0]?.id ?? '');
  const [newPoQty, setNewPoQty] = useState(1);
  const [newPoNote, setNewPoNote] = useState('');

  const [selectedBahanId, setSelectedBahanId] = useState<string>(() => bahan[0]?.id ?? '');
  const activeBahanId = selectedBahanId || bahan[0]?.id || '';
  const activeBahan = useMemo(
    () => bahan.find((b) => b.id === activeBahanId) || null,
    [bahan, activeBahanId]
  );

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustDelta, setAdjustDelta] = useState<number>(0);
  const [adjustNote, setAdjustNote] = useState('');

  const supplierObj = useMemo(
    () => (activePO ? suppliers.find((s) => s.id === activePO.supplierId) : undefined),
    [activePO, suppliers]
  );

  const linkedRetur = useMemo(
    () => (activePO?.returId ? returs.find((r) => r.id === activePO.returId) : undefined),
    [activePO, returs]
  );

  const activeBahanStok = useMemo(
    () => (activeBahan ? hitungStokSaatIni(activeBahan.id, stockMovements) : 0),
    [activeBahan, stockMovements]
  );

  const activeBahanMovements = useMemo(
    () =>
      stockMovements
        .filter((m) => m.bahanId === activeBahanId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [stockMovements, activeBahanId]
  );

  const getQtyReceiveValue = (poId: string, bahanId: string, remaining: number) => {
    const key = `${poId}:${bahanId}`;
    if (receiveInputs[key] !== undefined) return receiveInputs[key];
    return remaining;
  };

  const handleTerimaBarang = () => {
    if (!activePO) return;
    const map: Record<string, number> = {};
    let totalIncoming = 0;
    for (const item of activePO.items) {
      const sisa = Math.max(0, item.qty - item.qtyDiterima);
      const val = Math.max(0, getQtyReceiveValue(activePO.id, item.bahanId, sisa));
      if (val > 0) {
        map[item.bahanId] = val;
        totalIncoming += val;
      }
    }
    if (totalIncoming <= 0) {
      pushToast('Masukkan minimal 1 jumlah barang yang diterima.', 'warning');
      return;
    }
    terimaBarangPO(activePO.id, map);
    setReceiveInputs({});
    pushToast(
      `Penerimaan barang PO ${activePO.nomor} dicatat ke Kartu Stok${
        activePO.returId ? ' & Retur H+1 selesai' : ''
      }.`,
      'success'
    );
  };

  const handleRejectPO = () => {
    if (!activePO) return;
    ubahStatusPO(activePO.id, 'ditolak', rejectNote.trim() || 'Ditolak oleh Manajemen');
    setRejectModalOpen(false);
    setRejectNote('');
    pushToast(`PO ${activePO.nomor} ditolak.`, 'info');
  };

  const handleCreateQuickPO = () => {
    const supId = newPoSupplierId || suppliers[0]?.id;
    const bId = newPoBahanId || bahan[0]?.id;
    const bObj = bahan.find((x) => x.id === bId);
    if (!supId || !bObj) {
      pushToast('Pastikan Master Bahan dan Supplier sudah tersedia.', 'warning');
      return;
    }
    const po = buatPurchaseOrder({
      supplierId: supId,
      items: [{ bahanId: bObj.id, qty: Math.max(1, newPoQty), harga: bObj.hargaSatuan }],
      catatan: newPoNote.trim() || 'PO Manual Logistik',
      ajukanLangsung: true,
    });
    setManualSelectedPoId(po.id);
    setNewPoOpen(false);
    setNewPoNote('');
    setNewPoQty(1);
    pushToast(`PO ${po.nomor} berhasil dibuat dan diajukan.`, 'success');
  };

  const handleManualAdjust = () => {
    if (!activeBahan) return;
    if (adjustDelta === 0) {
      pushToast('Isi nilai perubahan stok (+ untuk tambah, - untuk kurang).', 'warning');
      return;
    }
    if (!adjustNote.trim()) {
      pushToast('Tuliskan alasan penyesuaian stok manual.', 'warning');
      return;
    }
    penyesuaianStokManual(activeBahan.id, adjustDelta, adjustNote.trim());
    setAdjustOpen(false);
    setAdjustDelta(0);
    setAdjustNote('');
    pushToast(`Kartu Stok ${activeBahan.nama} berhasil disesuaikan.`, 'success');
  };

  const timelineSteps = useMemo(() => {
    if (!activePO) return [];
    const s = activePO.status;
    const isRejected = s === 'ditolak' || s === 'dibatalkan';
    const reachedSubmit = ['diajukan', 'disetujui', 'diterima_sebagian', 'diterima', 'ditolak'].includes(s);
    const reachedApprove = ['disetujui', 'diterima_sebagian', 'diterima'].includes(s);
    const reachedPartial = s === 'diterima_sebagian';
    const reachedDone = s === 'diterima';

    return [
      {
        title: 'PO Dibuat (Draft)',
        desc: `${formatTanggal(activePO.tanggal)} · ${activePO.items.length} jenis bahan`,
        state: 'done' as const,
      },
      {
        title: 'Diajukan ke Manajemen',
        desc: reachedSubmit ? 'Menunggu / selesai tinjauan owner' : 'Belum diajukan',
        state: reachedSubmit ? ('done' as const) : ('todo' as const),
      },
      {
        title: isRejected
          ? s === 'ditolak'
            ? 'PO Ditolak Manajemen'
            : 'PO Dibatalkan'
          : 'Persetujuan Manajemen',
        desc: activePO.disetujuiOleh
          ? `Oleh ${activePO.disetujuiOleh}`
          : isRejected
            ? activePO.catatan || 'Pengajuan dihentikan'
            : 'Owner / Manajemen menyetujui anggaran PO',
        state: isRejected
          ? ('error' as const)
          : reachedApprove
            ? ('done' as const)
            : ('todo' as const),
      },
      {
        title: 'Penerimaan Barang & Kartu Stok',
        desc: reachedDone
          ? 'Seluruh qty pesanan masuk ke stok sistem'
          : reachedPartial
            ? 'Sebagian barang diterima, menunggu sisa pengiriman'
            : 'Menunggu kedatangan barang dari supplier',
        state: reachedDone
          ? ('done' as const)
          : reachedPartial
            ? ('active' as const)
            : ('todo' as const),
      },
    ];
  }, [activePO]);

  return (
    <AppShell pageTitle="Persetujuan PO, Penerimaan & Kartu Stok">
      <div className="space-y-6">
        {/* Top Action Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/logistik">
              <Button variant="secondary" size="sm">
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Kembali ke Verifikasi &amp; Retur
              </Button>
            </Link>
            <div className="inline-flex items-center gap-1 overflow-x-auto rounded-lg border border-[#E2E8F0] bg-[#F1F5F9] p-1">
              {(['semua', 'diajukan', 'disetujui', 'diterima_sebagian', 'diterima'] as const).map(
                (st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setFilterStatus(st)}
                    className={`rounded-md px-2.5 py-1 text-xs whitespace-nowrap transition-all ${
                      filterStatus === st
                        ? 'bg-white font-semibold text-[#2563EB] shadow-[0_1px_2px_rgba(15,23,42,0.08)]'
                        : 'font-medium text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    {st === 'semua' ? 'Semua PO' : poStatusLabel(st)}
                  </button>
                )
              )}
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setNewPoOpen(true)}
            disabled={bahan.length === 0 || suppliers.length === 0}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Buat PO Cepat
          </Button>
        </div>

        {/* Main PO Grid: List Selector + Detail PO + Vertical Timeline */}
        {sortedPOs.length === 0 ? (
          <Card className="p-8">
            <EmptyState
              title="Belum ada dokumen Purchase Order"
              description="Buat PO otomatis dari Rekomendasi Pembelian di halaman Verifikasi & Retur atau klik Buat PO Cepat."
              action={
                <Link href="/logistik">
                  <Button variant="primary">Buka Rekomendasi Pembelian</Button>
                </Link>
              }
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Sidebar List PO (3 cols) */}
            <Card className="space-y-3 p-4 lg:col-span-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#0F172A]">
                  Daftar PO ({filteredPOs.length})
                </h2>
              </div>
              <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {filteredPOs.length === 0 ? (
                  <p className="py-6 text-center text-xs text-[#64748B]">
                    Tidak ada PO pada filter ini.
                  </p>
                ) : (
                  filteredPOs.map((po) => {
                    const sup = suppliers.find((s) => s.id === po.supplierId);
                    const isSelected = activePO?.id === po.id;
                    return (
                      <button
                        key={po.id}
                        type="button"
                        onClick={() => setManualSelectedPoId(po.id)}
                        className={`w-full rounded-xl border p-3 text-left transition-colors ${
                          isSelected
                            ? 'border-[#2563EB] bg-[#EFF6FF]/60'
                            : 'border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="tabular-mono text-xs font-semibold text-[#0F172A]">
                            {po.nomor}
                          </span>
                          <Badge tone={poStatusTone(po.status)} dot={false}>
                            {poStatusLabel(po.status)}
                          </Badge>
                        </div>
                        <p className="mt-1 truncate text-xs font-semibold text-[#0F172A]">
                          {sup?.nama || 'Supplier'}
                        </p>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-[#64748B]">
                          <span>{formatTanggal(po.tanggal)}</span>
                          <span className="tabular-mono font-semibold text-[#0F172A]">
                            {formatRp(po.total)}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </Card>

            {/* Detail PO Card (6 cols) */}
            <Card className="space-y-4 p-5 lg:col-span-6">
              {activePO && (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E2E8F0] pb-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="tabular-mono text-lg font-bold text-[#0F172A]">
                          {activePO.nomor}
                        </h2>
                        <Badge tone={poStatusTone(activePO.status)}>
                          {poStatusLabel(activePO.status)}
                        </Badge>
                        {linkedRetur && (
                          <Badge tone="info">Pengganti {linkedRetur.nomor}</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-[#64748B]">
                        Supplier:{' '}
                        <strong className="font-semibold text-[#0F172A]">
                          {supplierObj?.nama || 'Supplier'}
                        </strong>{' '}
                        {supplierObj?.kontak ? `(${supplierObj.kontak})` : ''} · Tanggal:{' '}
                        {formatTanggal(activePO.tanggal)}
                      </p>
                      {activePO.catatan && (
                        <p className="mt-1 text-xs italic text-[#64748B]">
                          Catatan: {activePO.catatan}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-[11px] font-medium text-[#64748B]">Total Nilai PO</p>
                      <p className="tabular-mono text-xl font-bold text-[#2563EB]">
                        {formatRp(activePO.total)}
                      </p>
                    </div>
                  </div>

                  {/* Tabel Item PO */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                          <th className="rounded-l-lg py-2.5 pl-2 pr-2">Bahan</th>
                          <th className="px-2 py-2.5 text-right">Pesan</th>
                          <th className="px-2 py-2.5 text-right">Diterima</th>
                          {(activePO.status === 'disetujui' ||
                            activePO.status === 'diterima_sebagian') && (
                            <th className="px-2 py-2.5 text-right">Terima Skrg</th>
                          )}
                          <th className="px-2 py-2.5 text-right">Harga</th>
                          <th className="rounded-r-lg py-2.5 pl-2 pr-2 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]">
                        {activePO.items.map((item) => {
                          const b = bahan.find((x) => x.id === item.bahanId);
                          const sisa = Math.max(0, item.qty - item.qtyDiterima);
                          const canReceive =
                            activePO.status === 'disetujui' ||
                            activePO.status === 'diterima_sebagian';
                          return (
                            <tr key={item.bahanId} className="hover:bg-[#F8FAFC]">
                              <td className="py-2.5 pl-2 pr-2 font-semibold text-[#0F172A]">
                                {b?.nama || item.bahanId}
                                <span className="block text-[11px] font-normal text-[#64748B]">
                                  Satuan: {b?.satuan || '-'}
                                </span>
                              </td>
                              <td className="tabular-mono px-2 py-2.5 text-right font-semibold">
                                {item.qty}
                              </td>
                              <td className="tabular-mono px-2 py-2.5 text-right">
                                <span
                                  className={
                                    item.qtyDiterima >= item.qty
                                      ? 'font-semibold text-[#15803D]'
                                      : 'text-[#64748B]'
                                  }
                                >
                                  {item.qtyDiterima} / {item.qty}
                                </span>
                              </td>
                              {canReceive && (
                                <td className="px-2 py-2.5 text-right">
                                  {sisa > 0 ? (
                                    <input
                                      type="number"
                                      min={0}
                                      max={sisa}
                                      value={getQtyReceiveValue(activePO.id, item.bahanId, sisa)}
                                      onChange={(e) => {
                                        const v = Math.max(
                                          0,
                                          Math.min(sisa, Number(e.target.value) || 0)
                                        );
                                        setReceiveInputs((prev) => ({
                                          ...prev,
                                          [`${activePO.id}:${item.bahanId}`]: v,
                                        }));
                                      }}
                                      className="tabular-mono w-16 rounded-lg border border-[#E2E8F0] bg-white px-2 py-1 text-right font-semibold text-[#0F172A] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                                    />
                                  ) : (
                                    <span className="font-semibold text-[#15803D]">Lunas</span>
                                  )}
                                </td>
                              )}
                              <td className="tabular-mono px-2 py-2.5 text-right text-[#64748B]">
                                {formatRp(item.harga)}
                              </td>
                              <td className="tabular-mono py-2.5 pl-2 pr-2 text-right font-semibold text-[#0F172A]">
                                {formatRp(item.qty * item.harga)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Aksi Status PO */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E2E8F0] pt-3">
                    <span className="text-[11px] text-[#64748B]">
                      Pembaruan terakhir: {formatWaktu(activePO.updatedAt)}
                    </span>

                    <div className="flex flex-wrap items-center gap-2">
                      {activePO.status === 'draft' && (
                        <>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => {
                              ubahStatusPO(activePO.id, 'dibatalkan', 'Dibatalkan sebelum diajukan');
                              pushToast(`PO ${activePO.nomor} dibatalkan.`, 'info');
                            }}
                          >
                            Batalkan
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              ubahStatusPO(activePO.id, 'diajukan');
                              pushToast(`PO ${activePO.nomor} diajukan ke Manajemen.`, 'success');
                            }}
                          >
                            <Send className="h-3.5 w-3.5" aria-hidden="true" />
                            Ajukan ke Manajemen
                          </Button>
                        </>
                      )}

                      {activePO.status === 'diajukan' && (
                        <>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setRejectModalOpen(true)}
                          >
                            <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                            Tolak PO
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              ubahStatusPO(activePO.id, 'disetujui');
                              pushToast(`PO ${activePO.nomor} disetujui.`, 'success');
                            }}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                            Setujui PO (Manajemen)
                          </Button>
                        </>
                      )}

                      {(activePO.status === 'disetujui' ||
                        activePO.status === 'diterima_sebagian') && (
                        <Button variant="primary" size="sm" onClick={handleTerimaBarang}>
                          <PackageCheck className="h-3.5 w-3.5" aria-hidden="true" />
                          Konfirmasi Terima Barang &amp; Tambah Stok
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </Card>

            {/* Vertical Status Timeline (3 cols) */}
            <Card className="space-y-4 p-5 lg:col-span-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-[#2563EB]" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-[#0F172A]">Alur Status PO</h2>
              </div>

              <div className="space-y-4">
                {timelineSteps.map((step, idx) => {
                  const dotCls =
                    step.state === 'done'
                      ? 'bg-[#16A34A] border-[#16A34A] text-white'
                      : step.state === 'active'
                        ? 'bg-[#2563EB] border-[#2563EB] text-white'
                        : step.state === 'error'
                          ? 'bg-[#DC2626] border-[#DC2626] text-white'
                          : 'bg-white border-[#CBD5E1] text-[#64748B]';
                  return (
                    <div key={step.title} className="relative flex gap-3">
                      {idx < timelineSteps.length - 1 && (
                        <div className="absolute bottom-[-16px] left-[11px] top-6 w-0.5 bg-[#E2E8F0]" />
                      )}
                      <div
                        className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold ${dotCls}`}
                      >
                        {idx + 1}
                      </div>
                      <div className="pb-1">
                        <p className="text-xs font-semibold text-[#0F172A]">{step.title}</p>
                        <p className="mt-0.5 text-[11px] text-[#64748B]">{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {/* Section 2: Kartu Stok Ledger */}
        <Card className="space-y-4 p-5">
          <div className="flex flex-col justify-between gap-4 border-b border-[#E2E8F0] pb-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-[16px] font-semibold text-[#0F172A]">
                Kartu Stok Bahan Baku (Ledger Mutasi Real-Time)
              </h2>
              <p className="mt-0.5 text-xs text-[#64748B]">
                Jejak audit setiap perubahan stok dari stok awal, opname terverifikasi, waste, retur, penerimaan PO, dan penyesuaian manual.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={activeBahanId}
                onChange={(e) => setSelectedBahanId(e.target.value)}
                aria-label="Pilih bahan kartu stok"
                className="min-w-[240px] rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-medium text-[#0F172A] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
              >
                {bahan.length === 0 && <option value="">Belum ada master bahan</option>}
                {bahan.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nama} ({b.satuan})
                  </option>
                ))}
              </select>

              {activeBahan && (
                <Button variant="secondary" size="sm" onClick={() => setAdjustOpen(true)}>
                  <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                  Penyesuaian Manual
                </Button>
              )}
            </div>
          </div>

          {!activeBahan ? (
            <EmptyState
              title="Belum ada bahan untuk ditampilkan"
              description="Tambahkan bahan di Master Data untuk memantau mutasi Kartu Stok."
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 sm:grid-cols-4">
                <div>
                  <p className="text-[11px] font-medium text-[#64748B]">Stok Saat Ini</p>
                  <p className="tabular-mono mt-0.5 text-lg font-bold text-[#0F172A]">
                    {formatQty(activeBahanStok, activeBahan.satuan)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-[#64748B]">Stok Minimum</p>
                  <p className="tabular-mono mt-0.5 text-lg font-bold text-[#0F172A]">
                    {formatQty(activeBahan.stokMinimum, activeBahan.satuan)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-[#64748B]">Harga Satuan</p>
                  <p className="tabular-mono mt-0.5 text-lg font-bold text-[#0F172A]">
                    {formatRp(activeBahan.hargaSatuan)}
                  </p>
                </div>
                <div className="flex flex-col justify-center gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#64748B]">Status</span>
                    <Badge
                      tone={
                        evaluasiStatusStok(activeBahanStok, activeBahan.stokMinimum) === 'aman'
                          ? 'success'
                          : evaluasiStatusStok(activeBahanStok, activeBahan.stokMinimum) ===
                              'menipis'
                            ? 'warning'
                            : 'danger'
                      }
                    >
                      {evaluasiStatusStok(activeBahanStok, activeBahan.stokMinimum).toUpperCase()}
                    </Badge>
                  </div>
                  <StockBar
                    current={activeBahanStok}
                    min={activeBahan.stokMinimum}
                    status={evaluasiStatusStok(activeBahanStok, activeBahan.stokMinimum)}
                  />
                </div>
              </div>

              {activeBahanMovements.length === 0 ? (
                <EmptyState
                  title={`Belum ada mutasi stok untuk ${activeBahan.nama}`}
                  description="Mutasi muncul otomatis saat inisialisasi stok awal, verifikasi laporan opname, waste, atau penerimaan PO."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                        <th className="rounded-l-lg px-3 py-2.5">Waktu</th>
                        <th className="px-3 py-2.5">Tipe Mutasi</th>
                        <th className="px-3 py-2.5 text-right">Qty</th>
                        <th className="px-3 py-2.5">Referensi</th>
                        <th className="px-3 py-2.5">Catatan</th>
                        <th className="rounded-r-lg px-3 py-2.5">Oleh</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {activeBahanMovements.map((mv) => (
                        <tr key={mv.id} className="hover:bg-[#F8FAFC]">
                          <td className="tabular-mono px-3 py-2.5 text-[#64748B]">
                            {formatTanggal(mv.createdAt)} · {formatWaktu(mv.createdAt)}
                          </td>
                          <td className="px-3 py-2.5">
                            <Badge tone={movementBadgeTone(mv.tipe)}>{mv.tipe}</Badge>
                          </td>
                          <td
                            className={`tabular-mono px-3 py-2.5 text-right font-semibold ${
                              mv.qty >= 0 ? 'text-[#15803D]' : 'text-[#DC2626]'
                            }`}
                          >
                            {mv.qty > 0 ? `+${mv.qty}` : mv.qty} {activeBahan.satuan}
                          </td>
                          <td className="tabular-mono px-3 py-2.5 text-[#64748B]">
                            {mv.refType} ({mv.refId})
                          </td>
                          <td className="px-3 py-2.5 text-[#0F172A]">{mv.catatan || '-'}</td>
                          <td className="px-3 py-2.5 font-medium text-[#64748B]">{mv.oleh}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {/* Modal Tolak PO */}
      <Modal
        open={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Tolak Purchase Order"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#64748B]">
            Berikan alasan penolakan untuk dokumen{' '}
            <strong className="font-semibold text-[#0F172A]">{activePO?.nomor}</strong>.
          </p>
          <textarea
            rows={3}
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="Misal: Anggaran dialihkan ke supplier lokal / tunda minggu depan."
            className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRejectModalOpen(false)}>
              Batal
            </Button>
            <Button variant="dangerSolid" onClick={handleRejectPO}>
              Tolak PO
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Buat PO Cepat */}
      <Modal open={newPoOpen} onClose={() => setNewPoOpen(false)} title="Buat Purchase Order Cepat">
        <div className="space-y-4 text-sm">
          <div>
            <label htmlFor="po-sup" className="mb-1 block text-xs font-medium text-[#475569]">
              Supplier
            </label>
            <select
              id="po-sup"
              value={newPoSupplierId}
              onChange={(e) => setNewPoSupplierId(e.target.value)}
              className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama} ({s.kategori})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label htmlFor="po-bahan" className="mb-1 block text-xs font-medium text-[#475569]">
                Bahan Baku
              </label>
              <select
                id="po-bahan"
                value={newPoBahanId}
                onChange={(e) => setNewPoBahanId(e.target.value)}
                className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
              >
                {bahan.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nama} ({formatRp(b.hargaSatuan)}/{b.satuan})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="po-qty" className="mb-1 block text-xs font-medium text-[#475569]">
                Qty Beli
              </label>
              <input
                id="po-qty"
                type="number"
                min={1}
                value={newPoQty}
                onChange={(e) => setNewPoQty(Math.max(1, Number(e.target.value) || 1))}
                className="tabular-mono w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-normal text-[#0F172A] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
              />
            </div>
          </div>
          <div>
            <label htmlFor="po-note" className="mb-1 block text-xs font-medium text-[#475569]">
              Catatan (Opsional)
            </label>
            <input
              id="po-note"
              type="text"
              value={newPoNote}
              onChange={(e) => setNewPoNote(e.target.value)}
              placeholder="Catatan pengiriman..."
              className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setNewPoOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleCreateQuickPO}>
              Buat &amp; Ajukan PO
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Penyesuaian Manual Kartu Stok */}
      <Modal
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        title={`Penyesuaian Stok: ${activeBahan?.nama || ''}`}
      >
        <div className="space-y-4 text-sm">
          <p className="text-xs text-[#64748B]">
            Gunakan angka positif (misal <code className="font-semibold text-[#0F172A]">+5</code>) untuk penambahan
            atau negatif (misal <code className="font-semibold text-[#0F172A]">-2</code>) untuk koreksi pengurangan.
          </p>
          <div>
            <label htmlFor="adj-delta" className="mb-1 block text-xs font-medium text-[#475569]">
              Selisih Qty ({activeBahan?.satuan})
            </label>
            <input
              id="adj-delta"
              type="number"
              step="0.5"
              value={adjustDelta}
              onChange={(e) => setAdjustDelta(Number(e.target.value) || 0)}
              className="tabular-mono w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-semibold text-[#0F172A] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
            />
          </div>
          <div>
            <label htmlFor="adj-note" className="mb-1 block text-xs font-medium text-[#475569]">
              Alasan Koreksi
            </label>
            <input
              id="adj-note"
              type="text"
              value={adjustNote}
              onChange={(e) => setAdjustNote(e.target.value)}
              placeholder="Misal: Koreksi hitung fisik akhir bulan..."
              className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAdjustOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleManualAdjust}>
              Simpan Penyesuaian
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}

export default function DetailPOPage() {
  return (
    <Suspense
      fallback={
        <AppShell pageTitle="Persetujuan PO, Penerimaan & Kartu Stok">
          <Card className="p-8 text-sm text-[#64748B]">Memuat data Purchase Order...</Card>
        </AppShell>
      }
    >
      <DetailPOAndKartuStokInner />
    </Suspense>
  );
}
