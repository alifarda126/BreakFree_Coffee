'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  Bell,
  Boxes,
  ChevronDown,
  ClipboardCheck,
  Coffee,
  CookingPot,
  FileCheck2,
  FileText,
  History,
  LayoutDashboard,
  Menu as MenuIcon,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  Settings,
  ShoppingCart,
  Trash2,
  Truck,
  Wallet,
  X,
} from 'lucide-react';
import { useBreakfreeStore } from '@/lib/store/useBreakfreeStore';
import { getRoleMeta, ROLES } from '@/lib/role-routes';
import {
  detectActiveShiftId,
  evaluasiStatusStok,
  hitungStokSaatIni,
  todayISO,
  formatTanggal,
} from '@/lib/domain/calculations';
import { Badge } from '@/components/ui/primitives';
import { PageHeader } from '@/components/layout/PageHeader';
import type { RoleId } from '@/lib/types';

interface NavEntry {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  count?: number;
  tone?: 'danger' | 'warning';
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || 'BF';
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

  const laporanStok = useBreakfreeStore((s) => s.laporanStok);
  const purchaseOrders = useBreakfreeStore((s) => s.purchaseOrders);
  const bahan = useBreakfreeStore((s) => s.bahan);
  const stockMovements = useBreakfreeStore((s) => s.stockMovements);

  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const roleMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isInitialized && pathname !== '/setup') {
      router.replace('/setup');
    }
  }, [isInitialized, pathname, router]);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) {
        setRoleMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setRoleMenuOpen(false);
        setNotifOpen(false);
        setMobileDrawerOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const roleMeta = getRoleMeta(activeRole);
  const activeShiftId = detectActiveShiftId(shifts);
  const activeShift = shifts.find((s) => s.id === activeShiftId);
  const activePetugas = pegawai.find((p) => p.id === activePetugasId);

  const pendingVerifCount = laporanStok.filter((l) => l.status === 'terkirim').length;
  const pendingPOCount = purchaseOrders.filter((p) => p.status === 'diajukan').length;
  const kritisCount = useMemo(() => {
    return bahan.filter((b) => {
      const lvl = evaluasiStatusStok(hitungStokSaatIni(b.id, stockMovements), b.stokMinimum);
      return lvl === 'kritis' || lvl === 'habis';
    }).length;
  }, [bahan, stockMovements]);

  const totalNotifCount = pendingVerifCount + pendingPOCount + kritisCount;

  const navItems: NavEntry[] = useMemo(() => {
    switch (activeRole) {
      case 'kasir':
        return [
          { label: 'Dashboard Kasir', href: '/kasir', icon: LayoutDashboard },
          { label: 'Input Rekap Omzet', href: '/kasir/omzet', icon: Wallet },
          { label: 'Riwayat Rekap Omzet', href: '/kasir/riwayat', icon: History },
        ];
      case 'barista':
        return [
          { label: 'Dashboard Barista', href: '/barista', icon: Coffee },
          { label: 'Rekap Stok & Waste', href: '/barista/rekap', icon: ClipboardCheck },
          { label: 'Riwayat Laporan', href: '/barista/riwayat', icon: History },
        ];
      case 'kitchen':
        return [
          { label: 'Dashboard Kitchen', href: '/kitchen', icon: CookingPot },
          { label: 'Rekap Stok & Waste', href: '/kitchen/rekap', icon: ClipboardCheck },
          { label: 'Riwayat Laporan', href: '/kitchen/riwayat', icon: History },
        ];
      case 'logistik':
        return [
          {
            label: 'Dashboard Logistik',
            href: '/logistik',
            icon: Truck,
            count: pendingVerifCount || undefined,
            tone: 'warning',
          },
          {
            label: 'Monitoring Persediaan',
            href: '/logistik/persediaan',
            icon: Boxes,
            count: kritisCount || undefined,
            tone: 'danger',
          },
          { label: 'Monitoring Spoil/Waste', href: '/logistik/waste', icon: Trash2 },
          { label: 'Pengajuan Purchase Order', href: '/logistik/po', icon: ShoppingCart },
          { label: 'Riwayat Pengadaan', href: '/logistik/riwayat', icon: FileText },
        ];
      case 'manajemen':
      default:
        return [
          { label: 'Dashboard & Laporan', href: '/dashboard', icon: BarChart3 },
          {
            label: 'Persetujuan PO',
            href: '/manajemen/po',
            icon: FileCheck2,
            count: pendingPOCount || undefined,
            tone: 'warning',
          },
          { label: 'Laporan Penjualan', href: '/manajemen/penjualan', icon: ReceiptText },
          { label: 'Laporan Persediaan & Waste', href: '/manajemen/persediaan', icon: Package },
        ];
    }
  }, [activeRole, pendingVerifCount, pendingPOCount, kritisCount]);

  const showAdminLinks = activeRole === 'manajemen' || activeRole === 'logistik';

  const handleSelectRole = (nextRole: RoleId, homeHref: string) => {
    setActiveRole(nextRole);
    setRoleMenuOpen(false);
    setMobileDrawerOpen(false);
    router.push(homeHref);
  };

  const renderNavLink = (item: NavEntry, collapsed = false) => {
    const isActive = pathname === item.href;
    const Icon = item.icon;
    const cls = `group relative flex h-10 w-full items-center rounded-lg text-left text-[13.5px] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[#111111] ${
      collapsed ? 'justify-center px-0' : 'gap-2.5 px-3'
    } ${
      isActive
        ? 'bg-[#F5F5F5] font-semibold text-[#111111]'
        : 'font-medium text-[#525252] hover:bg-[#FAFAFA] hover:text-[#111111]'
    }`;

    return (
      <Link
        key={item.href}
        href={item.href}
        title={collapsed ? item.label : undefined}
        onClick={() => setMobileDrawerOpen(false)}
        className={cls}
      >
        {isActive && !collapsed && (
          <span
            className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[#111111]"
            aria-hidden="true"
          />
        )}
        <Icon
          className={`h-[18px] w-[18px] shrink-0 transition-colors ${
            isActive ? 'text-[#111111]' : 'text-[#737373] group-hover:text-[#111111]'
          }`}
          strokeWidth={1.75}
          aria-hidden="true"
        />
        {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
        {!collapsed && item.count != null && item.count > 0 && (
          <span
            className={`tabular-mono text-[12px] font-semibold ${
              item.tone === 'danger' ? 'text-[#DC2626]' : 'text-[#737373]'
            }`}
          >
            {item.count}
          </span>
        )}
        {collapsed && item.count != null && item.count > 0 && (
          <span
            className={`absolute right-1.5 top-1.5 h-2 w-2 rounded-full ${
              item.tone === 'danger' ? 'bg-[#DC2626]' : 'bg-[#111111]'
            }`}
            aria-hidden="true"
          />
        )}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen bg-white text-[#111111]">
      {/* Desktop Sidebar */}
      <aside
        className={`no-print sticky top-0 hidden h-screen shrink-0 flex-col justify-between border-r border-[#E5E5E5] bg-white transition-[width] duration-200 lg:flex ${
          sidebarCollapsed ? 'w-[76px] px-3 py-4' : 'w-[256px] px-4 py-5'
        }`}
      >
        <div className="flex flex-col gap-5">
          {/* Brand + Collapse Toggle */}
          <div className={`flex items-center ${sidebarCollapsed ? 'flex-col gap-3' : 'justify-between gap-2'}`}>
            <Link
              href={roleMeta.homeHref}
              className={`flex min-w-0 items-center gap-2.5 ${sidebarCollapsed ? 'justify-center' : 'px-1'}`}
              title="Breakfree Coffee SI"
            >
              <img
                src={`${process.env.NEXT_PUBLIC_BASE_PATH}/images/breakfree-logo.png`}
                alt="Logo Breakfree Coffee"
                width={36}
                height={36}
                className="h-9 w-9 shrink-0 rounded-lg border border-[#E5E5E5] object-cover"
              />
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-bold leading-[1.3] tracking-[-0.01em] text-[#111111]">
                    Breakfree Coffee SI
                  </div>
                  <div className="truncate text-[12px] font-normal leading-[1.4] text-[#737373]">
                    Operasional &amp; Logistik
                  </div>
                </div>
              )}
            </Link>

            <button
              type="button"
              onClick={() => setSidebarCollapsed((v) => !v)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#737373] transition hover:bg-[#F5F5F5] hover:text-[#111111] focus-visible:outline-2 focus-visible:outline-[#111111]"
              aria-label={sidebarCollapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
              title={sidebarCollapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              ) : (
                <PanelLeftClose className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              )}
            </button>
          </div>

          {/* Role-Scoped Navigation Group */}
          <div className="flex flex-col gap-1">
            {!sidebarCollapsed && (
              <span className="px-3 pb-1 text-[11px] font-medium text-[#737373]">
                Menu {roleMeta.label}
              </span>
            )}
            <nav className="flex flex-col gap-1" aria-label="Navigasi utama">
              {navItems.map((item) => renderNavLink(item, sidebarCollapsed))}
            </nav>
          </div>
        </div>

        {/* Sidebar Bottom: User Profile + Admin Settings */}
        <div className="flex flex-col gap-2 border-t border-[#E5E5E5] pt-3">
          {!sidebarCollapsed ? (
            <div className="flex flex-col gap-2.5 rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] p-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#111111] text-xs font-semibold text-white">
                  {getInitials(activePetugas?.nama ?? roleMeta.label)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-[#111111]">
                    {activePetugas?.nama ?? settings.outletNama}
                  </div>
                  <div className="truncate text-[12px] font-normal text-[#737373]">
                    {roleMeta.label}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="sidebar-petugas-select" className="text-[12px] font-normal text-[#737373]">
                  Petugas Aktif
                </label>
                <select
                  id="sidebar-petugas-select"
                  value={activePetugasId}
                  onChange={(e) => setActivePetugasId(e.target.value)}
                  aria-label="Pilih petugas aktif"
                  className="h-8 rounded-md border border-[#E5E5E5] bg-white px-2 text-[13px] font-normal text-[#111111] transition focus:border-[#111111] focus:outline-none focus:ring-2 focus:ring-[#111111]/10"
                >
                  {pegawai
                    .filter((p) => p.aktif && p.posisi !== 'kapten')
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nama} ({p.posisi})
                      </option>
                    ))}
                </select>
              </div>
            </div>
          ) : (
            <div
              className="mx-auto flex h-9 w-9 items-center justify-center rounded-md bg-[#111111] text-xs font-semibold text-white"
              title={`${activePetugas?.nama ?? roleMeta.label} (${roleMeta.label})`}
            >
              {getInitials(activePetugas?.nama ?? roleMeta.label)}
            </div>
          )}

          {showAdminLinks && (
            <div className="flex flex-col gap-1">
              <Link
                href="/master"
                title={sidebarCollapsed ? 'Master Bahan & Supplier' : undefined}
                className={`flex h-9 items-center rounded-lg text-[13px] transition-colors ${
                  sidebarCollapsed ? 'justify-center px-0' : 'gap-2.5 px-3'
                } ${
                  pathname === '/master'
                    ? 'bg-[#F5F5F5] font-semibold text-[#111111]'
                    : 'font-medium text-[#525252] hover:bg-[#FAFAFA] hover:text-[#111111]'
                }`}
              >
                <Package
                  className={`h-[17px] w-[17px] shrink-0 ${
                    pathname === '/master' ? 'text-[#111111]' : 'text-[#737373]'
                  }`}
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                {!sidebarCollapsed && <span className="truncate">Master Bahan &amp; Supplier</span>}
              </Link>
              <Link
                href="/pengaturan"
                title={sidebarCollapsed ? 'Pengaturan & Pegawai' : undefined}
                className={`flex h-9 items-center rounded-lg text-[13px] transition-colors ${
                  sidebarCollapsed ? 'justify-center px-0' : 'gap-2.5 px-3'
                } ${
                  pathname === '/pengaturan'
                    ? 'bg-[#F5F5F5] font-semibold text-[#111111]'
                    : 'font-medium text-[#525252] hover:bg-[#FAFAFA] hover:text-[#111111]'
                }`}
              >
                <Settings
                  className={`h-[17px] w-[17px] shrink-0 ${
                    pathname === '/pengaturan' ? 'text-[#111111]' : 'text-[#737373]'
                  }`}
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                {!sidebarCollapsed && <span className="truncate">Pengaturan &amp; Pegawai</span>}
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-50 flex bg-[#111111]/40 lg:hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMobileDrawerOpen(false);
          }}
        >
          <div className="flex w-[276px] flex-col justify-between bg-white px-4 py-5 shadow-[0_20px_40px_-12px_rgba(17,17,17,0.2)]">
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-4">
                <div className="flex items-center gap-2.5">
                  <img
                    src={`${process.env.NEXT_PUBLIC_BASE_PATH}/images/breakfree-logo.png`}
                    alt="Logo Breakfree Coffee"
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-lg border border-[#E5E5E5] object-cover"
                  />
                  <div>
                    <div className="text-sm font-bold text-[#111111]">Breakfree Coffee SI</div>
                    <div className="text-[11px] font-normal text-[#737373]">Operasional &amp; Logistik</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#737373] hover:bg-[#F5F5F5] hover:text-[#111111]"
                  aria-label="Tutup menu"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <nav className="flex flex-col gap-1" aria-label="Navigasi mobile drawer">
                {navItems.map((item) => renderNavLink(item, false))}
              </nav>
            </div>
            {showAdminLinks && (
              <div className="flex flex-col gap-1 border-t border-[#E5E5E5] pt-3">
                <Link
                  href="/master"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex h-10 items-center gap-2.5 rounded-lg px-3 text-[13px] font-medium text-[#525252] hover:bg-[#F5F5F5] hover:text-[#111111]"
                >
                  <Package className="h-[18px] w-[18px] text-[#737373]" strokeWidth={1.75} aria-hidden="true" />
                  <span>Master Bahan &amp; Supplier</span>
                </Link>
                <Link
                  href="/pengaturan"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex h-10 items-center gap-2.5 rounded-lg px-3 text-[13px] font-medium text-[#525252] hover:bg-[#F5F5F5] hover:text-[#111111]"
                >
                  <Settings className="h-[18px] w-[18px] text-[#737373]" strokeWidth={1.75} aria-hidden="true" />
                  <span>Pengaturan &amp; Pegawai</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Right Workspace Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Global Spacious Top Navbar & PageHeader */}
        <header className="no-print sticky top-0 z-30 flex shrink-0 items-center justify-between gap-4 border-b border-[#E5E5E5] bg-white px-4 pt-5 pb-4 sm:px-6 lg:px-8 lg:pt-6 lg:pb-5">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E5E5E5] bg-white text-[#111111] transition hover:bg-[#F5F5F5] lg:hidden"
              aria-label="Buka menu navigasi"
            >
              <MenuIcon className="h-5 w-5" aria-hidden="true" />
            </button>
            <PageHeader
              title={pageTitle}
              subtitle={`${formatTanggal(todayISO())}${
                activeShift ? ` · ${activeShift.nama} (${activeShift.jamMulai}-${activeShift.jamSelesai})` : ''
              }`}
            />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* Notification Bell Dropdown */}
            <div ref={notifRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((v) => !v);
                  setRoleMenuOpen(false);
                }}
                className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E5E5] bg-white text-[#525252] transition hover:bg-[#F5F5F5] hover:text-[#111111] focus-visible:outline-2 focus-visible:outline-[#111111]"
                aria-label="Notifikasi operasional"
                aria-expanded={notifOpen}
              >
                <Bell
                  className={`h-[18px] w-[18px] ${totalNotifCount > 0 ? 'text-[#111111]' : 'text-[#737373]'}`}
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                {totalNotifCount > 0 && (
                  <span className="tabular-mono absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#111111] px-1 text-[10px] font-semibold text-white">
                    {totalNotifCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-[340px] max-w-[calc(100vw-2rem)] rounded-lg border border-[#E5E5E5] bg-white p-4 shadow-[0_10px_28px_-8px_rgba(17,17,17,0.14)]">
                  <div className="mb-3 flex items-center justify-between border-b border-[#E5E5E5] pb-2.5">
                    <span className="text-[14px] font-semibold text-[#111111]">Notifikasi Operasional</span>
                    <Badge tone={totalNotifCount > 0 ? 'danger' : 'success'}>
                      {totalNotifCount} Aktif
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-2">
                    {totalNotifCount === 0 ? (
                      <p className="py-4 text-center text-[12px] font-normal text-[#737373]">
                        Semua laporan stok, persediaan, dan PO sudah terkendali.
                      </p>
                    ) : (
                      <>
                        {pendingVerifCount > 0 && (
                          <Link
                            href="/logistik"
                            onClick={() => {
                              setActiveRole('logistik');
                              setNotifOpen(false);
                            }}
                            className="rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] p-2.5 text-left transition hover:bg-[#F5F5F5]"
                          >
                            <div className="text-[13px] font-semibold text-[#111111]">
                              {pendingVerifCount} Laporan Stok Menunggu Verifikasi
                            </div>
                            <div className="mt-0.5 text-[12px] font-normal text-[#737373]">
                              Buka Dashboard Logistik untuk verifikasi laporan divisi
                            </div>
                          </Link>
                        )}
                        {pendingPOCount > 0 && (
                          <Link
                            href="/manajemen/po"
                            onClick={() => {
                              setActiveRole('manajemen');
                              setNotifOpen(false);
                            }}
                            className="rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] p-2.5 text-left transition hover:bg-[#F5F5F5]"
                          >
                            <div className="text-[13px] font-semibold text-[#111111]">
                              {pendingPOCount} Purchase Order Menunggu Persetujuan
                            </div>
                            <div className="mt-0.5 text-[12px] font-normal text-[#737373]">
                              Review &amp; proses persetujuan PO oleh Manajemen
                            </div>
                          </Link>
                        )}
                        {kritisCount > 0 && (
                          <Link
                            href="/logistik/persediaan"
                            onClick={() => {
                              setActiveRole('logistik');
                              setNotifOpen(false);
                            }}
                            className="rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] p-2.5 text-left transition hover:bg-[#F5F5F5]"
                          >
                            <div className="text-[13px] font-semibold text-[#DC2626]">
                              {kritisCount} Bahan Mencapai Batas Stok Kritis
                            </div>
                            <div className="mt-0.5 text-[12px] font-normal text-[#737373]">
                              Pantau persediaan &amp; ajukan PO restock di Logistik
                            </div>
                          </Link>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile & Role Switcher Dropdown */}
            <div ref={roleMenuRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setRoleMenuOpen((v) => !v);
                  setNotifOpen(false);
                }}
                className="flex h-9 items-center gap-2 rounded-lg border border-[#E5E5E5] bg-white pl-2 pr-2.5 text-[13px] font-medium text-[#111111] transition hover:border-[#D4D4D4] hover:bg-[#FAFAFA] focus-visible:outline-2 focus-visible:outline-[#111111]"
                aria-expanded={roleMenuOpen}
                aria-label="Profil pengguna dan pilih role workspace"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#111111] text-[11px] font-semibold text-white">
                  {getInitials(activePetugas?.nama ?? roleMeta.label)}
                </span>
                <div className="hidden text-left sm:block">
                  <div className="max-w-[130px] truncate text-[13px] font-semibold leading-tight text-[#111111]">
                    {activePetugas?.nama ?? roleMeta.label}
                  </div>
                  <div className="text-[11px] font-normal leading-tight text-[#737373]">{roleMeta.label}</div>
                </div>
                <span className="text-[13px] font-medium sm:hidden">{roleMeta.label}</span>
                <ChevronDown className="h-3.5 w-3.5 text-[#737373]" aria-hidden="true" />
              </button>

              {roleMenuOpen && (
                <div className="absolute right-0 mt-2 w-[288px] rounded-lg border border-[#E5E5E5] bg-white p-2 shadow-[0_10px_28px_-8px_rgba(17,17,17,0.14)]">
                  <div className="border-b border-[#E5E5E5] px-2.5 py-2">
                    <div className="text-[13px] font-semibold text-[#111111]">
                      {activePetugas?.nama ?? 'Pengguna Aktif'}
                    </div>
                    <div className="text-[12px] font-normal text-[#737373]">
                      Pindah Role Workspace
                    </div>
                  </div>
                  <div className="mt-1.5 flex flex-col gap-0.5">
                    {ROLES.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleSelectRole(r.id, r.homeHref)}
                        className={`flex items-center rounded-md px-2.5 py-2 text-left transition ${
                          activeRole === r.id
                            ? 'bg-[#F5F5F5] text-[#111111]'
                            : 'text-[#404040] hover:bg-[#FAFAFA]'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div
                            className={`text-[13px] ${
                              activeRole === r.id ? 'font-semibold text-[#111111]' : 'font-medium text-[#262626]'
                            }`}
                          >
                            {r.label}
                          </div>
                          <div className="truncate text-[12px] font-normal text-[#737373]">{r.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="mt-1.5 border-t border-[#E5E5E5] pt-1.5">
                    <Link
                      href="/setup"
                      onClick={() => setRoleMenuOpen(false)}
                      className="flex items-center gap-2 rounded-md px-2.5 py-2 text-[12px] font-medium text-[#737373] transition hover:bg-[#FAFAFA] hover:text-[#111111]"
                    >
                      <Settings className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Buka Setup Wizard / Master Data</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col gap-6 px-4 pt-6 pb-24 sm:px-6 lg:px-8 lg:pt-7 lg:pb-10">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav (< lg) */}
      <nav
        className="no-print fixed bottom-0 left-0 right-0 z-30 flex h-[68px] items-center justify-around border-t border-[#E5E5E5] bg-white px-2 lg:hidden"
        aria-label="Navigasi mobile"
      >
        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-[44px] min-w-[68px] flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1.5 text-[11px] transition-colors ${
                active ? 'bg-[#F5F5F5] font-semibold text-[#111111]' : 'font-medium text-[#737373]'
              }`}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
              <span className="max-w-[76px] truncate">{item.label.split(' ')[0]}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
