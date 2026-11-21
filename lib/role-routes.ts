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
    dotColor: '#2563EB',
    homeHref: '/kasir',
  },
  {
    id: 'barista',
    label: 'Barista',
    desc: 'Opname Stok & Waste Barista',
    dotColor: '#0284C7',
    homeHref: '/barista',
  },
  {
    id: 'kitchen',
    label: 'Kitchen',
    desc: 'Stok Makanan & Cek Kesegaran',
    dotColor: '#16A34A',
    homeHref: '/kitchen',
  },
  {
    id: 'logistik',
    label: 'Manajemen Logistik',
    desc: 'Verifikasi, Retur H+1 & PO',
    dotColor: '#F59E0B',
    homeHref: '/logistik',
  },
  {
    id: 'manajemen',
    label: 'Manajemen',
    desc: 'Persetujuan PO & Laporan Owner',
    dotColor: '#0F172A',
    homeHref: '/dashboard',
  },
];

export function getRoleMeta(role: RoleId): RoleMeta {
  return ROLES.find((r) => r.id === role) ?? ROLES[4];
}
