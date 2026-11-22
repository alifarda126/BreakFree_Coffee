'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, Check, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useBreakfreeStore } from '@/lib/store/useBreakfreeStore';
import {
  detectActiveShiftId,
  evaluasiStatusStok,
  formatQty,
  formatRp,
  hitungStokSaatIni,
  todayISO,
} from '@/lib/domain/calculations';
import { AppShell } from '@/components/layout/AppShell';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
  StepperQty,
  StockBar,
} from '@/components/ui/primitives';
import { LaporKosongModal } from '@/components/modals/LaporKosongModal';
import { useToast } from '@/components/ui/ToastProvider';
import type { AlasanWaste, Divisi, SesiShift } from '@/lib/types';

const ALASAN_WASTE_OPTIONS: AlasanWaste[] = [
  'Basi / Berubah Warna',
  'Kedaluwarsa',
  'Rusak / Tumpah',
  'Gagal Produksi',
  'Stok Mengendap',
];

interface DraftWasteRow {
  tempId: string;
  bahanId: string;
  qty: number;
  alasan: AlasanWaste;
  catatan: string;
}

export function DivisiRekapStokView({ divisi }: { divisi: Divisi }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit') || undefined;

  const bahan = useBreakfreeStore((s) => s.bahan);
  const stockMovements = useBreakfreeStore((s) => s.stockMovements);
  const shifts = useBreakfreeStore((s) => s.shifts);
  const pegawai = useBreakfreeStore((s) => s.pegawai);
  const activePetugasId = useBreakfreeStore((s) => s.activePetugasId);
  const laporanStok = useBreakfreeStore((s) => s.laporanStok);
  const submitLaporanStok = useBreakfreeStore((s) => s.submitLaporanStok);
  const { pushToast } = useToast();

  const divTitle = divisi === 'barista' ? 'Barista' : 'Kitchen';
  const divBahan = useMemo(
    () => bahan.filter((b) => b.divisi === divisi),
    [bahan, divisi]
  );
  const divPetugas = useMemo(
    () => pegawai.filter((p) => p.aktif && p.posisi === divisi),
    [pegawai, divisi]
  );

  const editTarget = useMemo(
    () => (editId ? laporanStok.find((l) => l.id === editId) : undefined),
    [editId, laporanStok]
  );

  const [tanggal, setTanggal] = useState(editTarget?.tanggal ?? todayISO());
  const [shiftId, setShiftId] = useState(
    editTarget?.shiftId ?? detectActiveShiftId(shifts)
  );
  const [sesi, setSesi] = useState<SesiShift>(editTarget?.sesi ?? 'closing');
  const [petugasId, setPetugasId] = useState(
    editTarget?.petugasId ??
      divPetugas.find((p) => p.id === activePetugasId)?.id ??
      divPetugas[0]?.id ??
      ''
  );

  const [fisikMap, setFisikMap] = useState<Record<string, number>>({});
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});
  const [wasteRows, setWasteRows] = useState<DraftWasteRow[]>([]);

  const [validateModalOpen, setValidateModalOpen] = useState(false);
  const [confirmAktual, setConfirmAktual] = useState(false);
  const [kosongModalOpen, setKosongModalOpen] = useState(false);

  useEffect(() => {
    const nextFisik: Record<string, number> = {};
    const nextNote: Record<string, string> = {};
    for (const b of divBahan) {
      const fromEdit = editTarget?.items.find((i) => i.bahanId === b.id);
      nextFisik[b.id] = fromEdit
        ? fromEdit.stokFisik
        : hitungStokSaatIni(b.id, stockMovements);
      nextNote[b.id] = fromEdit?.catatan ?? '';
    }
    setFisikMap(nextFisik);
    setNoteMap(nextNote);

    if (editTarget?.waste.length) {
      setWasteRows(
        editTarget.waste.map((w, i) => ({
          tempId: `w-${i}-${w.id}`,
          bahanId: w.bahanId,
          qty: w.qty,
          alasan: w.alasan,
          catatan: w.catatan,
        }))
      );
    }
  }, [divBahan, editTarget, stockMovements]);

  const opnameRows = useMemo(() => {
    return divBahan.map((b) => {
      const sys = hitungStokSaatIni(b.id, stockMovements);
      const phys = fisikMap[b.id] ?? sys;
      const diff = Math.round((phys - sys) * 1000) / 1000;
      const status = evaluasiStatusStok(phys, b.stokMinimum);
      return { b, sys, phys, diff, status, note: noteMap[b.id] ?? '' };
    });
  }, [divBahan, stockMovements, fisikMap, noteMap]);

  const totalWasteNilai = useMemo(() => {
    return wasteRows.reduce((acc, w) => {
      const b = bahan.find((x) => x.id === w.bahanId);
      return acc + Math.round(w.qty * (b?.hargaSatuan ?? 0));
    }, 0);
  }, [wasteRows, bahan]);

  const selisihTerbesar = useMemo(() => {
    if (!opnameRows.length) return null;
    return [...opnameRows].sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))[0];
  }, [opnameRows]);

  const addWasteRow = () => {
    if (!divBahan.length) return;
    setWasteRows((prev) => [
      ...prev,
      {
        tempId: Math.random().toString(36).slice(2, 8),
        bahanId: divBahan[0].id,
        qty: 1,
        alasan: 'Basi / Berubah Warna',
        catatan: '',
      },
    ]);
  };

  const handleSave = (asDraft: boolean) => {
    const effShift = shiftId || shifts[0]?.id || 'sh-sore';
    const effPetugas = petugasId || divPetugas[0]?.id || activePetugasId || '';
    submitLaporanStok({
      editId: editTarget?.id,
      tanggal,
      shiftId: effShift,
      sesi,
      divisi,
      petugasId: effPetugas,
      items: opnameRows.map((r) => ({
        bahanId: r.b.id,
        stokSistem: r.sys,
        stokFisik: r.phys,
        catatan: r.note,
      })),
      waste: wasteRows.map((w) => ({
        bahanId: w.bahanId,
        qty: w.qty,
        alasan: w.alasan,
        catatan: w.catatan,
      })),
      asDraft,
    });

    if (asDraft) {
      pushToast(`Draft laporan ${divTitle} disimpan`, 'info');
    } else {
      setValidateModalOpen(false);
      setConfirmAktual(false);
      pushToast(`Laporan ${sesi} ${divTitle} tervalidasi & dikirim ke Logistik`, 'success');
      router.push(`/${divisi}/riwayat`);
    }
  };

  const fieldCls =
    'h-9 rounded-lg border border-[#E5E5E5] bg-white px-2.5 text-sm text-[#111111] transition focus:border-[#111111] focus:outline-none focus:ring-2 focus:ring-[#111111]/10';

  return (
    <AppShell pageTitle={`Rekap Stok & Spoil/Waste Divisi ${divTitle}`}>
      {/* Stepper + Session Controls */}
      <Card className="flex flex-wrap items-center justify-between gap-3 py-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={validateModalOpen ? 'success' : 'primary'}>
            1. Isi Stok &amp; Waste
          </Badge>
          <ChevronRight className="h-4 w-4 text-[#737373]" aria-hidden="true" />
          <Badge tone={validateModalOpen ? 'primary' : 'neutral'} dot={false}>
            2. Review &amp; Validasi
          </Badge>
          <ChevronRight className="h-4 w-4 text-[#737373]" aria-hidden="true" />
          <Badge tone="neutral" dot={false}>
            3. Terkirim ke Logistik
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Opening / Closing Toggle */}
          <div className="inline-flex rounded-lg border border-[#E5E5E5] bg-[#F5F5F5] p-1">
            {(['opening', 'closing'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSesi(s)}
                className={`rounded-md px-3 py-1 text-[13px] capitalize transition-all ${
                  sesi === s
                    ? 'bg-white font-semibold text-[#111111] shadow-[0_1px_2px_rgba(17,17,17,0.06)]'
                    : 'font-medium text-[#737373] hover:text-[#111111]'
                }`}
              >
                {s === 'opening' ? 'Opname Awal Shift' : 'Opname Akhir Shift'}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Meta Selectors (Tanggal, Shift, Petugas) */}
      <Card className="grid grid-cols-1 gap-3 py-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="rek-tgl" className="text-xs font-medium text-[#737373]">Tanggal Shift</label>
          <input
            id="rek-tgl"
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className={`${fieldCls} tabular-mono`}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="rek-shift" className="text-xs font-medium text-[#737373]">Shift</label>
          <select
            id="rek-shift"
            value={shiftId || shifts[0]?.id || ''}
            onChange={(e) => setShiftId(e.target.value)}
            className={fieldCls}
          >
            {shifts.map((sh) => (
              <option key={sh.id} value={sh.id}>
                {sh.nama} ({sh.jamMulai}-{sh.jamSelesai})
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="rek-petugas" className="text-xs font-medium text-[#737373]">
            Petugas {divTitle}
          </label>
          <select
            id="rek-petugas"
            value={petugasId || divPetugas[0]?.id || ''}
            onChange={(e) => setPetugasId(e.target.value)}
            className={fieldCls}
          >
            {(divPetugas.length > 0 ? divPetugas : pegawai).map((p) => (
              <option key={p.id} value={p.id}>
                {p.nama}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Stock Opname Table (Desktop >= md) + List Cards (Mobile < md) */}
      <Card className="flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[16px] font-semibold text-[#111111]">
            Stock List Fisik Divisi {divTitle} ({sesi === 'opening' ? 'Opening' : 'Closing'})
          </h2>
          <span className="text-xs text-[#737373]">
            Stok sistem dihitung otomatis dari ledger keluar-masuk barang
          </span>
        </div>

        {opnameRows.length === 0 ? (
          <EmptyState
            title="Daftar bahan kosong"
            description="Tambahkan bahan di Master Data agar bisa direkap pada opening/closing shift."
          />
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[11px] font-semibold uppercase tracking-wider text-[#737373]">
                    <th className="rounded-l-lg px-3 py-2.5">Bahan Baku</th>
                    <th className="px-3 py-2.5 text-right">Stok Sistem</th>
                    <th className="px-3 py-2.5 text-center">Input Stok Fisik</th>
                    <th className="px-3 py-2.5 text-right">Selisih</th>
                    <th className="px-3 py-2.5">Status Stok</th>
                    <th className="rounded-r-lg px-3 py-2.5">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5]">
                  {opnameRows.map((r) => {
                    const stColor =
                      r.status === 'kritis' || r.status === 'habis'
                        ? 'text-[#DC2626]'
                        : r.status === 'menipis'
                          ? 'text-[#B45309]'
                          : 'text-[#15803D]';
                    return (
                      <tr key={r.b.id} className="transition-colors hover:bg-[#FAFAFA]">
                        <td className="px-3 py-2.5">
                          <div>
                            <div className="text-[13.5px] font-normal text-[#111111]">{r.b.nama}</div>
                            <div className="text-[12px] text-[#737373]">
                              {r.b.kategori} · {r.b.sumber}
                            </div>
                          </div>
                        </td>
                        <td className="tabular-mono px-3 py-2.5 text-right text-[#737373]">
                          {formatQty(r.sys, r.b.satuan)}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <StepperQty
                            value={r.phys}
                            unit={r.b.satuan}
                            step={r.b.satuan === 'pcs' ? 5 : 0.5}
                            ariaLabel={r.b.nama}
                            onChange={(val) =>
                              setFisikMap((prev) => ({ ...prev, [r.b.id]: val }))
                            }
                          />
                        </td>
                        <td
                          className={`tabular-mono px-3 py-2.5 text-right font-semibold ${
                            r.diff === 0 ? 'text-[#111111]' : stColor
                          }`}
                        >
                          {r.diff > 0 ? '+' : ''}
                          {formatQty(r.diff, r.b.satuan)}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-col gap-1">
                            <span className={`text-xs font-semibold capitalize ${stColor}`}>
                              {r.status}
                            </span>
                            <StockBar current={r.phys} min={r.b.stokMinimum} status={r.status} />
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="text"
                            value={r.note}
                            onChange={(e) =>
                              setNoteMap((prev) => ({ ...prev, [r.b.id]: e.target.value }))
                            }
                            aria-label={`Catatan ${r.b.nama}`}
                            placeholder="Kondisi / catatan..."
                            className="h-8 w-40 rounded-lg border border-[#E5E5E5] bg-white px-2.5 text-xs text-[#111111] focus:border-[#111111] focus:outline-none focus:ring-2 focus:ring-[#111111]/10"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile List-Cards */}
            <div className="flex flex-col gap-3 md:hidden">
              {opnameRows.map((r) => (
                <div
                  key={r.b.id}
                  className={`flex flex-col gap-2.5 rounded-xl border bg-white p-3.5 ${
                    r.status === 'kritis' || r.status === 'habis'
                      ? 'border-[#FECACA]'
                      : 'border-[#E5E5E5]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-[#111111]">{r.b.nama}</div>
                      <div className="tabular-mono text-xs text-[#737373]">
                        Sistem: {formatQty(r.sys, r.b.satuan)}
                      </div>
                    </div>
                    <Badge
                      tone={
                        r.status === 'kritis' || r.status === 'habis'
                          ? 'danger'
                          : r.status === 'menipis'
                            ? 'warning'
                            : 'success'
                      }
                    >
                      {r.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-[#262626]">Stok Fisik:</span>
                    <StepperQty
                      large
                      value={r.phys}
                      unit={r.b.satuan}
                      step={r.b.satuan === 'pcs' ? 5 : 0.5}
                      onChange={(val) => setFisikMap((prev) => ({ ...prev, [r.b.id]: val }))}
                    />
                  </div>
                  <StockBar current={r.phys} min={r.b.stokMinimum} status={r.status} />
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* Spoil / Waste Panel + Summary CTA */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Card className="flex flex-col gap-3 p-5 lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[15px] font-semibold text-[#111111]">
              Pencatatan Bahan Tidak Layak (Spoil / Waste)
            </h2>
            <Button variant="secondary" size="sm" onClick={addWasteRow}>
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Tambah Baris Waste
            </Button>
          </div>

          {wasteRows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#E5E5E5] bg-[#FAFAFA] px-4 py-3.5 text-xs text-[#737373]">
              Tidak ada bahan rusak/basi di shift ini. Klik &ldquo;Tambah Baris Waste&rdquo; bila
              ada bahan yang harus diretur atau dibuang.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {wasteRows.map((w) => {
                const mat = bahan.find((b) => b.id === w.bahanId);
                const nilai = Math.round(w.qty * (mat?.hargaSatuan ?? 0));
                return (
                  <div
                    key={w.tempId}
                    className="grid grid-cols-1 items-center gap-2 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] p-2.5 sm:grid-cols-12"
                  >
                    <select
                      value={w.bahanId}
                      onChange={(e) =>
                        setWasteRows((prev) =>
                          prev.map((row) =>
                            row.tempId === w.tempId ? { ...row, bahanId: e.target.value } : row
                          )
                        )
                      }
                      aria-label="Pilih bahan waste"
                      className="h-9 rounded-lg border border-[#E5E5E5] bg-white px-2 text-xs font-medium text-[#111111] sm:col-span-4"
                    >
                      {divBahan.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.nama} ({b.satuan})
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-1 sm:col-span-2">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={w.qty}
                        onChange={(e) => {
                          const v = Number.parseFloat(e.target.value);
                          setWasteRows((prev) =>
                            prev.map((row) =>
                              row.tempId === w.tempId
                                ? { ...row, qty: Number.isNaN(v) ? 0 : Math.max(0, v) }
                                : row
                            )
                          );
                        }}
                        aria-label="Jumlah waste"
                        className="tabular-mono h-9 w-full rounded-lg border border-[#E5E5E5] bg-white px-2 text-right text-xs font-normal text-[#111111]"
                      />
                      <span className="tabular-mono text-[11px] text-[#737373]">
                        {mat?.satuan}
                      </span>
                    </div>

                    <select
                      value={w.alasan}
                      onChange={(e) =>
                        setWasteRows((prev) =>
                          prev.map((row) =>
                            row.tempId === w.tempId
                              ? { ...row, alasan: e.target.value as AlasanWaste }
                              : row
                          )
                        )
                      }
                      aria-label="Alasan waste"
                      className="h-9 rounded-lg border border-[#E5E5E5] bg-white px-2 text-xs text-[#111111] sm:col-span-3"
                    >
                      {ALASAN_WASTE_OPTIONS.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center justify-between gap-2 sm:col-span-3 sm:justify-end">
                      <span className="tabular-mono text-xs font-semibold text-[#DC2626]">
                        {formatRp(nilai)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setWasteRows((prev) => prev.filter((r) => r.tempId !== w.tempId))
                        }
                        aria-label="Hapus baris waste"
                        className="rounded-lg p-1.5 text-[#737373] hover:bg-white hover:text-[#DC2626]"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="flex flex-col justify-between gap-3 p-5 lg:col-span-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#737373]">
              {opnameRows.length} bahan diisi · Total Waste
            </span>
            <span className="tabular-mono text-[15px] font-bold text-[#DC2626]">
              {formatRp(totalWasteNilai)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => handleSave(true)}>
              Draft
            </Button>
            <Button
              className="flex-1"
              disabled={opnameRows.length === 0}
              onClick={() => setValidateModalOpen(true)}
            >
              Lanjut ke Review &amp; Validasi
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </Card>
      </div>

      {/* Step 2 Validation Confirmation Modal */}
      <Modal
        open={validateModalOpen}
        onClose={() => setValidateModalOpen(false)}
        title="Review & Validasi Sebelum Kirim"
        badgeEl={<Badge tone="primary">Langkah 2 / 3</Badge>}
      >
        <div className="flex flex-col gap-4">
          <p className="text-[13px] text-[#737373]">
            Periksa ringkasan perubahan stok fisik &amp; catatan spoil/waste sebelum laporan
            diteruskan ke Manajemen Logistik:
          </p>

          <div className="flex flex-col gap-2.5 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] p-4 text-[13px]">
            <div className="flex items-center justify-between">
              <span className="text-[#737373]">Total Bahan Diperiksa</span>
              <span className="tabular-mono font-semibold text-[#111111]">
                {opnameRows.length} bahan ({sesi.toUpperCase()} {divTitle})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#737373]">Selisih Terbesar</span>
              <span className="tabular-mono font-semibold text-[#B45309]">
                {selisihTerbesar
                  ? `${selisihTerbesar.b.nama} (${selisihTerbesar.diff > 0 ? '+' : ''}${formatQty(
                      selisihTerbesar.diff,
                      selisihTerbesar.b.satuan
                    )})`
                  : '-'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#737373]">Total Kerugian Spoil / Waste</span>
              <span className="tabular-mono font-semibold text-[#DC2626]">
                {formatRp(totalWasteNilai)} ({wasteRows.filter((w) => w.qty > 0).length} item)
              </span>
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 text-xs font-medium text-[#262626]">
            <input
              type="checkbox"
              checked={confirmAktual}
              onChange={(e) => setConfirmAktual(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-[#111111]"
            />
            <span>Data stok fisik &amp; bahan tidak layak sudah sesuai kondisi aktual di outlet.</span>
          </label>

          <div className="flex items-center justify-end gap-2.5 pt-1">
            <Button variant="secondary" onClick={() => setValidateModalOpen(false)}>
              Kembali Edit
            </Button>
            <Button
              className="flex-1"
              disabled={!confirmAktual}
              onClick={() => handleSave(false)}
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              Kirim Laporan ke Logistik
            </Button>
          </div>
        </div>
      </Modal>

      <LaporKosongModal
        open={kosongModalOpen}
        onClose={() => setKosongModalOpen(false)}
        divisi={divisi}
      />
    </AppShell>
  );
}
