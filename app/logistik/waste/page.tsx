'use client';

import React, { useMemo, useState } from 'react';
import { PackageX, RotateCcw, Trash2 } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Badge, Button, Card, EmptyState, KpiCard } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/ToastProvider';
import { useBreakfreeStore } from '@/lib/store/useBreakfreeStore';
import {
  addDaysISO,
  formatQty,
  formatRp,
  formatTanggal,
  todayISO,
} from '@/lib/domain/calculations';
import type { Divisi } from '@/lib/types';

export default function LogistikWastePage() {
  const { pushToast } = useToast();
  const {
    bahan,
    laporanStok,
    returs,
    buatReturDariWaste,
    updateStatusRetur,
  } = useBreakfreeStore();

  const [daysWindow, setDaysWindow] = useState<7 | 30>(7);
  const [filterDivisi, setFilterDivisi] = useState<'semua' | Divisi>('semua');
  const [selectedWasteIds, setSelectedWasteIds] = useState<Record<string, boolean>>({});

  const startDate = addDaysISO(todayISO(), -(daysWindow - 1));

  const wasteRecords = useMemo(() => {
    const out: {
      id: string;
      tanggal: string;
      divisi: Divisi;
      bahanNama: string;
      satuan: string;
      qty: number;
      nilai: number;
      alasan: string;
      statusLap: string;
      returId?: string;
    }[] = [];

    for (const lap of laporanStok) {
      if (lap.tanggal < startDate || lap.status === 'draft') continue;
      if (filterDivisi !== 'semua' && lap.divisi !== filterDivisi) continue;
      for (const w of lap.waste) {
        const b = bahan.find((x) => x.id === w.bahanId);
        out.push({
          id: w.id,
          tanggal: lap.tanggal,
          divisi: lap.divisi,
          bahanNama: b?.nama ?? w.bahanId,
          satuan: b?.satuan ?? '',
          qty: w.qty,
          nilai: w.nilai,
          alasan: w.alasan,
          statusLap: lap.status,
          returId: w.returId,
        });
      }
    }
    return out.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, [laporanStok, bahan, startDate, filterDivisi]);

  const totalNilai = wasteRecords.reduce((a, b) => a + b.nilai, 0);
  const readyForRetur = wasteRecords.filter((w) => w.statusLap === 'diverifikasi' && !w.returId);

  const handleBuatRetur = () => {
    const ids = Object.entries(selectedWasteIds)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (ids.length === 0) {
      pushToast('Pilih minimal 1 item waste terverifikasi untuk diajukan retur.', 'warning');
      return;
    }
    const created = buatReturDariWaste(ids);
    if (created) {
      setSelectedWasteIds({});
      pushToast(`Retur ${created.nomor} dibuat (target pengganti ${formatTanggal(created.tanggalPengganti)}).`, 'success');
    }
  };

  return (
    <AppShell pageTitle="Monitoring Spoil / Waste">
      {/* Period & Filter Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-[#E2E8F0] bg-[#F1F5F9] p-1">
          {([7, 30] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDaysWindow(d)}
              className={`rounded-md px-3.5 py-1.5 text-[13px] transition-all ${
                daysWindow === d
                  ? 'bg-white font-semibold text-[#2563EB] shadow-[0_1px_2px_rgba(15,23,42,0.08)]'
                  : 'font-medium text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              {d} Hari Terakhir
            </button>
          ))}
        </div>

        <select
          value={filterDivisi}
          onChange={(e) => setFilterDivisi(e.target.value as 'semua' | Divisi)}
          aria-label="Filter divisi waste"
          className="h-9 rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13px] text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
        >
          <option value="semua">Semua Divisi (Barista &amp; Kitchen)</option>
          <option value="barista">Barista</option>
          <option value="kitchen">Kitchen</option>
        </select>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label={`Total Nilai Spoil/Waste (${daysWindow}H)`}
          value={formatRp(totalNilai)}
          subtext={`${wasteRecords.length} catatan bahan tidak layak`}
          tone={totalNilai > 0 ? 'danger' : 'neutral'}
          icon={<Trash2 className="h-[18px] w-[18px]" strokeWidth={1.75} />}
        />
        <KpiCard
          label="Siap Diajukan Retur H+1"
          value={`${readyForRetur.length} Item`}
          subtext="Waste terverifikasi yang belum diretur"
          tone={readyForRetur.length > 0 ? 'warning' : 'success'}
          icon={<RotateCcw className="h-[18px] w-[18px]" strokeWidth={1.75} />}
        />
        <KpiCard
          label="Dokumen Retur Aktif"
          value={`${returs.filter((r) => r.status !== 'pengganti_diterima').length} Dokumen`}
          subtext={`Total ${returs.length} dokumen retur tercatat`}
          icon={<PackageX className="h-[18px] w-[18px]" strokeWidth={1.75} />}
        />
      </div>

      {/* Main Split: Waste Table + Retur BOP */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="flex flex-col gap-4 lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-[17px] font-semibold text-[#0F172A]">
                Daftar Laporan Spoil / Waste Divisi
              </h2>
              <p className="mt-0.5 text-[13px] font-normal text-[#64748B]">
                Centang item waste terverifikasi untuk memproses Retur BOP H+1.
              </p>
            </div>
            {readyForRetur.length > 0 && (
              <Button size="sm" onClick={handleBuatRetur}>
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Buat Retur H+1
              </Button>
            )}
          </div>

          {wasteRecords.length === 0 ? (
            <EmptyState
              title="Belum ada catatan spoil / waste pada periode ini"
              description="Laporan bahan tidak layak dari Barista dan Kitchen akan muncul di tabel ini."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13.5px]">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[12px] font-semibold uppercase text-[#64748B]">
                    <th className="w-10 rounded-l-lg px-2 py-2.5">Pilih</th>
                    <th className="px-3 py-2.5">Tanggal</th>
                    <th className="px-3 py-2.5">Bahan</th>
                    <th className="px-3 py-2.5">Divisi</th>
                    <th className="px-3 py-2.5">Alasan</th>
                    <th className="px-3 py-2.5 text-right">Qty</th>
                    <th className="rounded-r-lg px-3 py-2.5 text-right">Nilai</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {wasteRecords.map((w) => {
                    const selectable = w.statusLap === 'diverifikasi' && !w.returId;
                    return (
                      <tr key={w.id} className="hover:bg-[#F8FAFC]">
                        <td className="px-2 py-3">
                          <input
                            type="checkbox"
                            disabled={!selectable}
                            checked={Boolean(selectedWasteIds[w.id])}
                            onChange={(e) =>
                              setSelectedWasteIds((prev) => ({
                                ...prev,
                                [w.id]: e.target.checked,
                              }))
                            }
                            aria-label={`Pilih ${w.bahanNama}`}
                            className="h-4 w-4 rounded accent-[#2563EB]"
                          />
                        </td>
                        <td className="tabular-mono px-3 py-3 text-[#64748B]">
                          {formatTanggal(w.tanggal)}
                        </td>
                        <td className="px-3 py-3 text-[#0F172A]">{w.bahanNama}</td>
                        <td className="px-3 py-3 capitalize text-[#64748B]">{w.divisi}</td>
                        <td className="px-3 py-3 text-[#334155]">{w.alasan}</td>
                        <td className="tabular-mono px-3 py-3 text-right">
                          {formatQty(w.qty, w.satuan)}
                        </td>
                        <td className="tabular-mono px-3 py-3 text-right font-semibold text-[#DC2626]">
                          {formatRp(w.nilai)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="flex flex-col gap-3 lg:col-span-4">
          <h2 className="text-[15px] font-semibold text-[#0F172A]">Dokumen Retur BOP H+1</h2>
          {returs.length === 0 ? (
            <EmptyState
              title="Belum ada dokumen retur"
              description="Pilih item waste terverifikasi untuk membuat dokumen Retur H+1."
            />
          ) : (
            <div className="space-y-2.5">
              {returs.map((ret) => (
                <div
                  key={ret.id}
                  className="space-y-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="tabular-mono text-[13px] font-semibold text-[#0F172A]">
                      {ret.nomor}
                    </span>
                    <Badge
                      tone={
                        ret.status === 'pengganti_diterima'
                          ? 'success'
                          : ret.status === 'ditarik'
                            ? 'info'
                            : 'warning'
                      }
                    >
                      {ret.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-[12px] font-normal text-[#64748B]">
                    Target pengganti: {formatTanggal(ret.tanggalPengganti)} · {ret.ringkasanItem.length} item
                  </p>
                  {ret.status === 'diajukan' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        updateStatusRetur(ret.id, 'ditarik');
                        pushToast(`Retur ${ret.nomor} ditandai sudah ditarik.`, 'info');
                      }}
                    >
                      Tandai Ditarik BOP
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
