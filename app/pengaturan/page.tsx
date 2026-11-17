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

  // --- Settings form ---
  const [outletNama, setOutletNama] = useState(settings.outletNama);
  const [outletAlamat, setOutletAlamat] = useState(settings.outletAlamat);
  const [faktorAkhirPekan, setFaktorAkhirPekan] = useState(settings.faktorAkhirPekan);
  const [toleransiSelisih, setToleransiSelisih] = useState(settings.toleransiSelisihOmzet);

  // --- Shift modal ---
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<string | undefined>(undefined);
  const [shNama, setShNama] = useState('');
  const [shMulai, setShMulai] = useState('07:00');
  const [shSelesai, setShSelesai] = useState('15:00');

  // --- Pegawai modal ---
  const [pegModalOpen, setPegModalOpen] = useState(false);
  const [editingPegId, setEditingPegId] = useState<string | undefined>(undefined);
  const [pNama, setPNama] = useState('');
  const [pPosisi, setPPosisi] = useState<PegawaiPosisi>('barista');
  const [pAktif, setPAktif] = useState(true);

  // --- Reset modal (`RESET`) ---
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

  // Shift handlers
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

  // Pegawai handlers
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

  // Export JSON
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

  // Import JSON
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

  return (
    <AppShell pageTitle="Pengaturan Sistem, Pegawai & Backup Data">
      <div className="space-y-6">
        {/* Baris 1: Parameter Outlet & Pakem + Backup / Reset Storage */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Parameter Sistem */}
          <Card className="lg:col-span-7 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sliders className="h-4 w-4 text-[#9C5B2E]" />
              <div>
                <h2 className="text-base font-bold text-[#221C17]">
                  Parameter Operasional & Pakem Outlet
                </h2>
                <p className="text-xs text-[#70675E]">
                  Mengatur pengali stok akhir pekan dan toleransi selisih kasir vs POS Pawoon.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#70675E] mb-1">
                    Nama Outlet
                  </label>
                  <input
                    type="text"
                    value={outletNama}
                    onChange={(e) => setOutletNama(e.target.value)}
                    className="w-full rounded-xl border border-[#E6DFD5] bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#70675E] mb-1">
                    Alamat Outlet
                  </label>
                  <input
                    type="text"
                    value={outletAlamat}
                    onChange={(e) => setOutletAlamat(e.target.value)}
                    className="w-full rounded-xl border border-[#E6DFD5] bg-white px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#70675E] mb-1">
                    Pakem Akhir Pekan (Pengali Sabtu–Minggu)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    step="0.1"
                    value={faktorAkhirPekan}
                    onChange={(e) => setFaktorAkhirPekan(Number(e.target.value) || 1.5)}
                    className="w-full rounded-xl border border-[#E6DFD5] bg-white px-3 py-2 text-sm font-bold tabular-mono"
                  />
                  <p className="text-[11px] text-[#70675E] mt-1">
                    Default Breakfree: <strong className="tabular-mono">1.5x</strong> dari stok
                    minimum hari biasa.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#70675E] mb-1">
                    Toleransi Selisih Omzet POS (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={toleransiSelisih}
                    onChange={(e) => setToleransiSelisih(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full rounded-xl border border-[#E6DFD5] bg-white px-3 py-2 text-sm font-bold tabular-mono"
                  />
                  <p className="text-[11px] text-[#70675E] mt-1">
                    Nilai 0 mewajibkan alasan setiap ada selisih kasir vs POS.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" variant="primary" size="sm">
                  <Save className="h-4 w-4" />
                  Simpan Parameter
                </Button>
              </div>
            </form>
          </Card>

          {/* LocalStorage Backup & Reset */}
          <Card className="lg:col-span-5 p-5 flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div>
                <h2 className="text-base font-bold text-[#221C17]">
                  Penyimpanan Lokal & Backup JSON
                </h2>
                <p className="text-xs text-[#70675E]">
                  Semua transaksi tersimpan lokal di browser tanpa server. Ekspor secara berkala untuk arsip testing atau pindah perangkat.
                </p>
              </div>

              <div className="rounded-xl border border-[#E6DFD5] bg-[#FAF8F5] p-3.5 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#70675E]">Kunci Storage</span>
                  <code className="font-mono font-bold text-[#221C17]">{STORAGE_KEY}</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#70675E]">Ukuran Data Tersimpan</span>
                  <span className="font-bold tabular-mono text-[#221C17]">{storageSizeKB} KB</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#70675E]">Ringkasan Rekord</span>
                  <span className="tabular-mono text-[#221C17]">
                    {bahan.length} bahan · {rekapOmzet.length} omzet · {laporanStok.length} opname ·{' '}
                    {purchaseOrders.length} PO
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={handleExportJson}>
                  <Download className="h-4 w-4" />
                  Ekspor JSON
                </Button>
                <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4" />
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
                <Trash2 className="h-4 w-4" />
                Reset Seluruh Data Lokal
              </Button>
            </div>
          </Card>
        </div>

        {/* Baris 2: Master Shift & Master Pegawai */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Master Shift */}
          <Card className="lg:col-span-5 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#9C5B2E]" />
                <div>
                  <h2 className="text-base font-bold text-[#221C17]">
                    Master Shift ({shifts.length})
                  </h2>
                  <p className="text-xs text-[#70675E]">Jadwal operasional harian Breakfree.</p>
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={openAddShift}>
                <Plus className="h-4 w-4" />
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
                    className="flex items-center justify-between rounded-xl border border-[#E6DFD5] bg-[#FAF8F5] px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-bold text-[#221C17]">{s.nama}</p>
                      <p className="text-xs tabular-mono text-[#70675E]">
                        {s.jamMulai} — {s.jamSelesai} WIB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditShift(s)}
                      aria-label={`Edit ${s.nama}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Master Pegawai */}
          <Card className="lg:col-span-7 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#9C5B2E]" />
                <div>
                  <h2 className="text-base font-bold text-[#221C17]">
                    Daftar Pegawai & Petugas ({pegawai.length})
                  </h2>
                  <p className="text-xs text-[#70675E]">
                    Menentukan daftar petugas aktif pada Topbar & pencatat laporan shift.
                  </p>
                </div>
              </div>
              <Button variant="primary" size="sm" onClick={openAddPegawai}>
                <Plus className="h-4 w-4" />
                Tambah Pegawai
              </Button>
            </div>

            {pegawai.length === 0 ? (
              <EmptyState
                title="Belum ada data pegawai"
                description="Tambahkan daftar pegawai Breakfree agar setiap input tercatat penanggung jawabnya."
              />
            ) : (
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E6DFD5] text-[11px] font-bold uppercase tracking-wider text-[#70675E]">
                      <th className="py-2 px-3">Nama Petugas</th>
                      <th className="py-2 px-3">Posisi / Role</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6DFD5]">
                    {pegawai.map((p) => (
                      <tr key={p.id} className="hover:bg-[#FAF8F5]">
                        <td className="py-2.5 px-3 font-bold text-sm text-[#221C17]">{p.nama}</td>
                        <td className="py-2.5 px-3 capitalize">
                          <Badge tone="primary">{p.posisi}</Badge>
                        </td>
                        <td className="py-2.5 px-3">
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
                        <td className="py-2.5 px-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditPegawai(p)}
                            aria-label={`Edit ${p.nama}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
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

        {/* Baris 3: Log Aktivitas (Audit Trail FR-07) */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-[#9C5B2E]" />
            <div>
              <h2 className="text-base font-bold text-[#221C17]">
                Log Aktivitas & Jejak Audit ({activityLogs.length})
              </h2>
              <p className="text-xs text-[#70675E]">
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
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E6DFD5] text-[11px] font-bold uppercase tracking-wider text-[#70675E]">
                    <th className="py-2 px-3">Waktu</th>
                    <th className="py-2 px-3">Role</th>
                    <th className="py-2 px-3">Petugas</th>
                    <th className="py-2 px-3">Aksi</th>
                    <th className="py-2 px-3">Entitas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6DFD5]">
                  {activityLogs.slice(0, 50).map((log) => (
                    <tr key={log.id} className="hover:bg-[#FAF8F5]">
                      <td className="py-2 px-3 tabular-mono text-[#70675E]">
                        {formatTanggal(log.createdAt)} · {formatWaktu(log.createdAt)}
                      </td>
                      <td className="py-2 px-3 capitalize">
                        <Badge tone="neutral">{log.role}</Badge>
                      </td>
                      <td className="py-2 px-3 font-semibold text-[#221C17]">
                        {petugasNama(log.petugasId)}
                      </td>
                      <td className="py-2 px-3 text-[#221C17]">{log.aksi}</td>
                      <td className="py-2 px-3 tabular-mono text-[#70675E]">
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
            <label className="block text-xs font-bold text-[#70675E] mb-1">Nama Shift</label>
            <input
              type="text"
              required
              value={shNama}
              onChange={(e) => setShNama(e.target.value)}
              placeholder="Contoh: Shift 1 Pagi"
              className="w-full rounded-xl border border-[#E6DFD5] bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#70675E] mb-1">Jam Mulai</label>
              <input
                type="time"
                value={shMulai}
                onChange={(e) => setShMulai(e.target.value)}
                className="w-full rounded-xl border border-[#E6DFD5] bg-white px-3 py-2 text-sm font-bold tabular-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#70675E] mb-1">Jam Selesai</label>
              <input
                type="time"
                value={shSelesai}
                onChange={(e) => setShSelesai(e.target.value)}
                className="w-full rounded-xl border border-[#E6DFD5] bg-white px-3 py-2 text-sm font-bold tabular-mono"
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
            <label className="block text-xs font-bold text-[#70675E] mb-1">Nama Lengkap</label>
            <input
              type="text"
              required
              value={pNama}
              onChange={(e) => setPNama(e.target.value)}
              placeholder="Nama petugas"
              className="w-full rounded-xl border border-[#E6DFD5] bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#70675E] mb-1">Posisi / Role</label>
            <select
              value={pPosisi}
              onChange={(e) => setPPosisi(e.target.value as PegawaiPosisi)}
              className="w-full rounded-xl border border-[#E6DFD5] bg-white px-3 py-2 text-sm"
            >
              <option value="kasir">Kasir</option>
              <option value="barista">Barista</option>
              <option value="kitchen">Kitchen</option>
              <option value="kapten">Kapten Outlet</option>
              <option value="logistik">Logistik</option>
              <option value="manajemen">Manajemen / Owner</option>
              <option value="waiter">Waiter</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-[#221C17] cursor-pointer">
            <input
              type="checkbox"
              checked={pAktif}
              onChange={(e) => setPAktif(e.target.checked)}
              className="h-4 w-4 accent-[#9C5B2E]"
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

      {/* Modal Konfirmasi Reset Seluruh Data (FR-05: wajib ketik RESET) */}
      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Reset Seluruh Data Lokal">
        <div className="space-y-4 text-sm">
          <div className="rounded-xl border border-[#E8BEBA] bg-[#FCEBEA] p-3.5 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-[#B83227] shrink-0 mt-0.5" />
            <div className="text-xs text-[#221C17] space-y-1">
              <p className="font-bold text-[#B83227]">Tindakan ini menghapus seluruh data lokal!</p>
              <p>
                Semua master data, rekap omzet, laporan stok, retur, PO, QC, dan log aktivitas di{' '}
                <code className="font-mono">{STORAGE_KEY}</code> akan dikosongkan. Disarankan{' '}
                <strong>Ekspor JSON</strong> terlebih dahulu.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#70675E] mb-1">
              Ketik <code className="font-mono text-[#B83227]">RESET</code> untuk mengonfirmasi:
            </label>
            <input
              type="text"
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              placeholder="RESET"
              className="w-full rounded-xl border border-[#E6DFD5] bg-white px-3 py-2 text-sm font-bold tracking-widest uppercase"
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
