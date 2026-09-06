'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Card, CardContent, Badge, Skeleton } from '@/components/ui/primitives';
import { CATEGORY_MAP, labelFromSlug } from '@mailmind/shared/categories';
import type { ThreadSummary } from '@mailmind/shared/types';
import { relativeTime } from '@/lib/utils';

export default function InboxPage() {
  const params = useParams<{ category: string }>();
  const slug = params.category;
  const meta = CATEGORY_MAP.find((m) => m.slug === slug);

  const { data, isLoading } = useQuery({
    queryKey: ['threads', slug],
    queryFn: async () => {
      const res = await api.get<ThreadSummary[]>(`/api/threads?category=${slug}&limit=50`);
      if (!res.success) throw new Error(res.error.message);
      return { items: res.data, meta: res.meta };
    },
  });

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">
          {meta?.label ?? labelFromSlug(slug)}
        </h1>
        <span className="text-sm text-slate-500">
          {data?.items.length ?? 0} thread{(data?.items.length ?? 0) !== 1 ? 's' : ''}
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : !data?.items.length ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500 text-sm">
            No threads in this category.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {data.items.map((t) => (
            <li key={t.id}>
              <Link href={`/thread/${t.id}`}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${
                          t.urgency === 'Critical' || t.urgency === 'High'
                            ? 'bg-red-500'
                            : t.urgency === 'Medium'
                            ? 'bg-amber-500'
                            : 'bg-slate-300'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-slate-900 truncate">
                            {t.subject}
                          </span>
                          {t.urgency === 'Critical' && <Badge tone="red">URGENT</Badge>}
                          {t.needsFollowUp && <Badge tone="orange">follow-up</Badge>}
                          {!t.isRead && <Badge tone="blue">unread</Badge>}
                        </div>
                        <div className="text-sm text-slate-600 truncate">{t.aiExplanation}</div>
                        <div className="text-xs text-slate-400 mt-1">
                          {t.effectiveCategory} · {t.messageCount} msg · {relativeTime(t.lastMessageAt)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
