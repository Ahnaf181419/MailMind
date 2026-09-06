'use client';

import { create } from 'zustand';

interface UiState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebar: (open: boolean) => void;
  toast: { id: number; message: string; tone: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, tone?: 'success' | 'error' | 'info') => void;
  clearToast: () => void;
}

let toastSeq = 0;

export const useUi = create<UiState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebar: (open) => set({ sidebarOpen: open }),
  toast: null,
  showToast: (message, tone = 'info') => {
    const id = ++toastSeq;
    set({ toast: { id, message, tone } });
    setTimeout(() => {
      set((s) => (s.toast?.id === id ? { toast: null } : s));
    }, 3500);
  },
  clearToast: () => set({ toast: null }),
}));
