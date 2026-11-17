import { z } from 'zod';

const roleEnum = z.enum(['kasir', 'barista', 'kitchen', 'kapten', 'logistik', 'manajemen']);
const divisiEnum = z.enum(['barista', 'kitchen']);

export const BreakfreeBackupSchema = z.object({
  schemaVersion: z.number().int().min(1),
  isInitialized: z.boolean(),
  activeRole: roleEnum,
  activePetugasId: z.string(),
  settings: z.object({
    faktorAkhirPekan: z.number().positive(),
    toleransiSelisihOmzet: z.number().min(0),
    outletNama: z.string().min(1),
    outletAlamat: z.string().min(1),
  }),
  pegawai: z.array(
    z.object({
      id: z.string(),
      nama: z.string(),
      posisi: z.enum(['kasir', 'barista', 'kitchen', 'kapten', 'logistik', 'manajemen', 'waiter']),
      aktif: z.boolean(),
    })
  ),
  shifts: z.array(
    z.object({
      id: z.string(),
      nama: z.string(),
      jamMulai: z.string(),
      jamSelesai: z.string(),
    })
  ),
  bahan: z.array(
    z.object({
      id: z.string(),
      nama: z.string(),
      kategori: z.string(),
      satuan: z.string(),
      divisi: z.enum(['barista', 'kitchen', 'bersama']),
      sumber: z.enum(['internal', 'eksternal']),
      stokMinimum: z.number().min(0),
      hargaSatuan: z.number().min(0),
      perishable: z.boolean(),
    })
  ),
  menu: z.array(
    z.object({
      id: z.string(),
      nama: z.string(),
      kategori: z.enum(['minuman_panas', 'minuman_dingin', 'makanan', 'camilan']),
      divisi: divisiEnum,
      harga: z.number().min(0),
      resep: z.array(z.object({ bahanId: z.string(), qty: z.number().positive() })),
    })
  ),
  suppliers: z.array(
    z.object({
      id: z.string(),
      nama: z.string(),
      kontak: z.string(),
      kategori: z.string(),
    })
  ),
  stockMovements: z.array(z.any()),
  laporanStok: z.array(z.any()),
  rekapOmzet: z.array(z.any()),
  laporanKosong: z.array(z.any()),
  returs: z.array(z.any()),
  purchaseOrders: z.array(z.any()),
  qcLogs: z.array(z.any()),
  keluhan: z.array(z.any()),
  activityLogs: z.array(z.any()),
});
