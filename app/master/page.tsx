'use client';

import React, { useMemo, useState } from 'react';
import {
  Coffee,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  Truck,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Badge, Button, Card, EmptyState, Modal } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/ToastProvider';
import { useBreakfreeStore } from '@/lib/store/useBreakfreeStore';
import { formatQty, formatRp, hitungStokSaatIni } from '@/lib/domain/calculations';
import type {
  Bahan,
  Divisi,
  DivisiBahan,
  Menu,
  ResepItem,
  SumberBahan,
  Supplier,
} from '@/lib/types';

type MasterTab = 'bahan' | 'menu' | 'supplier';

export default function MasterDataPage() {
  const { pushToast } = useToast();
  const {
    bahan,
    menu,
    suppliers,
    stockMovements,
    purchaseOrders,
    upsertBahan,
    deleteBahan,
    upsertMenu,
    deleteMenu,
    upsertSupplier,
    deleteSupplier,
  } = useBreakfreeStore();

  const [tab, setTab] = useState<MasterTab>('bahan');
  const [search, setSearch] = useState('');
  const [filterDivisi, setFilterDivisi] = useState<'semua' | DivisiBahan>('semua');
  const [filterSumber, setFilterSumber] = useState<'semua' | SumberBahan>('semua');

  // --- Bahan Form Modal ---
  const [bahanModalOpen, setBahanModalOpen] = useState(false);
  const [editingBahanId, setEditingBahanId] = useState<string | undefined>(undefined);
  const [bNama, setBNama] = useState('');
  const [bKategori, setBKategori] = useState('Dairy');
  const [bSatuan, setBSatuan] = useState('liter');
  const [bDivisi, setBDivisi] = useState<DivisiBahan>('barista');
  const [bSumber, setBSumber] = useState<SumberBahan>('eksternal');
  const [bStokMin, setBStokMin] = useState<number>(5);
  const [bHarga, setBHarga] = useState<number>(15000);
  const [bPerishable, setBPerishable] = useState<boolean>(false);

  // --- Menu Form Modal ---
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [editingMenuId, setEditingMenuId] = useState<string | undefined>(undefined);
  const [mNama, setMNama] = useState('');
  const [mKategori, setMKategori] = useState<Menu['kategori']>('minuman_dingin');
  const [mDivisi, setMDivisi] = useState<Divisi>('barista');
  const [mHarga, setMHarga] = useState<number>(22000);
  const [mResep, setMResep] = useState<ResepItem[]>([]);
  const [pickBahanId, setPickBahanId] = useState('');
  const [pickQty, setPickQty] = useState<number>(1);

  // --- Supplier Form Modal ---
  const [supModalOpen, setSupModalOpen] = useState(false);
  const [editingSupId, setEditingSupId] = useState<string | undefined>(undefined);
  const [sNama, setSNama] = useState('');
  const [sKontak, setSKontak] = useState('');
  const [sKategori, setSKategori] = useState('Kopi & Sirup');

  const q = search.trim().toLowerCase();

  const filteredBahan = useMemo(() => {
    return bahan.filter((b) => {
      if (filterDivisi !== 'semua' && b.divisi !== filterDivisi) return false;
      if (filterSumber !== 'semua' && b.sumber !== filterSumber) return false;
      if (q && !b.nama.toLowerCase().includes(q) && !b.kategori.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [bahan, filterDivisi, filterSumber, q]);

  const filteredMenu = useMemo(() => {
    return menu.filter((m) => {
      if (filterDivisi === 'barista' || filterDivisi === 'kitchen') {
        if (m.divisi !== filterDivisi) return false;
      }
      if (q && !m.nama.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [menu, filterDivisi, q]);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      if (q && !s.nama.toLowerCase().includes(q) && !s.kategori.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [suppliers, q]);

  const openAddBahan = () => {
    setEditingBahanId(undefined);
    setBNama('');
    setBKategori('Dairy');
    setBSatuan('liter');
    setBDivisi('barista');
    setBSumber('eksternal');
    setBStokMin(5);
    setBHarga(15000);
    setBPerishable(false);
    setBahanModalOpen(true);
  };

  const openEditBahan = (b: Bahan) => {
    setEditingBahanId(b.id);
    setBNama(b.nama);
    setBKategori(b.kategori);
    setBSatuan(b.satuan);
    setBDivisi(b.divisi);
    setBSumber(b.sumber);
    setBStokMin(b.stokMinimum);
    setBHarga(b.hargaSatuan);
    setBPerishable(b.perishable);
    setBahanModalOpen(true);
  };

  const handleSaveBahan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bNama.trim() || !bSatuan.trim()) {
      pushToast('Nama bahan dan satuan wajib diisi.', 'warning');
      return;
    }
    upsertBahan({
      id: editingBahanId,
      nama: bNama.trim(),
      kategori: bKategori.trim() || 'Umum',
      satuan: bSatuan.trim(),
      divisi: bDivisi,
      sumber: bSumber,
      stokMinimum: Math.max(0, bStokMin),
      hargaSatuan: Math.max(0, bHarga),
      perishable: bPerishable,
    });
    setBahanModalOpen(false);
    pushToast(
      editingBahanId ? `Bahan "${bNama}" diperbarui.` : `Bahan "${bNama}" ditambahkan.`,
      'success'
    );
  };

  const openAddMenu = () => {
    setEditingMenuId(undefined);
    setMNama('');
    setMKategori('minuman_dingin');
    setMDivisi('barista');
    setMHarga(22000);
    setMResep([]);
    setPickBahanId(bahan[0]?.id ?? '');
    setPickQty(1);
    setMenuModalOpen(true);
  };

  const openEditMenu = (m: Menu) => {
    setEditingMenuId(m.id);
    setMNama(m.nama);
    setMKategori(m.kategori);
    setMDivisi(m.divisi);
    setMHarga(m.harga);
    setMResep([...m.resep]);
    setPickBahanId(bahan[0]?.id ?? '');
    setPickQty(1);
    setMenuModalOpen(true);
  };

  const handleAddResepRow = () => {
    if (!pickBahanId) return;
    if (pickQty <= 0) {
      pushToast('Takaran bahan harus lebih dari 0.', 'warning');
      return;
    }
    setMResep((prev) => {
      const idx = prev.findIndex((r) => r.bahanId === pickBahanId);
      if (idx >= 0) {
        return prev.map((r, i) => (i === idx ? { ...r, qty: pickQty } : r));
      }
      return [...prev, { bahanId: pickBahanId, qty: pickQty }];
    });
  };

  const handleSaveMenu = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mNama.trim()) {
      pushToast('Nama menu wajib diisi.', 'warning');
      return;
    }
    upsertMenu({
      id: editingMenuId,
      nama: mNama.trim(),
      kategori: mKategori,
      divisi: mDivisi,
      harga: Math.max(0, mHarga),
      resep: mResep,
    });
    setMenuModalOpen(false);
    pushToast(
      editingMenuId ? `Menu "${mNama}" diperbarui.` : `Menu "${mNama}" ditambahkan.`,
      'success'
    );
  };

  const openAddSup = () => {
    setEditingSupId(undefined);
    setSNama('');
    setSKontak('');
    setSKategori('Kopi & Sirup');
    setSupModalOpen(true);
  };

  const openEditSup = (s: Supplier) => {
    setEditingSupId(s.id);
    setSNama(s.nama);
    setSKontak(s.kontak);
    setSKategori(s.kategori);
    setSupModalOpen(true);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sNama.trim()) {
      pushToast('Nama supplier wajib diisi.', 'warning');
      return;
    }
    upsertSupplier({
      id: editingSupId,
      nama: sNama.trim(),
      kontak: sKontak.trim() || '-',
      kategori: sKategori.trim() || 'Umum',
    });
    setSupModalOpen(false);
    pushToast(
      editingSupId ? `Supplier "${sNama}" diperbarui.` : `Supplier "${sNama}" ditambahkan.`,
      'success'
    );
  };

  const inputCls =
    'w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#111111] transition focus:border-[#111111] focus:outline-none focus:ring-2 focus:ring-[#111111]/10';

  return (
    <AppShell pageTitle="Master Bahan Baku, Menu & Supplier">
      <div className="space-y-6">
        {/* Tabs + Primary Action */}
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div
            className="inline-flex rounded-lg border border-[#E5E5E5] bg-[#F5F5F5] p-1"
            role="tablist"
            aria-label="Kategori master data"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'bahan'}
              onClick={() => setTab('bahan')}
              className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs transition-all ${
                tab === 'bahan'
                  ? 'bg-white font-semibold text-[#111111] shadow-[0_1px_2px_rgba(17,17,17,0.06)]'
                  : 'font-medium text-[#737373] hover:text-[#111111]'
              }`}
            >
              <Package className="h-3.5 w-3.5" aria-hidden="true" />
              Bahan Baku ({bahan.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'menu'}
              onClick={() => setTab('menu')}
              className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs transition-all ${
                tab === 'menu'
                  ? 'bg-white font-semibold text-[#111111] shadow-[0_1px_2px_rgba(17,17,17,0.06)]'
                  : 'font-medium text-[#737373] hover:text-[#111111]'
              }`}
            >
              <Coffee className="h-3.5 w-3.5" aria-hidden="true" />
              Menu &amp; Resep ({menu.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'supplier'}
              onClick={() => setTab('supplier')}
              className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs transition-all ${
                tab === 'supplier'
                  ? 'bg-white font-semibold text-[#111111] shadow-[0_1px_2px_rgba(17,17,17,0.06)]'
                  : 'font-medium text-[#737373] hover:text-[#111111]'
              }`}
            >
              <Truck className="h-3.5 w-3.5" aria-hidden="true" />
              Supplier ({suppliers.length})
            </button>
          </div>

          {tab === 'bahan' && (
            <Button variant="primary" size="sm" onClick={openAddBahan}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Tambah Bahan Baku
            </Button>
          )}
          {tab === 'menu' && (
            <Button variant="primary" size="sm" onClick={openAddMenu}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Tambah Menu &amp; Resep
            </Button>
          )}
          {tab === 'supplier' && (
            <Button variant="primary" size="sm" onClick={openAddSup}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Tambah Supplier
            </Button>
          )}
        </div>

        {/* Filter Bar */}
        <Card className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-[220px] flex-1">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#737373]"
              aria-hidden="true"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Cari data master"
              placeholder={
                tab === 'bahan'
                  ? 'Cari nama bahan atau kategori...'
                  : tab === 'menu'
                    ? 'Cari nama menu...'
                    : 'Cari supplier atau kategori pasokan...'
              }
              className="w-full rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] py-2 pl-9 pr-3 text-xs text-[#111111] transition focus:border-[#111111] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#111111]/10"
            />
          </div>

          {tab !== 'supplier' && (
            <select
              value={filterDivisi}
              onChange={(e) => setFilterDivisi(e.target.value as 'semua' | DivisiBahan)}
              aria-label="Filter divisi"
              className="rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 text-xs font-medium text-[#111111] focus:border-[#111111] focus:outline-none focus:ring-2 focus:ring-[#111111]/10"
            >
              <option value="semua">Semua Divisi</option>
              <option value="barista">Barista</option>
              <option value="kitchen">Kitchen</option>
              {tab === 'bahan' && <option value="bersama">Bersama</option>}
            </select>
          )}

          {tab === 'bahan' && (
            <select
              value={filterSumber}
              onChange={(e) => setFilterSumber(e.target.value as 'semua' | SumberBahan)}
              aria-label="Filter sumber bahan"
              className="rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 text-xs font-medium text-[#111111] focus:border-[#111111] focus:outline-none focus:ring-2 focus:ring-[#111111]/10"
            >
              <option value="semua">Semua Sumber</option>
              <option value="eksternal">Eksternal (Beli PO)</option>
              <option value="internal">Internal (Pre-mix / Produksi)</option>
            </select>
          )}
        </Card>

        {/* Tab 1: Bahan Baku */}
        {tab === 'bahan' && (
          <Card className="p-5">
            {filteredBahan.length === 0 ? (
              <EmptyState
                title="Tidak ada bahan sesuai filter"
                description="Tambahkan bahan baru atau ubah kata kunci pencarian."
                action={
                  <Button variant="primary" size="sm" onClick={openAddBahan}>
                    + Tambah Bahan Baku
                  </Button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[11px] font-semibold uppercase tracking-wider text-[#737373]">
                      <th className="rounded-l-lg px-3 py-2.5">Nama Bahan</th>
                      <th className="px-3 py-2.5">Divisi &amp; Sumber</th>
                      <th className="px-3 py-2.5 text-right">Stok Saat Ini</th>
                      <th className="px-3 py-2.5 text-right">Stok Min</th>
                      <th className="px-3 py-2.5 text-right">Harga Satuan</th>
                      <th className="px-3 py-2.5">Sifat</th>
                      <th className="rounded-r-lg px-3 py-2.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5E5]">
                    {filteredBahan.map((b) => {
                      const stok = hitungStokSaatIni(b.id, stockMovements);
                      return (
                        <tr key={b.id} className="transition-colors hover:bg-[#FAFAFA]">
                          <td className="px-3 py-3">
                            <p className="text-[13px] font-semibold text-[#111111]">{b.nama}</p>
                            <p className="text-[11px] text-[#737373]">{b.kategori}</p>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge
                                tone={
                                  b.divisi === 'barista'
                                    ? 'primary'
                                    : b.divisi === 'kitchen'
                                      ? 'success'
                                      : 'neutral'
                                }
                              >
                                {b.divisi}
                              </Badge>
                              <Badge tone={b.sumber === 'eksternal' ? 'neutral' : 'warning'}>
                                {b.sumber === 'eksternal' ? 'Eksternal' : 'Internal'}
                              </Badge>
                            </div>
                          </td>
                          <td className="tabular-mono px-3 py-3 text-right font-semibold text-[#111111]">
                            {formatQty(stok, b.satuan)}
                          </td>
                          <td className="tabular-mono px-3 py-3 text-right text-[#737373]">
                            {formatQty(b.stokMinimum, b.satuan)}
                          </td>
                          <td className="tabular-mono px-3 py-3 text-right font-medium text-[#111111]">
                            {formatRp(b.hargaSatuan)}
                          </td>
                          <td className="px-3 py-3">
                            {b.perishable ? (
                              <Badge tone="danger">Mudah Basi</Badge>
                            ) : (
                              <Badge tone="neutral">Reguler</Badge>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditBahan(b)}
                                aria-label={`Edit ${b.nama}`}
                              >
                                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  deleteBahan(b.id);
                                  pushToast(`Bahan "${b.nama}" dihapus.`, 'info');
                                }}
                                aria-label={`Hapus ${b.nama}`}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-[#DC2626]" aria-hidden="true" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* Tab 2: Menu & Resep */}
        {tab === 'menu' && (
          <Card className="p-5">
            {filteredMenu.length === 0 ? (
              <EmptyState
                title="Belum ada menu sesuai filter"
                description="Tambahkan menu beserta komposisi bahan bakunya agar bahan kosong otomatis menandai menu terdampak."
                action={
                  <Button variant="primary" size="sm" onClick={openAddMenu}>
                    + Tambah Menu
                  </Button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[11px] font-semibold uppercase tracking-wider text-[#737373]">
                      <th className="rounded-l-lg px-3 py-2.5">Nama Menu</th>
                      <th className="px-3 py-2.5">Divisi &amp; Kategori</th>
                      <th className="px-3 py-2.5 text-right">Harga Jual</th>
                      <th className="px-3 py-2.5">Komposisi Resep (Bahan Terkait)</th>
                      <th className="rounded-r-lg px-3 py-2.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5E5]">
                    {filteredMenu.map((m) => (
                      <tr key={m.id} className="transition-colors hover:bg-[#FAFAFA]">
                        <td className="px-3 py-3 text-[13px] font-semibold text-[#111111]">
                          {m.nama}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge tone={m.divisi === 'barista' ? 'primary' : 'success'}>
                              {m.divisi}
                            </Badge>
                            <Badge tone="neutral">{m.kategori.replace('_', ' ')}</Badge>
                          </div>
                        </td>
                        <td className="tabular-mono px-3 py-3 text-right font-semibold text-[#111111]">
                          {formatRp(m.harga)}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {m.resep.length === 0 && (
                              <span className="italic text-[#737373]">Belum ada resep</span>
                            )}
                            {m.resep.map((r, idx) => {
                              const b = bahan.find((x) => x.id === r.bahanId);
                              return (
                                <span
                                  key={r.bahanId}
                                  className="inline-flex items-center gap-1 text-[12px] text-[#262626]"
                                >
                                  <span>{b?.nama || r.bahanId}</span>
                                  <span className="tabular-mono font-medium text-[#111111]">
                                    ({r.qty} {b?.satuan || ''})
                                  </span>
                                  {idx < m.resep.length - 1 && <span className="text-[#D4D4D4]">·</span>}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditMenu(m)}
                              aria-label={`Edit ${m.nama}`}
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                deleteMenu(m.id);
                                pushToast(`Menu "${m.nama}" dihapus.`, 'info');
                              }}
                              aria-label={`Hapus ${m.nama}`}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-[#DC2626]" aria-hidden="true" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* Tab 3: Supplier */}
        {tab === 'supplier' && (
          <Card className="p-5">
            {filteredSuppliers.length === 0 ? (
              <EmptyState
                title="Belum ada supplier terdaftar"
                description="Tambahkan supplier agar Logistik dapat menerbitkan Purchase Order."
                action={
                  <Button variant="primary" size="sm" onClick={openAddSup}>
                    + Tambah Supplier
                  </Button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[11px] font-semibold uppercase tracking-wider text-[#737373]">
                      <th className="rounded-l-lg px-3 py-2.5">Nama Supplier</th>
                      <th className="px-3 py-2.5">Kategori Pasokan</th>
                      <th className="px-3 py-2.5">Kontak / Telepon</th>
                      <th className="px-3 py-2.5 text-right">Total PO</th>
                      <th className="rounded-r-lg px-3 py-2.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5E5]">
                    {filteredSuppliers.map((s) => {
                      const poCount = purchaseOrders.filter((p) => p.supplierId === s.id).length;
                      return (
                        <tr key={s.id} className="transition-colors hover:bg-[#FAFAFA]">
                          <td className="px-3 py-3 text-[13px] font-semibold text-[#111111]">
                            {s.nama}
                          </td>
                          <td className="px-3 py-3">
                            <Badge tone="neutral">{s.kategori}</Badge>
                          </td>
                          <td className="tabular-mono px-3 py-3 text-[#737373]">{s.kontak}</td>
                          <td className="tabular-mono px-3 py-3 text-right font-semibold text-[#111111]">
                            {poCount} PO
                          </td>
                          <td className="px-3 py-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditSup(s)}
                                aria-label={`Edit ${s.nama}`}
                              >
                                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  deleteSupplier(s.id);
                                  pushToast(`Supplier "${s.nama}" dihapus.`, 'info');
                                }}
                                aria-label={`Hapus ${s.nama}`}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-[#DC2626]" aria-hidden="true" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Modal Tambah / Edit Bahan */}
      <Modal
        open={bahanModalOpen}
        onClose={() => setBahanModalOpen(false)}
        title={editingBahanId ? 'Edit Bahan Baku' : 'Tambah Bahan Baku Baru'}
      >
        <form onSubmit={handleSaveBahan} className="space-y-4 text-sm">
          <div>
            <label htmlFor="b-nama" className="mb-1 block text-xs font-medium text-[#737373]">
              Nama Bahan
            </label>
            <input
              id="b-nama"
              type="text"
              required
              value={bNama}
              onChange={(e) => setBNama(e.target.value)}
              placeholder="Contoh: Susu Full Cream UHT"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="b-kat" className="mb-1 block text-xs font-medium text-[#737373]">
                Kategori
              </label>
              <input
                id="b-kat"
                type="text"
                value={bKategori}
                onChange={(e) => setBKategori(e.target.value)}
                placeholder="Dairy / Kopi / Dapur"
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="b-sat" className="mb-1 block text-xs font-medium text-[#737373]">
                Satuan
              </label>
              <input
                id="b-sat"
                type="text"
                required
                value={bSatuan}
                onChange={(e) => setBSatuan(e.target.value)}
                placeholder="liter / kg / pack / pcs"
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="b-div" className="mb-1 block text-xs font-medium text-[#737373]">
                Divisi Pemakai
              </label>
              <select
                id="b-div"
                value={bDivisi}
                onChange={(e) => setBDivisi(e.target.value as DivisiBahan)}
                className={inputCls}
              >
                <option value="barista">Barista</option>
                <option value="kitchen">Kitchen</option>
                <option value="bersama">Bersama</option>
              </select>
            </div>
            <div>
              <label htmlFor="b-sum" className="mb-1 block text-xs font-medium text-[#737373]">
                Sumber Pengadaan
              </label>
              <select
                id="b-sum"
                value={bSumber}
                onChange={(e) => setBSumber(e.target.value as SumberBahan)}
                className={inputCls}
              >
                <option value="eksternal">Eksternal (Beli PO)</option>
                <option value="internal">Internal (Produksi Outlet)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="b-min" className="mb-1 block text-xs font-medium text-[#737373]">
                Stok Minimum
              </label>
              <input
                id="b-min"
                type="number"
                min={0}
                step="0.5"
                value={bStokMin}
                onChange={(e) => setBStokMin(Math.max(0, Number(e.target.value) || 0))}
                className={`${inputCls} tabular-mono`}
              />
            </div>
            <div>
              <label htmlFor="b-hrg" className="mb-1 block text-xs font-medium text-[#737373]">
                Harga Satuan (Rp)
              </label>
              <input
                id="b-hrg"
                type="number"
                min={0}
                step={500}
                value={bHarga}
                onChange={(e) => setBHarga(Math.max(0, Number(e.target.value) || 0))}
                className={`${inputCls} tabular-mono`}
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-[#262626]">
            <input
              type="checkbox"
              checked={bPerishable}
              onChange={(e) => setBPerishable(e.target.checked)}
              className="h-4 w-4 rounded accent-[#111111]"
            />
            Bahan mudah basi / perishable (dipantau ketat saat Closing &amp; Retur BOP)
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setBahanModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary">
              Simpan Bahan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Tambah / Edit Menu & Resep */}
      <Modal
        open={menuModalOpen}
        onClose={() => setMenuModalOpen(false)}
        title={editingMenuId ? 'Edit Menu & Resep' : 'Tambah Menu & Resep Baru'}
      >
        <form onSubmit={handleSaveMenu} className="space-y-4 text-sm">
          <div>
            <label htmlFor="m-nama" className="mb-1 block text-xs font-medium text-[#737373]">
              Nama Menu
            </label>
            <input
              id="m-nama"
              type="text"
              required
              value={mNama}
              onChange={(e) => setMNama(e.target.value)}
              placeholder="Contoh: Es Kopi Susu Breakfree"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="m-div" className="mb-1 block text-xs font-medium text-[#737373]">
                Divisi
              </label>
              <select
                id="m-div"
                value={mDivisi}
                onChange={(e) => setMDivisi(e.target.value as Divisi)}
                className={inputCls}
              >
                <option value="barista">Barista</option>
                <option value="kitchen">Kitchen</option>
              </select>
            </div>
            <div>
              <label htmlFor="m-kat" className="mb-1 block text-xs font-medium text-[#737373]">
                Kategori
              </label>
              <select
                id="m-kat"
                value={mKategori}
                onChange={(e) => setMKategori(e.target.value as Menu['kategori'])}
                className={inputCls}
              >
                <option value="minuman_dingin">Minuman Dingin</option>
                <option value="minuman_panas">Minuman Panas</option>
                <option value="makanan">Makanan</option>
                <option value="camilan">Camilan</option>
              </select>
            </div>
            <div>
              <label htmlFor="m-hrg" className="mb-1 block text-xs font-medium text-[#737373]">
                Harga Jual
              </label>
              <input
                id="m-hrg"
                type="number"
                min={0}
                step={500}
                value={mHarga}
                onChange={(e) => setMHarga(Math.max(0, Number(e.target.value) || 0))}
                className={`${inputCls} tabular-mono`}
              />
            </div>
          </div>

          {/* Builder Resep */}
          <div className="space-y-3 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] p-3.5">
            <p className="text-xs font-semibold text-[#111111]">Komposisi Bahan Baku Resep</p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={pickBahanId}
                onChange={(e) => setPickBahanId(e.target.value)}
                aria-label="Pilih bahan untuk resep"
                className="min-w-[160px] flex-1 rounded-lg border border-[#E5E5E5] bg-white px-2.5 py-1.5 text-xs text-[#111111] focus:border-[#111111] focus:outline-none"
              >
                {bahan.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nama} ({b.satuan})
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={0.01}
                step="0.01"
                value={pickQty}
                onChange={(e) => setPickQty(Number(e.target.value) || 0)}
                aria-label="Takaran bahan resep"
                className="tabular-mono w-20 rounded-lg border border-[#E5E5E5] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#111111] focus:border-[#111111] focus:outline-none"
              />
              <Button type="button" variant="secondary" size="sm" onClick={handleAddResepRow}>
                + Pasang
              </Button>
            </div>

            {mResep.length === 0 ? (
              <p className="text-[11px] text-[#737373]">
                Belum ada bahan ditambahkan ke resep menu ini.
              </p>
            ) : (
              <div className="space-y-1.5">
                {mResep.map((r) => {
                  const b = bahan.find((x) => x.id === r.bahanId);
                  return (
                    <div
                      key={r.bahanId}
                      className="flex items-center justify-between rounded-lg border border-[#E5E5E5] bg-white px-2.5 py-1.5 text-xs"
                    >
                      <span className="font-medium text-[#111111]">
                        {b?.nama || r.bahanId} ({r.qty} {b?.satuan || ''})
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setMResep((prev) => prev.filter((x) => x.bahanId !== r.bahanId))
                        }
                        className="font-semibold text-[#DC2626] hover:underline"
                      >
                        Hapus
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setMenuModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary">
              Simpan Menu
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Tambah / Edit Supplier */}
      <Modal
        open={supModalOpen}
        onClose={() => setSupModalOpen(false)}
        title={editingSupId ? 'Edit Supplier' : 'Tambah Supplier Baru'}
      >
        <form onSubmit={handleSaveSupplier} className="space-y-4 text-sm">
          <div>
            <label htmlFor="s-nama" className="mb-1 block text-xs font-medium text-[#737373]">
              Nama Supplier
            </label>
            <input
              id="s-nama"
              type="text"
              required
              value={sNama}
              onChange={(e) => setSNama(e.target.value)}
              placeholder="Contoh: Roastery Malang Sejahtera"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="s-kat" className="mb-1 block text-xs font-medium text-[#737373]">
              Kategori Pasokan
            </label>
            <input
              id="s-kat"
              type="text"
              value={sKategori}
              onChange={(e) => setSKategori(e.target.value)}
              placeholder="Kopi & Sirup / Dairy / Fresh Market"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="s-kontak" className="mb-1 block text-xs font-medium text-[#737373]">
              Nomor Kontak / WA
            </label>
            <input
              id="s-kontak"
              type="text"
              value={sKontak}
              onChange={(e) => setSKontak(e.target.value)}
              placeholder="0812-xxxx-xxxx"
              className={inputCls}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setSupModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary">
              Simpan Supplier
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
