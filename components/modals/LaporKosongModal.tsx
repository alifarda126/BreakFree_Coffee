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
          <label className="text-[13px] font-semibold text-[#221C17]">
            Pilih Bahan Baku yang Habis ({divisi === 'barista' ? 'Barista' : 'Kitchen'})
          </label>
          <select
            value={activeBahanId}
            onChange={(e) => setSelectedBahanId(e.target.value)}
            className="h-10 rounded-[10px] border border-[#E6E0D8] bg-white px-3 text-sm font-semibold text-[#221C17] focus:border-[#9C5B2E] focus:outline-none"
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
          <label className="text-[13px] font-semibold text-[#221C17]">Pelapor ({divisi})</label>
          <select
            value={pelaporId || divPetugas[0]?.id || ''}
            onChange={(e) => setPelaporId(e.target.value)}
            className="h-10 rounded-[10px] border border-[#E6E0D8] bg-white px-3 text-sm text-[#221C17] focus:border-[#9C5B2E] focus:outline-none"
          >
            {(divPetugas.length > 0 ? divPetugas : pegawai).map((p) => (
              <option key={p.id} value={p.id}>
                {p.nama}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2 rounded-[10px] border border-[#E5B8B3] bg-[#F8E3E0] p-3.5">
          <span className="text-xs font-bold text-[#B23A2E]">
            Menu Terdampak Otomatis (berdasarkan Master Resep):
          </span>
          {affectedMenus.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {affectedMenus.map((m) => (
                <span
                  key={m.id}
                  className="inline-flex items-center rounded-full border border-[#E5B8B3] bg-white px-2.5 py-0.5 text-xs font-semibold text-[#B23A2E]"
                >
                  {m.nama}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-xs text-[#3D342C]">
              Tidak ada menu resep terkait, catatan tetap dikirim ke Kasir.
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-semibold text-[#221C17]">Catatan untuk Kasir (Opsional)</label>
          <input
            type="text"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Misal: Ayam baru masuk pengiriman H+1 besok pagi"
            className="h-10 rounded-[10px] border border-[#E6E0D8] bg-white px-3 text-sm text-[#221C17] focus:border-[#9C5B2E] focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-1">
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" variant="dangerSolid" className="flex-1" disabled={!activeBahanId}>
            <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />
            Kirim Peringatan ke Kasir
          </Button>
        </div>
      </form>
    </Modal>
  );
}
