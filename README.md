# Breakfree Coffee — Sistem Informasi Operasional

Aplikasi web frontend-only berbasis **Next.js (App Router + TypeScript + Tailwind CSS)** untuk pengelolaan operasional harian **Breakfree Coffee Lowokwaru**. Seluruh data tersimpan secara lokal di browser (`localStorage` pada key `breakfree-si:v1`) tanpa memerlukan database atau backend.

## Fitur Utama

- **Tanpa Login & Multi-Role Switcher**: Berpindah peran langsung melalui Topbar (`Manajemen`, `Kasir`, `Barista`, `Kitchen`, `Kapten Outlet`, `Logistik`) serta pilihan petugas aktif.
- **Tanpa Data Mock Transaksi**: Halaman `/setup` memungkinkan pengisian **Master Data Awal Breakfree** (bahan baku, menu & resep, supplier, 3 shift, pegawai) dengan 0 transaksi awal, **Mulai dari Kosong**, atau **Impor JSON**.
- **Kasir (`/kasir`, `/kasir/omzet`, `/kasir/kosong`)**: Rekap omzet per shift (Cash + QRIS), validator selisih terhadap POS Pawoon, konfirmasi menu terdampak bahan kosong, serta riwayat omzet.
- **Barista & Kitchen (`/barista/*`, `/kitchen/*`)**: Form stok opname Opening/Closing dengan stepper cepat, pelaporan waste (basi/kedaluwarsa/rusak), dan tombol cepat lapor bahan kosong.
- **Kapten Outlet (`/kapten`, `/kapten/stok-kritis`)**: Matrix kepatuhan laporan per shift, log Quality Control (QC ulang), eskalasi keluhan pelanggan, dan monitor stok kritis lintas divisi.
- **Logistik & Pembelian (`/logistik`, `/logistik/po`)**: Verifikasi laporan stok divisi, pelacak Retur BOP H+1, rekomendasi Purchase Order otomatis (termasuk mode **Pakem Akhir Pekan**), penerimaan barang PO, dan **Kartu Stok** real-time.
- **Master Data & Pengaturan (`/master`, `/pengaturan`)**: CRUD Bahan Baku, Menu & Resep, Supplier, Master Shift, Pegawai, parameter pakem & toleransi, Ekspor/Impor backup JSON, Reset data lokal, serta Log Aktivitas.

## Menjalankan Secara Lokal

```bash
npm install
npm run dev
```

Buka `http://localhost:3000` di browser.

## Deploy ke GitHub Pages

Workflow GitHub Actions akan otomatis membangun dan menerbitkan aplikasi ke GitHub Pages saat ada push ke branch `main` (atau bisa dijalankan manual dari tab **Actions**).

1. Di repository GitHub, buka **Settings → Pages**.
2. Pada **Build and deployment → Source**, pilih **GitHub Actions**.
3. Setelah workflow selesai, buka URL Pages repository: `https://alifarda126.github.io/BreakFree_Coffee/`.

Build static menghasilkan folder `out`. Karena aplikasi ini berjalan sepenuhnya di browser, data tetap tersimpan di `localStorage` browser/perangkat masing-masing dan tidak tersinkron antar pengguna.
