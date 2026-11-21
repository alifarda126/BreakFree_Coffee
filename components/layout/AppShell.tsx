'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  Coffee,
  CookingPot,
  FileText,
  History,
  LayoutDashboard,
  Menu as MenuIcon,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Truck,
  Users,
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

  const laporanKosong = useBreakfreeStore((s) => s.laporanKosong);
  const laporanStok = useBreakfreeStore((s) => s.laporanStok);
  const purchaseOrders = useBreakfreeStore((s) => s.purchaseOrders);
  const bahan = useBreakfreeStore((s) => s.bahan);
  const stockMovements = useBreakfreeStore((s) => s.stockMovements);

  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [kosongModalDivisi, setKosongModalDivisi] = useState<'barista' | 'kitchen' | null>(null);

  const roleMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Redirect uninitialized app to /setup
  useEffect(() => {
    if (!isInitialized && pathname !== '/setup') {
      router.replace('/setup');
    }
  }, [isInitialized, pathname, router]);

  // Close popovers on outside click or Escape
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
  }, [activeRole, activeKosongCount, pendingVerifCount, pendingPOCount]);

  const handleSelectRole = (nextRole: RoleId, homeHref: string) => {
    setActiveRole(nextRole);
    setRoleMenuOpen(false);
    setMobileDrawerOpen(false);
    router.push(homeHref);
  };

  const renderNavLink = (item: NavEntry, collapsed = false) => {
    const isActive = item.href ? pathname === item.href : false;
    const Icon = item.icon;
    const cls = `group relative flex h-10 w-full items-center rounded-lg text-left text-[13.5px] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[#2563EB] ${
      collapsed ? 'justify-center px-0' : 'gap-2.5 px-3'
    } ${
      isActive
        ? 'bg-[#EFF6FF] font-semibold text-[#2563EB]'
        : 'font-medium text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
    }`;

    const inner = (
      <>
        {isActive && !collapsed && (
          <span
            className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[#2563EB]"
            aria-hidden="true"
          />
        )}
        <Icon
          className={`h-[18px] w-[18px] shrink-0 transition-colors ${
            isActive ? 'text-[#2563EB]' : 'text-[#64748B] group-hover:text-[#0F172A]'
          }`}
          strokeWidth={1.85}
          aria-hidden="true"
        />
        {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
        {!collapsed && item.count != null && item.count > 0 && (
          <span
            className={`tabular-mono inline-flex h-5 min-w-[20px] items-center justify-center rounded-md px-1.5 text-[11px] font-bold ${
              item.tone === 'danger'
                ? 'bg-[#FEF2F2] text-[#B91C1C]'
                : 'bg-[#FFFBEB] text-[#B45309]'
            }`}
          >
            {item.count}
          </span>
        )}
        {collapsed && item.count != null && item.count > 0 && (
          <span
            className={`absolute right-1.5 top-1.5 h-2 w-2 rounded-full ${
              item.tone === 'danger' ? 'bg-[#DC2626]' : 'bg-[#F59E0B]'
            }`}
            aria-hidden="true"
          />
        )}
      </>
    );

    if (item.onClick) {
      return (
        <button
          key={item.label}
          type="button"
          title={collapsed ? item.label : undefined}
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
        title={collapsed ? item.label : undefined}
        onClick={() => setMobileDrawerOpen(false)}
        className={cls}
      >
        {inner}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      {/* Desktop Sidebar */}
      <aside
        className={`no-print sticky top-0 hidden h-screen shrink-0 flex-col justify-between border-r border-[#E2E8F0] bg-white transition-[width] duration-200 lg:flex ${
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
                src="/images/breakfree-logo.png"
                alt="Logo Breakfree Coffee"
                width={36}
                height={36}
                className="h-9 w-9 shrink-0 rounded-lg border border-[#E2E8F0] object-cover"
              />
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-bold leading-[1.3] tracking-[-0.01em] text-[#0F172A]">
                    Breakfree Coffee SI
                  </div>
                  <div className="truncate text-[12px] font-normal leading-[1.4] text-[#64748B]">
                    Operasional &amp; Logistik
                  </div>
                </div>
              )}
            </Link>

            <button
              type="button"
              onClick={() => setSidebarCollapsed((v) => !v)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#64748B] transition hover:bg-[#F1F5F9] hover:text-[#0F172A] focus-visible:outline-2 focus-visible:outline-[#2563EB]"
              aria-label={sidebarCollapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
              title={sidebarCollapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" strokeWidth={1.85} aria-hidden="true" />
              ) : (
                <PanelLeftClose className="h-4 w-4" strokeWidth={1.85} aria-hidden="true" />
              )}
            </button>
          </div>

          {/* Navigation Group */}
          <div className="flex flex-col gap-1">
            {!sidebarCollapsed && (
              <span className="px-3 pb-1 text-[11px] font-semibold text-[#64748B]">
                Menu {roleMeta.label}
              </span>
            )}
            <nav className="flex flex-col gap-1" aria-label="Navigasi utama">
              {navItems.map((item) => renderNavLink(item, sidebarCollapsed))}
            </nav>
          </div>
        </div>

        {/* Sidebar Bottom: User Profile + Settings */}
        <div className="flex flex-col gap-2 border-t border-[#E2E8F0] pt-3">
          {!sidebarCollapsed ? (
            <div className="flex flex-col gap-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EFF6FF] text-xs font-semibold text-[#2563EB]">
                  {getInitials(activePetugas?.nama ?? roleMeta.label)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-[#0F172A]">
                    {activePetugas?.nama ?? settings.outletNama}
                  </div>
                  <div className="truncate text-[12px] font-normal text-[#64748B]">
                    {roleMeta.label} · {settings.outletNama}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="sidebar-petugas-select" className="text-[12px] font-normal text-[#64748B]">
                  Petugas Aktif
                </label>
                <select
                  id="sidebar-petugas-select"
                  value={activePetugasId}
                  onChange={(e) => setActivePetugasId(e.target.value)}
                  aria-label="Pilih petugas aktif"
                  className="h-8 rounded-lg border border-[#E2E8F0] bg-white px-2 text-[13px] font-normal text-[#0F172A] transition focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15"
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
              className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-[#EFF6FF] text-xs font-bold text-[#2563EB]"
              title={`${activePetugas?.nama ?? roleMeta.label} (${roleMeta.label})`}
            >
              {getInitials(activePetugas?.nama ?? roleMeta.label)}
            </div>
          )}

          <Link
            href="/pengaturan"
            title={sidebarCollapsed ? 'Pengaturan Data' : undefined}
            className={`flex h-9 items-center rounded-lg text-[13px] transition-colors ${
              sidebarCollapsed ? 'justify-center px-0' : 'gap-2.5 px-3'
            } ${
              pathname === '/pengaturan'
                ? 'bg-[#EFF6FF] font-bold text-[#2563EB]'
                : 'font-semibold text-[#334155] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
            }`}
          >
            <Settings
              className={`h-[17px] w-[17px] shrink-0 ${
                pathname === '/pengaturan' ? 'text-[#2563EB]' : 'text-[#64748B]'
              }`}
              strokeWidth={1.85}
              aria-hidden="true"
            />
            {!sidebarCollapsed && <span className="truncate">Pengaturan Data</span>}
          </Link>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-50 flex bg-[#0F172A]/40 lg:hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMobileDrawerOpen(false);
          }}
        >
          <div className="flex w-[276px] flex-col justify-between bg-white px-4 py-5 shadow-[0_24px_48px_-12px_rgba(15,23,42,0.22)]">
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/images/breakfree-logo.png"
                    alt="Logo Breakfree Coffee"
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-lg border border-[#E2E8F0] object-cover"
                  />
                  <div>
                    <div className="text-sm font-bold text-[#0F172A]">Breakfree Coffee SI</div>
                    <div className="text-[11px] font-normal text-[#64748B]">Operasional &amp; Logistik</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                  aria-label="Tutup menu"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <nav className="flex flex-col gap-1" aria-label="Navigasi mobile drawer">
                {navItems.map((item) => renderNavLink(item, false))}
              </nav>
            </div>
            <div className="flex flex-col gap-2 border-t border-[#E2E8F0] pt-3">
              <Link
                href="/pengaturan"
                onClick={() => setMobileDrawerOpen(false)}
                className="flex h-10 items-center gap-2.5 rounded-lg px-3 text-[13px] font-semibold text-[#334155] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
              >
                <Settings className="h-[18px] w-[18px] text-[#64748B]" strokeWidth={1.85} aria-hidden="true" />
                <span>Pengaturan Data</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Right Workspace Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Minimalist Top Navbar (64px) */}
        <header className="no-print sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-[#E2E8F0] bg-white/95 px-4 backdrop-blur-xs lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-[#0F172A] transition hover:bg-[#F8FAFC] lg:hidden"
              aria-label="Buka menu navigasi"
            >
              <MenuIcon className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-[20px] font-bold leading-[1.3] tracking-[-0.02em] text-[#0F172A] sm:text-[24px]">
                {pageTitle}
              </h1>
              <div className="flex items-center gap-1.5 truncate text-[12px] font-normal leading-[1.5] text-[#64748B]">
                <CalendarDays className="hidden h-3.5 w-3.5 shrink-0 text-[#64748B] sm:inline" aria-hidden="true" />
                <span className="truncate">
                  {formatTanggal(todayISO())}
                  {activeShift ? ` · ${activeShift.nama} (${activeShift.jamMulai}-${activeShift.jamSelesai})` : ''}
                </span>
              </div>
            </div>
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
                className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-[#475569] transition hover:bg-[#F8FAFC] hover:text-[#0F172A] focus-visible:outline-2 focus-visible:outline-[#2563EB]"
                aria-label="Notifikasi operasional"
                aria-expanded={notifOpen}
              >
                <Bell
                  className={`h-[18px] w-[18px] ${totalNotifCount > 0 ? 'text-[#2563EB]' : 'text-[#475569]'}`}
                  strokeWidth={1.85}
                  aria-hidden="true"
                />
                {totalNotifCount > 0 && (
                  <span className="tabular-mono absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#DC2626] px-1 text-[10px] font-bold text-white">
                    {totalNotifCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-[340px] max-w-[calc(100vw-2rem)] rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-[0_10px_28px_-8px_rgba(15,23,42,0.14)]">
                  <div className="mb-3 flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
                    <span className="text-sm font-bold text-[#0F172A]">Notifikasi Operasional</span>
                    <Badge tone={totalNotifCount > 0 ? 'danger' : 'success'}>
                      {totalNotifCount} Aktif
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-2">
                    {totalNotifCount === 0 ? (
                      <p className="py-4 text-center text-xs font-medium text-[#64748B]">
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
                            className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-2.5 text-left transition hover:bg-[#FEE2E2]"
                          >
                            <div className="text-xs font-bold text-[#B91C1C]">
                              {activeKosongCount} Bahan/Menu Kosong Aktif
                            </div>
                            <div className="mt-0.5 text-[11px] font-medium text-[#475569]">
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
                            className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] p-2.5 text-left transition hover:bg-[#FEF3C7]"
                          >
                            <div className="text-xs font-bold text-[#B45309]">
                              {pendingVerifCount} Laporan Stok Menunggu Verifikasi
                            </div>
                            <div className="mt-0.5 text-[11px] font-medium text-[#475569]">
                              Buka Inbox Logistik untuk verifikasi &amp; buat retur
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
                            className="rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] p-2.5 text-left transition hover:bg-[#DBEAFE]"
                          >
                            <div className="text-xs font-bold text-[#1E40AF]">
                              {pendingPOCount} Purchase Order Menunggu Persetujuan
                            </div>
                            <div className="mt-0.5 text-[11px] font-medium text-[#475569]">
                              Review &amp; setujui PO dari Manajemen
                            </div>
                          </Link>
                        )}
                        {kritisCount > 0 && (
                          <Link
                            href="/logistik"
                            onClick={() => {
                              setActiveRole('logistik');
                              setNotifOpen(false);
                            }}
                            className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2.5 text-left transition hover:bg-[#F1F5F9]"
                          >
                            <div className="text-xs font-bold text-[#B91C1C]">
                              {kritisCount} Bahan Mencapai Batas Stok Kritis
                            </div>
                            <div className="mt-0.5 text-[11px] font-medium text-[#475569]">
                              Buka Logistik untuk pantau stok &amp; buat PO restock
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
                className="flex h-9 items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white pl-2 pr-2.5 text-[13px] font-medium text-[#0F172A] transition hover:border-[#CBD5E1] hover:bg-[#F8FAFC] focus-visible:outline-2 focus-visible:outline-[#2563EB]"
                aria-expanded={roleMenuOpen}
                aria-label="Profil pengguna dan pilih role workspace"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#EFF6FF] text-[11px] font-semibold text-[#2563EB]">
                  {getInitials(activePetugas?.nama ?? roleMeta.label)}
                </span>
                <div className="hidden text-left sm:block">
                  <div className="max-w-[130px] truncate text-[13px] font-semibold leading-tight text-[#0F172A]">
                    {activePetugas?.nama ?? roleMeta.label}
                  </div>
                  <div className="text-[11px] font-normal leading-tight text-[#64748B]">{roleMeta.label}</div>
                </div>
                <span className="text-[13px] font-medium sm:hidden">{roleMeta.label}</span>
                <ChevronDown className="h-3.5 w-3.5 text-[#64748B]" aria-hidden="true" />
              </button>

              {roleMenuOpen && (
                <div className="absolute right-0 mt-2 w-[288px] rounded-xl border border-[#E2E8F0] bg-white p-2 shadow-[0_10px_28px_-8px_rgba(15,23,42,0.14)]">
                  <div className="border-b border-[#E2E8F0] px-2.5 py-2">
                    <div className="text-[13px] font-semibold text-[#0F172A]">
                      {activePetugas?.nama ?? 'Pengguna Aktif'}
                    </div>
                    <div className="text-[12px] font-normal text-[#64748B]">
                      Pindah Role Workspace (Tanpa Login)
                    </div>
                  </div>
                  <div className="mt-1.5 flex flex-col gap-0.5">
                    {ROLES.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleSelectRole(r.id, r.homeHref)}
                        className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition ${
                          activeRole === r.id
                            ? 'bg-[#EFF6FF] text-[#2563EB]'
                            : 'text-[#0F172A] hover:bg-[#F8FAFC]'
                        }`}
                      >
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: r.dotColor }}
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <div
                            className={`text-[13px] ${
                              activeRole === r.id ? 'font-semibold text-[#2563EB]' : 'font-medium text-[#0F172A]'
                            }`}
                          >
                            {r.label}
                          </div>
                          <div className="truncate text-[12px] font-normal text-[#64748B]">{r.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="mt-1.5 border-t border-[#E2E8F0] pt-1.5">
                    <Link
                      href="/setup"
                      onClick={() => setRoleMenuOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-[#475569] transition hover:bg-[#F8FAFC] hover:text-[#0F172A]"
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
        <main className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col gap-6 p-4 pb-24 lg:p-8 lg:pb-10">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav (< lg) */}
      <nav
        className="no-print fixed bottom-0 left-0 right-0 z-30 flex h-[68px] items-center justify-around border-t border-[#E2E8F0] bg-white px-2 lg:hidden"
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
                className="flex min-h-[44px] min-w-[68px] flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-[#64748B]"
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.85} aria-hidden="true" />
                <span className="max-w-[72px] truncate">{item.label.split(' ')[0]}</span>
              </button>
            );
          }
          return (
            <Link
              key={item.label}
              href={item.href!}
              className={`flex min-h-[44px] min-w-[68px] flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1.5 text-[11px] transition-colors ${
                active ? 'bg-[#EFF6FF] font-bold text-[#2563EB]' : 'font-semibold text-[#64748B]'
              }`}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.85} aria-hidden="true" />
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
