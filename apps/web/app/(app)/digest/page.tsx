'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, Skeleton, Badge } from '@/components/ui/primitives';

interface DigestResponse {
  digestText: string;
  generatedAt: string;
  stale: boolean;
}

export default function DigestPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['digest'],
    queryFn: async () => {
      const res = await api.get<DigestResponse>('/api/digest');
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
  });

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Daily Digest</h1>
      <p className="text-sm text-slate-500 mb-6">
        {data?.generatedAt
          ? new Date(data.generatedAt).toLocaleString()
          : 'Loading…'}
      </p>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <Skeleton className="h-32" />
          ) : (
            <>
              {data?.stale && (
                <Badge tone="amber" className="mb-3">
                  Just regenerated
                </Badge>
              )}
              <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                {data?.digestText ?? 'No data'}
              </pre>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
