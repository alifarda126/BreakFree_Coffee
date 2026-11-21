'use client';

import React from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useBreakfreeStore } from '@/lib/store/useBreakfreeStore';
import { formatRp, formatTanggal, formatWaktu } from '@/lib/domain/calculations';
import { AppShell } from '@/components/layout/AppShell';
import { Badge, Button, Card, EmptyState } from '@/components/ui/primitives';
import type { Divisi } from '@/lib/types';

export function DivisiRiwayatView({ divisi }: { divisi: Divisi }) {
  const laporanStok = useBreakfreeStore((s) => s.laporanStok);
  const shifts = useBreakfreeStore((s) => s.shifts);
  const pegawai = useBreakfreeStore((s) => s.pegawai);

  const divTitle = divisi === 'barista' ? 'Barista' : 'Kitchen';
  const rows = laporanStok.filter((l) => l.divisi === divisi);

  return (
    <AppShell pageTitle={`Riwayat Laporan Stok & Verifikasi (${divTitle})`}>
      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[16px] font-semibold text-[#0F172A]">
            Daftar Pengiriman Stock List &amp; Waste Divisi {divTitle}
          </h2>
          <Link href={`/${divisi}/rekap`}>
            <Button size="sm">
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Input Rekap Shift Baru
            </Button>
          </Link>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title={`Belum ada riwayat laporan ${divTitle}`}
            description="Laporan opening/closing yang disimpan sebagai draft atau dikirim ke Logistik akan tampil di sini."
            action={
              <Link href={`/${divisi}/rekap`}>
                <Button size="sm">Buat Rekap Pertama</Button>
              </Link>
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {rows.map((lap) => {
              const sh = shifts.find((s) => s.id === lap.shiftId);
              const peg = pegawai.find((p) => p.id === lap.petugasId);
              const totalWaste = lap.waste.reduce((a, w) => a + w.nilai, 0);
              const tone =
                lap.status === 'diverifikasi'
                  ? 'success'
                  : lap.status === 'dikembalikan'
                    ? 'warning'
                    : lap.status === 'terkirim'
                      ? 'info'
                      : 'neutral';
              const label =
                lap.status === 'diverifikasi'
                  ? 'Diverifikasi Logistik'
                  : lap.status === 'dikembalikan'
                    ? 'Dikembalikan Logistik (Perlu Revisi)'
                    : lap.status === 'terkirim'
                      ? 'Terkirim (Menunggu Verifikasi)'
                      : 'Draft';

              return (
                <div
                  key={lap.id}
                  className={`flex flex-col gap-2 rounded-xl border bg-[#F8FAFC] p-4 ${
                    lap.status === 'dikembalikan' ? 'border-[#FDE68A]' : 'border-[#E2E8F0]'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-[#0F172A]">
                      {formatTanggal(lap.tanggal)} · {lap.sesi === 'opening' ? 'Opening' : 'Closing'}{' '}
                      {sh?.nama ?? ''} · Petugas: {peg?.nama ?? '-'}
                    </span>
                    <Badge tone={tone}>{label}</Badge>
                  </div>
                  <p className="text-[13px] text-[#334155]">
                    {lap.items.length} bahan direkap · {lap.waste.length} item waste (Total rugi{' '}
                    <span className="tabular-mono font-semibold text-[#DC2626]">
                      {formatRp(totalWaste)}
                    </span>
                    )
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`text-xs ${
                        lap.status === 'dikembalikan' ? 'font-semibold text-[#B45309]' : 'text-[#64748B]'
                      }`}
                    >
                      {lap.catatanVerifikasi
                        ? `Catatan Logistik (${lap.verifiedBy ?? '-'}): ${lap.catatanVerifikasi}`
                        : lap.submittedAt
                          ? `Dikirim pada ${formatWaktu(lap.submittedAt)}`
                          : 'Belum dikirim'}
                    </span>
                    {(lap.status === 'dikembalikan' || lap.status === 'draft') && (
                      <Link href={`/${divisi}/rekap?edit=${lap.id}`}>
                        <Button size="sm">Perbaiki / Lanjutkan</Button>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </AppShell>
  );
}
