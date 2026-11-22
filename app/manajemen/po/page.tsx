'use client';

import React, { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, ClipboardList, XCircle } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Badge, Button, Card, EmptyState, Modal } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/ToastProvider';
import { useBreakfreeStore } from '@/lib/store/useBreakfreeStore';
import { formatRp, formatTanggal, formatWaktu } from '@/lib/domain/calculations';
import type { StatusPO } from '@/lib/types';

function poStatusTone(status: StatusPO) {
  switch (status) {
    case 'disetujui':
    case 'diterima':
      return 'success';
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
    diajukan: 'Menunggu Persetujuan',
    disetujui: 'Disetujui',
    ditolak: 'Ditolak',
    diterima_sebagian: 'Diterima Sebagian',
    diterima: 'Selesai Diterima',
    dibatalkan: 'Dibatalkan',
  };
  return labels[status];
}

function PersetujuanPOInner() {
  const searchParams = useSearchParams();
  const queryPoId = searchParams.get('id');
  const { pushToast } = useToast();

  const { bahan, suppliers, purchaseOrders, ubahStatusPO } = useBreakfreeStore();

  const visiblePOs = useMemo(
    () =>
      [...purchaseOrders]
        .filter((p) => p.status !== 'draft')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [purchaseOrders]
  );

  const [filterStatus, setFilterStatus] = useState<'diajukan' | 'semua' | 'disetujui' | 'ditolak'>('semua');
  const filteredPOs = useMemo(() => {
    if (filterStatus === 'semua') return visiblePOs;
    return visiblePOs.filter((p) => p.status === filterStatus);
  }, [visiblePOs, filterStatus]);

  const [selectedId, setSelectedId] = useState('');
  const activePoId = selectedId || queryPoId || filteredPOs[0]?.id || '';
  const activePO = useMemo(
    () => visiblePOs.find((p) => p.id === activePoId) || filteredPOs[0] || null,
    [visiblePOs, filteredPOs, activePoId]
  );

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState('');

  const supplierObj = useMemo(
    () => (activePO ? suppliers.find((s) => s.id === activePO.supplierId) : undefined),
    [activePO, suppliers]
  );

  const pendingCount = visiblePOs.filter((p) => p.status === 'diajukan').length;

  const handleReject = () => {
    if (!activePO) return;
    ubahStatusPO(activePO.id, 'ditolak', rejectNote.trim() || 'Ditolak oleh Manajemen');
    setRejectOpen(false);
    setRejectNote('');
    pushToast(`PO ${activePO.nomor} ditolak.`, 'info');
  };

  return (
    <AppShell pageTitle="Persetujuan Purchase Order">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-[#E5E5E5] bg-[#F5F5F5] p-1">
          {(
            [
              { id: 'semua', label: `Semua (${visiblePOs.length})` },
              { id: 'diajukan', label: `Menunggu (${pendingCount})` },
              { id: 'disetujui', label: 'Disetujui' },
              { id: 'ditolak', label: 'Ditolak' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilterStatus(t.id)}
              className={`rounded-md px-3 py-1.5 text-[13px] transition-all ${
                filterStatus === t.id
                  ? 'bg-white font-semibold text-[#111111] shadow-[0_1px_2px_rgba(17,17,17,0.06)]'
                  : 'font-medium text-[#737373] hover:text-[#111111]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {visiblePOs.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            title="Belum ada pengajuan Purchase Order"
            description="Pengajuan PO yang dikirim oleh tim Logistik akan tampil di sini untuk diperiksa dan disetujui."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left List */}
          <Card className="space-y-3 p-4 lg:col-span-4">
            <h2 className="text-[15px] font-semibold text-[#111111]">
              Daftar Pengajuan PO ({filteredPOs.length})
            </h2>
            <div className="max-h-[460px] space-y-2 overflow-y-auto pr-1">
              {filteredPOs.length === 0 ? (
                <p className="py-6 text-center text-[12px] text-[#737373]">
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
                      onClick={() => setSelectedId(po.id)}
                      className={`w-full rounded-xl border p-3 text-left transition-colors ${
                        isSelected
                          ? 'border-[#111111] bg-[#F5F5F5]'
                          : 'border-[#E5E5E5] bg-white hover:bg-[#FAFAFA]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="tabular-mono text-[13px] font-semibold text-[#111111]">
                          {po.nomor}
                        </span>
                        <Badge tone={poStatusTone(po.status)} dot={false}>
                          {poStatusLabel(po.status)}
                        </Badge>
                      </div>
                      <p className="mt-1 truncate text-[13px] font-normal text-[#262626]">
                        {sup?.nama || 'Supplier'}
                      </p>
                      <div className="mt-1 flex items-center justify-between text-[12px] text-[#737373]">
                        <span>{formatTanggal(po.tanggal)}</span>
                        <span className="tabular-mono font-semibold text-[#111111]">
                          {formatRp(po.total)}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </Card>

          {/* Right Approval Detail */}
          <Card className="space-y-4 p-5 lg:col-span-8">
            {activePO && (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E5E5E5] pb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="tabular-mono text-[18px] font-bold text-[#111111]">
                        {activePO.nomor}
                      </h2>
                      <Badge tone={poStatusTone(activePO.status)}>
                        {poStatusLabel(activePO.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[13px] font-normal text-[#737373]">
                      Supplier:{' '}
                      <span className="font-medium text-[#111111]">
                        {supplierObj?.nama || '-'}
                      </span>{' '}
                      · Tanggal: {formatTanggal(activePO.tanggal)}
                    </p>
                    {activePO.catatan && (
                      <p className="mt-1 text-[12px] text-[#737373]">Catatan: {activePO.catatan}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] text-[#737373]">Total Pengajuan</p>
                    <p className="tabular-mono text-[24px] font-bold text-[#111111]">
                      {formatRp(activePO.total)}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13.5px]">
                    <thead>
                      <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[12px] font-semibold uppercase text-[#737373]">
                        <th className="rounded-l-lg px-3 py-2.5">Bahan Baku</th>
                        <th className="px-3 py-2.5 text-right">Qty</th>
                        <th className="px-3 py-2.5 text-right">Harga Satuan</th>
                        <th className="rounded-r-lg px-3 py-2.5 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5E5]">
                      {activePO.items.map((item) => {
                        const b = bahan.find((x) => x.id === item.bahanId);
                        return (
                          <tr key={item.bahanId}>
                            <td className="px-3 py-2.5 text-[#111111]">
                              {b?.nama || item.bahanId}
                              <span className="block text-[12px] text-[#737373]">
                                Satuan: {b?.satuan || '-'}
                              </span>
                            </td>
                            <td className="tabular-mono px-3 py-2.5 text-right">{item.qty}</td>
                            <td className="tabular-mono px-3 py-2.5 text-right text-[#737373]">
                              {formatRp(item.harga)}
                            </td>
                            <td className="tabular-mono px-3 py-2.5 text-right font-semibold text-[#111111]">
                              {formatRp(item.qty * item.harga)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E5E5E5] pt-4">
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-[#737373]">
                    <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
                    Diperbarui: {formatWaktu(activePO.updatedAt)}
                  </span>

                  {activePO.status === 'diajukan' ? (
                    <div className="flex items-center gap-2">
                      <Button variant="danger" onClick={() => setRejectOpen(true)}>
                        <XCircle className="h-4 w-4" aria-hidden="true" />
                        Tolak PO
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => {
                          ubahStatusPO(activePO.id, 'disetujui');
                          pushToast(`PO ${activePO.nomor} disetujui.`, 'success');
                        }}
                      >
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        Setujui PO
                      </Button>
                    </div>
                  ) : (
                    <Badge tone={poStatusTone(activePO.status)}>
                      {poStatusLabel(activePO.status)}
                    </Badge>
                  )}
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      <Modal open={rejectOpen} onClose={() => setRejectOpen(false)} title="Tolak Purchase Order">
        <div className="space-y-4">
          <p className="text-[13px] text-[#737373]">
            Berikan alasan penolakan untuk dokumen{' '}
            <span className="font-semibold text-[#111111]">{activePO?.nomor}</span>.
          </p>
          <textarea
            rows={3}
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="Contoh: Tunda pembelian atau sesuaikan kuantitas dengan stok gudang."
            className="w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 text-[14px] text-[#111111] focus:border-[#111111] focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRejectOpen(false)}>
              Batal
            </Button>
            <Button variant="dangerSolid" onClick={handleReject}>
              Tolak PO
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}

export default function ManajemenPOPage() {
  return (
    <Suspense
      fallback={
        <AppShell pageTitle="Persetujuan Purchase Order">
          <Card className="p-8 text-[13px] text-[#737373]">Memuat daftar persetujuan PO...</Card>
        </AppShell>
      }
    >
      <PersetujuanPOInner />
    </Suspense>
  );
}
