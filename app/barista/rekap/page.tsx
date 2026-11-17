import { Suspense } from 'react';
import { DivisiRekapStokView } from '@/components/divisi/DivisiRekapStokView';

export default function BaristaRekapPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-[#8A7F73]">Memuat form rekap barista...</div>}>
      <DivisiRekapStokView divisi="barista" />
    </Suspense>
  );
}
