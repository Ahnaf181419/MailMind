'use client';

import { useState } from 'react';
import { Button, Badge } from '@/components/ui/primitives';
import { X } from 'lucide-react';
import type { Category } from '@mailmind/shared/types';

interface ReclassifyDrawerProps {
  open: boolean;
  onClose: () => void;
  current: Category;
  corrected: Category | null;
  onSubmit: (category: Category) => Promise<void> | void;
}

const CATEGORIES: Category[] = [
  'Meeting',
  'Class/Schedule',
  'Student Issue',
  'Examination',
  'Re-evaluation',
  'Committee/Admin',
  'Research',
  'Other',
];

export function ReclassifyDrawer({
  open,
  onClose,
  current,
  corrected,
  onSubmit,
}: ReclassifyDrawerProps) {
  const [picked, setPicked] = useState<Category | null>(corrected ?? current);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  async function handleSubmit() {
    if (!picked) return;
    setSubmitting(true);
    await onSubmit(picked);
    setSubmitting(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold">Reclassify thread</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 flex-1 overflow-y-auto">
          <div className="mb-4 text-sm text-slate-600">
            AI suggested <Badge tone="violet">{current}</Badge>. Override if needed.
          </div>
          <ul className="space-y-1.5">
            {CATEGORIES.map((c) => (
              <li key={c}>
                <button
                  onClick={() => setPicked(c)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    picked === c
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  {c}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!picked || picked === (corrected ?? current) || submitting}
          >
            {submitting ? 'Saving…' : 'Save reclassification'}
          </Button>
        </div>
      </div>
    </div>
  );
}
