import { create } from 'zustand';
import { api } from '../db/api';
import { useLessonProgressStore } from './useLessonProgressStore';
import { db } from '../db/database';

interface User {
  id: number;
  username: string;
  nickname: string;
  created_at: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, nickname: string) => Promise<void>;
  logout: () => void;
  loadFromStorage: () => void;
  clearError: () => void;
  syncProgressFromServer: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isLoggedIn: false,
  isLoading: false,
  error: null,

  login: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.login(username, password);
      localStorage.setItem('nce_token', res.access_token);
      set({ token: res.access_token, user: res.user, isLoggedIn: true, isLoading: false });
      get().syncProgressFromServer().catch(() => {});
    } catch (e: any) {
      set({ error: e.message || '登录失败', isLoading: false });
    }
  },

  register: async (username, password, nickname) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.register(username, password, nickname);
      localStorage.setItem('nce_token', res.access_token);
      set({ token: res.access_token, user: res.user, isLoggedIn: true, isLoading: false });
      get().syncProgressFromServer().catch(() => {});
    } catch (e: any) {
      set({ error: e.message || '注册失败', isLoading: false });
    }
  },

  logout: () => {
    localStorage.removeItem('nce_token');
    set({ token: null, user: null, isLoggedIn: false });
  },

  loadFromStorage: () => {
    const token = localStorage.getItem('nce_token');
    if (token) {
      set({ token, isLoggedIn: true });
      api.getProfile().then(user => set({ user })).catch(() => set({ token: null, isLoggedIn: false }));
    }
  },

  clearError: () => set({ error: null }),

  syncProgressFromServer: async () => {
    try {
      const res = await api.getProgress();
      const serverProgress = res.progress || [];
      for (const p of serverProgress) {
        const existing = await db.lessonProgress.get(p.lesson_group);
        if (!existing || (p.completed && !existing.completed)) {
          await db.lessonProgress.put({
            lessonGroup: p.lesson_group,
            completed: p.completed,
            bestAccuracy: Math.max(existing?.bestAccuracy || 0, p.best_accuracy || 0),
            attempts: Math.max(existing?.attempts || 0, p.attempts || 0),
            lastAttemptAt: Date.now(),
            completedAt: p.completed
              ? (existing?.completedAt || Date.now())
              : (existing?.completedAt || 0),
          });
        }
      }
      await useLessonProgressStore.getState().refresh();
    } catch (e) {
      console.warn('进度同步失败,继续使用本地数据', e);
    }
  },
}));
