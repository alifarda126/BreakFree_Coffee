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

  // Qty masuk form state keyed by `${poId}:${bahanId}`
  const [receiveInputs, setReceiveInputs] = useState<Record<string, number>>({});

  // Reject PO modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState('');

  // Quick Manual PO modal
  const [newPoOpen, setNewPoOpen] = useState(false);
  const [newPoSupplierId, setNewPoSupplierId] = useState(() => suppliers[0]?.id ?? '');
  const [newPoBahanId, setNewPoBahanId] = useState(() => bahan[0]?.id ?? '');
  const [newPoQty, setNewPoQty] = useState(1);
  const [newPoNote, setNewPoNote] = useState('');

  // Kartu Stok state
  const [selectedBahanId, setSelectedBahanId] = useState<string>(() => bahan[0]?.id ?? '');
  const activeBahanId = selectedBahanId || bahan[0]?.id || '';
  const activeBahan = useMemo(
    () => bahan.find((b) => b.id === activeBahanId) || null,
    [bahan, activeBahanId]
  );

  // Manual Adjust Modal
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
    <AppShell pageTitle="Detail PO, Penerimaan & Kartu Stok">
      <div className="space-y-6">
        {/* Top Action Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link href="/logistik">
              <Button variant="secondary" size="sm">
                <ArrowLeft className="h-4 w-4" />
                Kembali ke Verifikasi & Retur
              </Button>
            </Link>
            <div className="flex items-center gap-1 overflow-x-auto">
              {(['semua', 'diajukan', 'disetujui', 'diterima_sebagian', 'diterima'] as const).map(
                (st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setFilterStatus(st)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                      filterStatus === st
                        ? 'bg-[#221C17] text-white'
                        : 'bg-white border border-[#E6DFD5] text-[#70675E] hover:text-[#221C17]'
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
            <Plus className="h-4 w-4" />
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sidebar List PO (3 cols) */}
            <Card className="lg:col-span-3 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#221C17]">
                  Daftar PO ({filteredPOs.length})
                </h2>
              </div>
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {filteredPOs.length === 0 ? (
                  <p className="text-xs text-[#70675E] py-4 text-center">
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
                        className={`w-full text-left rounded-xl border p-3 transition-colors ${
                          isSelected
                            ? 'border-[#9C5B2E] bg-[#F5EDE6]/70'
                            : 'border-[#E6DFD5] bg-white hover:bg-[#FAF8F5]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold tabular-mono text-[#221C17]">
                            {po.nomor}
                          </span>
                          <Badge tone={poStatusTone(po.status)}>
                            {poStatusLabel(po.status)}
                          </Badge>
                        </div>
                        <p className="text-xs font-semibold text-[#221C17] mt-1 truncate">
                          {sup?.nama || 'Supplier'}
                        </p>
                        <div className="flex items-center justify-between mt-1 text-[11px] text-[#70675E]">
                          <span>{formatTanggal(po.tanggal)}</span>
                          <span className="font-bold tabular-mono text-[#221C17]">
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
            <Card className="lg:col-span-6 p-5 space-y-4">
              {activePO && (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E6DFD5] pb-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-extrabold tabular-mono text-[#221C17]">
                          {activePO.nomor}
                        </h2>
                        <Badge tone={poStatusTone(activePO.status)}>
                          {poStatusLabel(activePO.status)}
                        </Badge>
                        {linkedRetur && (
                          <Badge tone="info">Pengganti {linkedRetur.nomor}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-[#70675E] mt-1">
                        Supplier:{' '}
                        <strong className="text-[#221C17]">
                          {supplierObj?.nama || 'Supplier'}
                        </strong>{' '}
                        {supplierObj?.kontak ? `(${supplierObj.kontak})` : ''} · Tanggal:{' '}
                        {formatTanggal(activePO.tanggal)}
                      </p>
                      {activePO.catatan && (
                        <p className="text-xs italic text-[#70675E] mt-1">
                          Catatan: {activePO.catatan}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-[11px] font-medium text-[#70675E]">Total Nilai PO</p>
                      <p className="text-xl font-extrabold tabular-mono text-[#9C5B2E]">
                        {formatRp(activePO.total)}
                      </p>
                    </div>
                  </div>

                  {/* Tabel Item PO */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#E6DFD5] text-[11px] font-bold uppercase tracking-wider text-[#70675E]">
                          <th className="py-2 pr-2">Bahan</th>
                          <th className="py-2 px-2 text-right">Pesan</th>
                          <th className="py-2 px-2 text-right">Diterima</th>
                          {(activePO.status === 'disetujui' ||
                            activePO.status === 'diterima_sebagian') && (
                            <th className="py-2 px-2 text-right">Terima Skrg</th>
                          )}
                          <th className="py-2 px-2 text-right">Harga</th>
                          <th className="py-2 pl-2 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E6DFD5]">
                        {activePO.items.map((item) => {
                          const b = bahan.find((x) => x.id === item.bahanId);
                          const sisa = Math.max(0, item.qty - item.qtyDiterima);
                          const canReceive =
                            activePO.status === 'disetujui' ||
                            activePO.status === 'diterima_sebagian';
                          return (
                            <tr key={item.bahanId}>
                              <td className="py-2.5 pr-2 font-semibold text-[#221C17]">
                                {b?.nama || item.bahanId}
                                <span className="block text-[11px] font-normal text-[#70675E]">
                                  Satuan: {b?.satuan || '-'}
                                </span>
                              </td>
                              <td className="py-2.5 px-2 text-right tabular-mono font-bold">
                                {item.qty}
                              </td>
                              <td className="py-2.5 px-2 text-right tabular-mono">
                                <span
                                  className={
                                    item.qtyDiterima >= item.qty
                                      ? 'font-bold text-[#236B42]'
                                      : 'text-[#70675E]'
                                  }
                                >
                                  {item.qtyDiterima} / {item.qty}
                                </span>
                              </td>
                              {canReceive && (
                                <td className="py-2.5 px-2 text-right">
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
                                      className="w-16 rounded-lg border border-[#E6DFD5] bg-white px-2 py-1 text-right font-bold tabular-mono text-[#221C17] focus:border-[#9C5B2E] focus:outline-none"
                                    />
                                  ) : (
                                    <span className="text-[#236B42] font-semibold">Lunas</span>
                                  )}
                                </td>
                              )}
                              <td className="py-2.5 px-2 text-right tabular-mono text-[#70675E]">
                                {formatRp(item.harga)}
                              </td>
                              <td className="py-2.5 pl-2 text-right tabular-mono font-bold text-[#221C17]">
                                {formatRp(item.qty * item.harga)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Aksi Status PO */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#E6DFD5]">
                    <span className="text-[11px] text-[#70675E]">
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
                            <Send className="h-4 w-4" />
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
                            <XCircle className="h-4 w-4" />
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
                            <CheckCircle2 className="h-4 w-4" />
                            Setujui PO (Manajemen)
                          </Button>
                        </>
                      )}

                      {(activePO.status === 'disetujui' ||
                        activePO.status === 'diterima_sebagian') && (
                        <Button variant="primary" size="sm" onClick={handleTerimaBarang}>
                          <PackageCheck className="h-4 w-4" />
                          Konfirmasi Terima Barang & Tambah Stok
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </Card>

            {/* Vertical Status Timeline (3 cols) */}
            <Card className="lg:col-span-3 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-[#9C5B2E]" />
                <h2 className="text-sm font-bold text-[#221C17]">Alur Status PO</h2>
              </div>

              <div className="space-y-4">
                {timelineSteps.map((step, idx) => {
                  const dotCls =
                    step.state === 'done'
                      ? 'bg-[#236B42] border-[#236B42] text-white'
                      : step.state === 'active'
                      ? 'bg-[#9C5B2E] border-[#9C5B2E] text-white'
                      : step.state === 'error'
                      ? 'bg-[#B83227] border-[#B83227] text-white'
                      : 'bg-white border-[#D6CEC2] text-[#70675E]';
                  return (
                    <div key={step.title} className="relative flex gap-3">
                      {idx < timelineSteps.length - 1 && (
                        <div className="absolute left-[11px] top-6 bottom-[-16px] w-0.5 bg-[#E6DFD5]" />
                      )}
                      <div
                        className={`relative z-10 h-6 w-6 rounded-full border-2 flex items-center justify-center text-[11px] font-bold shrink-0 ${dotCls}`}
                      >
                        {idx + 1}
                      </div>
                      <div className="pb-1">
                        <p className="text-xs font-bold text-[#221C17]">{step.title}</p>
                        <p className="text-[11px] text-[#70675E] mt-0.5">{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {/* Section 2: Kartu Stok Ledger */}
        <Card className="p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E6DFD5] pb-4">
            <div>
              <h2 className="text-base font-bold text-[#221C17]">
                Kartu Stok Bahan Baku (Ledger Mutasi Real-Time)
              </h2>
              <p className="text-xs text-[#70675E]">
                Jejak audit setiap perubahan stok dari stok awal, opname terverifikasi, waste, retur, penerimaan PO, dan penyesuaian manual.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={activeBahanId}
                onChange={(e) => setSelectedBahanId(e.target.value)}
                className="rounded-lg border border-[#E6DFD5] bg-white px-3 py-2 text-xs font-semibold text-[#221C17] focus:border-[#9C5B2E] focus:outline-none min-w-[240px]"
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
                  <SlidersHorizontal className="h-4 w-4" />
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
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 rounded-xl border border-[#E6DFD5] bg-[#FAF8F5] p-4">
                <div>
                  <p className="text-[11px] font-medium text-[#70675E]">Stok Saat Ini</p>
                  <p className="text-lg font-extrabold tabular-mono text-[#221C17] mt-0.5">
                    {formatQty(activeBahanStok, activeBahan.satuan)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-[#70675E]">Stok Minimum</p>
                  <p className="text-lg font-extrabold tabular-mono text-[#221C17] mt-0.5">
                    {formatQty(activeBahan.stokMinimum, activeBahan.satuan)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-[#70675E]">Harga Satuan</p>
                  <p className="text-lg font-extrabold tabular-mono text-[#221C17] mt-0.5">
                    {formatRp(activeBahan.hargaSatuan)}
                  </p>
                </div>
                <div className="flex flex-col justify-center gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#70675E]">Status</span>
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
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#E6DFD5] text-[11px] font-bold uppercase tracking-wider text-[#70675E]">
                        <th className="py-2.5 px-3">Waktu</th>
                        <th className="py-2.5 px-3">Tipe Mutasi</th>
                        <th className="py-2.5 px-3 text-right">Qty</th>
                        <th className="py-2.5 px-3">Referensi</th>
                        <th className="py-2.5 px-3">Catatan</th>
                        <th className="py-2.5 px-3">Oleh</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6DFD5]">
                      {activeBahanMovements.map((mv) => (
                        <tr key={mv.id} className="hover:bg-[#FAF8F5]">
                          <td className="py-2.5 px-3 tabular-mono text-[#70675E]">
                            {formatTanggal(mv.createdAt)} · {formatWaktu(mv.createdAt)}
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge tone={movementBadgeTone(mv.tipe)}>{mv.tipe}</Badge>
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right tabular-mono font-bold ${
                              mv.qty >= 0 ? 'text-[#236B42]' : 'text-[#B83227]'
                            }`}
                          >
                            {mv.qty > 0 ? `+${mv.qty}` : mv.qty} {activeBahan.satuan}
                          </td>
                          <td className="py-2.5 px-3 tabular-mono text-[#70675E]">
                            {mv.refType} ({mv.refId})
                          </td>
                          <td className="py-2.5 px-3 text-[#221C17]">{mv.catatan || '—'}</td>
                          <td className="py-2.5 px-3 font-medium text-[#70675E]">{mv.oleh}</td>
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
          <p className="text-xs text-[#70675E]">
            Berikan alasan penolakan untuk dokumen <strong className="text-[#221C17]">{activePO?.nomor}</strong>.
          </p>
          <textarea
            rows={3}
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="Misal: Anggaran dialihkan ke supplier lokal / tunda minggu depan."
            className="w-full rounded-xl border border-[#E6DFD5] bg-white px-3 py-2 text-sm text-[#221C17] focus:border-[#9C5B2E] focus:outline-none"
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
            <label className="block text-xs font-bold text-[#70675E] mb-1">Supplier</label>
            <select
              value={newPoSupplierId}
              onChange={(e) => setNewPoSupplierId(e.target.value)}
              className="w-full rounded-xl border border-[#E6DFD5] bg-white px-3 py-2 text-sm"
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
              <label className="block text-xs font-bold text-[#70675E] mb-1">Bahan Baku</label>
              <select
                value={newPoBahanId}
                onChange={(e) => setNewPoBahanId(e.target.value)}
                className="w-full rounded-xl border border-[#E6DFD5] bg-white px-3 py-2 text-sm"
              >
                {bahan.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nama} ({formatRp(b.hargaSatuan)}/{b.satuan})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#70675E] mb-1">Qty Beli</label>
              <input
                type="number"
                min={1}
                value={newPoQty}
                onChange={(e) => setNewPoQty(Math.max(1, Number(e.target.value) || 1))}
                className="w-full rounded-xl border border-[#E6DFD5] bg-white px-3 py-2 text-sm font-bold tabular-mono"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#70675E] mb-1">Catatan (Opsional)</label>
            <input
              type="text"
              value={newPoNote}
              onChange={(e) => setNewPoNote(e.target.value)}
              placeholder="Catatan pengiriman..."
              className="w-full rounded-xl border border-[#E6DFD5] bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setNewPoOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleCreateQuickPO}>
              Buat & Ajukan PO
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Penyesuaian Manual Kartu Stok */}
      <Modal
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        title={`Penyesuaian Stok — ${activeBahan?.nama || ''}`}
      >
        <div className="space-y-4 text-sm">
          <p className="text-xs text-[#70675E]">
            Gunakan angka positif (misal <code className="font-mono">+5</code>) untuk penambahan
            atau negatif (misal <code className="font-mono">-2</code>) untuk koreksi pengurangan.
          </p>
          <div>
            <label className="block text-xs font-bold text-[#70675E] mb-1">
              Selisih Qty ({activeBahan?.satuan})
            </label>
            <input
              type="number"
              step="0.5"
              value={adjustDelta}
              onChange={(e) => setAdjustDelta(Number(e.target.value) || 0)}
              className="w-full rounded-xl border border-[#E6DFD5] bg-white px-3 py-2 text-sm font-bold tabular-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#70675E] mb-1">Alasan Koreksi</label>
            <input
              type="text"
              value={adjustNote}
              onChange={(e) => setAdjustNote(e.target.value)}
              placeholder="Misal: Koreksi hitung fisik akhir bulan..."
              className="w-full rounded-xl border border-[#E6DFD5] bg-white px-3 py-2 text-sm"
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
        <AppShell pageTitle="Detail PO, Penerimaan & Kartu Stok">
          <Card className="p-8 text-sm text-[#70675E]">Memuat data Purchase Order...</Card>
        </AppShell>
      }
    >
      <DetailPOAndKartuStokInner />
    </Suspense>
  );
}
