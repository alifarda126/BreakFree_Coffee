import { Suspense } from 'react';
import { DivisiRekapStokView } from '@/components/divisi/DivisiRekapStokView';

export default function KitchenRekapPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-[#8A7F73]">Memuat form rekap kitchen...</div>}>
      <DivisiRekapStokView divisi="kitchen" />
    </Suspense>
  );
}
