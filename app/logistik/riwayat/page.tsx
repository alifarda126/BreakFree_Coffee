'use client';

import React, { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ClipboardList, PackageCheck, Plus, Send } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Badge, Button, Card, EmptyState } from '@/components/ui/primitives';
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

function RiwayatPengadaanInner() {
  const searchParams = useSearchParams();
  const queryPoId = searchParams.get('id');
  const { pushToast } = useToast();

  const { bahan, suppliers, purchaseOrders, ubahStatusPO, terimaBarangPO } = useBreakfreeStore();

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

  const supplierObj = useMemo(
    () => (activePO ? suppliers.find((s) => s.id === activePO.supplierId) : undefined),
    [activePO, suppliers]
  );

  const getQtyReceiveValue = (poId: string, bahanId: string, remaining: number) => {
    const key = `${poId}:${bahanId}`;
    return receiveInputs[key] !== undefined ? receiveInputs[key] : remaining;
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
      pushToast('Masukkan minimal 1 qty barang yang diterima.', 'warning');
      return;
    }
    terimaBarangPO(activePO.id, map);
    setReceiveInputs({});
    pushToast(`Penerimaan PO ${activePO.nomor} dicatat ke persediaan stok.`, 'success');
  };

  return (
    <AppShell pageTitle="Riwayat Pengadaan">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 overflow-x-auto rounded-lg border border-[#E5E5E5] bg-[#F5F5F5] p-1">
          {(['semua', 'diajukan', 'disetujui', 'diterima', 'ditolak'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`rounded-md px-3 py-1 text-[12.5px] whitespace-nowrap transition-all ${
                filterStatus === st
                  ? 'bg-white font-semibold text-[#111111] shadow-[0_1px_2px_rgba(17,17,17,0.06)]'
                  : 'font-medium text-[#737373] hover:text-[#111111]'
              }`}
            >
              {st === 'semua' ? 'Semua PO' : poStatusLabel(st)}
            </button>
          ))}
        </div>

        <Link href="/logistik/po">
          <Button size="sm">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Buat Pengajuan PO
          </Button>
        </Link>
      </div>

      {sortedPOs.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            title="Belum ada riwayat pengadaan PO"
            description="Buat pengajuan Purchase Order terlebih dahulu untuk memantau status persetujuan dan penerimaan barang."
            action={
              <Link href="/logistik/po">
                <Button size="sm">Buat Pengajuan PO</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left PO List */}
          <Card className="space-y-3 p-4 lg:col-span-4">
            <h2 className="text-[15px] font-semibold text-[#111111]">
              Daftar Purchase Order ({filteredPOs.length})
            </h2>
            <div className="max-h-[460px] space-y-2 overflow-y-auto pr-1">
              {filteredPOs.map((po) => {
                const sup = suppliers.find((s) => s.id === po.supplierId);
                const isSelected = activePO?.id === po.id;
                return (
                  <button
                    key={po.id}
                    type="button"
                    onClick={() => setManualSelectedPoId(po.id)}
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
              })}
            </div>
          </Card>

          {/* Right PO Detail & Receive */}
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
                      Supplier: <span className="font-medium text-[#111111]">{supplierObj?.nama || '-'}</span> · Tanggal: {formatTanggal(activePO.tanggal)}
                    </p>
                    {activePO.catatan && (
                      <p className="mt-1 text-[12px] text-[#737373]">Catatan: {activePO.catatan}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] text-[#737373]">Total PO</p>
                    <p className="tabular-mono text-[22px] font-bold text-[#111111]">
                      {formatRp(activePO.total)}
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13.5px]">
                    <thead>
                      <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[12px] font-semibold uppercase text-[#737373]">
                        <th className="rounded-l-lg px-3 py-2.5">Bahan</th>
                        <th className="px-3 py-2.5 text-right">Pesan</th>
                        <th className="px-3 py-2.5 text-right">Diterima</th>
                        {(activePO.status === 'disetujui' || activePO.status === 'diterima_sebagian') && (
                          <th className="px-3 py-2.5 text-right">Terima Skrg</th>
                        )}
                        <th className="rounded-r-lg px-3 py-2.5 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5E5]">
                      {activePO.items.map((item) => {
                        const b = bahan.find((x) => x.id === item.bahanId);
                        const sisa = Math.max(0, item.qty - item.qtyDiterima);
                        const canReceive =
                          activePO.status === 'disetujui' || activePO.status === 'diterima_sebagian';
                        return (
                          <tr key={item.bahanId}>
                            <td className="px-3 py-2.5 text-[#111111]">
                              {b?.nama || item.bahanId}
                              <span className="block text-[12px] text-[#737373]">{b?.satuan || '-'}</span>
                            </td>
                            <td className="tabular-mono px-3 py-2.5 text-right">{item.qty}</td>
                            <td className="tabular-mono px-3 py-2.5 text-right text-[#737373]">
                              {item.qtyDiterima} / {item.qty}
                            </td>
                            {canReceive && (
                              <td className="px-3 py-2.5 text-right">
                                {sisa > 0 ? (
                                  <input
                                    type="number"
                                    min={0}
                                    max={sisa}
                                    value={getQtyReceiveValue(activePO.id, item.bahanId, sisa)}
                                    onChange={(e) => {
                                      const v = Math.max(0, Math.min(sisa, Number(e.target.value) || 0));
                                      setReceiveInputs((prev) => ({
                                        ...prev,
                                        [`${activePO.id}:${item.bahanId}`]: v,
                                      }));
                                    }}
                                    className="tabular-mono w-16 rounded-lg border border-[#E5E5E5] bg-white px-2 py-1 text-right text-[13px] focus:border-[#111111] focus:outline-none"
                                  />
                                ) : (
                                  <span className="text-[12px] font-medium text-[#15803D]">Selesai</span>
                                )}
                              </td>
                            )}
                            <td className="tabular-mono px-3 py-2.5 text-right font-semibold text-[#111111]">
                              {formatRp(item.qty * item.harga)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E5E5E5] pt-3">
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-[#737373]">
                    <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
                    Diperbarui: {formatWaktu(activePO.updatedAt)}
                  </span>
                  <div className="flex items-center gap-2">
                    {activePO.status === 'draft' && (
                      <Button
                        size="sm"
                        onClick={() => {
                          ubahStatusPO(activePO.id, 'diajukan');
                          pushToast(`PO ${activePO.nomor} diajukan ke Manajemen.`, 'success');
                        }}
                      >
                        <Send className="h-3.5 w-3.5" aria-hidden="true" />
                        Ajukan ke Manajemen
                      </Button>
                    )}
                    {(activePO.status === 'disetujui' || activePO.status === 'diterima_sebagian') && (
                      <Button size="sm" onClick={handleTerimaBarang}>
                        <PackageCheck className="h-3.5 w-3.5" aria-hidden="true" />
                        Konfirmasi Terima Barang
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </AppShell>
  );
}

export default function LogistikRiwayatPage() {
  return (
    <Suspense
      fallback={
        <AppShell pageTitle="Riwayat Pengadaan">
          <Card className="p-8 text-[13px] text-[#737373]">Memuat riwayat pengadaan...</Card>
        </AppShell>
      }
    >
      <RiwayatPengadaanInner />
    </Suspense>
  );
}
