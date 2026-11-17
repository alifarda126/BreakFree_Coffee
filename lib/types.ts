export type RoleId =
  | 'kasir'
  | 'barista'
  | 'kitchen'
  | 'kapten'
  | 'logistik'
  | 'manajemen';

export type PegawaiPosisi = RoleId | 'waiter';

export type Divisi = 'barista' | 'kitchen';
export type DivisiBahan = Divisi | 'bersama';
export type SumberBahan = 'internal' | 'eksternal';
export type SesiShift = 'opening' | 'closing';

export interface Pegawai {
  id: string;
  nama: string;
  posisi: PegawaiPosisi;
  aktif: boolean;
}

export interface Shift {
  id: string;
  nama: string;
  jamMulai: string; // HH:mm
  jamSelesai: string; // HH:mm
}

export interface Bahan {
  id: string;
  nama: string;
  kategori: string;
  satuan: string;
  divisi: DivisiBahan;
  sumber: SumberBahan;
  stokMinimum: number;
  hargaSatuan: number;
  perishable: boolean;
}

export interface ResepItem {
  bahanId: string;
  qty: number;
}

export interface Menu {
  id: string;
  nama: string;
  kategori: 'minuman_panas' | 'minuman_dingin' | 'makanan' | 'camilan';
  divisi: Divisi;
  harga: number;
  resep: ResepItem[];
}

export interface Supplier {
  id: string;
  nama: string;
  kontak: string;
  kategori: string;
}

export type StockMovementType =
  | 'INITIAL'
  | 'OPNAME_ADJUST'
  | 'WASTE'
  | 'RETUR_OUT'
  | 'PO_RECEIVE'
  | 'MANUAL_ADJUST';

export interface StockMovement {
  id: string;
  bahanId: string;
  tipe: StockMovementType;
  qty: number; // + masuk, - keluar
  refType: string;
  refId: string;
  catatan?: string;
  createdAt: string;
  oleh: string;
}

export interface LaporanStokItem {
  bahanId: string;
  stokSistem: number;
  stokFisik: number;
  selisih: number;
  catatan: string;
}

export type AlasanWaste =
  | 'Basi / Berubah Warna'
  | 'Kedaluwarsa'
  | 'Rusak / Tumpah'
  | 'Gagal Produksi'
  | 'Stok Mengendap';

export interface WasteItem {
  id: string;
  bahanId: string;
  qty: number;
  alasan: AlasanWaste;
  nilai: number;
  catatan: string;
  returId?: string;
}

export type StatusLaporanStok =
  | 'draft'
  | 'terkirim'
  | 'diverifikasi'
  | 'dikembalikan';

export interface LaporanStok {
  id: string;
  tanggal: string; // YYYY-MM-DD
  shiftId: string;
  sesi: SesiShift;
  divisi: Divisi;
  petugasId: string;
  items: LaporanStokItem[];
  waste: WasteItem[];
  status: StatusLaporanStok;
  catatanVerifikasi?: string;
  createdAt: string;
  submittedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

export type StatusRekapOmzet =
  | 'draft'
  | 'perlu_cek'
  | 'terkirim'
  | 'revisi';

export interface RekapOmzet {
  id: string;
  tanggal: string; // YYYY-MM-DD
  shiftId: string;
  petugasId: string;
  cash: number;
  qris: number;
  jumlahTransaksi: number;
  totalPOS: number;
  selisih: number;
  alasanSelisih?: string;
  catatan?: string;
  status: StatusRekapOmzet;
  versi: number;
  createdAt: string;
  submittedAt?: string;
}

export type StatusLaporanKosong =
  | 'aktif'
  | 'dikonfirmasi'
  | 'disampaikan'
  | 'tersedia_kembali';

export interface LaporanKosong {
  id: string;
  bahanId: string;
  menuTerdampak: string[]; // menu names
  divisi: Divisi;
  pelaporId: string;
  catatan?: string;
  status: StatusLaporanKosong;
  createdAt: string;
  updatedAt: string;
}

export type StatusRetur = 'diajukan' | 'ditarik' | 'pengganti_diterima';

export interface Retur {
  id: string;
  nomor: string;
  wasteItemIds: string[];
  ringkasanItem: { bahanId: string; qty: number; alasan: string }[];
  status: StatusRetur;
  tanggalPengganti: string; // H+1 YYYY-MM-DD (aturan BOP)
  poId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface POItem {
  bahanId: string;
  qty: number;
  harga: number;
  qtyDiterima: number;
}

export type StatusPO =
  | 'draft'
  | 'diajukan'
  | 'disetujui'
  | 'ditolak'
  | 'diterima_sebagian'
  | 'diterima'
  | 'dibatalkan';

export interface PurchaseOrder {
  id: string;
  nomor: string;
  tanggal: string; // YYYY-MM-DD
  supplierId: string;
  items: POItem[];
  total: number;
  status: StatusPO;
  returId?: string;
  disetujuiOleh?: string;
  catatan?: string;
  createdAt: string;
  updatedAt: string;
}

export type AlasanQC =
  | 'Rasa tidak sesuai SOP'
  | 'Suhu kurang panas/dingin'
  | 'Porsi / takaran kurang'
  | 'Tampilan / penyajian'
  | 'Salah pesanan / ukuran cup';

export interface QcLog {
  id: string;
  waktu: string;
  menuId: string;
  divisi: Divisi;
  alasan: AlasanQC;
  penanggungJawabId: string;
  durasiPerbaikanMenit: number;
  kaptenId: string;
  catatan?: string;
}

export type LevelKeluhan = 'karyawan' | 'kapten' | 'manajemen';
export type StatusKeluhan = 'terbuka' | 'eskalasi' | 'selesai';

export interface Keluhan {
  id: string;
  waktu: string;
  deskripsi: string;
  kategori: 'Waktu Tunggu' | 'Kualitas Produk' | 'Fasilitas Outlet' | 'Pelayanan';
  penanganId: string;
  level: LevelKeluhan;
  status: StatusKeluhan;
  penyelesaian?: string;
}

export interface ActivityLog {
  id: string;
  role: RoleId;
  petugasId: string;
  aksi: string;
  entitas: string;
  entitasId: string;
  createdAt: string;
}

export interface AppSettings {
  faktorAkhirPekan: number; // default 1.5 ("pakem" Sabtu-Minggu)
  toleransiSelisihOmzet: number; // default 0
  outletNama: string;
  outletAlamat: string;
}

export interface BreakfreeStateData {
  schemaVersion: number;
  isInitialized: boolean;
  activeRole: RoleId;
  activePetugasId: string;
  settings: AppSettings;
  pegawai: Pegawai[];
  shifts: Shift[];
  bahan: Bahan[];
  menu: Menu[];
  suppliers: Supplier[];
  stockMovements: StockMovement[];
  laporanStok: LaporanStok[];
  rekapOmzet: RekapOmzet[];
  laporanKosong: LaporanKosong[];
  returs: Retur[];
  purchaseOrders: PurchaseOrder[];
  qcLogs: QcLog[];
  keluhan: Keluhan[];
  activityLogs: ActivityLog[];
}
