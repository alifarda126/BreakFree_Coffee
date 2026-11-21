'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, ShoppingCart, SlidersHorizontal } from 'lucide-react';
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
  type StatusStokLevel,
} from '@/lib/domain/calculations';
import type { Bahan, DivisiBahan } from '@/lib/types';

export default function LogistikPersediaanPage() {
  const { pushToast } = useToast();
  const { bahan, stockMovements, penyesuaianStokManual } = useBreakfreeStore();

  const [search, setSearch] = useState('');
  const [filterDivisi, setFilterDivisi] = useState<'semua' | DivisiBahan>('semua');
  const [filterStatus, setFilterStatus] = useState<'semua' | 'kritis' | StatusStokLevel>('semua');

  const [ledgerBahan, setLedgerBahan] = useState<Bahan | null>(null);
  const [adjustDelta, setAdjustDelta] = useState<number>(0);
  const [adjustNote, setAdjustNote] = useState('');

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bahan
      .map((b) => {
        const stok = hitungStokSaatIni(b.id, stockMovements);
        const status = evaluasiStatusStok(stok, b.stokMinimum);
        return { b, stok, status };
      })
      .filter(({ b, status }) => {
        if (filterDivisi !== 'semua' && b.divisi !== filterDivisi) return false;
        if (filterStatus === 'kritis' && status !== 'kritis' && status !== 'habis') return false;
        if (filterStatus !== 'semua' && filterStatus !== 'kritis' && status !== filterStatus) return false;
        if (q && !b.nama.toLowerCase().includes(q) && !b.kategori.toLowerCase().includes(q)) return false;
        return true;
      });
  }, [bahan, stockMovements, search, filterDivisi, filterStatus]);

  const ledgerMovements = useMemo(() => {
    if (!ledgerBahan) return [];
    return stockMovements
      .filter((m) => m.bahanId === ledgerBahan.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [ledgerBahan, stockMovements]);

  const handleAdjust = () => {
    if (!ledgerBahan) return;
    if (adjustDelta === 0) {
      pushToast('Masukkan selisih qty (+ untuk tambah, - untuk kurang).', 'warning');
      return;
    }
    if (!adjustNote.trim()) {
      pushToast('Alasan penyesuaian wajib diisi.', 'warning');
      return;
    }
    penyesuaianStokManual(ledgerBahan.id, adjustDelta, adjustNote.trim());
    setAdjustDelta(0);
    setAdjustNote('');
    pushToast(`Stok ${ledgerBahan.nama} berhasil disesuaikan.`, 'success');
  };

  return (
    <AppShell pageTitle="Monitoring Persediaan">
      {/* Filter Bar */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          <div className="relative min-w-[220px] flex-1">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]"
              aria-hidden="true"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Cari bahan baku"
              placeholder="Cari nama bahan atau kategori..."
              className="h-9 w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] pl-9 pr-3 text-[13px] text-[#0F172A] focus:border-[#2563EB] focus:bg-white focus:outline-none"
            />
          </div>

          <select
            value={filterDivisi}
            onChange={(e) => setFilterDivisi(e.target.value as 'semua' | DivisiBahan)}
            aria-label="Filter divisi"
            className="h-9 rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13px] text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
          >
            <option value="semua">Semua Divisi</option>
            <option value="barista">Barista</option>
            <option value="kitchen">Kitchen</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'semua' | 'kritis' | StatusStokLevel)}
            aria-label="Filter status stok"
            className="h-9 rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13px] text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
          >
            <option value="semua">Semua Status</option>
            <option value="kritis">Kritis / Habis</option>
            <option value="menipis">Menipis</option>
            <option value="aman">Aman</option>
          </select>
        </div>

        <Link href="/logistik/po">
          <Button size="sm">
            <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
            Buat Pengajuan PO
          </Button>
        </Link>
      </Card>

      {/* Persediaan Table */}
      <Card className="p-5">
        {rows.length === 0 ? (
          <EmptyState
            title="Tidak ada bahan sesuai filter"
            description="Ubah filter status/divisi atau tambahkan master bahan baru."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[12px] font-semibold uppercase text-[#64748B]">
                  <th className="rounded-l-lg px-3 py-2.5">Bahan Baku</th>
                  <th className="px-3 py-2.5">Divisi</th>
                  <th className="px-3 py-2.5 text-right">Stok Saat Ini</th>
                  <th className="px-3 py-2.5 text-right">Stok Min</th>
                  <th className="px-3 py-2.5">Indikator</th>
                  <th className="px-3 py-2.5 text-right">Harga Satuan</th>
                  <th className="rounded-r-lg px-3 py-2.5 text-right">Kartu Stok</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {rows.map(({ b, stok, status }) => {
                  const tone =
                    status === 'aman' ? 'success' : status === 'menipis' ? 'warning' : 'danger';
                  return (
                    <tr key={b.id} className="transition-colors hover:bg-[#F8FAFC]">
                      <td className="px-3 py-3">
                        <div className="font-normal text-[#0F172A]">{b.nama}</div>
                        <div className="text-[12px] font-normal text-[#64748B]">{b.kategori}</div>
                      </td>
                      <td className="px-3 py-3 capitalize text-[#64748B]">{b.divisi}</td>
                      <td
                        className={`tabular-mono px-3 py-3 text-right font-semibold ${
                          status === 'aman'
                            ? 'text-[#15803D]'
                            : status === 'menipis'
                              ? 'text-[#B45309]'
                              : 'text-[#DC2626]'
                        }`}
                      >
                        {formatQty(stok, b.satuan)}
                      </td>
                      <td className="tabular-mono px-3 py-3 text-right text-[#64748B]">
                        {formatQty(b.stokMinimum, b.satuan)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <StockBar current={stok} min={b.stokMinimum} status={status} />
                          <Badge tone={tone} dot={false}>
                            {status}
                          </Badge>
                        </div>
                      </td>
                      <td className="tabular-mono px-3 py-3 text-right text-[#334155]">
                        {formatRp(b.hargaSatuan)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setLedgerBahan(b);
                            setAdjustDelta(0);
                            setAdjustNote('');
                          }}
                        >
                          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                          Mutasi
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal Kartu Stok & Penyesuaian Manual */}
      <Modal
        open={Boolean(ledgerBahan)}
        onClose={() => setLedgerBahan(null)}
        title={`Kartu Stok: ${ledgerBahan?.nama ?? ''}`}
      >
        {ledgerBahan && (
          <div className="space-y-4">
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5">
              <p className="mb-2 text-[13px] font-medium text-[#0F172A]">Penyesuaian Stok Manual</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <input
                  type="number"
                  step="0.5"
                  value={adjustDelta}
                  onChange={(e) => setAdjustDelta(Number(e.target.value) || 0)}
                  placeholder="+/- qty"
                  aria-label="Selisih qty"
                  className="tabular-mono h-9 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-[13px] text-[#0F172A]"
                />
                <input
                  type="text"
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  placeholder="Alasan penyesuaian..."
                  aria-label="Alasan penyesuaian"
                  className="h-9 rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-[13px] text-[#0F172A] sm:col-span-2"
                />
              </div>
              <div className="mt-2.5 flex justify-end">
                <Button size="sm" onClick={handleAdjust}>
                  Simpan Penyesuaian
                </Button>
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto rounded-xl border border-[#E2E8F0]">
              {ledgerMovements.length === 0 ? (
                <p className="p-4 text-center text-[12px] text-[#64748B]">Belum ada mutasi stok.</p>
              ) : (
                <table className="w-full text-left text-[12px]">
                  <thead className="bg-[#F8FAFC] text-[#64748B]">
                    <tr>
                      <th className="px-3 py-2">Waktu</th>
                      <th className="px-3 py-2">Tipe</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {ledgerMovements.slice(0, 20).map((mv) => (
                      <tr key={mv.id}>
                        <td className="tabular-mono px-3 py-2 text-[#64748B]">
                          {formatTanggal(mv.createdAt)} · {formatWaktu(mv.createdAt)}
                        </td>
                        <td className="px-3 py-2">
                          <Badge tone={mv.qty >= 0 ? 'success' : 'danger'} dot={false}>
                            {mv.tipe}
                          </Badge>
                        </td>
                        <td
                          className={`tabular-mono px-3 py-2 text-right font-semibold ${
                            mv.qty >= 0 ? 'text-[#15803D]' : 'text-[#DC2626]'
                          }`}
                        >
                          {mv.qty > 0 ? `+${mv.qty}` : mv.qty} {ledgerBahan.satuan}
                        </td>
                        <td className="px-3 py-2 text-[#334155]">{mv.catatan || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
