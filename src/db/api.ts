// 生产用 Railway，开发用本地
const API_BASE = import.meta.env.PROD
  ? (import.meta.env.VITE_API_URL || 'https://new-concept-english-production.up.railway.app')
  : 'http://localhost:8000';

async function request(path: string, options: RequestInit = {}, retries = 1): Promise<any> {
  const token = localStorage.getItem('nce_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...((options.headers as any) || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: '网络错误，请稍后重试' }));
        throw new Error(err.detail || '请求失败');
      }
      return res.json();
    } catch (e: any) {
      if (i < retries) { await new Promise(r => setTimeout(r, 1000)); continue; }
      throw new Error(e.message || '网络错误，请检查连接');
    }
  }
}

export const api = {
  // 认证
  register: (username: string, password: string, nickname: string) =>
    request('/api/auth/register', { method: 'POST', body: JSON.stringify({ username, password, nickname }) }),
  login: (username: string, password: string) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

  // 用户
  getProfile: () => request('/api/user/profile'),
  getProgress: () => request('/api/user/progress'),
  getStats: () => request('/api/user/stats'),

  // 练习
  submitAnswer: (data: { question_id: string; correct: boolean; user_answer: string; time_spent: number; lesson_group?: string; question_type?: string }) =>
    request('/api/practice/submit', { method: 'POST', body: JSON.stringify(data) }),
  updateProgress: (lesson_group: string, correct: number, total: number) =>
    request('/api/progress/update', { method: 'POST', body: JSON.stringify({ lesson_group, correct, total }) }),

  // 密码与账户
  changePassword: (oldPassword: string, newPassword: string) =>
    request('/api/user/password', { method: 'PUT', body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }) }),
  deleteAccount: () =>
    request('/api/user/account', { method: 'DELETE' }),

  // 健康检查
  health: () => request('/api/health'),
};
