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
    desc: 'Rekap Omzet & Menu Kosong',
    dotColor: '#9C5B2E',
    homeHref: '/kasir',
  },
  {
    id: 'barista',
    label: 'Barista',
    desc: 'Opname Stok & Waste Barista',
    dotColor: '#6B4A3A',
    homeHref: '/barista',
  },
  {
    id: 'kitchen',
    label: 'Kitchen',
    desc: 'Stok Makanan & Cek Kesegaran',
    dotColor: '#3F7A4F',
    homeHref: '/kitchen',
  },
  {
    id: 'kapten',
    label: 'Kapten Outlet',
    desc: 'Monitoring Shift, QC & Keluhan',
    dotColor: '#3B6C8F',
    homeHref: '/kapten',
  },
  {
    id: 'logistik',
    label: 'Manajemen Logistik',
    desc: 'Verifikasi, Retur H+1 & PO',
    dotColor: '#A86A12',
    homeHref: '/logistik',
  },
  {
    id: 'manajemen',
    label: 'Manajemen',
    desc: 'Persetujuan PO & Laporan Owner',
    dotColor: '#221C17',
    homeHref: '/dashboard',
  },
];

export function getRoleMeta(role: RoleId): RoleMeta {
  return ROLES.find((r) => r.id === role) ?? ROLES[5];
}
