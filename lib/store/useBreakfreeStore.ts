'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type {
  ActivityLog,
  AlasanQC,
  AlasanWaste,
  AppSettings,
  Bahan,
  BreakfreeStateData,
  Divisi,
  Keluhan,
  LaporanKosong,
  LaporanStok,
  LaporanStokItem,
  LevelKeluhan,
  Menu,
  Pegawai,
  POItem,
  PurchaseOrder,
  QcLog,
  RekapOmzet,
  Retur,
  RoleId,
  SesiShift,
  Shift,
  StatusKeluhan,
  StatusLaporanKosong,
  StatusPO,
  StatusRetur,
  StockMovement,
  Supplier,
  WasteItem,
} from '@/lib/types';
import {
  addDaysISO,
  generateDocNomor,
  hitungSelisihOmzet,
  hitungStokSaatIni,
  todayISO,
} from '@/lib/domain/calculations';
import {
  SEED_BAHAN,
  SEED_MENU,
  SEED_PEGAWAI,
  SEED_SHIFTS,
  SEED_SUPPLIERS,
} from '@/lib/seed/breakfree-master';

export const STORAGE_KEY = 'breakfree-si:v1';

const INITIAL_DATA: BreakfreeStateData = {
  schemaVersion: 1,
  isInitialized: false,
  activeRole: 'manajemen',
  activePetugasId: '',
  settings: {
    faktorAkhirPekan: 1.5,
    toleransiSelisihOmzet: 0,
    outletNama: 'Breakfree Coffee Lowokwaru',
    outletAlamat: 'Jl. Sunan Pandanaran No. 4, Lowokwaru, Kota Malang',
  },
  pegawai: [],
  shifts: [],
  bahan: [],
  menu: [],
  suppliers: [],
  stockMovements: [],
  laporanStok: [],
  rekapOmzet: [],
  laporanKosong: [],
  returs: [],
  purchaseOrders: [],
  qcLogs: [],
  keluhan: [],
  activityLogs: [],
};

interface BreakfreeActions {
  // Setup & Data Management
  initMasterBreakfree: (withInitialStock: boolean) => void;
  initKosong: () => void;
  importBackup: (data: BreakfreeStateData) => void;
  resetAllData: () => void;

  // Navigation / Role context (tanpa login)
  setActiveRole: (role: RoleId) => void;
  setActivePetugasId: (id: string) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;

  // Kasir
  simpanRekapOmzet: (input: {
    tanggal: string;
    shiftId: string;
    petugasId: string;
    cash: number;
    qris: number;
    jumlahTransaksi: number;
    totalPOS: number;
    alasanSelisih?: string;
    catatan?: string;
    submit: boolean;
    revisiDariId?: string;
  }) => RekapOmzet;
  updateStatusKosong: (id: string, status: StatusLaporanKosong) => void;

  // Barista & Kitchen
  submitLaporanStok: (input: {
    editId?: string;
    tanggal: string;
    shiftId: string;
    sesi: SesiShift;
    divisi: Divisi;
    petugasId: string;
    items: Omit<LaporanStokItem, 'selisih'>[];
    waste: Omit<WasteItem, 'id' | 'nilai'>[];
    asDraft: boolean;
  }) => LaporanStok;
  laporBahanKosong: (input: {
    bahanId: string;
    divisi: Divisi;
    pelaporId: string;
    catatan?: string;
  }) => LaporanKosong;

  // Kapten Outlet
  tambahQcLog: (input: {
    menuId: string;
    divisi: Divisi;
    alasan: AlasanQC;
    penanggungJawabId: string;
    durasiPerbaikanMenit: number;
    kaptenId: string;
    catatan?: string;
  }) => void;
  tambahKeluhan: (input: {
    deskripsi: string;
    kategori: Keluhan['kategori'];
    penanganId: string;
    level: LevelKeluhan;
    penyelesaian?: string;
  }) => void;
  updateKeluhanStatus: (
    id: string,
    level: LevelKeluhan,
    status: StatusKeluhan,
    penyelesaian?: string
  ) => void;

