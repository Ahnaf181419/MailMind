'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/primitives';
import { useUi } from '@/lib/ui';
import { X, Sparkles, Save, Copy } from 'lucide-react';

interface DraftReplyModalProps {
  open: boolean;
  onClose: () => void;
  threadId: string;
  subject: string;
  onSaved?: () => void;
}

export function DraftReplyModal({
  open,
  onClose,
  threadId,
  subject,
  onSaved,
}: DraftReplyModalProps) {
  const qc = useQueryClient();
  const { showToast } = useUi();
  const [subject2, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [source, setSource] = useState<'llm' | 'fallback' | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api
      .post<{ subject: string; body: string; source: 'llm' | 'fallback' }>(
        `/api/threads/${threadId}/draft-reply`,
      )
      .then((res) => {
        if (res.success) {
          setSubject(res.data.subject ?? `Re: ${subject}`);
          setBody(res.data.body ?? '');
          setSource(res.data.source);
        } else {
          showToast(res.error.message, 'error');
          setSubject(`Re: ${subject}`);
          setBody('');
        }
      })
      .finally(() => setLoading(false));
  }, [open, threadId, subject, showToast]);

  if (!open) return null;

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(`${subject2}\n\n${body}`);
      showToast('Copied to clipboard', 'success');
    } catch {
      showToast('Copy failed', 'error');
    }
  }

  async function saveDraft() {
    setSaving(true);
    const res = await api.patch(`/api/threads/${threadId}/draft`, {
      subject: subject2,
      body,
    });
    if (res.success) {
      showToast('Draft saved', 'success');
      qc.invalidateQueries({ queryKey: ['thread', threadId] });
      onSaved?.();
      onClose();
    } else {
      showToast(res.error.message, 'error');
    }
    setSaving(false);
  }

  function sendViaGmail() {
    const mailto = `https://mail.google.com/mail/?view=cm&fs=1&to=&su=${encodeURIComponent(subject2)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, '_blank');
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm grid place-items-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-500" />
            <h2 className="font-semibold">Draft reply</h2>
            {source === 'fallback' && (
              <span className="text-xs text-amber-600">(fallback — LLM unavailable)</span>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 flex-1 overflow-y-auto">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Subject</label>
            <input
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              value={subject2}
              onChange={(e) => setSubject(e.target.value)}
              disabled={loading}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Body</label>
            {loading ? (
              <div className="h-48 rounded-md bg-slate-50 animate-pulse" />
            ) : (
              <textarea
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm min-h-[200px] font-sans"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            )}
          </div>
          <p className="text-xs text-slate-400">
            We never auto-send. Faculty reviews, edits, and sends it themselves.
          </p>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={copyToClipboard} disabled={loading || !body}>
            <Copy className="w-4 h-4" />
            Copy
          </Button>
          <Button variant="secondary" onClick={saveDraft} disabled={loading || saving || !body}>
            <Save className="w-4 h-4" />
            Save draft
          </Button>
          <Button onClick={sendViaGmail} disabled={loading || !body}>
            Send via Gmail
          </Button>
        </div>
      </div>
    </div>
  );
}
