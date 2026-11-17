'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  ChevronDown,
  ClipboardCheck,
  Coffee,
  CookingPot,
  FileText,
  History,
  LayoutDashboard,
  Menu as MenuIcon,
  Package,
  Settings,
  ShieldCheck,
  Truck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useBreakfreeStore } from '@/lib/store/useBreakfreeStore';
import { getRoleMeta, ROLES } from '@/lib/role-routes';
import { detectActiveShiftId, evaluasiStatusStok, hitungStokSaatIni, todayISO, formatTanggal } from '@/lib/domain/calculations';
import { Badge } from '@/components/ui/primitives';
import { LaporKosongModal } from '@/components/modals/LaporKosongModal';
import type { RoleId } from '@/lib/types';

interface NavEntry {
  label: string;
  href?: string;
  onClick?: () => void;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  count?: number;
  tone?: 'danger' | 'warning';
}

export function AppShell({
  pageTitle,
  children,
}: {
  pageTitle: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const isInitialized = useBreakfreeStore((s) => s.isInitialized);
  const activeRole = useBreakfreeStore((s) => s.activeRole);
  const activePetugasId = useBreakfreeStore((s) => s.activePetugasId);
  const pegawai = useBreakfreeStore((s) => s.pegawai);
  const shifts = useBreakfreeStore((s) => s.shifts);
  const settings = useBreakfreeStore((s) => s.settings);
  const setActiveRole = useBreakfreeStore((s) => s.setActiveRole);
  const setActivePetugasId = useBreakfreeStore((s) => s.setActivePetugasId);

  const laporanKosong = useBreakfreeStore((s) => s.laporanKosong);
  const laporanStok = useBreakfreeStore((s) => s.laporanStok);
  const purchaseOrders = useBreakfreeStore((s) => s.purchaseOrders);
  const bahan = useBreakfreeStore((s) => s.bahan);
  const stockMovements = useBreakfreeStore((s) => s.stockMovements);
  const qcLogs = useBreakfreeStore((s) => s.qcLogs);
  const keluhan = useBreakfreeStore((s) => s.keluhan);

  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [kosongModalDivisi, setKosongModalDivisi] = useState<'barista' | 'kitchen' | null>(null);

  const roleMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Redirect uninitialized app to /setup
  useEffect(() => {
    if (!isInitialized && pathname !== '/setup') {
      router.replace('/setup');
    }
  }, [isInitialized, pathname, router]);

  // Close popovers on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) {
        setRoleMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const roleMeta = getRoleMeta(activeRole);
  const activeShiftId = detectActiveShiftId(shifts);
  const activeShift = shifts.find((s) => s.id === activeShiftId);
  const activePetugas = pegawai.find((p) => p.id === activePetugasId);

  // Real-time counts from localStorage store
  const activeKosongCount = laporanKosong.filter(
    (l) => l.status === 'aktif' || l.status === 'dikonfirmasi'
  ).length;
  const pendingVerifCount = laporanStok.filter((l) => l.status === 'terkirim').length;
  const pendingPOCount = purchaseOrders.filter((p) => p.status === 'diajukan').length;
  const kritisCount = useMemo(() => {
    return bahan.filter((b) => {
      const lvl = evaluasiStatusStok(hitungStokSaatIni(b.id, stockMovements), b.stokMinimum);
      return lvl === 'kritis' || lvl === 'habis';
    }).length;
  }, [bahan, stockMovements]);

  const openKeluhanCount = keluhan.filter((k) => k.status !== 'selesai').length;
  const totalNotifCount = activeKosongCount + pendingVerifCount + pendingPOCount + kritisCount;

  const navItems: NavEntry[] = useMemo(() => {
    switch (activeRole) {
      case 'kasir':
        return [
          { label: 'Dashboard Kasir', href: '/kasir', icon: LayoutDashboard },
          { label: 'Rekap Omzet Shift', href: '/kasir/omzet', icon: Wallet },
          {
            label: 'Menu Kosong & Riwayat',
            href: '/kasir/kosong',
            icon: AlertTriangle,
            count: activeKosongCount || undefined,
            tone: 'danger',
          },
        ];
      case 'barista':
        return [
          { label: 'Dashboard & Stok Barista', href: '/barista', icon: Coffee },
          { label: 'Rekap Stok & Waste', href: '/barista/rekap', icon: ClipboardCheck },
          {
            label: 'Lapor Bahan Kosong',
            onClick: () => setKosongModalDivisi('barista'),
            icon: AlertTriangle,
          },
          { label: 'Riwayat Laporan', href: '/barista/riwayat', icon: History },
        ];
      case 'kitchen':
        return [
          { label: 'Dashboard & Stok Kitchen', href: '/kitchen', icon: CookingPot },
          { label: 'Rekap Stok & Waste', href: '/kitchen/rekap', icon: ClipboardCheck },
          {
            label: 'Lapor Bahan Kosong',
            onClick: () => setKosongModalDivisi('kitchen'),
            icon: AlertTriangle,
          },
          { label: 'Riwayat Laporan', href: '/kitchen/riwayat', icon: History },
        ];
      case 'kapten':
        return [
          {
            label: 'Monitoring, QC & Keluhan',
            href: '/kapten',
            icon: ShieldCheck,
            count: openKeluhanCount || qcLogs.length ? openKeluhanCount : undefined,
            tone: 'warning',
          },
          {
            label: 'Stok Kritis Outlet',
            href: '/kapten/stok-kritis',
            icon: AlertTriangle,
            count: kritisCount || undefined,
            tone: 'danger',
          },
        ];
      case 'logistik':
        return [
          {
            label: 'Verifikasi & Retur H+1',
            href: '/logistik',
            icon: Truck,
            count: pendingVerifCount || undefined,
            tone: 'warning',
          },
          { label: 'Purchase Order & Kartu Stok', href: '/logistik/po', icon: FileText },
          { label: 'Master Bahan & Menu', href: '/master', icon: Package },
          { label: 'Laporan Terintegrasi', href: '/dashboard', icon: BarChart3 },
        ];
      case 'manajemen':
      default:
        return [
          { label: 'Dashboard & Laporan', href: '/dashboard', icon: BarChart3 },
          {
            label: 'Persetujuan PO',
            href: '/logistik/po',
            icon: FileText,
            count: pendingPOCount || undefined,
            tone: 'warning',
          },
          { label: 'Master Bahan & Menu', href: '/master', icon: Package },
          { label: 'Master Pegawai & Shift', href: '/pengaturan', icon: Users },
        ];
    }
  }, [
    activeRole,
    activeKosongCount,
    pendingVerifCount,
    pendingPOCount,
    kritisCount,
    openKeluhanCount,
    qcLogs.length,
  ]);

  const handleSelectRole = (nextRole: RoleId, homeHref: string) => {
    setActiveRole(nextRole);
    setRoleMenuOpen(false);
    setMobileDrawerOpen(false);
    router.push(homeHref);
  };

  const renderNavLink = (item: NavEntry) => {
    const isActive = item.href ? pathname === item.href : false;
    const Icon = item.icon;
    const cls = `flex h-10 w-full items-center gap-2.5 rounded-[10px] px-3 text-left text-sm transition-colors duration-150 ${
      isActive
        ? 'bg-[#F4E8DD] font-semibold text-[#9C5B2E]'
        : 'font-medium text-[#3D342C] hover:bg-[#EAE3D9]'
    }`;

    const inner = (
      <>
        <Icon
          className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-[#9C5B2E]' : 'text-[#8A7F73]'}`}
          strokeWidth={1.75}
        />
        <span className="flex-1 truncate">{item.label}</span>
        {item.count != null && item.count > 0 && (
          <span
            className={`tabular-mono inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
              item.tone === 'danger'
                ? 'bg-[#F8E3E0] text-[#B23A2E]'
                : 'bg-[#FBF0DC] text-[#A86A12]'
            }`}
          >
            {item.count}
          </span>
        )}
      </>
    );

    if (item.onClick) {
      return (
        <button
          key={item.label}
          type="button"
          onClick={() => {
            item.onClick?.();
            setMobileDrawerOpen(false);
          }}
          className={cls}
        >
          {inner}
        </button>
      );
    }

    return (
      <Link
        key={item.label}
        href={item.href!}
        onClick={() => setMobileDrawerOpen(false)}
        className={cls}
      >
        {inner}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#FAF8F5] text-[#3D342C]">
      {/* Desktop Sidebar (240px) */}
      <aside className="no-print hidden w-[240px] shrink-0 flex-col justify-between border-r border-[#E6E0D8] bg-[#F3EFE9] px-4 py-5 lg:flex">
        <div className="flex flex-col gap-5">
          <Link href={roleMeta.homeHref} className="flex items-center gap-2.5 px-1">
            <img
              src="/images/breakfree-logo.png"
              alt="Logo Breakfree Coffee"
              className="h-9 w-9 rounded-full object-cover"
            />
            <div className="min-w-0">
              <div className="truncate text-[15px] font-bold text-[#221C17]">Breakfree Coffee</div>
              <div className="truncate text-[11px] font-medium text-[#8A7F73]">
                Operasional Outlet
              </div>
            </div>
          </Link>

          <nav className="flex flex-col gap-1" aria-label="Navigasi utama">
            {navItems.map(renderNavLink)}
          </nav>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="flex flex-col gap-1 rounded-[10px] border border-[#E6E0D8] bg-white p-3">
            <div className="text-xs font-bold text-[#221C17]">{settings.outletNama}</div>
            <div className="truncate text-[11px] text-[#8A7F73]">{settings.outletAlamat}</div>
            <div className="mt-1 flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wide text-[#8A7F73]">
                Petugas Aktif
              </label>
              <select
                value={activePetugasId}
                onChange={(e) => setActivePetugasId(e.target.value)}
                aria-label="Pilih petugas aktif"
                className="h-7 rounded-[6px] border border-[#E6E0D8] bg-[#FAF8F5] px-2 text-xs font-semibold text-[#9C5B2E] focus:border-[#9C5B2E] focus:outline-none"
              >
                {pegawai
                  .filter((p) => p.aktif)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama} ({p.posisi})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <Link
            href="/pengaturan"
            className={`flex h-10 items-center gap-2.5 rounded-[10px] px-3 text-sm transition-colors ${
              pathname === '/pengaturan'
                ? 'bg-[#F4E8DD] font-semibold text-[#9C5B2E]'
                : 'font-medium text-[#3D342C] hover:bg-[#EAE3D9]'
            }`}
          >
            <Settings
              className={`h-[18px] w-[18px] ${
                pathname === '/pengaturan' ? 'text-[#9C5B2E]' : 'text-[#8A7F73]'
              }`}
              strokeWidth={1.75}
            />
            <span>Pengaturan Data</span>
          </Link>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-50 flex bg-[#221C17]/35 lg:hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMobileDrawerOpen(false);
          }}
        >
          <div className="flex w-[260px] flex-col justify-between bg-[#F3EFE9] px-4 py-5">
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#221C17]">Breakfree Coffee</span>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="rounded p-1 text-[#8A7F73]"
                  aria-label="Tutup menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex flex-col gap-1">{navItems.map(renderNavLink)}</nav>
            </div>
            <Link
              href="/pengaturan"
              onClick={() => setMobileDrawerOpen(false)}
              className="flex h-10 items-center gap-2.5 rounded-[10px] px-3 text-sm font-medium text-[#3D342C] hover:bg-[#EAE3D9]"
            >
              <Settings className="h-[18px] w-[18px] text-[#8A7F73]" strokeWidth={1.75} />
              <span>Pengaturan Data</span>
            </Link>
          </div>
        </div>
      )}

      {/* Right Workspace Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar (64px) */}
        <header className="no-print sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-[#E6E0D8] bg-white px-4 lg:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#E6E0D8] text-[#3D342C] lg:hidden"
              aria-label="Buka menu navigasi"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-[#221C17] sm:text-lg">{pageTitle}</h1>
              <p className="tabular-mono truncate text-[11px] text-[#8A7F73] sm:text-xs">
                {formatTanggal(todayISO())}
                {activeShift ? ` · ${activeShift.nama} (${activeShift.jamMulai}–${activeShift.jamSelesai})` : ''}
                {activePetugas ? ` · ${activePetugas.nama}` : ''}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            {/* Role Switcher Dropdown (Tanpa Login) */}
            <div ref={roleMenuRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setRoleMenuOpen((v) => !v);
                  setNotifOpen(false);
                }}
                className="flex h-9 items-center gap-2 rounded-full border border-[#E6E0D8] bg-white pl-2.5 pr-3 text-[13px] font-semibold text-[#221C17] transition hover:border-[#D4CBBF] hover:bg-[#FBF9F6]"
                aria-expanded={roleMenuOpen}
                aria-label="Pilih role workspace"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: roleMeta.dotColor }}
                />
                <span className="hidden sm:inline text-[#8A7F73] font-medium">Masuk sebagai:</span>
                <span>{roleMeta.label}</span>
                <ChevronDown className="h-3.5 w-3.5 text-[#8A7F73]" />
              </button>

              {roleMenuOpen && (
                <div className="absolute right-0 mt-2 w-[280px] rounded-[14px] border border-[#D4CBBF] bg-white p-2.5 shadow-[0_8px_24px_-8px_rgba(61,52,44,0.18)]">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8A7F73]">
                    Pilih Role Workspace (Tanpa Login)
                  </div>
                  <div className="mt-1 flex flex-col gap-1">
                    {ROLES.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleSelectRole(r.id, r.homeHref)}
                        className={`flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left transition ${
                          activeRole === r.id
                            ? 'bg-[#F4E8DD]'
                            : 'hover:bg-[#FBF9F6]'
                        }`}
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: r.dotColor }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-bold text-[#221C17]">{r.label}</div>
                          <div className="truncate text-[11px] text-[#8A7F73]">{r.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="mt-1.5 border-t border-[#E6E0D8] pt-1.5">
                    <Link
                      href="/setup"
                      onClick={() => setRoleMenuOpen(false)}
                      className="flex items-center gap-2 rounded-[10px] px-2.5 py-2 text-xs font-semibold text-[#8A7F73] hover:bg-[#F3EFE9] hover:text-[#221C17]"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      <span>Buka Setup Wizard / Master Data</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Notification Bell Dropdown */}
            <div ref={notifRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((v) => !v);
                  setRoleMenuOpen(false);
                }}
                className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[#E6E0D8] bg-white text-[#3D342C] hover:bg-[#FBF9F6]"
                aria-label="Notifikasi operasional"
              >
                <Bell
                  className={`h-4 w-4 ${totalNotifCount > 0 ? 'text-[#B23A2E]' : 'text-[#3D342C]'}`}
                  strokeWidth={1.75}
                />
                {totalNotifCount > 0 && (
                  <span className="tabular-mono absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#B23A2E] px-1 text-[10px] font-bold text-white">
                    {totalNotifCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-[340px] rounded-[14px] border border-[#D4CBBF] bg-white p-4 shadow-[0_8px_24px_-8px_rgba(61,52,44,0.18)]">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-bold text-[#221C17]">Notifikasi Operasional</span>
                    <Badge tone={totalNotifCount > 0 ? 'danger' : 'success'}>
                      {totalNotifCount} Aktif
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-2">
                    {totalNotifCount === 0 ? (
                      <p className="py-3 text-center text-xs text-[#8A7F73]">
                        Semua laporan, stok kritis, dan PO sudah terkendali.
                      </p>
                    ) : (
                      <>
                        {activeKosongCount > 0 && (
                          <Link
                            href="/kasir/kosong"
                            onClick={() => {
                              setActiveRole('kasir');
                              setNotifOpen(false);
                            }}
                            className="rounded-[10px] border border-[#E5B8B3] bg-[#F8E3E0] p-2.5 text-left"
                          >
                            <div className="text-xs font-bold text-[#B23A2E]">
                              {activeKosongCount} Bahan/Menu Kosong Aktif
                            </div>
                            <div className="text-[11px] text-[#3D342C]">
                              Buka layar Kasir untuk konfirmasi ke pelanggan
                            </div>
                          </Link>
                        )}
                        {pendingVerifCount > 0 && (
                          <Link
                            href="/logistik"
                            onClick={() => {
                              setActiveRole('logistik');
                              setNotifOpen(false);
                            }}
                            className="rounded-[10px] border border-[#E6E0D8] bg-[#FBF0DC] p-2.5 text-left"
                          >
                            <div className="text-xs font-bold text-[#A86A12]">
                              {pendingVerifCount} Laporan Stok Menunggu Verifikasi
                            </div>
                            <div className="text-[11px] text-[#3D342C]">
                              Buka Inbox Logistik untuk verifikasi & buat retur
                            </div>
                          </Link>
                        )}
                        {pendingPOCount > 0 && (
                          <Link
                            href="/logistik/po"
                            onClick={() => {
                              setActiveRole('manajemen');
                              setNotifOpen(false);
                            }}
                            className="rounded-[10px] border border-[#E6E0D8] bg-[#E3EEF5] p-2.5 text-left"
                          >
                            <div className="text-xs font-bold text-[#3B6C8F]">
                              {pendingPOCount} Purchase Order Menunggu Persetujuan
                            </div>
                            <div className="text-[11px] text-[#3D342C]">
                              Review & setujui PO dari Manajemen
                            </div>
                          </Link>
                        )}
                        {kritisCount > 0 && (
                          <Link
                            href="/kapten/stok-kritis"
                            onClick={() => {
                              setActiveRole('kapten');
                              setNotifOpen(false);
                            }}
                            className="rounded-[10px] border border-[#E6E0D8] bg-[#FBF9F6] p-2.5 text-left"
                          >
                            <div className="text-xs font-bold text-[#B23A2E]">
                              {kritisCount} Bahan Mencapai Batas Stok Kritis
                            </div>
                            <div className="text-[11px] text-[#3D342C]">
                              Pantau bahan kritis lintas Barista & Kitchen
                            </div>
                          </Link>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area (max-w-7xl, generous padding) */}
        <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-5 p-4 pb-24 lg:p-7 lg:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav (< 768px / < lg per DESIGN.md max 4 items) */}
      <nav
        className="no-print fixed bottom-0 left-0 right-0 z-30 flex h-[68px] items-center justify-around border-t border-[#E6E0D8] bg-white px-2 lg:hidden"
        aria-label="Navigasi mobile"
      >
        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const active = item.href ? pathname === item.href : false;
          if (item.onClick) {
            return (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className="flex min-w-[72px] flex-col items-center justify-center gap-0.5 rounded-[10px] px-2 py-1.5 text-[11px] font-medium text-[#8A7F73]"
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                <span className="max-w-[72px] truncate">{item.label.split(' ')[0]}</span>
              </button>
            );
          }
          return (
            <Link
              key={item.label}
              href={item.href!}
              className={`flex min-w-[72px] flex-col items-center justify-center gap-0.5 rounded-[10px] px-2 py-1.5 text-[11px] ${
                active ? 'bg-[#F4E8DD] font-bold text-[#9C5B2E]' : 'font-medium text-[#8A7F73]'
              }`}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
              <span className="max-w-[72px] truncate">{item.label.split(' ')[0]}</span>
            </Link>
          );
        })}
      </nav>

      {/* Lapor Bahan Kosong Modal triggered from Barista / Kitchen sidebar */}
      {kosongModalDivisi && (
        <LaporKosongModal
          open={true}
          onClose={() => setKosongModalDivisi(null)}
          divisi={kosongModalDivisi}
        />
      )}
    </div>
  );
}
