'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/components/ui/primitives';
import { useUi } from '@/lib/ui';
import { Plus, X } from 'lucide-react';

interface Settings {
  vipSenders: string[];
  customVips: string[];
  staleThresholdHrs: number;
  followupThresholdHrs: number;
  digestEnabled: boolean;
  categoryOverrides: Record<string, string>;
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const { showToast } = useUi();
  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await api.get<Settings>('/api/settings');
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
  });

  const [draft, setDraft] = useState<Settings | null>(null);
  const [newVip, setNewVip] = useState('');
  const [staleHrs, setStaleHrs] = useState(48);

  useEffect(() => {
    if (data) {
      setDraft(data);
      setStaleHrs(data.staleThresholdHrs);
    }
  }, [data]);

  if (isLoading || !draft) {
    return <div className="p-8 text-slate-400 text-sm">Loading settings…</div>;
  }

  async function save() {
    const payload = {
      vipSenders: draft!.vipSenders,
      customVips: draft!.customVips,
      staleThresholdHrs: staleHrs,
      followupThresholdHrs: draft!.followupThresholdHrs,
      digestEnabled: draft!.digestEnabled,
      categoryOverrides: draft!.categoryOverrides,
    };
    const res = await api.patch('/api/settings', payload);
    if (res.success) {
      showToast('Settings saved', 'success');
      qc.invalidateQueries({ queryKey: ['settings'] });
    } else {
      showToast(res.error.message, 'error');
    }
  }

  function removeVip(idx: number) {
    setDraft({ ...draft!, vipSenders: draft!.vipSenders.filter((_, i) => i !== idx) });
  }

  function addVip() {
    const v = newVip.trim();
    if (!v) return;
    if (draft!.vipSenders.includes(v)) {
      showToast('Already in VIP list', 'info');
      return;
    }
    setDraft({ ...draft!, vipSenders: [...draft!.vipSenders, v] });
    setNewVip('');
  }

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>VIP senders</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 mb-3">
            Threads from these senders are always flagged at High or Critical urgency.
          </p>
          <ul className="space-y-2">
            {draft.vipSenders.map((v, i) => (
              <li
                key={`${v}-${i}`}
                className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm"
              >
                <span className="font-mono text-slate-700">{v}</span>
                <button
                  onClick={() => removeVip(i)}
                  className="text-slate-400 hover:text-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2 mt-3">
            <input
              className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm"
              placeholder="dean@aust.edu"
              value={newVip}
              onChange={(e) => setNewVip(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addVip();
              }}
            />
            <Button variant="secondary" onClick={addVip}>
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stale threshold</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 mb-3">
            Threads unreplied for more than this many hours show a stale badge.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={720}
              value={staleHrs}
              onChange={(e) => setStaleHrs(parseInt(e.target.value, 10) || 48)}
              className="w-24 rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
            <span className="text-sm text-slate-600">hours</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily digest</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.digestEnabled}
              onChange={(e) => setDraft({ ...draft, digestEnabled: e.target.checked })}
            />
            <span>Enable daily digest page</span>
          </label>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save}>Save settings</Button>
      </div>
    </div>
  );
}
