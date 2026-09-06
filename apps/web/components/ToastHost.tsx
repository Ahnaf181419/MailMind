'use client';

import { useUi } from '@/lib/ui';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ToastHost() {
  const { toast, clearToast } = useUi();
  if (!toast) return null;
  const Icon =
    toast.tone === 'success' ? CheckCircle2 : toast.tone === 'error' ? AlertCircle : Info;
  const color =
    toast.tone === 'success'
      ? 'border-green-200 bg-green-50 text-green-800'
      : toast.tone === 'error'
      ? 'border-red-200 bg-red-50 text-red-800'
      : 'border-blue-200 bg-blue-50 text-blue-800';
  return (
    <div
      className={cn(
        'fixed bottom-5 right-5 z-50 rounded-lg border shadow-md px-4 py-3 flex items-center gap-2 max-w-sm',
        color,
      )}
      onClick={clearToast}
      role="status"
    >
      <Icon className="w-4 h-4" />
      <span className="text-sm">{toast.message}</span>
    </div>
  );
}
