import type {
  Bahan,
  LaporanStok,
  PurchaseOrder,
  Shift,
  StockMovement,
} from '@/lib/types';

export function formatRp(value: number): string {
  const abs = Math.round(Math.abs(value));
  const formatted = new Intl.NumberFormat('id-ID').format(abs);
  return value < 0 ? `-Rp ${formatted}` : `Rp ${formatted}`;
}

export function formatNumber(value: number, maxDecimals = 2): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(value);
}

export function formatQty(qty: number, satuan: string): string {
  return `${formatNumber(qty, 2)} ${satuan}`;
}

export function formatTanggal(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(d);
}

export function formatWaktu(isoStr: string): string {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return isoStr;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).format(d);
}

export function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysISO(dateISO: string, days: number): string {
  const d = new Date(`${dateISO}T00:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isWeekendISO(dateISO: string): boolean {
  const d = new Date(`${dateISO}T00:00:00`);
  const day = d.getDay(); // 0 = Sun, 6 = Sat
  return day === 0 || day === 6;
}

export function detectActiveShiftId(shifts: Shift[]): string {
  if (!shifts.length) return '';
  const hour = new Date().getHours();
  if (hour >= 8 && hour < 16) {
    return shifts.find((s) => s.jamMulai.startsWith('08'))?.id ?? shifts[0].id;
  }
  if (hour >= 16 && hour < 18) {
    return shifts.find((s) => s.jamMulai.startsWith('16'))?.id ?? shifts[0].id;
  }
  return shifts.find((s) => s.jamMulai.startsWith('18'))?.id ?? shifts[shifts.length - 1].id;
}

/** Aturan PRD §7: stokSaatIni(bahan) = Σ StockMovement.qty */
export function hitungStokSaatIni(bahanId: string, movements: StockMovement[]): number {
  let total = 0;
  for (const m of movements) {
    if (m.bahanId === bahanId) total += m.qty;
  }
  return Math.round(total * 1000) / 1000;
}

export type StatusStokLevel = 'aman' | 'menipis' | 'kritis' | 'habis';

export function evaluasiStatusStok(stok: number, stokMin: number): StatusStokLevel {
  if (stok <= 0) return 'habis';
  if (stok <= stokMin) return 'kritis';
  if (stok <= stokMin * 1.5) return 'menipis';
  return 'aman';
}

export function hitungSelisihOmzet(
  cash: number,
  qris: number,
  totalPOS: number,
  toleransi = 0
): { totalInput: number; selisih: number; valid: boolean } {
  const totalInput = cash + qris;
  const selisih = totalInput - totalPOS;
  return {
    totalInput,
    selisih,
    valid: Math.abs(selisih) <= toleransi && totalPOS > 0,
  };
}

/**
 * Rumus PRD §6.5 FR-L3:
 * rekomendasi = max(0, (stokMin * faktorHari) + rataWaste7Hari - stokSaatIni - qtyPOBerjalan)
 */
export function hitungRekomendasiBahan(
  bahan: Bahan,
  movements: StockMovement[],
  laporanStok: LaporanStok[],
  purchaseOrders: PurchaseOrder[],
  faktorAkhirPekan: number,
  gunakanPakemAkhirPekan: boolean
) {
  const stokSaatIni = hitungStokSaatIni(bahan.id, movements);
  const faktorHari = gunakanPakemAkhirPekan ? faktorAkhirPekan : 1;

  const sevenDaysAgo = addDaysISO(todayISO(), -7);
  let totalWaste7H = 0;
  for (const lap of laporanStok) {
    if (lap.tanggal >= sevenDaysAgo && lap.status === 'diverifikasi') {
      for (const w of lap.waste) {
        if (w.bahanId === bahan.id) totalWaste7H += w.qty;
      }
    }
  }
  const rataWaste7Hari = Math.round((totalWaste7H / 7) * 100) / 100;

  let qtyPOBerjalan = 0;
  for (const po of purchaseOrders) {
    if (po.status === 'diajukan' || po.status === 'disetujui' || po.status === 'diterima_sebagian') {
      for (const item of po.items) {
        if (item.bahanId === bahan.id) {
          qtyPOBerjalan += Math.max(0, item.qty - item.qtyDiterima);
        }
      }
    }
  }

  const targetStok = bahan.stokMinimum * faktorHari;
  const raw = targetStok + rataWaste7Hari - stokSaatIni - qtyPOBerjalan;
  const rekomendasiQty = raw > 0 ? Math.ceil(raw) : 0;

  return {
    bahan,
    stokSaatIni,
    targetStok,
    totalWaste7H,
    rataWaste7Hari,
    qtyPOBerjalan,
    rekomendasiQty,
    estimasiBiaya: rekomendasiQty * bahan.hargaSatuan,
    status: evaluasiStatusStok(stokSaatIni, bahan.stokMinimum),
  };
}

export function generateDocNomor(prefix: 'PO' | 'RTR', existingNumbers: string[], tanggalISO = todayISO()): string {
  const ymd = tanggalISO.replace(/-/g, '');
  const tag = `${prefix}-${ymd}-`;
  let maxSeq = 0;
  for (const num of existingNumbers) {
    if (num.startsWith(tag)) {
      const seq = Number.parseInt(num.slice(tag.length), 10);
      if (!Number.isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  }
  return `${tag}${String(maxSeq + 1).padStart(3, '0')}`;
}
