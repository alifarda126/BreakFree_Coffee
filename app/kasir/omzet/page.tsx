'use client';

import React, { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { useBreakfreeStore } from '@/lib/store/useBreakfreeStore';
import {
  detectActiveShiftId,
  formatRp,
  formatTanggal,
  hitungSelisihOmzet,
  todayISO,
} from '@/lib/domain/calculations';
import { AppShell } from '@/components/layout/AppShell';
import { Badge, Button, Card, CurrencyInput } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/ToastProvider';

export default function KasirOmzetPage() {
  const shifts = useBreakfreeStore((s) => s.shifts);
  const pegawai = useBreakfreeStore((s) => s.pegawai);
  const activePetugasId = useBreakfreeStore((s) => s.activePetugasId);
  const settings = useBreakfreeStore((s) => s.settings);
  const rekapOmzet = useBreakfreeStore((s) => s.rekapOmzet);
  const simpanRekapOmzet = useBreakfreeStore((s) => s.simpanRekapOmzet);
  const { pushToast } = useToast();

  const kasirList = useMemo(
    () => pegawai.filter((p) => p.aktif && p.posisi === 'kasir'),
    [pegawai]
  );

  const [tanggal, setTanggal] = useState(todayISO());
  const [shiftId, setShiftId] = useState(() => detectActiveShiftId(shifts));
  const [petugasId, setPetugasId] = useState(
    () => kasirList.find((k) => k.id === activePetugasId)?.id ?? kasirList[0]?.id ?? ''
  );
  const [cash, setCash] = useState(0);
  const [qris, setQris] = useState(0);
  const [jumlahTransaksi, setJumlahTransaksi] = useState(0);
  const [totalPOS, setTotalPOS] = useState(0);
  const [alasanSelisih, setAlasanSelisih] = useState('');
  const [catatan, setCatatan] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const effectiveShiftId = shiftId || shifts[0]?.id || '';
  const effectivePetugasId = petugasId || kasirList[0]?.id || activePetugasId || '';

  const existingSubmitted = rekapOmzet.find(
    (r) =>
      r.tanggal === tanggal &&
      r.shiftId === effectiveShiftId &&
      (r.status === 'terkirim' || r.status === 'revisi')
  );

  const { totalInput, selisih, valid } = hitungSelisihOmzet(
    cash,
    qris,
    totalPOS,
    settings.toleransiSelisihOmzet
  );

  const hasMismatch = totalPOS > 0 && !valid;
  const canSubmit =
    confirmed &&
    totalPOS > 0 &&
    (valid || alasanSelisih.trim().length >= 5);

  const handleSave = (submit: boolean) => {
    const rec = simpanRekapOmzet({
      tanggal,
      shiftId: effectiveShiftId,
      petugasId: effectivePetugasId,
      cash,
      qris,
      jumlahTransaksi,
      totalPOS,
      alasanSelisih,
      catatan,
      submit,
      revisiDariId: existingSubmitted?.id,
    });

    if (rec.status === 'perlu_cek') {
      pushToast(
        'Ada selisih antara Cash+QRIS dan POS Pawoon. Status: Perlu Cek Ulang',
        'warning'
      );
    } else if (submit) {
      pushToast(
        existingSubmitted ? 'Revisi rekap omzet berhasil dikirim' : 'Rekap omzet shift terkirim ke sistem',
        'success'
      );
    } else {
      pushToast('Draft rekap omzet disimpan', 'info');
    }
  };

  const inputCls =
    'h-10 rounded-lg border border-[#E5E5E5] bg-white px-3 text-[14px] font-normal text-[#111111] transition focus:border-[#111111] focus:outline-none focus:ring-2 focus:ring-[#111111]/10';

  return (
    <AppShell pageTitle="Input Rekap Omzet">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Form */}
        <Card className="flex flex-col gap-4 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-[17px] font-semibold text-[#111111]">
                Rekap Closing Shift Kasir
              </h2>
              <p className="mt-0.5 text-[13px] font-normal text-[#737373]">
                Masukkan nominal rekapitulasi dari aplikasi POS Pawoon pada akhir shift.
              </p>
            </div>
            {existingSubmitted ? (
              <Badge tone="info">Mode Revisi (v{existingSubmitted.versi + 1})</Badge>
            ) : (
              <Badge tone="primary">
                {shifts.find((s) => s.id === effectiveShiftId)?.nama ?? 'Shift'}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="omz-tgl" className="text-[13px] font-medium text-[#111111]">Tanggal</label>
              <input
                id="omz-tgl"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className={`${inputCls} tabular-mono`}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="omz-shift" className="text-[13px] font-medium text-[#111111]">Shift</label>
              <select
                id="omz-shift"
                value={effectiveShiftId}
                onChange={(e) => setShiftId(e.target.value)}
                className={inputCls}
              >
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nama} ({s.jamMulai}-{s.jamSelesai})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="omz-kasir" className="text-[13px] font-medium text-[#111111]">Petugas Kasir</label>
              <select
                id="omz-kasir"
                value={effectivePetugasId}
                onChange={(e) => setPetugasId(e.target.value)}
                className={inputCls}
              >
                {(kasirList.length > 0 ? kasirList : pegawai).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <CurrencyInput
              id="cash-input"
              label="Total Transaksi Cash"
              value={cash}
              onChange={setCash}
              helper="Total uang fisik laci kasir"
            />
            <CurrencyInput
              id="qris-input"
              label="Total Transaksi QRIS"
              value={qris}
              onChange={setQris}
              helper="Rekap settlement QRIS shift"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <CurrencyInput
              id="trx-input"
              label="Jumlah Transaksi"
              value={jumlahTransaksi}
              onChange={setJumlahTransaksi}
              prefix={null}
              suffix="struk"
            />
            <CurrencyInput
              id="pos-input"
              label="Total Omzet POS Pawoon"
              value={totalPOS}
              onChange={setTotalPOS}
              helper="Harus sesuai dengan Cash + QRIS"
              error={
                hasMismatch
                  ? `Selisih ${formatRp(selisih)} terdeteksi, cek ulang input atau beri alasan`
                  : undefined
              }
            />
          </div>

          {hasMismatch && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="omz-alasan" className="text-[13px] font-medium text-[#B45309]">
                Alasan Selisih (min. 5 karakter bila tetap kirim)
              </label>
              <input
                id="omz-alasan"
                type="text"
                value={alasanSelisih}
                onChange={(e) => setAlasanSelisih(e.target.value)}
                placeholder="Misal: Refund tunai order #114 belum tercatat di settlement QRIS"
                className="h-10 rounded-lg border border-[#F59E0B] bg-[#FFFBEB] px-3 text-[14px] font-normal text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/25"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="omz-note" className="text-[13px] font-medium text-[#111111]">
              Catatan Shift (Opsional)
            </label>
            <input
              id="omz-note"
              type="text"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Catatan singkat pergantian shift"
              className={inputCls}
            />
          </div>
        </Card>

        {/* Right: Live Validator + Recent History */}
        <div className="flex flex-col gap-6 lg:col-span-5">
          <Card className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-[#111111]">
                Validasi POS Pawoon
              </h2>
              {totalPOS === 0 ? (
                <Badge tone="neutral">Menunggu Input</Badge>
              ) : valid ? (
                <Badge tone="success">Sesuai POS</Badge>
              ) : (
                <Badge tone="warning">Perlu Cek Ulang</Badge>
              )}
            </div>

            <div className="flex flex-col gap-2.5 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] p-4">
              <div className="flex items-center justify-between text-[13px]">
                <span className="font-normal text-[#737373]">Total Hitungan (Cash + QRIS)</span>
                <span className="tabular-mono text-[15px] font-semibold text-[#111111]">
                  {formatRp(totalInput)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <span className="font-normal text-[#737373]">Total Laporan POS Pawoon</span>
                <span className="tabular-mono text-[15px] font-semibold text-[#111111]">
                  {formatRp(totalPOS)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-[#E5E5E5] pt-2.5">
                <span className="text-[14px] font-semibold text-[#111111]">Selisih</span>
                <span
                  className={`tabular-mono text-[24px] font-bold ${
                    totalPOS === 0
                      ? 'text-[#737373]'
                      : valid
                        ? 'text-[#15803D]'
                        : 'text-[#DC2626]'
                  }`}
                >
                  {formatRp(selisih)}
                </span>
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-2.5 text-[12.5px] font-normal text-[#262626]">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded accent-[#111111]"
              />
              <span>
                Data Cash &amp; QRIS sudah dicocokkan dengan laporan shift POS Pawoon.
              </span>
            </label>

            <div className="flex items-center gap-2.5">
              <Button variant="secondary" onClick={() => handleSave(false)}>
                Simpan Draft
              </Button>
              <Button
                className="flex-1"
                disabled={!canSubmit}
                onClick={() => handleSave(true)}
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                {existingSubmitted ? 'Kirim Revisi' : 'Validasi & Kirim'}
              </Button>
            </div>
          </Card>

          <Card className="flex flex-col gap-3">
            <h2 className="text-[15px] font-semibold text-[#111111]">Riwayat Rekap Terakhir</h2>
            {rekapOmzet.length === 0 ? (
              <p className="py-4 text-center text-[12px] font-normal text-[#737373]">
                Belum ada rekap tersimpan.
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-[#E5E5E5]">
                {rekapOmzet.slice(0, 5).map((r) => {
                  const sh = shifts.find((s) => s.id === r.shiftId);
                  return (
                    <div key={r.id} className="flex items-center justify-between gap-2 py-2.5">
                      <div>
                        <div className="text-[13px] font-medium text-[#111111]">
                          {formatTanggal(r.tanggal)} · {sh?.nama ?? r.shiftId}
                          {r.versi > 1 ? ` (v${r.versi})` : ''}
                        </div>
                        <div className="text-[12px] font-normal text-[#737373]">
                          {r.jumlahTransaksi} transaksi
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="tabular-mono text-[13px] font-semibold text-[#111111]">
                          {formatRp(r.cash + r.qris)}
                        </span>
                        <Badge
                          tone={
                            r.status === 'terkirim' || r.status === 'revisi'
                              ? 'success'
                              : r.status === 'perlu_cek'
                                ? 'warning'
                                : 'info'
                          }
                        >
                          {r.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
