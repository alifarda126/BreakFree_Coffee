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

  // Open Bahan Modal
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

  // Open Menu Modal
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

  // Open Supplier Modal
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

  return (
    <AppShell pageTitle="Master Bahan Baku, Menu & Supplier">
      <div className="space-y-6">
        {/* Tabs + Primary Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="inline-flex rounded-xl border border-[#E6DFD5] bg-white p-1">
            <button
              type="button"
              onClick={() => setTab('bahan')}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
                tab === 'bahan'
                  ? 'bg-[#221C17] text-white'
                  : 'text-[#70675E] hover:text-[#221C17]'
              }`}
            >
              <Package className="h-4 w-4" />
              Bahan Baku ({bahan.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('menu')}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
                tab === 'menu'
                  ? 'bg-[#221C17] text-white'
                  : 'text-[#70675E] hover:text-[#221C17]'
              }`}
            >
              <Coffee className="h-4 w-4" />
              Menu & Resep ({menu.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('supplier')}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
                tab === 'supplier'
                  ? 'bg-[#221C17] text-white'
                  : 'text-[#70675E] hover:text-[#221C17]'
              }`}
            >
              <Truck className="h-4 w-4" />
              Supplier ({suppliers.length})
            </button>
          </div>

          {tab === 'bahan' && (
            <Button variant="primary" size="sm" onClick={openAddBahan}>
              <Plus className="h-4 w-4" />
              Tambah Bahan Baku
            </Button>
          )}
          {tab === 'menu' && (
            <Button variant="primary" size="sm" onClick={openAddMenu}>
              <Plus className="h-4 w-4" />
              Tambah Menu & Resep
            </Button>
          )}
          {tab === 'supplier' && (
            <Button variant="primary" size="sm" onClick={openAddSup}>
              <Plus className="h-4 w-4" />
              Tambah Supplier
            </Button>
          )}
        </div>

        {/* Filter Bar */}
        <Card className="p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 text-[#70675E] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                tab === 'bahan'
                  ? 'Cari nama bahan atau kategori...'
                  : tab === 'menu'
                  ? 'Cari nama menu...'
                  : 'Cari supplier atau kategori pasokan...'
              }
              className="w-full rounded-xl border border-[#E6DFD5] bg-[#FAF8F5] pl-9 pr-3 py-2 text-xs text-[#221C17] focus:border-[#9C5B2E] focus:bg-white focus:outline-none"
            />
          </div>

          {tab !== 'supplier' && (
            <select
              value={filterDivisi}
              onChange={(e) => setFilterDivisi(e.target.value as 'semua' | DivisiBahan)}
              className="rounded-xl border border-[#E6DFD5] bg-white px-3 py-2 text-xs font-semibold text-[#221C17]"
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
              className="rounded-xl border border-[#E6DFD5] bg-white px-3 py-2 text-xs font-semibold text-[#221C17]"
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
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E6DFD5] text-[11px] font-bold uppercase tracking-wider text-[#70675E]">
                      <th className="py-2.5 px-3">Nama Bahan</th>
                      <th className="py-2.5 px-3">Divisi & Sumber</th>
                      <th className="py-2.5 px-3 text-right">Stok Saat Ini</th>
                      <th className="py-2.5 px-3 text-right">Stok Min</th>
                      <th className="py-2.5 px-3 text-right">Harga Satuan</th>
                      <th className="py-2.5 px-3">Sifat</th>
                      <th className="py-2.5 px-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6DFD5]">
                    {filteredBahan.map((b) => {
                      const stok = hitungStokSaatIni(b.id, stockMovements);
                      return (
                        <tr key={b.id} className="hover:bg-[#FAF8F5]">
                          <td className="py-3 px-3">
                            <p className="font-bold text-sm text-[#221C17]">{b.nama}</p>
                            <p className="text-[11px] text-[#70675E]">{b.kategori}</p>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge
                                tone={
                                  b.divisi === 'barista'
                                    ? 'primary'
                                    : b.divisi === 'kitchen'
                                    ? 'info'
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
                          <td className="py-3 px-3 text-right font-bold tabular-mono text-[#221C17]">
                            {formatQty(stok, b.satuan)}
                          </td>
                          <td className="py-3 px-3 text-right tabular-mono text-[#70675E]">
                            {formatQty(b.stokMinimum, b.satuan)}
                          </td>
                          <td className="py-3 px-3 text-right tabular-mono font-semibold text-[#221C17]">
                            {formatRp(b.hargaSatuan)}
                          </td>
                          <td className="py-3 px-3">
                            {b.perishable ? (
                              <Badge tone="danger">Mudah Basi</Badge>
                            ) : (
                              <Badge tone="neutral">Reguler</Badge>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditBahan(b)}
                                aria-label={`Edit ${b.nama}`}
                              >
                                <Pencil className="h-3.5 w-3.5" />
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
                                <Trash2 className="h-3.5 w-3.5 text-[#B83227]" />
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
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E6DFD5] text-[11px] font-bold uppercase tracking-wider text-[#70675E]">
                      <th className="py-2.5 px-3">Nama Menu</th>
                      <th className="py-2.5 px-3">Divisi & Kategori</th>
                      <th className="py-2.5 px-3 text-right">Harga Jual</th>
                      <th className="py-2.5 px-3">Komposisi Resep (Bahan Terkait)</th>
                      <th className="py-2.5 px-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6DFD5]">
                    {filteredMenu.map((m) => (
                      <tr key={m.id} className="hover:bg-[#FAF8F5]">
                        <td className="py-3 px-3 font-bold text-sm text-[#221C17]">{m.nama}</td>
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge tone={m.divisi === 'barista' ? 'primary' : 'info'}>
                              {m.divisi}
                            </Badge>
                            <Badge tone="neutral">{m.kategori.replace('_', ' ')}</Badge>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-bold tabular-mono text-[#221C17]">
                          {formatRp(m.harga)}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1.5">
                            {m.resep.length === 0 && (
                              <span className="text-[#70675E] italic">Belum ada resep</span>
                            )}
                            {m.resep.map((r) => {
                              const b = bahan.find((x) => x.id === r.bahanId);
                              return (
                                <span
                                  key={r.bahanId}
                                  className="inline-flex items-center gap-1 rounded-md border border-[#E6DFD5] bg-[#FAF8F5] px-2 py-0.5 text-[11px] text-[#221C17]"
                                >
                                  <span>{b?.nama || r.bahanId}</span>
                                  <strong className="tabular-mono text-[#9C5B2E]">
                                    {r.qty} {b?.satuan || ''}
                                  </strong>
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditMenu(m)}
                              aria-label={`Edit ${m.nama}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
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
                              <Trash2 className="h-3.5 w-3.5 text-[#B83227]" />
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
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E6DFD5] text-[11px] font-bold uppercase tracking-wider text-[#70675E]">
                      <th className="py-2.5 px-3">Nama Supplier</th>
                      <th className="py-2.5 px-3">Kategori Pasokan</th>
                      <th className="py-2.5 px-3">Kontak / Telepon</th>
                      <th className="py-2.5 px-3 text-right">Total PO</th>
                      <th className="py-2.5 px-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6DFD5]">
                    {filteredSuppliers.map((s) => {
                      const poCount = purchaseOrders.filter((p) => p.supplierId === s.id).length;
                      return (
                        <tr key={s.id} className="hover:bg-[#FAF8F5]">
                          <td className="py-3 px-3 font-bold text-sm text-[#221C17]">{s.nama}</td>
                          <td className="py-3 px-3">
                            <Badge tone="neutral">{s.kategori}</Badge>
                          </td>
                          <td className="py-3 px-3 tabular-mono text-[#70675E]">{s.kontak}</td>
                          <td className="py-3 px-3 text-right tabular-mono font-bold text-[#221C17]">
                            {poCount} PO
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditSup(s)}
                                aria-label={`Edit ${s.nama}`}
                              >
                                <Pencil className="h-3.5 w-3.5" />
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
                                <Trash2 className="h-3.5 w-3.5 text-[#B83227]" />
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
            <label className="block text-xs font-bold text-[#70675E] mb-1">Nama Bahan</label>
            <input
              type="text"
              required
              value={bNama}
              onChange={(e) => setBNama(e.target.value)}
              placeholder="Contoh: Susu Full Cream UHT"
              className="w-full rounded-xl border border-[#E6DFD5] bg-white px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#70675E] mb-1">Kategori</label>
              <input
                type="text"
                value={bKategori}
                onChange={(e) => setBKategori(e.target.value)}
                placeholder="Dairy / Kopi / Dapur"
                className="w-full rounded-xl border border-[#E6DFD5] bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#70675E] mb-1">Satuan</label>
              <input
                type="text"
                required
                value={bSatuan}
                onChange={(e) => setBSatuan(e.target.value)}
                placeholder="liter / kg / pack / pcs"
                className="w-full rounded-xl border border-[#E6DFD5] bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#70675E] mb-1">Divisi Pemakai</label>
              <select
                value={bDivisi}
                onChange={(e) => setBDivisi(e.target.value as DivisiBahan)}
                className="w-full rounded-xl border border-[#E6DFD5] bg-white px-3 py-2 text-sm"
              >
                <option value="barista">Barista</option>
                <option value="kitchen">Kitchen</option>
                <option value="bersama">Bersama</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#70675E] mb-1">Sumber Pengadaan</label>
              <select
                value={bSumber}
                onChange={(e) => setBSumber(e.target.value as SumberBahan)}
                className="w-full rounded-xl border border-[#E6DFD5] bg-white px-3 py-2 text-sm"
              >
                <option value="eksternal">Eksternal (Beli PO)</option>
                <option value="internal">Internal (Produksi Outlet)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#70675E] mb-1">Stok Minimum</label>
              <input
                type="number"
                min={0}
                step="0.5"
                value={bStokMin}
                onChange={(e) => setBStokMin(Math.max(0, Number(e.target.value) || 0))}
                className="w-full rounded-xl border border-[#E6DFD5] bg-white px-3 py-2 text-sm font-bold tabular-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#70675E] mb-1">Harga Satuan (Rp)</label>
              <input
                type="number"
                min={0}
                step={500}
                value={bHarga}
                onChange={(e) => setBHarga(Math.max(0, Number(e.target.value) || 0))}
                className="w-full rounded-xl border border-[#E6DFD5] bg-white px-3 py-2 text-sm font-bold tabular-mono"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-[#221C17] cursor-pointer">
            <input
              type="checkbox"
              checked={bPerishable}
              onChange={(e) => setBPerishable(e.target.checked)}
              className="h-4 w-4 accent-[#9C5B2E]"
            />
            Bahan mudah basi / perishable (dipantau ketat saat Closing & Retur BOP)
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
            <label className="block text-xs font-bold text-[#70675E] mb-1">Nama Menu</label>
            <input
              type="text"
              required
              value={mNama}
              onChange={(e) => setMNama(e.target.value)}
              placeholder="Contoh: Es Kopi Susu Breakfree"
              className="w-full rounded-xl border border-[#E6DFD5] bg-white px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#70675E] mb-1">Divisi</label>
              <select
                value={mDivisi}
                onChange={(e) => setMDivisi(e.target.value as Divisi)}
                className="w-full rounded-xl border border-[#E6DFD5] bg-white px-3 py-2 text-sm"
              >
                <option value="barista">Barista</option>
                <option value="kitchen">Kitchen</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#70675E] mb-1">Kategori</label>
              <select
                value={mKategori}
                onChange={(e) => setMKategori(e.target.value as Menu['kategori'])}
                className="w-full rounded-xl border border-[#E6DFD5] bg-white px-3 py-2 text-sm"
              >
                <option value="minuman_dingin">Minuman Dingin</option>
                <option value="minuman_panas">Minuman Panas</option>
                <option value="makanan">Makanan</option>
                <option value="camilan">Camilan</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#70675E] mb-1">Harga Jual</label>
              <input
                type="number"
                min={0}
                step={500}
                value={mHarga}
                onChange={(e) => setMHarga(Math.max(0, Number(e.target.value) || 0))}
                className="w-full rounded-xl border border-[#E6DFD5] bg-white px-3 py-2 text-sm font-bold tabular-mono"
              />
            </div>
          </div>

          {/* Builder Resep */}
          <div className="rounded-xl border border-[#E6DFD5] bg-[#FAF8F5] p-3.5 space-y-3">
            <p className="text-xs font-bold text-[#221C17]">Komposisi Bahan Baku Resep</p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={pickBahanId}
                onChange={(e) => setPickBahanId(e.target.value)}
                className="flex-1 min-w-[160px] rounded-lg border border-[#E6DFD5] bg-white px-2.5 py-1.5 text-xs"
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
                className="w-20 rounded-lg border border-[#E6DFD5] bg-white px-2.5 py-1.5 text-xs font-bold tabular-mono"
              />
              <Button type="button" variant="secondary" size="sm" onClick={handleAddResepRow}>
                + Pasang
              </Button>
            </div>

            {mResep.length === 0 ? (
              <p className="text-[11px] text-[#70675E]">
                Belum ada bahan ditambahkan ke resep menu ini.
              </p>
            ) : (
              <div className="space-y-1.5">
                {mResep.map((r) => {
                  const b = bahan.find((x) => x.id === r.bahanId);
                  return (
                    <div
                      key={r.bahanId}
                      className="flex items-center justify-between rounded-lg bg-white border border-[#E6DFD5] px-2.5 py-1.5 text-xs"
                    >
                      <span className="font-semibold text-[#221C17]">
                        {b?.nama || r.bahanId} ({r.qty} {b?.satuan || ''})
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setMResep((prev) => prev.filter((x) => x.bahanId !== r.bahanId))
                        }
                        className="text-[#B83227] font-semibold hover:underline"
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
            <label className="block text-xs font-bold text-[#70675E] mb-1">Nama Supplier</label>
            <input
              type="text"
              required
              value={sNama}
              onChange={(e) => setSNama(e.target.value)}
              placeholder="Contoh: Roastery Malang Sejahtera"
              className="w-full rounded-xl border border-[#E6DFD5] bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#70675E] mb-1">Kategori Pasokan</label>
            <input
              type="text"
              value={sKategori}
              onChange={(e) => setSKategori(e.target.value)}
              placeholder="Kopi & Sirup / Dairy / Fresh Market"
              className="w-full rounded-xl border border-[#E6DFD5] bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#70675E] mb-1">Nomor Kontak / WA</label>
            <input
              type="text"
              value={sKontak}
              onChange={(e) => setSKontak(e.target.value)}
              placeholder="0812-xxxx-xxxx"
              className="w-full rounded-xl border border-[#E6DFD5] bg-white px-3 py-2 text-sm"
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
