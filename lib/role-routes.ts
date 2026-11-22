import type { RoleId } from '@/lib/types';

export interface RoleMeta {
  id: RoleId;
  label: string;
  desc: string;
  dotColor: string;
  homeHref: string;
}

export const ROLES: RoleMeta[] = [
  {
    id: 'kasir',
    label: 'Kasir',
    desc: 'Rekap Omzet POS Pawoon per Shift',
    dotColor: '#111111',
    homeHref: '/kasir',
  },
  {
    id: 'barista',
    label: 'Barista',
    desc: 'Stok & Spoil/Waste Bahan Minuman',
    dotColor: '#262626',
    homeHref: '/barista',
  },
  {
    id: 'kitchen',
    label: 'Kitchen',
    desc: 'Stok & Spoil/Waste Bahan Makanan',
    dotColor: '#404040',
    homeHref: '/kitchen',
  },
  {
    id: 'logistik',
    label: 'Logistik',
    desc: 'Monitoring Stok, Waste & Pengajuan PO',
    dotColor: '#525252',
    homeHref: '/logistik',
  },
  {
    id: 'manajemen',
    label: 'Manajemen / Owner',
    desc: 'Laporan Terintegrasi & Persetujuan PO',
    dotColor: '#111111',
    homeHref: '/dashboard',
  },
];

export function getRoleMeta(role: RoleId): RoleMeta {
  return ROLES.find((r) => r.id === role) ?? ROLES[4];
}
