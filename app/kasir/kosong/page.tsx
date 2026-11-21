'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function KasirKosongRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/kasir/riwayat');
  }, [router]);
  return null;
}
