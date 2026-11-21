'use client';

import React, { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useBreakfreeStore } from '@/lib/store/useBreakfreeStore';
import { formatQty, hitungStokSaatIni } from '@/lib/domain/calculations';
import { Badge, Button, Modal } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/ToastProvider';
import type { Divisi } from '@/lib/types';

export function LaporKosongModal({
  open,
  onClose,
  divisi,
}: {
  open: boolean;
  onClose: () => void;
  divisi: Divisi;
}) {
  const bahan = useBreakfreeStore((s) => s.bahan);
  const menu = useBreakfreeStore((s) => s.menu);
  const stockMovements = useBreakfreeStore((s) => s.stockMovements);
  const pegawai = useBreakfreeStore((s) => s.pegawai);
  const activePetugasId = useBreakfreeStore((s) => s.activePetugasId);
  const laporBahanKosong = useBreakfreeStore((s) => s.laporBahanKosong);
  const { pushToast } = useToast();

  const divBahan = useMemo(
    () => bahan.filter((b) => b.divisi === divisi || b.divisi === 'bersama'),
    [bahan, divisi]
  );

  const [selectedBahanId, setSelectedBahanId] = useState<string>('');
  const [catatan, setCatatan] = useState('');

  const activeBahanId =
    selectedBahanId && divBahan.some((b) => b.id === selectedBahanId)
      ? selectedBahanId
      : divBahan[0]?.id ?? '';

  const affectedMenus = useMemo(
    () => menu.filter((m) => m.resep.some((r) => r.bahanId === activeBahanId)),
    [menu, activeBahanId]
  );

  const divPetugas = useMemo(
    () => pegawai.filter((p) => p.aktif && p.posisi === divisi),
    [pegawai, divisi]
  );
  const [pelaporId, setPelaporId] = useState(activePetugasId || divPetugas[0]?.id || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBahanId) return;
    laporBahanKosong({
      bahanId: activeBahanId,
      divisi,
      pelaporId: pelaporId || activePetugasId || 'petugas',
      catatan,
    });
    const bName = bahan.find((b) => b.id === activeBahanId)?.nama ?? 'Bahan';
    pushToast(`Notifikasi bahan kosong "${bName}" dikirim ke Kasir`, 'danger');
    setCatatan('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Lapor Bahan / Menu Kosong"
      badgeEl={<Badge tone="danger">Notifikasi Real-Time ke Kasir</Badge>}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="kosong-bahan" className="text-[13px] font-medium text-[#0F172A]">
            Pilih Bahan Baku yang Habis ({divisi === 'barista' ? 'Barista' : 'Kitchen'})
          </label>
          <select
            id="kosong-bahan"
            value={activeBahanId}
            onChange={(e) => setSelectedBahanId(e.target.value)}
            className="h-10 rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm font-normal text-[#0F172A] transition focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
          >
            {divBahan.map((b) => {
              const cur = hitungStokSaatIni(b.id, stockMovements);
              return (
                <option key={b.id} value={b.id}>
                  {b.nama} (Stok saat ini: {formatQty(cur, b.satuan)})
                </option>
              );
            })}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="kosong-pelapor" className="text-[13px] font-medium text-[#0F172A]">
            Pelapor ({divisi})
          </label>
          <select
            id="kosong-pelapor"
            value={pelaporId || divPetugas[0]?.id || ''}
            onChange={(e) => setPelaporId(e.target.value)}
            className="h-10 rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm text-[#0F172A] transition focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
          >
            {(divPetugas.length > 0 ? divPetugas : pegawai).map((p) => (
              <option key={p.id} value={p.id}>
                {p.nama}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3.5">
          <span className="text-xs font-semibold text-[#B91C1C]">
            Menu Terdampak Otomatis (berdasarkan Master Resep):
          </span>
          {affectedMenus.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {affectedMenus.map((m) => (
                <span
                  key={m.id}
                  className="inline-flex items-center rounded-md border border-[#FECACA] bg-white px-2.5 py-0.5 text-xs font-medium text-[#B91C1C]"
                >
                  {m.nama}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-xs text-[#475569]">
              Tidak ada menu resep terkait, catatan tetap dikirim ke Kasir.
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="kosong-catatan" className="text-[13px] font-medium text-[#0F172A]">
            Catatan untuk Kasir (Opsional)
          </label>
          <input
            id="kosong-catatan"
            type="text"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Misal: Ayam baru masuk pengiriman H+1 besok pagi"
            className="h-10 rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm text-[#0F172A] transition focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-1">
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" variant="dangerSolid" className="flex-1" disabled={!activeBahanId}>
            <AlertTriangle className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            Kirim Peringatan ke Kasir
          </Button>
        </div>
      </form>
    </Modal>
  );
}
