'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, Badge, Skeleton } from '@/components/ui/primitives';
import { useUi } from '@/lib/ui';
import type { DashboardStats, ThreadSummary } from '@mailmind/shared/types';
import { CATEGORY_MAP, effectiveUrgencyToPriority } from '@mailmind/shared/categories';
import { relativeTime } from '@/lib/utils';
import { AlertCircle, Mail, Sparkles, Inbox } from 'lucide-react';

export default function DashboardPage() {
  const { showToast } = useUi();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.get<DashboardStats>('/api/dashboard');
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
  });

  if (error) {
    showToast('Failed to load dashboard', 'error');
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
        </h1>
        <p className="text-sm text-slate-500">Your morning view</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="total" value={data?.total} loading={isLoading} />
        <StatCard label="unread" value={data?.unread} tone="amber" loading={isLoading} />
        <StatCard label="urgent" value={data?.urgent} tone="red" loading={isLoading} />
        <StatCard label="stale" value={data?.stale} tone="orange" loading={isLoading} />
      </div>

      <Card className="mb-6">
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            Today's attention
          </CardTitle>
          <button
            onClick={() => refetch()}
            className="text-xs text-slate-500 hover:text-slate-900"
          >
            refresh
          </button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : !data?.todaysAttention?.length ? (
            <EmptyState />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.todaysAttention.map((t) => (
                <li key={t.id} className="py-3 first:pt-0 last:pb-0">
                  <Link href={`/thread/${t.id}`} className="flex items-start gap-3 group">
                    <PriorityDot urgency={t.urgency} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 group-hover:underline">
                        {t.subject}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {t.effectiveCategory} · {relativeTime(t.lastMessageAt)}
                      </div>
                    </div>
                    <Badge tone={effectiveUrgencyToPriority(t.urgency) === 'urgent' ? 'red' : 'amber'}>
                      {t.urgency}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-slate-500" />
            Categories
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32" />
          ) : (
            <ul className="space-y-2">
              {CATEGORY_MAP.map((c) => {
                const count = (data?.byCategory && Object.entries(data.byCategory)
                  .filter(([k]) => c.enums.includes(k as never))
                  .reduce((acc, [, v]) => acc + v, 0)) ?? 0;
                const max = Math.max(1, ...Object.values(data?.byCategory ?? { _: 0 }));
                return (
                  <li key={c.slug}>
                    <Link
                      href={`/inbox/${c.slug}`}
                      className="grid grid-cols-[140px_1fr_40px] items-center gap-3 group hover:bg-slate-50 -mx-2 px-2 py-1.5 rounded-md"
                    >
                      <span className="text-sm text-slate-700">{c.label}</span>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-700 rounded-full transition-all"
                          style={{ width: `${(count / max) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-mono text-slate-600 text-right">
                        {count}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Sparkles className="w-3 h-3" />
        <span>AI re-aggregates on every action — counts stay honest.</span>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  loading,
}: {
  label: string;
  value?: number;
  tone?: 'red' | 'orange' | 'amber' | 'slate';
  loading?: boolean;
}) {
  const colors = {
    red: 'text-red-600',
    orange: 'text-orange-600',
    amber: 'text-amber-600',
    slate: 'text-slate-900',
  } as const;
  return (
    <Card>
      <CardContent className="pt-5">
        {loading ? (
          <Skeleton className="h-9 w-16" />
        ) : (
          <div className={`text-3xl font-bold ${colors[tone ?? 'slate']}`}>
            {value ?? 0}
          </div>
        )}
        <div className="text-xs text-slate-500 mt-1">{label}</div>
      </CardContent>
    </Card>
  );
}

function PriorityDot({ urgency }: { urgency: ThreadSummary['urgency'] }) {
  const colors: Record<string, string> = {
    Critical: 'bg-red-600',
    High: 'bg-red-500',
    Medium: 'bg-amber-500',
    Low: 'bg-slate-300',
  };
  return (
    <span
      className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${colors[urgency] ?? 'bg-slate-300'}`}
    />
  );
}

function EmptyState() {
  return (
    <div className="text-center py-8 text-sm text-slate-500">
      All caught up — nothing needs your attention right now.
    </div>
  );
}