  // Logistik & Manajemen
  verifikasiLaporanStok: (
    id: string,
    keputusan: 'diverifikasi' | 'dikembalikan',
    verifiedBy: string,
    catatan?: string
  ) => void;
  buatReturDariWaste: (wasteItemIds: string[]) => Retur | null;
  updateStatusRetur: (returId: string, status: StatusRetur) => void;
  buatPurchaseOrder: (input: {
    supplierId: string;
    items: { bahanId: string; qty: number; harga: number }[];
    returId?: string;
    catatan?: string;
    ajukanLangsung?: boolean;
  }) => PurchaseOrder;
  ubahStatusPO: (poId: string, status: StatusPO, catatan?: string) => void;
  terimaBarangPO: (poId: string, qtyMasukMap: Record<string, number>) => void;

  // Master Data CRUD
  upsertBahan: (bahan: Omit<Bahan, 'id'> & { id?: string }) => void;
  deleteBahan: (id: string) => void;
  upsertMenu: (menu: Omit<Menu, 'id'> & { id?: string }) => void;
  deleteMenu: (id: string) => void;
  upsertSupplier: (sup: Omit<Supplier, 'id'> & { id?: string }) => void;
  deleteSupplier: (id: string) => void;
  upsertPegawai: (peg: Omit<Pegawai, 'id'> & { id?: string }) => void;
  upsertShift: (shift: Omit<Shift, 'id'> & { id?: string }) => void;
  penyesuaianStokManual: (bahanId: string, qtyDelta: number, catatan: string) => void;
}

export type BreakfreeStore = BreakfreeStateData & BreakfreeActions;

function appendLog(
  logs: ActivityLog[],
  role: RoleId,
  petugasId: string,
  aksi: string,
  entitas: string,
  entitasId: string
): ActivityLog[] {
  const entry: ActivityLog = {
    id: nanoid(10),
    role,
    petugasId,
    aksi,
    entitas,
    entitasId,
    createdAt: new Date().toISOString(),
  };
  return [entry, ...logs].slice(0, 250);
}

