'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    api
      .get<{ user: { id: string; email: string; name: string } }>('/api/me')
      .then((res) => {
        if (!active) return;
        if (!res.success) {
          router.replace('/');
        }
      });
    return () => {
      active = false;
    };
  }, [router]);

  return <>{children}</>;
}
