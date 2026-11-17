'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBreakfreeStore } from '@/lib/store/useBreakfreeStore';
import { getRoleMeta } from '@/lib/role-routes';

export default function HomePage() {
  const router = useRouter();
  const isInitialized = useBreakfreeStore((s) => s.isInitialized);
  const activeRole = useBreakfreeStore((s) => s.activeRole);

  useEffect(() => {
    if (!isInitialized) {
      router.replace('/setup');
    } else {
      router.replace(getRoleMeta(activeRole).homeHref);
    }
  }, [isInitialized, activeRole, router]);

  return null;
}
