'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Card, CardContent, Button, Badge } from '@/components/ui/primitives';
import { useUi } from '@/lib/ui';
import { Mail, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useUi();
  const [email, setEmail] = useState('demo@aust.edu');
  const [password, setPassword] = useState('demo1234');
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setLoading(true);
    try {
      const res = await api.post<{ user?: { id: string }; token?: string }>(
        '/api/auth/sign-in/email',
        { email, password },
      );
      const authOk =
        res.success === true ||
        (res as { user?: unknown }).user != null ||
        (res as { token?: unknown }).token != null;
      if (!authOk) {
        const resErr = res as { error?: { message?: string } };
        showToast(resErr.error?.message ?? 'Sign-in failed', 'error');
        setLoading(false);
        return;
      }
      router.push('/dashboard');
    } catch {
      showToast('Sign-in error', 'error');
      setLoading(false);
    }
  }

  async function handleDemoMode() {
    setLoading(true);
    try {
      const res = await api.post<{ user?: { id: string }; token?: string }>(
        '/api/auth/sign-in/email',
        { email: 'demo@aust.edu', password: 'demo1234' },
      );
      const authOk =
        res.success === true ||
        (res as { user?: unknown }).user != null ||
        (res as { token?: unknown }).token != null;
      if (!authOk) {
        const resErr = res as { error?: { message?: string } };
        showToast(resErr.error?.message ?? 'Demo sign-in failed', 'error');
        setLoading(false);
        return;
      }
      await api.post('/api/sync/mock', { reset: false });
      router.push('/dashboard');
    } catch {
      showToast('Demo sign-in error', 'error');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 px-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white grid place-items-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">MailMind</h1>
          </div>
          <p className="text-slate-600">Your faculty inbox, intelligently organised.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-500" />
                <h2 className="font-semibold">Try Demo Mode</h2>
                <Badge tone="green">Recommended</Badge>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Instant access with 22 seeded AUST faculty emails across 8 categories. The AI
                has already categorised, prioritised, and extracted action items.
              </p>
              <div className="rounded-md bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600 font-mono">
                demo@aust.edu / demo1234
              </div>
              <Button
                onClick={handleDemoMode}
                disabled={loading}
                className="w-full"
              >
                Enter Demo →
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">Sign in</h2>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Sign in to your MailMind account. New users: same form creates an account.
              </p>
              <div className="space-y-2">
                <input
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  placeholder="email@aust.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                />
                <input
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                />
              </div>
              <Button onClick={handleSignIn} variant="secondary" className="w-full" disabled={loading}>
                Sign in
              </Button>
              <p className="text-xs text-slate-400">
                Gmail OAuth (Phase 2) will appear here when env vars are configured.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
