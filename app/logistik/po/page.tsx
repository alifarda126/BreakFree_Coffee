'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarClock, PackagePlus, ShoppingCart } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Badge, Button, Card, EmptyState, StockBar } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/ToastProvider';
import { useBreakfreeStore } from '@/lib/store/useBreakfreeStore';
import {
  formatQty,
  formatRp,
  hitungRekomendasiBahan,
  isWeekendISO,
  todayISO,
} from '@/lib/domain/calculations';

export default function PengajuanPOPage() {
  const router = useRouter();
  const { pushToast } = useToast();
  const {
    bahan,
    suppliers,
    stockMovements,
    laporanStok,
    purchaseOrders,
    settings,
    buatPurchaseOrder,
  } = useBreakfreeStore();

  const [pakemWeekend, setPakemWeekend] = useState<boolean>(() => isWeekendISO(todayISO()));
  const [showAllBahan, setShowAllBahan] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(() => suppliers[0]?.id ?? '');
  const [checkedBahan, setCheckedBahan] = useState<Record<string, boolean>>({});
  const [customQtyMap, setCustomQtyMap] = useState<Record<string, number>>({});
  const [customHargaMap, setCustomHargaMap] = useState<Record<string, number>>({});
  const [poCatatan, setPoCatatan] = useState('');

  const effectiveSupplierId = selectedSupplierId || suppliers[0]?.id || '';

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
        if (weight[a.status] !== weight[b.status]) return weight[a.status] - weight[b.status];
        return b.rekomendasiQty - a.rekomendasiQty;
      });
  }, [bahan, stockMovements, laporanStok, purchaseOrders, settings.faktorAkhirPekan, pakemWeekend]);

  const visibleRekomendasi = useMemo(() => {
    if (showAllBahan) return rekomendasiRows;
    const needed = rekomendasiRows.filter((r) => r.rekomendasiQty > 0 || r.status !== 'aman');
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
      pushToast('Pilih supplier terlebih dahulu.', 'warning');
      return;
    }
    if (selectedPOItems.length === 0) {
      pushToast('Centang minimal 1 bahan yang akan dibeli.', 'warning');
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
          : 'Restock berdasarkan evaluasi stok minimum & waste'),
      ajukanLangsung,
    });
    setCheckedBahan({});
    setPoCatatan('');
    pushToast(
      `PO ${po.nomor} ${ajukanLangsung ? 'berhasil diajukan ke Manajemen' : 'disimpan sebagai draft'}.`,
      'success'
    );
    router.push(`/logistik/riwayat?id=${po.id}`);
  };

  return (
    <AppShell pageTitle="Pengajuan Purchase Order">
      <Card className="space-y-4 p-5">
        <div className="flex flex-col justify-between gap-4 border-b border-[#E2E8F0] pb-4 lg:flex-row lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[17px] font-semibold text-[#0F172A]">
                Evaluasi Kebutuhan &amp; Rekomendasi Pembelian Bahan
              </h2>
              <Badge tone={pakemWeekend ? 'primary' : 'neutral'} dot={false}>
                <CalendarClock className="h-3 w-3" aria-hidden="true" />
                {pakemWeekend
                  ? `Pakem Akhir Pekan (x${settings.faktorAkhirPekan})`
                  : 'Hari Kerja (x1.0)'}
              </Badge>
            </div>
            <p className="mt-1 text-[13px] font-normal text-[#64748B]">
              Dihitung otomatis dari stok saat ini, batas stok minimum, rata-rata waste 7 hari, dan PO aktif.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-[12px] font-medium text-[#0F172A]">
              <input
                type="checkbox"
                checked={pakemWeekend}
                onChange={(e) => setPakemWeekend(e.target.checked)}
                className="h-4 w-4 rounded accent-[#2563EB]"
              />
              Pakem Sabtu-Minggu
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-[12px] font-medium text-[#0F172A]">
              <input
                type="checkbox"
                checked={showAllBahan}
                onChange={(e) => setShowAllBahan(e.target.checked)}
                className="h-4 w-4 rounded accent-[#2563EB]"
              />
              Semua Bahan ({bahan.length})
            </label>
            <Button variant="secondary" size="sm" onClick={handleSelectAllRecommended}>
              Pilih Semua Rekomendasi
            </Button>
          </div>
        </div>

        {bahan.length === 0 ? (
          <EmptyState
            title="Belum ada master bahan"
            description="Tambahkan bahan baku di Master Bahan terlebih dahulu sebelum membuat PO."
            action={
              <Link href="/master">
                <Button size="sm">Buka Master Bahan</Button>
              </Link>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-[13.5px]">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[12px] font-semibold uppercase text-[#64748B]">
                    <th className="w-10 rounded-l-lg px-2 py-2.5">Pilih</th>
                    <th className="px-3 py-2.5">Bahan Baku</th>
                    <th className="px-3 py-2.5">Status Stok</th>
                    <th className="px-3 py-2.5 text-right">Target</th>
                    <th className="px-3 py-2.5 text-right">Waste 7H</th>
                    <th className="px-3 py-2.5 text-right">Saran Beli</th>
                    <th className="px-3 py-2.5 text-right">Qty PO</th>
                    <th className="rounded-r-lg px-3 py-2.5 text-right">Harga Satuan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
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
                            aria-label={`Pilih ${row.bahan.nama}`}
                            className="h-4 w-4 rounded accent-[#2563EB]"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <div className="text-[#0F172A]">{row.bahan.nama}</div>
                          <div className="text-[12px] capitalize text-[#64748B]">
                            {row.bahan.divisi} · {row.bahan.kategori}
                          </div>
                        </td>
                        <td className="min-w-[155px] px-3 py-3">
                          <div className="mb-1 flex items-center justify-between text-[12px]">
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
                              dot={false}
                            >
                              {row.status}
                            </Badge>
                          </div>
                          <StockBar
                            current={row.stokSaatIni}
                            min={row.bahan.stokMinimum}
                            status={row.status}
                          />
                        </td>
                        <td className="tabular-mono px-3 py-3 text-right text-[#64748B]">
                          {formatQty(row.targetStok, row.bahan.satuan)}
                        </td>
                        <td className="tabular-mono px-3 py-3 text-right text-[#64748B]">
                          {formatQty(row.totalWaste7H, row.bahan.satuan)}
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
                            className="tabular-mono w-20 rounded-lg border border-[#E2E8F0] bg-white px-2 py-1 text-right text-[13px] text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
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
                            aria-label={`Harga ${row.bahan.nama}`}
                            className="tabular-mono w-28 rounded-lg border border-[#E2E8F0] bg-white px-2 py-1 text-right text-[13px] text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Submit PO Bar */}
            <div className="flex flex-col justify-between gap-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 lg:flex-row lg:items-center">
              <div className="flex flex-1 flex-wrap items-center gap-3">
                <div className="min-w-[200px]">
                  <label htmlFor="po-sup" className="mb-1 block text-[12px] font-medium text-[#475569]">
                    Supplier Tujuan
                  </label>
                  <select
                    id="po-sup"
                    value={effectiveSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="h-9 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13px] text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
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
                  <label htmlFor="po-note" className="mb-1 block text-[12px] font-medium text-[#475569]">
                    Catatan PO (Opsional)
                  </label>
                  <input
                    id="po-note"
                    type="text"
                    value={poCatatan}
                    onChange={(e) => setPoCatatan(e.target.value)}
                    placeholder="Misal: Kirim besok pagi sebelum shift 1 buka"
                    className="h-9 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13px] text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 lg:justify-end">
                <div className="text-right">
                  <p className="text-[12px] font-normal text-[#64748B]">
                    {selectedPOItems.length} bahan dipilih · Estimasi Total
                  </p>
                  <p className="tabular-mono text-[20px] font-bold text-[#0F172A]">
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
                    Ajukan ke Manajemen
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </Card>
    </AppShell>
  );
}
