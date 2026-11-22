'use client';

import React, { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Clock,
  Download,
  History,
  Pencil,
  Plus,
  Save,
  Sliders,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Badge, Button, Card, EmptyState, Modal } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/ToastProvider';
import { STORAGE_KEY, useBreakfreeStore } from '@/lib/store/useBreakfreeStore';
import { BreakfreeBackupSchema } from '@/lib/schema/backup';
import { formatTanggal, formatWaktu, todayISO } from '@/lib/domain/calculations';
import type { BreakfreeStateData, Pegawai, PegawaiPosisi, Shift } from '@/lib/types';

export default function PengaturanPage() {
  const router = useRouter();
  const { pushToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    schemaVersion,
    isInitialized,
    activeRole,
    activePetugasId,
    settings,
    pegawai,
    shifts,
    bahan,
    menu,
    suppliers,
    stockMovements,
    laporanStok,
    rekapOmzet,
    laporanKosong,
    returs,
    purchaseOrders,
    qcLogs,
    keluhan,
    activityLogs,
    updateSettings,
    upsertShift,
    upsertPegawai,
    importBackup,
    resetAllData,
  } = useBreakfreeStore();

  const [outletNama, setOutletNama] = useState(settings.outletNama);
  const [outletAlamat, setOutletAlamat] = useState(settings.outletAlamat);
  const [faktorAkhirPekan, setFaktorAkhirPekan] = useState(settings.faktorAkhirPekan);
  const [toleransiSelisih, setToleransiSelisih] = useState(settings.toleransiSelisihOmzet);

  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<string | undefined>(undefined);
  const [shNama, setShNama] = useState('');
  const [shMulai, setShMulai] = useState('07:00');
  const [shSelesai, setShSelesai] = useState('15:00');

  const [pegModalOpen, setPegModalOpen] = useState(false);
  const [editingPegId, setEditingPegId] = useState<string | undefined>(undefined);
  const [pNama, setPNama] = useState('');
  const [pPosisi, setPPosisi] = useState<PegawaiPosisi>('barista');
  const [pAktif, setPAktif] = useState(true);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');

  const fullStateSnapshot: BreakfreeStateData = useMemo(
    () => ({
      schemaVersion,
      isInitialized,
      activeRole,
      activePetugasId,
      settings,
      pegawai,
      shifts,
      bahan,
      menu,
      suppliers,
      stockMovements,
      laporanStok,
      rekapOmzet,
      laporanKosong,
      returs,
      purchaseOrders,
      qcLogs,
      keluhan,
      activityLogs,
    }),
    [
      schemaVersion,
      isInitialized,
      activeRole,
      activePetugasId,
      settings,
      pegawai,
      shifts,
      bahan,
      menu,
      suppliers,
      stockMovements,
      laporanStok,
      rekapOmzet,
      laporanKosong,
      returs,
      purchaseOrders,
      qcLogs,
      keluhan,
      activityLogs,
    ]
  );

  const storageSizeKB = useMemo(() => {
    try {
      const bytes = new Blob([JSON.stringify(fullStateSnapshot)]).size;
      return (bytes / 1024).toFixed(1);
    } catch {
      return '0.0';
    }
  }, [fullStateSnapshot]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      outletNama: outletNama.trim() || 'Breakfree Coffee',
      outletAlamat: outletAlamat.trim(),
      faktorAkhirPekan: Math.max(1, Number(faktorAkhirPekan) || 1.5),
      toleransiSelisihOmzet: Math.max(0, Number(toleransiSelisih) || 0),
    });
    pushToast('Parameter sistem & identitas outlet disimpan.', 'success');
  };

  const openEditShift = (s: Shift) => {
    setEditingShiftId(s.id);
    setShNama(s.nama);
    setShMulai(s.jamMulai);
    setShSelesai(s.jamSelesai);
    setShiftModalOpen(true);
  };

  const openAddShift = () => {
    setEditingShiftId(undefined);
    setShNama('');
    setShMulai('08:00');
    setShSelesai('16:00');
    setShiftModalOpen(true);
  };

  const handleSaveShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shNama.trim()) {
      pushToast('Nama shift wajib diisi.', 'warning');
      return;
    }
    upsertShift({
      id: editingShiftId,
      nama: shNama.trim(),
      jamMulai: shMulai,
      jamSelesai: shSelesai,
    });
    setShiftModalOpen(false);
    pushToast(`Shift "${shNama}" disimpan.`, 'success');
  };

  const openAddPegawai = () => {
    setEditingPegId(undefined);
    setPNama('');
    setPPosisi('barista');
    setPAktif(true);
    setPegModalOpen(true);
  };

  const openEditPegawai = (p: Pegawai) => {
    setEditingPegId(p.id);
    setPNama(p.nama);
    setPPosisi(p.posisi);
    setPAktif(p.aktif);
    setPegModalOpen(true);
  };

  const handleSavePegawai = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pNama.trim()) {
      pushToast('Nama pegawai wajib diisi.', 'warning');
      return;
    }
    upsertPegawai({
      id: editingPegId,
      nama: pNama.trim(),
      posisi: pPosisi,
      aktif: pAktif,
    });
    setPegModalOpen(false);
    pushToast(`Data pegawai "${pNama}" disimpan.`, 'success');
  };

  const handleExportJson = () => {
    const json = JSON.stringify(fullStateSnapshot, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `breakfree-si-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast('File backup JSON berhasil diunduh.', 'success');
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const checked = BreakfreeBackupSchema.safeParse(parsed);
      if (!checked.success) {
        pushToast(
          `Format backup JSON tidak valid: ${checked.error.issues[0]?.message || 'Schema tidak sesuai'}`,
          'danger'
        );
        return;
      }
      importBackup(checked.data as BreakfreeStateData);
      setOutletNama(checked.data.settings.outletNama);
      setOutletAlamat(checked.data.settings.outletAlamat);
      setFaktorAkhirPekan(checked.data.settings.faktorAkhirPekan);
      setToleransiSelisih(checked.data.settings.toleransiSelisihOmzet);
      pushToast('Data backup berhasil dipulihkan ke penyimpanan lokal.', 'success');
    } catch {
      pushToast('Gagal membaca file JSON. Pastikan file tidak rusak.', 'danger');
    } finally {
      e.target.value = '';
    }
  };

  const handleConfirmReset = () => {
    if (resetConfirmText.trim() !== 'RESET') {
      pushToast('Ketik tepat kata RESET (huruf kapital) untuk melanjutkan.', 'warning');
      return;
    }
    resetAllData();
    setResetOpen(false);
    setResetConfirmText('');
    pushToast('Seluruh data lokal berhasil dihapus.', 'info');
    router.push('/setup');
  };

  const petugasNama = (id: string) => pegawai.find((p) => p.id === id)?.nama || 'Sistem';

  const inputCls =
    'w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#111111] transition focus:border-[#111111] focus:outline-none focus:ring-2 focus:ring-[#111111]/10';

  return (
    <AppShell pageTitle="Master Pegawai, Shift & Pengaturan Data">
      <div className="space-y-6">
        {/* Baris 1: Parameter Outlet & Pakem + Backup / Reset Storage */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <Card className="p-5 lg:col-span-7">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5F5F5] text-[#111111]">
                <Sliders className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-[16px] font-semibold text-[#111111]">
                  Parameter Operasional &amp; Pakem Outlet
                </h2>
                <p className="text-xs text-[#737373]">
                  Mengatur pengali stok akhir pekan dan toleransi selisih kasir vs POS Pawoon.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="set-nama" className="mb-1 block text-xs font-medium text-[#737373]">
                    Nama Outlet
                  </label>
                  <input
                    id="set-nama"
                    type="text"
                    value={outletNama}
                    onChange={(e) => setOutletNama(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="set-alamat" className="mb-1 block text-xs font-medium text-[#737373]">
                    Alamat Outlet
                  </label>
                  <input
                    id="set-alamat"
                    type="text"
                    value={outletAlamat}
                    onChange={(e) => setOutletAlamat(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="set-pakem" className="mb-1 block text-xs font-medium text-[#737373]">
                    Pakem Akhir Pekan (Pengali Sabtu-Minggu)
                  </label>
                  <input
                    id="set-pakem"
                    type="number"
                    min={1}
                    max={5}
                    step="0.1"
                    value={faktorAkhirPekan}
                    onChange={(e) => setFaktorAkhirPekan(Number(e.target.value) || 1.5)}
                    className={`${inputCls} tabular-mono`}
                  />
                  <p className="mt-1 text-[11px] text-[#737373]">
                    Default Breakfree: <strong className="tabular-mono text-[#111111]">1.5x</strong> dari stok
                    minimum hari biasa.
                  </p>
                </div>
                <div>
                  <label htmlFor="set-tol" className="mb-1 block text-xs font-medium text-[#737373]">
                    Toleransi Selisih Omzet POS (Rp)
                  </label>
                  <input
                    id="set-tol"
                    type="number"
                    min={0}
                    step={500}
                    value={toleransiSelisih}
                    onChange={(e) => setToleransiSelisih(Math.max(0, Number(e.target.value) || 0))}
                    className={`${inputCls} tabular-mono`}
                  />
                  <p className="mt-1 text-[11px] text-[#737373]">
                    Nilai 0 mewajibkan alasan setiap ada selisih kasir vs POS.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" variant="primary" size="sm">
                  <Save className="h-3.5 w-3.5" aria-hidden="true" />
                  Simpan Parameter
                </Button>
              </div>
            </form>
          </Card>

          <Card className="flex flex-col justify-between gap-4 p-5 lg:col-span-5">
            <div className="space-y-3">
              <div>
                <h2 className="text-[16px] font-semibold text-[#111111]">
                  Penyimpanan Lokal &amp; Backup JSON
                </h2>
                <p className="mt-0.5 text-xs text-[#737373]">
                  Semua transaksi tersimpan lokal di browser tanpa server. Ekspor secara berkala untuk arsip testing atau pindah perangkat.
                </p>
              </div>

              <div className="space-y-2 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] p-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#737373]">Kunci Storage</span>
                  <code className="font-semibold text-[#111111]">{STORAGE_KEY}</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#737373]">Ukuran Data Tersimpan</span>
                  <span className="tabular-mono font-semibold text-[#111111]">{storageSizeKB} KB</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#737373]">Ringkasan Rekord</span>
                  <span className="tabular-mono text-[#111111]">
                    {bahan.length} bahan · {rekapOmzet.length} omzet · {laporanStok.length} opname ·{' '}
                    {purchaseOrders.length} PO
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={handleExportJson}>
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Ekspor JSON
                </Button>
                <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  Impor JSON
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </div>

              <Button
                variant="danger"
                className="w-full"
                onClick={() => {
                  setResetConfirmText('');
                  setResetOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Reset Seluruh Data Lokal
              </Button>
            </div>
          </Card>
        </div>

        {/* Baris 2: Master Shift & Master Pegawai */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <Card className="space-y-4 p-5 lg:col-span-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5F5F5] text-[#111111]">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-[16px] font-semibold text-[#111111]">
                    Master Shift ({shifts.length})
                  </h2>
                  <p className="text-xs text-[#737373]">Jadwal operasional harian Breakfree.</p>
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={openAddShift}>
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Shift
              </Button>
            </div>

            {shifts.length === 0 ? (
              <EmptyState
                title="Belum ada shift"
                description="Tambahkan shift kerja harian outlet."
              />
            ) : (
              <div className="space-y-2.5">
                {shifts.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#111111]">{s.nama}</p>
                      <p className="tabular-mono text-xs text-[#737373]">
                        {s.jamMulai} - {s.jamSelesai} WIB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditShift(s)}
                      aria-label={`Edit ${s.nama}`}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="space-y-4 p-5 lg:col-span-7">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5F5F5] text-[#111111]">
                  <Users className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-[16px] font-semibold text-[#111111]">
                    Daftar Pegawai &amp; Petugas ({pegawai.length})
                  </h2>
                  <p className="text-xs text-[#737373]">
                    Menentukan daftar petugas aktif pada Topbar &amp; pencatat laporan shift.
                  </p>
                </div>
              </div>
              <Button variant="primary" size="sm" onClick={openAddPegawai}>
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Tambah Pegawai
              </Button>
            </div>

            {pegawai.length === 0 ? (
              <EmptyState
                title="Belum ada data pegawai"
                description="Tambahkan daftar pegawai Breakfree agar setiap input tercatat penanggung jawabnya."
              />
            ) : (
              <div className="max-h-80 overflow-x-auto overflow-y-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[11px] font-semibold uppercase tracking-wider text-[#737373]">
                      <th className="rounded-l-lg px-3 py-2.5">Nama Petugas</th>
                      <th className="px-3 py-2.5">Posisi / Role</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="rounded-r-lg px-3 py-2.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5E5]">
                    {pegawai.map((p) => (
                      <tr key={p.id} className="transition-colors hover:bg-[#FAFAFA]">
                        <td className="px-3 py-2.5 text-[13px] font-normal text-[#111111]">
                          {p.nama}
                        </td>
                        <td className="px-3 py-2.5 capitalize">
                          <Badge tone="primary">{p.posisi}</Badge>
                        </td>
                        <td className="px-3 py-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              upsertPegawai({ ...p, aktif: !p.aktif });
                              pushToast(
                                `${p.nama} diubah menjadi ${!p.aktif ? 'Aktif' : 'Nonaktif'}.`,
                                'info'
                              );
                            }}
                          >
                            <Badge tone={p.aktif ? 'success' : 'neutral'}>
                              {p.aktif ? 'Aktif' : 'Nonaktif'}
                            </Badge>
                          </button>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditPegawai(p)}
                            aria-label={`Edit ${p.nama}`}
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Baris 3: Log Aktivitas */}
        <Card className="space-y-4 p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5F5F5] text-[#111111]">
              <History className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-[#111111]">
                Log Aktivitas &amp; Jejak Audit ({activityLogs.length})
              </h2>
              <p className="text-xs text-[#737373]">
                Menyimpan maksimal 200 aktivitas terbaru lintas role di penyimpanan lokal.
              </p>
            </div>
          </div>

          {activityLogs.length === 0 ? (
            <EmptyState
              title="Belum ada aktivitas terekam"
              description="Setiap transaksi omzet, opname, retur, PO, dan ubah master akan tercatat di sini."
            />
          ) : (
            <div className="max-h-72 overflow-x-auto overflow-y-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[11px] font-semibold uppercase tracking-wider text-[#737373]">
                    <th className="rounded-l-lg px-3 py-2.5">Waktu</th>
                    <th className="px-3 py-2.5">Role</th>
                    <th className="px-3 py-2.5">Petugas</th>
                    <th className="px-3 py-2.5">Aksi</th>
                    <th className="rounded-r-lg px-3 py-2.5">Entitas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5]">
                  {activityLogs.slice(0, 50).map((log) => (
                    <tr key={log.id} className="hover:bg-[#FAFAFA]">
                      <td className="tabular-mono px-3 py-2.5 text-[#737373]">
                        {formatTanggal(log.createdAt)} · {formatWaktu(log.createdAt)}
                      </td>
                      <td className="px-3 py-2.5 capitalize">
                        <Badge tone="neutral">{log.role}</Badge>
                      </td>
                      <td className="px-3 py-2.5 font-normal text-[#111111]">
                        {petugasNama(log.petugasId)}
                      </td>
                      <td className="px-3 py-2.5 text-[#111111]">{log.aksi}</td>
                      <td className="tabular-mono px-3 py-2.5 text-[#737373]">
                        {log.entitas} ({log.entitasId})
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Modal Shift */}
      <Modal
        open={shiftModalOpen}
        onClose={() => setShiftModalOpen(false)}
        title={editingShiftId ? 'Edit Jadwal Shift' : 'Tambah Shift Baru'}
      >
        <form onSubmit={handleSaveShift} className="space-y-4 text-sm">
          <div>
            <label htmlFor="sh-nama" className="mb-1 block text-xs font-medium text-[#737373]">
              Nama Shift
            </label>
            <input
              id="sh-nama"
              type="text"
              required
              value={shNama}
              onChange={(e) => setShNama(e.target.value)}
              placeholder="Contoh: Shift 1 Pagi"
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="sh-mulai" className="mb-1 block text-xs font-medium text-[#737373]">
                Jam Mulai
              </label>
              <input
                id="sh-mulai"
                type="time"
                value={shMulai}
                onChange={(e) => setShMulai(e.target.value)}
                className={`${inputCls} tabular-mono font-semibold`}
              />
            </div>
            <div>
              <label htmlFor="sh-selesai" className="mb-1 block text-xs font-medium text-[#737373]">
                Jam Selesai
              </label>
              <input
                id="sh-selesai"
                type="time"
                value={shSelesai}
                onChange={(e) => setShSelesai(e.target.value)}
                className={`${inputCls} tabular-mono font-semibold`}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShiftModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary">
              Simpan Shift
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Pegawai */}
      <Modal
        open={pegModalOpen}
        onClose={() => setPegModalOpen(false)}
        title={editingPegId ? 'Edit Data Pegawai' : 'Tambah Pegawai Baru'}
      >
        <form onSubmit={handleSavePegawai} className="space-y-4 text-sm">
          <div>
            <label htmlFor="p-nama" className="mb-1 block text-xs font-medium text-[#737373]">
              Nama Lengkap
            </label>
            <input
              id="p-nama"
              type="text"
              required
              value={pNama}
              onChange={(e) => setPNama(e.target.value)}
              placeholder="Nama petugas"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="p-posisi" className="mb-1 block text-xs font-medium text-[#737373]">
              Posisi / Role
            </label>
            <select
              id="p-posisi"
              value={pPosisi}
              onChange={(e) => setPPosisi(e.target.value as PegawaiPosisi)}
              className={inputCls}
            >
              <option value="kasir">Kasir</option>
              <option value="barista">Barista</option>
              <option value="kitchen">Kitchen</option>
              <option value="logistik">Logistik</option>
              <option value="manajemen">Manajemen / Owner</option>
              <option value="waiter">Waiter</option>
            </select>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-[#262626]">
            <input
              type="checkbox"
              checked={pAktif}
              onChange={(e) => setPAktif(e.target.checked)}
              className="h-4 w-4 rounded accent-[#111111]"
            />
            Pegawai sedang aktif bertugas
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setPegModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary">
              Simpan Pegawai
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Konfirmasi Reset Seluruh Data */}
      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Reset Seluruh Data Lokal">
        <div className="space-y-4 text-sm">
          <div className="flex items-start gap-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3.5">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#DC2626]" aria-hidden="true" />
            <div className="space-y-1 text-xs text-[#262626]">
              <p className="font-semibold text-[#DC2626]">
                Tindakan ini menghapus seluruh data lokal!
              </p>
              <p>
                Semua master data, rekap omzet, laporan stok, retur, PO, dan log aktivitas di{' '}
                <code className="font-semibold text-[#111111]">{STORAGE_KEY}</code> akan
                dikosongkan. Disarankan <strong>Ekspor JSON</strong> terlebih dahulu.
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="reset-input" className="mb-1 block text-xs font-medium text-[#737373]">
              Ketik <code className="font-semibold text-[#DC2626]">RESET</code> untuk mengonfirmasi:
            </label>
            <input
              id="reset-input"
              type="text"
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              placeholder="RESET"
              className={`${inputCls} font-semibold uppercase tracking-widest`}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setResetOpen(false)}>
              Batal
            </Button>
            <Button
              variant="dangerSolid"
              disabled={resetConfirmText.trim() !== 'RESET'}
              onClick={handleConfirmReset}
            >
              Hapus Permanen Semua Data
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
