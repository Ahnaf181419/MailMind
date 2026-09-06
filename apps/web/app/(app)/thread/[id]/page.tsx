'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, Badge, Button, Skeleton } from '@/components/ui/primitives';
import { useUi } from '@/lib/ui';
import { formatLongDate, relativeTime } from '@/lib/utils';
import { ArrowLeft, Sparkles, CheckCheck, Clock } from 'lucide-react';
import type { Status, Category, Draft } from '@mailmind/shared/types';
import { DraftReplyModal } from '@/components/DraftReplyModal';
import { ReclassifyDrawer } from '@/components/ReclassifyDrawer';

interface ThreadDetail extends ThreadDetailBase {}
type ThreadDetailBase = {
  id: string;
  subject: string;
  category: Category;
  correctedCategory: Category | null;
  effectiveCategory: Category;
  urgency: 'Low' | 'Medium' | 'High' | 'Critical';
  aiExplanation: string;
  deadline: string | null;
  isRead: boolean;
  needsFollowUp: boolean;
  status: Status;
  snoozedUntil: string | null;
  repliedAt: string | null;
  actionedAt: string | null;
  draftedReply: Draft | null;
  lastMessageAt: string;
  messageCount: number;
  participants: string[];
  messages: Array<{
    sender: string;
    senderIsFaculty: boolean;
    sentAt: string;
    body: string;
  }>;
  messagesTruncated?: boolean;
  classificationStatus: 'pending' | 'completed' | 'failed';
  staleThresholdHrs?: number;
};

export default function ThreadDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const qc = useQueryClient();
  const { showToast } = useUi();
  const [draftOpen, setDraftOpen] = useState(false);
  const [reclassifyOpen, setReclassifyOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['thread', id],
    queryFn: async () => {
      const res = await api.get<ThreadDetailBase>(`/api/threads/${id}`);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
  });

  async function updateStatus(status: Status) {
    const res = await api.patch(`/api/threads/${id}/status`, { status });
    if (res.success) {
      showToast(`Marked ${status}`, 'success');
      qc.invalidateQueries({ queryKey: ['thread', id] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['threads'] });
    } else {
      showToast(res.error.message, 'error');
    }
  }

  async function snooze(hours: number) {
    const until = new Date(Date.now() + hours * 3600_000).toISOString();
    const res = await api.patch(`/api/threads/${id}/snooze`, { until });
    if (res.success) {
      showToast(`Snoozed for ${hours}h`, 'success');
      qc.invalidateQueries({ queryKey: ['thread', id] });
    } else {
      showToast(res.error.message, 'error');
    }
  }

  async function reclassifyTo(category: Category) {
    const res = await api.patch(`/api/threads/${id}/reclassify`, { category });
    if (res.success) {
      showToast(`Reclassified to ${category}`, 'success');
      qc.invalidateQueries({ queryKey: ['thread', id] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['threads'] });
    } else {
      showToast(res.error.message, 'error');
    }
  }

  if (isLoading || !data) {
    return (
      <div className="p-8 max-w-5xl">
        <Skeleton className="h-8 w-32 mb-4" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const lastMessage = data.messages[data.messages.length - 1];

  return (
    <div className="p-8 max-w-6xl">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="border-b border-slate-100 pb-4 mb-4">
              <h1 className="text-xl font-semibold text-slate-900 mb-2">{data.subject}</h1>
              <div className="text-sm text-slate-500">
                {data.messages.length} message{data.messages.length !== 1 ? 's' : ''} ·{' '}
                last activity {relativeTime(data.lastMessageAt)}
              </div>
              {data.messagesTruncated && (
                <div className="text-xs text-amber-600 mt-2">
                  ⚠ Older messages truncated (thread too long).
                </div>
              )}
            </div>

            <div className="space-y-5">
              {data.messages.map((m, i) => (
                <div key={i} className="text-sm">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-medium text-slate-900">
                      {m.sender}
                      {m.senderIsFaculty && (
                        <span className="ml-1 text-xs text-slate-400">(you)</span>
                      )}
                    </span>
                    <span className="text-xs text-slate-400">{formatLongDate(m.sentAt)}</span>
                  </div>
                  <div className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {m.body}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-500" />
                <span className="text-sm font-semibold text-slate-900">AI Panel</span>
              </div>

              <div className="space-y-1">
                <div className="text-[11px] uppercase tracking-wider text-slate-400">Summary</div>
                <p className="text-sm text-slate-700">{data.aiExplanation}</p>
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">Category</div>
                <div className="flex items-center gap-2">
                  <Badge tone={data.effectiveCategory === 'Other' ? 'slate' : 'violet'}>
                    {data.effectiveCategory}
                  </Badge>
                  {data.correctedCategory && (
                    <Badge tone="amber">corrected from {data.category}</Badge>
                  )}
                </div>
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">Urgency</div>
                <Badge
                  tone={
                    data.urgency === 'Critical' || data.urgency === 'High'
                      ? 'red'
                      : data.urgency === 'Medium'
                      ? 'amber'
                      : 'slate'
                  }
                >
                  {data.urgency}
                </Badge>
              </div>

              {data.deadline && (
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">Deadline</div>
                  <div className="text-sm text-slate-700">{formatLongDate(data.deadline)}</div>
                </div>
              )}

              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-400 mb-1">Status</div>
                <div className="flex items-center gap-2">
                  <Badge tone={data.status === 'replied' ? 'green' : 'slate'}>{data.status}</Badge>
                  {data.needsFollowUp && <Badge tone="orange">needs follow-up</Badge>}
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <Button className="w-full" onClick={() => setDraftOpen(true)}>
                  <Sparkles className="w-4 h-4" />
                  Draft reply
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => updateStatus('replied')}
                    disabled={data.status === 'replied'}
                  >
                    <CheckCheck className="w-4 h-4" />
                    Mark replied
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => snooze(24)}
                  >
                    <Clock className="w-4 h-4" />
                    Snooze 24h
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setReclassifyOpen(true)}
                >
                  Reclassify…
                </Button>
              </div>
            </CardContent>
          </Card>

          {data.classificationStatus === 'failed' && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-5">
                <div className="text-sm text-amber-800">
                  Classification failed — please review manually.
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <DraftReplyModal
        open={draftOpen}
        onClose={() => setDraftOpen(false)}
        threadId={data.id}
        subject={data.subject}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ['thread', id] });
        }}
      />

      <ReclassifyDrawer
        open={reclassifyOpen}
        onClose={() => setReclassifyOpen(false)}
        current={data.category}
        corrected={data.correctedCategory}
        onSubmit={async (cat) => {
          await reclassifyTo(cat);
        }}
      />
    </div>
  );
}
