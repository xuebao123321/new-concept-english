import { create } from 'zustand';
import { api } from '../db/api';
import { useLessonProgressStore } from './useLessonProgressStore';
import { db } from '../db/database';

interface User {
  id: number;
  username: string;
  nickname: string;
  role?: string;
  family_code?: string;
  parent_id?: number | null;
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
  token: localStorage.getItem('nce_token') || null,
  user: null,
  isLoggedIn: !!localStorage.getItem('nce_token'),
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
      api.getProfile().then(user => {
        set({ user });
        get().syncProgressFromServer().catch(() => {});
      }).catch(() => set({ token: null, isLoggedIn: false }));
    }
  },

  clearError: () => set({ error: null }),

  syncProgressFromServer: async () => {
    try {
      const res = await api.getProgress();
      const serverProgress = res.progress || [];
      for (const p of serverProgress) {
        const existing = await db.lessonProgress.get(p.lesson_group);
        // 始终以服务端数据为准：status/unlocked_by 由家长端控制
        const serverStatus = (p as any).status || (p.completed ? 'completed' : 'locked');
        const serverUnlockedBy = (p as any).unlocked_by || '';
        await db.lessonProgress.put({
          lessonGroup: p.lesson_group,
          completed: p.completed,
          bestAccuracy: Math.max(existing?.bestAccuracy || 0, p.best_accuracy || 0),
          attempts: Math.max(existing?.attempts || 0, p.attempts || 0),
          lastAttemptAt: Date.now(),
          completedAt: p.completed
            ? (existing?.completedAt || Date.now())
            : (existing?.completedAt || 0),
          status: serverStatus,
          unlocked_by: serverUnlockedBy,
        });
      }
      await useLessonProgressStore.getState().refresh();
    } catch (e) {
      console.warn('进度同步失败,继续使用本地数据', e);
    }
  },
}));
