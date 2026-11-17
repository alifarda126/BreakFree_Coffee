'use client';

import React, { useMemo } from 'react';
import { useBreakfreeStore } from '@/lib/store/useBreakfreeStore';
import {
  evaluasiStatusStok,
  formatQty,
  hitungStokSaatIni,
} from '@/lib/domain/calculations';
import { AppShell } from '@/components/layout/AppShell';
import { Badge, Card, EmptyState } from '@/components/ui/primitives';

export default function KaptenStokKritisPage() {
  const bahan = useBreakfreeStore((s) => s.bahan);
  const menu = useBreakfreeStore((s) => s.menu);
  const stockMovements = useBreakfreeStore((s) => s.stockMovements);
  const purchaseOrders = useBreakfreeStore((s) => s.purchaseOrders);
  const laporanKosong = useBreakfreeStore((s) => s.laporanKosong);

  const attentionList = useMemo(() => {
    return bahan
      .map((b) => {
        const cur = hitungStokSaatIni(b.id, stockMovements);
        const level = evaluasiStatusStok(cur, b.stokMinimum);
        const affectedMenus = menu
          .filter((m) => m.resep.some((r) => r.bahanId === b.id))
          .map((m) => m.nama);
        const activePO = purchaseOrders.find(
          (po) =>
            (po.status === 'diajukan' || po.status === 'disetujui') &&
            po.items.some((i) => i.bahanId === b.id)
        );
        const emptyReport = laporanKosong.find(
          (l) => l.bahanId === b.id && (l.status === 'aktif' || l.status === 'dikonfirmasi')
        );
        return { b, cur, level, affectedMenus, activePO, emptyReport };
      })
      .filter((x) => x.level !== 'aman' || x.emptyReport != null);
  }, [bahan, stockMovements, menu, purchaseOrders, laporanKosong]);

  return (
    <AppShell pageTitle="Pemantauan Stok Kritis & Menu Kosong Outlet">
      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-[#221C17]">
              Bahan Kritis &amp; Menu Kosong Lintas Divisi (Barista + Kitchen)
            </h2>
            <p className="text-xs text-[#8A7F73]">
              Koordinasi cepat Kapten Outlet antara Barista, Kitchen, Kasir, dan Manajemen Logistik
            </p>
          </div>
          <Badge tone={attentionList.length > 0 ? 'danger' : 'success'}>
            {attentionList.length} Bahan Perlu Perhatian
          </Badge>
        </div>

        {attentionList.length === 0 ? (
          <EmptyState
            title="Seluruh stok Barista & Kitchen dalam status Aman"
            description="Bahan baku yang menyentuh batas <= 150% stok minimum atau dilaporkan kosong akan otomatis tampil di sini."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {attentionList.map((item) => {
              const tone =
                item.level === 'habis' || item.level === 'kritis' || item.emptyReport
                  ? 'danger'
                  : 'warning';
              return (
                <div
                  key={item.b.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[#E6E0D8] bg-[#FBF9F6] p-4"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-bold text-[#221C17]">
                      {item.b.nama} ({item.b.divisi})
                    </span>
                    <span className="text-xs text-[#8A7F73]">
                      Menu terdampak:{' '}
                      {item.affectedMenus.length > 0 ? item.affectedMenus.join(', ') : '-'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`tabular-mono text-[13px] font-bold ${
                        tone === 'danger' ? 'text-[#B23A2E]' : 'text-[#A86A12]'
                      }`}
                    >
                      {formatQty(item.cur, item.b.satuan)} (Min {formatQty(item.b.stokMinimum, item.b.satuan)})
                    </span>
                    <Badge tone={tone}>
                      {item.emptyReport
                        ? 'Dilaporkan Kosong'
                        : item.level === 'habis'
                          ? 'Habis'
                          : item.level === 'kritis'
                            ? 'Kritis'
                            : 'Menipis'}
                      {item.activePO ? ` · Masuk ${item.activePO.nomor}` : ''}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </AppShell>
  );
}