export const useBreakfreeStore = create<BreakfreeStore>()(
  persist(
    (set, get) => ({
      ...INITIAL_DATA,

      initMasterBreakfree: (withInitialStock) => {
        const now = new Date().toISOString();
        const initialBalances: Record<string, number> = {
          'bhn-susu-uht': 14,
          'bhn-espresso': 4.5,
          'bhn-oat-milk': 5,
          'bhn-aren': 4,
          'bhn-matcha': 2,
          'bhn-cup16': 200,
          'bhn-ayam': 6,
          'bhn-beras': 14,
          'bhn-batako': 30,
          'bhn-spinach': 16,
        };
        const initialMovements: StockMovement[] = withInitialStock
          ? SEED_BAHAN.map((b) => ({
              id: nanoid(10),
              bahanId: b.id,
              tipe: 'INITIAL',
              qty: initialBalances[b.id] ?? b.stokMinimum,
              refType: 'SETUP',
              refId: 'initial-master',
              catatan: 'Saldo awal konfigurasi master Breakfree',
              createdAt: now,
              oleh: 'Setup Workspace',
            }))
          : [];

        set({
          ...INITIAL_DATA,
          isInitialized: true,
          activeRole: 'manajemen',
          activePetugasId: 'peg-owner1',
          pegawai: SEED_PEGAWAI,
          shifts: SEED_SHIFTS,
          bahan: SEED_BAHAN,
          menu: SEED_MENU,
          suppliers: SEED_SUPPLIERS,
          stockMovements: initialMovements,
          activityLogs: appendLog(
            [],
            'manajemen',
            'peg-owner1',
            withInitialStock
              ? 'Memuat master data awal Breakfree + saldo awal stok'
              : 'Memuat master data awal Breakfree (saldo stok 0)',
            'Workspace',
            'setup'
          ),
        });
      },

      initKosong: () => {
        set({
          ...INITIAL_DATA,
          isInitialized: true,
          shifts: [
            { id: 'sh-pagi', nama: 'Shift Pagi', jamMulai: '08:00', jamSelesai: '16:00' },
            { id: 'sh-sore', nama: 'Shift Sore', jamMulai: '16:00', jamSelesai: '24:00' },
            { id: 'sh-malam', nama: 'Shift Malam', jamMulai: '18:00', jamSelesai: '02:00' },
          ],
          activeRole: 'manajemen',
        });
      },

      importBackup: (data) => {
        set({ ...data, isInitialized: true });
      },

      resetAllData: () => {
        set({ ...INITIAL_DATA });
      },

      setActiveRole: (role) => {
        const st = get();
        const match = st.pegawai.find((p) => p.aktif && p.posisi === role);
        set({
          activeRole: role,
          activePetugasId: match?.id ?? st.activePetugasId,
        });
      },

      setActivePetugasId: (id) => set({ activePetugasId: id }),

      updateSettings: (patch) => {
        const st = get();
        set({
          settings: { ...st.settings, ...patch },
          activityLogs: appendLog(
            st.activityLogs,
            st.activeRole,
            st.activePetugasId,
            'Memperbarui pengaturan operasional',
            'Settings',
            'global'
          ),
        });
      },

      simpanRekapOmzet: (input) => {
        const st = get();
        const { selisih, valid } = hitungSelisihOmzet(
          input.cash,
          input.qris,
          input.totalPOS,
          st.settings.toleransiSelisihOmzet
        );

        const existingVersions = st.rekapOmzet.filter(
          (r) => r.tanggal === input.tanggal && r.shiftId === input.shiftId
        );
        const versi = existingVersions.length + 1;

        let status: RekapOmzet['status'] = 'draft';
        if (input.submit) {
          if (valid || (input.alasanSelisih && input.alasanSelisih.trim().length >= 5)) {
            status = input.revisiDariId ? 'revisi' : 'terkirim';
          } else {
            status = 'perlu_cek';
          }
        } else if (!valid && input.totalPOS > 0) {
          status = 'perlu_cek';
        }

        const record: RekapOmzet = {
          id: nanoid(10),
          tanggal: input.tanggal,
          shiftId: input.shiftId,
          petugasId: input.petugasId,
          cash: input.cash,
          qris: input.qris,
          jumlahTransaksi: input.jumlahTransaksi,
          totalPOS: input.totalPOS,
          selisih,
          alasanSelisih: input.alasanSelisih?.trim(),
          catatan: input.catatan?.trim(),
          status,
          versi,
          createdAt: new Date().toISOString(),
          submittedAt: status === 'terkirim' || status === 'revisi' ? new Date().toISOString() : undefined,
        };

        set({
          rekapOmzet: [record, ...st.rekapOmzet],
          activityLogs: appendLog(
            st.activityLogs,
            st.activeRole,
            input.petugasId,
            `Mencatat rekap omzet (${status})`,
            'RekapOmzet',
            record.id
          ),
        });
        return record;
      },

      updateStatusKosong: (id, status) => {
        const st = get();
        const now = new Date().toISOString();
        set({
          laporanKosong: st.laporanKosong.map((lk) =>
            lk.id === id ? { ...lk, status, updatedAt: now } : lk
          ),
          activityLogs: appendLog(
            st.activityLogs,
            st.activeRole,
            st.activePetugasId,
            `Ubah status menu kosong menjadi ${status}`,
            'LaporanKosong',
            id
          ),
        });
      },

      submitLaporanStok: (input) => {
        const st = get();
        const now = new Date().toISOString();
        const id = input.editId || nanoid(10);

        const computedItems: LaporanStokItem[] = input.items.map((it) => ({
          ...it,
          selisih: Math.round((it.stokFisik - it.stokSistem) * 1000) / 1000,
        }));

        const computedWaste: WasteItem[] = input.waste
          .filter((w) => w.qty > 0)
          .map((w) => {
            const b = st.bahan.find((x) => x.id === w.bahanId);
            return {
              id: nanoid(8),
              bahanId: w.bahanId,
              qty: w.qty,
              alasan: w.alasan,
              nilai: Math.round(w.qty * (b?.hargaSatuan ?? 0)),
              catatan: w.catatan,
            };
          });

        const record: LaporanStok = {
          id,
          tanggal: input.tanggal,
          shiftId: input.shiftId,
          sesi: input.sesi,
          divisi: input.divisi,
          petugasId: input.petugasId,
          items: computedItems,
          waste: computedWaste,
          status: input.asDraft ? 'draft' : 'terkirim',
          createdAt: now,
          submittedAt: input.asDraft ? undefined : now,
        };

        let nextMovements = [...st.stockMovements];
        if (!input.asDraft) {
          const pegName =
            st.pegawai.find((p) => p.id === input.petugasId)?.nama ?? st.activeRole;

          // Record OPNAME_ADJUST to bring ledger to physical count (PRD FR-B4)
          for (const item of computedItems) {
            const currentLedger = hitungStokSaatIni(item.bahanId, nextMovements);
            const delta = Math.round((item.stokFisik - currentLedger) * 1000) / 1000;
            if (delta !== 0) {
              nextMovements.unshift({
                id: nanoid(10),
                bahanId: item.bahanId,
                tipe: 'OPNAME_ADJUST',
                qty: delta,
                refType: 'LaporanStok',
                refId: id,
                catatan: `${input.sesi.toUpperCase()} ${input.divisi}${item.catatan ? ` · ${item.catatan}` : ''}`,
                createdAt: now,
                oleh: pegName,
              });
            }
          }

          // Waste ledger record (informatif/pengurangan bila belum terhitung opname, dicatat qty negatif & opname terpisah sesuai FR-B4)
          for (const w of computedWaste) {
            nextMovements.unshift({
              id: nanoid(10),
              bahanId: w.bahanId,
              tipe: 'WASTE',
              qty: -w.qty,
              refType: 'WasteItem',
              refId: w.id,
              catatan: `Spoil/Waste: ${w.alasan}`,
              createdAt: now,
              oleh: pegName,
            });
          }
        }

        const exists = st.laporanStok.some((l) => l.id === id);
        const nextLaporan = exists
          ? st.laporanStok.map((l) => (l.id === id ? record : l))
          : [record, ...st.laporanStok];

        set({
          laporanStok: nextLaporan,
          stockMovements: nextMovements,
          activityLogs: appendLog(
            st.activityLogs,
            st.activeRole,
            input.petugasId,
            `${input.asDraft ? 'Menyimpan draft' : 'Mengirim'} laporan stok ${input.sesi} (${input.divisi})`,
            'LaporanStok',
            id
          ),
        });
        return record;
      },

      laporBahanKosong: (input) => {
        const st = get();
        const now = new Date().toISOString();
        const affected = st.menu
          .filter((m) => m.resep.some((r) => r.bahanId === input.bahanId))
          .map((m) => m.nama);

        const record: LaporanKosong = {
          id: nanoid(10),
          bahanId: input.bahanId,
          menuTerdampak: affected,
          divisi: input.divisi,
          pelaporId: input.pelaporId,
          catatan: input.catatan?.trim(),
          status: 'aktif',
          createdAt: now,
          updatedAt: now,
        };

        set({
          laporanKosong: [record, ...st.laporanKosong],
          activityLogs: appendLog(
            st.activityLogs,
            st.activeRole,
            input.pelaporId,
            `Melaporkan bahan kosong (${affected.length} menu terdampak)`,
            'LaporanKosong',
            record.id
          ),
        });
        return record;
      },

      tambahQcLog: (input) => {
        const st = get();
        const rec: QcLog = {
          id: nanoid(10),
          waktu: new Date().toISOString(),
          ...input,
        };
        set({
          qcLogs: [rec, ...st.qcLogs],
          activityLogs: appendLog(
            st.activityLogs,
            st.activeRole,
            input.kaptenId,
            `Mencatat log QC pesanan dikembalikan`,
            'QcLog',
            rec.id
          ),
        });
      },

      tambahKeluhan: (input) => {
        const st = get();
        const rec: Keluhan = {
          id: nanoid(10),
          waktu: new Date().toISOString(),
          deskripsi: input.deskripsi,
          kategori: input.kategori,
          penanganId: input.penanganId,
          level: input.level,
          status: input.level === 'karyawan' && input.penyelesaian ? 'selesai' : 'eskalasi',
          penyelesaian: input.penyelesaian,
        };
        set({
          keluhan: [rec, ...st.keluhan],
          activityLogs: appendLog(
            st.activityLogs,
            st.activeRole,
            input.penanganId,
            `Mencatat keluhan pelanggan (${input.level})`,
            'Keluhan',
            rec.id
          ),
        });
      },

      updateKeluhanStatus: (id, level, status, penyelesaian) => {
        const st = get();
        set({
          keluhan: st.keluhan.map((k) =>
            k.id === id
              ? { ...k, level, status, penyelesaian: penyelesaian ?? k.penyelesaian }
              : k
          ),
          activityLogs: appendLog(
            st.activityLogs,
            st.activeRole,
            st.activePetugasId,
            `Update keluhan menjadi ${status} (${level})`,
            'Keluhan',
            id
          ),
        });
      },

      verifikasiLaporanStok: (id, keputusan, verifiedBy, catatan) => {
        const st = get();
        const now = new Date().toISOString();
        set({
          laporanStok: st.laporanStok.map((l) =>
            l.id === id
              ? {
                  ...l,
                  status: keputusan,
                  verifiedAt: now,
                  verifiedBy,
                  catatanVerifikasi: catatan?.trim(),
                }
              : l
          ),
          activityLogs: appendLog(
            st.activityLogs,
            st.activeRole,
            st.activePetugasId,
            `Laporan stok ${keputusan}`,
            'LaporanStok',
            id
          ),
        });
      },

      buatReturDariWaste: (wasteItemIds) => {
        const st = get();
        if (!wasteItemIds.length) return null;

        const allWaste: WasteItem[] = [];
        for (const lap of st.laporanStok) {
          for (const w of lap.waste) {
            if (wasteItemIds.includes(w.id) && !w.returId) {
              allWaste.push(w);
            }
          }
        }
        if (!allWaste.length) return null;

        const now = new Date().toISOString();
        const returId = nanoid(10);
        const nomor = generateDocNomor(
          'RTR',
          st.returs.map((r) => r.nomor),
          todayISO()
        );

        const newRetur: Retur = {
          id: returId,
          nomor,
          wasteItemIds: allWaste.map((w) => w.id),
          ringkasanItem: allWaste.map((w) => ({
            bahanId: w.bahanId,
            qty: w.qty,
            alasan: w.alasan,
          })),
          status: 'diajukan',
          tanggalPengganti: addDaysISO(todayISO(), 1), // Aturan BOP H+1!
          createdAt: now,
          updatedAt: now,
        };

        const idSet = new Set(newRetur.wasteItemIds);
        const nextLaporan = st.laporanStok.map((lap) => ({
          ...lap,
          waste: lap.waste.map((w) => (idSet.has(w.id) ? { ...w, returId } : w)),
        }));

        set({
          returs: [newRetur, ...st.returs],
          laporanStok: nextLaporan,
          activityLogs: appendLog(
            st.activityLogs,
            st.activeRole,
            st.activePetugasId,
            `Membuat dokumen retur ${nomor} (pengganti H+1 BOP)`,
            'Retur',
            returId
          ),
        });
        return newRetur;
      },

      updateStatusRetur: (returId, status) => {
        const st = get();
        set({
          returs: st.returs.map((r) =>
            r.id === returId ? { ...r, status, updatedAt: new Date().toISOString() } : r
          ),
          activityLogs: appendLog(
            st.activityLogs,
            st.activeRole,
            st.activePetugasId,
            `Ubah status retur menjadi ${status}`,
            'Retur',
            returId
          ),
        });
      },

      buatPurchaseOrder: (input) => {
        const st = get();
        const now = new Date().toISOString();
        const tgl = todayISO();
        const nomor = generateDocNomor(
          'PO',
          st.purchaseOrders.map((p) => p.nomor),
          tgl
        );

        const poItems: POItem[] = input.items.map((it) => ({
          bahanId: it.bahanId,
          qty: it.qty,
          harga: it.harga,
          qtyDiterima: 0,
        }));
        const total = poItems.reduce((acc, it) => acc + it.qty * it.harga, 0);

        const po: PurchaseOrder = {
          id: nanoid(10),
          nomor,
          tanggal: tgl,
          supplierId: input.supplierId,
          items: poItems,
          total,
          status: input.ajukanLangsung ? 'diajukan' : 'draft',
          returId: input.returId,
          catatan: input.catatan?.trim(),
          createdAt: now,
          updatedAt: now,
        };

        const nextReturs = input.returId
          ? st.returs.map((r) => (r.id === input.returId ? { ...r, poId: po.id } : r))
          : st.returs;

        set({
          purchaseOrders: [po, ...st.purchaseOrders],
          returs: nextReturs,
          activityLogs: appendLog(
            st.activityLogs,
            st.activeRole,
            st.activePetugasId,
            `Membuat ${nomor} (${po.status})`,
            'PurchaseOrder',
            po.id
          ),
        });
        return po;
      },

      ubahStatusPO: (poId, status, catatan) => {
        const st = get();
        const approver =
          status === 'disetujui'
            ? st.pegawai.find((p) => p.id === st.activePetugasId)?.nama ?? 'Manajemen'
            : undefined;
        set({
          purchaseOrders: st.purchaseOrders.map((po) =>
            po.id === poId
              ? {
                  ...po,
                  status,
                  disetujuiOleh: approver ?? po.disetujuiOleh,
                  catatan: catatan ?? po.catatan,
                  updatedAt: new Date().toISOString(),
                }
              : po
          ),
          activityLogs: appendLog(
            st.activityLogs,
            st.activeRole,
            st.activePetugasId,
            `Status PO diubah ke ${status}`,
            'PurchaseOrder',
            poId
          ),
        });
      },

      terimaBarangPO: (poId, qtyMasukMap) => {
        const st = get();
        const po = st.purchaseOrders.find((p) => p.id === poId);
        if (!po) return;
        const now = new Date().toISOString();
        const receiver =
          st.pegawai.find((p) => p.id === st.activePetugasId)?.nama ?? 'Manajemen Logistik';

        const newMovements: StockMovement[] = [];
        const updatedItems = po.items.map((it) => {
          const masuk = Math.max(0, qtyMasukMap[it.bahanId] ?? 0);
          if (masuk > 0) {
            newMovements.push({
              id: nanoid(10),
              bahanId: it.bahanId,
              tipe: 'PO_RECEIVE',
              qty: masuk,
              refType: 'PurchaseOrder',
              refId: po.id,
              catatan: `Penerimaan ${po.nomor}`,
              createdAt: now,
              oleh: receiver,
            });
          }
          return {
            ...it,
            qtyDiterima: Math.min(it.qty, it.qtyDiterima + masuk),
          };
        });

        const allReceived = updatedItems.every((it) => it.qtyDiterima >= it.qty);
        const nextStatus: StatusPO = allReceived ? 'diterima' : 'diterima_sebagian';

        // Otomatis selesaikan retur H+1 terkait jika semua/barang diterima (PRD FR-L5)
        const nextReturs = po.returId
          ? st.returs.map((r) =>
              r.id === po.returId
                ? { ...r, status: 'pengganti_diterima' as StatusRetur, updatedAt: now }
                : r
            )
          : st.returs;

        set({
          purchaseOrders: st.purchaseOrders.map((p) =>
            p.id === poId ? { ...p, items: updatedItems, status: nextStatus, updatedAt: now } : p
          ),
          stockMovements: [...newMovements, ...st.stockMovements],
          returs: nextReturs,
          activityLogs: appendLog(
            st.activityLogs,
            st.activeRole,
            st.activePetugasId,
            `Penerimaan barang ${po.nomor} (${nextStatus})`,
            'PurchaseOrder',
            po.id
          ),
        });
      },

      upsertBahan: (input) => {
        const st = get();
        const id = input.id || `bhn-${nanoid(6)}`;
        const exists = st.bahan.some((b) => b.id === id);
        const rec: Bahan = { ...input, id };
        set({
          bahan: exists ? st.bahan.map((b) => (b.id === id ? rec : b)) : [...st.bahan, rec],
        });
      },

      deleteBahan: (id) => {
        set((st) => ({ bahan: st.bahan.filter((b) => b.id !== id) }));
      },

      upsertMenu: (input) => {
        const st = get();
        const id = input.id || `mn-${nanoid(6)}`;
        const exists = st.menu.some((m) => m.id === id);
        const rec: Menu = { ...input, id };
        set({
          menu: exists ? st.menu.map((m) => (m.id === id ? rec : m)) : [...st.menu, rec],
        });
      },

      deleteMenu: (id) => {
        set((st) => ({ menu: st.menu.filter((m) => m.id !== id) }));
      },

      upsertSupplier: (input) => {
        const st = get();
        const id = input.id || `sup-${nanoid(6)}`;
        const exists = st.suppliers.some((s) => s.id === id);
        const rec: Supplier = { ...input, id };
        set({
          suppliers: exists
            ? st.suppliers.map((s) => (s.id === id ? rec : s))
            : [...st.suppliers, rec],
        });
      },

      deleteSupplier: (id) => {
        set((st) => ({ suppliers: st.suppliers.filter((s) => s.id !== id) }));
      },

      upsertPegawai: (input) => {
        const st = get();
        const id = input.id || `peg-${nanoid(6)}`;
        const exists = st.pegawai.some((p) => p.id === id);
        const rec: Pegawai = { ...input, id };
        set({
          pegawai: exists
            ? st.pegawai.map((p) => (p.id === id ? rec : p))
            : [...st.pegawai, rec],
        });
      },

      upsertShift: (input) => {
        const st = get();
        const id = input.id || `sh-${nanoid(6)}`;
        const exists = st.shifts.some((s) => s.id === id);
        const rec: Shift = { ...input, id };
        set({
          shifts: exists ? st.shifts.map((s) => (s.id === id ? rec : s)) : [...st.shifts, rec],
        });
      },

      penyesuaianStokManual: (bahanId, qtyDelta, catatan) => {
        const st = get();
        if (qtyDelta === 0) return;
        const pegName =
          st.pegawai.find((p) => p.id === st.activePetugasId)?.nama ?? st.activeRole;
        const mov: StockMovement = {
          id: nanoid(10),
          bahanId,
          tipe: 'MANUAL_ADJUST',
          qty: qtyDelta,
          refType: 'Manual',
          refId: 'manual',
          catatan,
          createdAt: new Date().toISOString(),
          oleh: pegName,
        };
        set({
          stockMovements: [mov, ...st.stockMovements],
          activityLogs: appendLog(
            st.activityLogs,
            st.activeRole,
            st.activePetugasId,
            `Penyesuaian stok manual (${qtyDelta > 0 ? '+' : ''}${qtyDelta})`,
            'Bahan',
            bahanId
          ),
        });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);
