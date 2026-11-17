'use client';

import React, { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useBreakfreeStore } from '@/lib/store/useBreakfreeStore';
import {
  detectActiveShiftId,
  formatRp,
  formatTanggal,
  formatWaktu,
  todayISO,
} from '@/lib/domain/calculations';
import { AppShell } from '@/components/layout/AppShell';
import { Badge, Button, Card, EmptyState, Modal } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/ToastProvider';
import type { AlasanQC, Divisi, Keluhan, LevelKeluhan } from '@/lib/types';

const ALASAN_QC: AlasanQC[] = [
  'Rasa tidak sesuai SOP',
  'Suhu kurang panas/dingin',
  'Porsi / takaran kurang',
  'Tampilan / penyajian',
  'Salah pesanan / ukuran cup',
];

export default function KaptenMonitoringPage() {
  const laporanStok = useBreakfreeStore((s) => s.laporanStok);
  const rekapOmzet = useBreakfreeStore((s) => s.rekapOmzet);
  const shifts = useBreakfreeStore((s) => s.shifts);
  const menu = useBreakfreeStore((s) => s.menu);
  const pegawai = useBreakfreeStore((s) => s.pegawai);
  const activePetugasId = useBreakfreeStore((s) => s.activePetugasId);
  const qcLogs = useBreakfreeStore((s) => s.qcLogs);
  const keluhan = useBreakfreeStore((s) => s.keluhan);
  const tambahQcLog = useBreakfreeStore((s) => s.tambahQcLog);
  const tambahKeluhan = useBreakfreeStore((s) => s.tambahKeluhan);
  const updateKeluhanStatus = useBreakfreeStore((s) => s.updateKeluhanStatus);
  const { pushToast } = useToast();

  const today = todayISO();
  const activeShiftId = detectActiveShiftId(shifts);

  // QC Modal state
  const [qcOpen, setQcOpen] = useState(false);
  const [qcMenuId, setQcMenuId] = useState(menu[0]?.id ?? '');
  const [qcDivisi, setQcDivisi] = useState<Divisi>('barista');
  const [qcAlasan, setQcAlasan] = useState<AlasanQC>('Rasa tidak sesuai SOP');
  const [qcPetugasId, setQcPetugasId] = useState(pegawai[0]?.id ?? '');
  const [qcDurasi, setQcDurasi] = useState(5);

  // Keluhan Modal state
  const [kelOpen, setKelOpen] = useState(false);
  const [kelDesc, setKelDesc] = useState('');
  const [kelKat, setKelKat] = useState<Keluhan['kategori']>('Kualitas Produk');
  const [kelLevel, setKelLevel] = useState<LevelKeluhan>('kapten');
  const [kelNote, setKelNote] = useState('');

  // Shift completion matrix across Kasir, Barista (opening/closing), Kitchen (opening/closing)
  const matrixCells = useMemo(() => {
    const kasirToday = rekapOmzet.find((r) => r.tanggal === today && r.shiftId === activeShiftId);
    const barOpen = laporanStok.find(
      (l) => l.tanggal === today && l.divisi === 'barista' && l.sesi === 'opening'
    );
    const barClose = laporanStok.find(
      (l) => l.tanggal === today && l.divisi === 'barista' && l.sesi === 'closing'
    );
    const kitOpen = laporanStok.find(
      (l) => l.tanggal === today && l.divisi === 'kitchen' && l.sesi === 'opening'
    );
    const kitClose = laporanStok.find(
      (l) => l.tanggal === today && l.divisi === 'kitchen' && l.sesi === 'closing'
    );

    const mapSt = (st?: string) => {
      if (!st) return { label: 'Menunggu', tone: 'danger' as const };
      if (st === 'draft' || st === 'perlu_cek' || st === 'dikembalikan')
        return { label: st === 'draft' ? 'Draft' : 'Perlu Cek', tone: 'warning' as const };
      return { label: st === 'diverifikasi' ? 'Diverifikasi' : 'Terkirim', tone: 'success' as const };
    };

    const getName = (id?: string) =>
      pegawai.find((p) => p.id === id)?.nama ?? 'Belum diisi';

    return [
      {
        title: 'Kasir · Shift Aktif',
        ...mapSt(kasirToday?.status),
        meta: kasirToday ? `${getName(kasirToday.petugasId)} · ${formatRp(kasirToday.cash + kasirToday.qris)}` : 'Belum ada input',
      },
      {
        title: 'Barista · Opening',
        ...mapSt(barOpen?.status),
        meta: barOpen ? `${getName(barOpen.petugasId)} · ${barOpen.items.length} bahan` : 'Belum diisi',
      },
      {
        title: 'Barista · Closing',
        ...mapSt(barClose?.status),
        meta: barClose ? `${getName(barClose.petugasId)} · ${barClose.waste.length} waste` : 'Belum diisi',
      },
      {
        title: 'Kitchen · Opening',
        ...mapSt(kitOpen?.status),
        meta: kitOpen ? `${getName(kitOpen.petugasId)} · ${kitOpen.items.length} bahan` : 'Belum diisi',
      },
      {
        title: 'Kitchen · Closing',
        ...mapSt(kitClose?.status),
        meta: kitClose ? `${getName(kitClose.petugasId)} · ${kitClose.waste.length} waste` : 'Belum diisi',
      },
    ];
  }, [rekapOmzet, laporanStok, today, activeShiftId, pegawai]);

  const submittedCount = matrixCells.filter((c) => c.tone === 'success').length;

  const handleSaveQC = (e: React.FormEvent) => {
    e.preventDefault();
    const targetMenuId = qcMenuId || menu[0]?.id;
    if (!targetMenuId) return;
    tambahQcLog({
      menuId: targetMenuId,
      divisi: qcDivisi,
      alasan: qcAlasan,
      penanggungJawabId: qcPetugasId || pegawai[0]?.id || '',
      durasiPerbaikanMenit: qcDurasi,
      kaptenId: activePetugasId,
    });
    setQcOpen(false);
    pushToast('Log QC pesanan dikembalikan dicatat', 'warning');
  };

  const handleSaveKeluhan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kelDesc.trim()) return;
    tambahKeluhan({
      deskripsi: kelDesc.trim(),
      kategori: kelKat,
      penanganId: activePetugasId,
      level: kelLevel,
      penyelesaian: kelNote.trim() || undefined,
    });
    setKelDesc('');
    setKelNote('');
    setKelOpen(false);
    pushToast('Keluhan pelanggan dicatat', 'info');
  };

  return (
    <AppShell pageTitle="Monitoring Shift, Log QC & Keluhan Pelanggan">
      {/* Shift Completion Matrix */}
      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-[15px] font-bold text-[#221C17]">
              Matriks Kelengkapan Laporan Shift Hari Ini ({formatTanggal(today)})
            </h2>
            <p className="text-xs text-[#8A7F73]">
              Memantau apakah Kasir, Barista, dan Kitchen sudah validasi &amp; kirim laporan ke sistem
            </p>
          </div>
          <Badge tone={submittedCount === 5 ? 'success' : 'warning'}>
            {submittedCount} / 5 Terkirim
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {matrixCells.map((c) => (
            <div
              key={c.title}
              className="flex flex-col gap-2 rounded-[10px] border border-[#E6E0D8] bg-[#FBF9F6] p-3"
            >
              <span className="text-xs font-bold text-[#221C17]">{c.title}</span>
              <div>
                <Badge tone={c.tone}>{c.label}</Badge>
              </div>
              <span className="tabular-mono truncate text-[11px] text-[#8A7F73]">{c.meta}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Main 6 / 6 Split */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Left: Log QC */}
        <Card className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-[#221C17]">
                Log QC (Pesanan Dikembalikan Kapten)
              </h2>
              <p className="text-xs text-[#8A7F73]">
                Audit ketidaksesuaian standar sebelum diantar waiter ke pelanggan
              </p>
            </div>
            <Button size="sm" onClick={() => setQcOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Catat QC
            </Button>
          </div>

          {qcLogs.length === 0 ? (
            <EmptyState
              title="Belum ada pesanan dikembalikan (QC)"
              description="Jika Kapten Outlet mengembalikan minuman/makanan karena standar rasa, suhu, atau ukuran, catat di sini beserta durasi perbaikannya."
            />
          ) : (
            <div className="flex flex-col gap-2.5">
              {qcLogs.map((q) => {
                const m = menu.find((x) => x.id === q.menuId);
                const pic = pegawai.find((p) => p.id === q.penanggungJawabId);
                return (
                  <div
                    key={q.id}
                    className="flex flex-col gap-1.5 rounded-[10px] border border-[#E6E0D8] bg-[#FBF9F6] p-3.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-bold text-[#221C17]">
                        {m?.nama ?? 'Menu'}
                      </span>
                      <span className="tabular-mono text-[11px] text-[#8A7F73]">
                        {formatWaktu(q.waktu)}
                      </span>
                    </div>
                    <p className="text-xs text-[#3D342C]">{q.alasan}</p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-semibold text-[#9C5B2E]">
                        {q.divisi} · {pic?.nama ?? '-'}
                      </span>
                      <Badge tone={q.durasiPerbaikanMenit > 5 ? 'warning' : 'success'} dot={false}>
                        {q.durasiPerbaikanMenit} menit perbaikan
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Right: Keluhan Pelanggan */}
        <Card className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-[#221C17]">
                Keluhan Pelanggan &amp; Jalur Eskalasi
              </h2>
              <p className="text-xs text-[#8A7F73]">
                Alur SOP: Karyawan → Kapten Outlet → Manajemen / Head
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setKelOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Catat Keluhan
            </Button>
          </div>

          {keluhan.length === 0 ? (
            <EmptyState
              title="Tidak ada keluhan pelanggan"
              description="Catat kendala pelayanan atau fasilitas di sini untuk melihat status penanganan dan eskalasinya."
            />
          ) : (
            <div className="flex flex-col gap-2.5">
              {keluhan.map((k) => {
                const penangan = pegawai.find((p) => p.id === k.penanganId);
                const tone =
                  k.status === 'selesai'
                    ? 'success'
                    : k.level === 'manajemen'
                      ? 'danger'
                      : 'warning';
                return (
                  <div
                    key={k.id}
                    className="flex flex-col gap-1.5 rounded-[10px] border border-[#E6E0D8] bg-[#FBF9F6] p-3.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone={tone}>
                        {k.status === 'selesai'
                          ? `Selesai (${k.level})`
                          : `Eskalasi ${k.level}`}
                      </Badge>
                      <span className="tabular-mono text-[11px] text-[#8A7F73]">
                        {formatWaktu(k.waktu)}
                      </span>
                    </div>
                    <p className="text-[13px] font-bold text-[#221C17]">{k.deskripsi}</p>
                    <p className="text-[11px] text-[#8A7F73]">
                      Kategori: {k.kategori} · Penangan: {penangan?.nama ?? '-'}
                    </p>
                    {k.penyelesaian && (
                      <p className="text-xs text-[#3D342C]">Tindakan: {k.penyelesaian}</p>
                    )}
                    {k.status !== 'selesai' && (
                      <div className="flex flex-wrap gap-2 pt-1.5">
                        {k.level !== 'manajemen' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              updateKeluhanStatus(k.id, 'manajemen', 'eskalasi')
                            }
                          >
                            Eskalasi ke Manajemen
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() =>
                            updateKeluhanStatus(k.id, k.level, 'selesai', 'Diselesaikan di outlet')
                          }
                        >
                          Tandai Selesai
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Modal Catat QC */}
      <Modal open={qcOpen} onClose={() => setQcOpen(false)} title="Catat Log QC (Pesanan Dikembalikan)">
        <form onSubmit={handleSaveQC} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[#221C17]">Menu</label>
            <select
              value={qcMenuId || menu[0]?.id || ''}
              onChange={(e) => setQcMenuId(e.target.value)}
              className="h-10 rounded-[10px] border border-[#E6E0D8] px-3 text-sm"
            >
              {menu.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nama} ({m.divisi})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#221C17]">Divisi Penanggung Jawab</label>
              <select
                value={qcDivisi}
                onChange={(e) => setQcDivisi(e.target.value as Divisi)}
                className="h-10 rounded-[10px] border border-[#E6E0D8] px-3 text-sm"
              >
                <option value="barista">Barista</option>
                <option value="kitchen">Kitchen</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#221C17]">Petugas</label>
              <select
                value={qcPetugasId || pegawai[0]?.id || ''}
                onChange={(e) => setQcPetugasId(e.target.value)}
                className="h-10 rounded-[10px] border border-[#E6E0D8] px-3 text-sm"
              >
                {pegawai.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#221C17]">Alasan Pengembalian</label>
              <select
                value={qcAlasan}
                onChange={(e) => setQcAlasan(e.target.value as AlasanQC)}
                className="h-10 rounded-[10px] border border-[#E6E0D8] px-3 text-sm"
              >
                {ALASAN_QC.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#221C17]">Durasi Perbaikan (Menit)</label>
              <input
                type="number"
                min={1}
                value={qcDurasi}
                onChange={(e) => setQcDurasi(Math.max(1, Number(e.target.value)))}
                className="tabular-mono h-10 rounded-[10px] border border-[#E6E0D8] px-3 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setQcOpen(false)}>
              Batal
            </Button>
            <Button type="submit">Simpan Log QC</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Catat Keluhan */}
      <Modal open={kelOpen} onClose={() => setKelOpen(false)} title="Catat Keluhan Pelanggan">
        <form onSubmit={handleSaveKeluhan} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[#221C17]">Deskripsi Keluhan</label>
            <input
              type="text"
              required
              value={kelDesc}
              onChange={(e) => setKelDesc(e.target.value)}
              placeholder="Misal: Pesanan menunggu lama saat jam ramai mahasiswa"
              className="h-10 rounded-[10px] border border-[#E6E0D8] px-3 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#221C17]">Kategori</label>
              <select
                value={kelKat}
                onChange={(e) => setKelKat(e.target.value as Keluhan['kategori'])}
                className="h-10 rounded-[10px] border border-[#E6E0D8] px-3 text-sm"
              >
                <option value="Waktu Tunggu">Waktu Tunggu</option>
                <option value="Kualitas Produk">Kualitas Produk</option>
                <option value="Fasilitas Outlet">Fasilitas Outlet</option>
                <option value="Pelayanan">Pelayanan</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#221C17]">Level Penanganan</label>
              <select
                value={kelLevel}
                onChange={(e) => setKelLevel(e.target.value as LevelKeluhan)}
                className="h-10 rounded-[10px] border border-[#E6E0D8] px-3 text-sm"
              >
                <option value="karyawan">Ditangani Karyawan</option>
                <option value="kapten">Eskalasi Kapten Outlet</option>
                <option value="manajemen">Eskalasi Manajemen / Head</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[#221C17]">Tindakan Penyelesaian</label>
            <input
              type="text"
              value={kelNote}
              onChange={(e) => setKelNote(e.target.value)}
              placeholder="Misal: Diberikan minuman pengganti / koordinasi prioritas dapur"
              className="h-10 rounded-[10px] border border-[#E6E0D8] px-3 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setKelOpen(false)}>
              Batal
            </Button>
            <Button type="submit">Simpan Keluhan</Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
