import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';

const API = import.meta.env.PROD
  ? (import.meta.env.VITE_API_URL || 'https://new-concept-english-production.up.railway.app')
  : 'http://localhost:8000';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const nav = useNavigate();
  const { isLoggedIn } = useAuthStore();
  const userInputRef = useRef<HTMLInputElement>(null);

  // 已登录则跳转首页
  useEffect(() => {
    if (isLoggedIn) nav('/', { replace: true });
  }, [isLoggedIn, nav]);

  // 切换模式时自动聚焦用户名输入框
  useEffect(() => {
    userInputRef.current?.focus();
  }, [mode]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || '登录失败');
      localStorage.setItem('nce_token', d.access_token);
      useAuthStore.getState().loadFromStorage();
      setMsg({ type: 'success', text: '✅ 登录成功！跳转中...' });
      setTimeout(() => nav('/', { replace: true }), 600);
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message || '网络错误，请稍后重试' });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, nickname: nickname || username }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || '注册失败');
      setMsg({ type: 'success', text: '✅ 注册成功！请登录' });
      setMode('login');
      setPassword('');
      setNickname('');
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message || '网络错误，请稍后重试' });
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: 'login' | 'register') => {
    if (m === mode) return;
    setMode(m);
    setMsg(null);
    setPassword('');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-cream safe-top safe-bottom">
      {/* ── Logo 区 ── */}
      <div className="text-center mb-6">
        <div className="text-7xl mb-3 animate-float select-none">🐻</div>
        <h1 className="text-2xl font-extrabold text-ink tracking-tight">
          新概念英语
        </h1>
        <p className="text-sm text-ink-light mt-0.5 font-bold">
          智能练习 · 快乐学习
        </p>
      </div>

      {/* ── 卡片 ── */}
      <div className="card p-6 w-full max-w-sm animate-slide-up">
        {/* Tab 切换 */}
        <div className="flex gap-1 mb-5 p-1 bg-warm-bg rounded-2xl">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-200 ${
              mode === 'login'
                ? 'bg-white text-forest shadow-sm'
                : 'text-ink-light hover:text-ink'
            }`}
          >
            🔑 登录
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-200 ${
              mode === 'register'
                ? 'bg-white text-forest shadow-sm'
                : 'text-ink-light hover:text-ink'
            }`}
          >
            ✨ 注册
          </button>
        </div>

        {/* 消息提示 */}
        {msg && (
          <div
            className={`mb-4 p-3.5 rounded-2xl text-sm font-bold text-center animate-slide-up ${
              msg.type === 'error'
                ? 'bg-berry-pale text-berry border-2 border-wrong-pale'
                : 'bg-forest-pale text-forest border-2 border-brand-pale'
            }`}
          >
            {msg.text}
          </div>
        )}

        {/* 表单 */}
        <form
          onSubmit={mode === 'login' ? handleLogin : handleRegister}
          className="space-y-3"
        >
          <input
            ref={userInputRef}
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="用户名"
            required
            minLength={3}
            autoComplete="username"
            className="w-full"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="密码"
            required
            minLength={4}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="w-full"
          />
          {mode === 'register' && (
            <input
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder="昵称（选填，默认同用户名）"
              autoComplete="nickname"
              className="w-full animate-slide-up"
            />
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-brand w-full text-base mt-1"
          >
            {loading
              ? '⏳ 处理中...'
              : mode === 'login'
                ? '🐻 登录'
                : '🐻 创建账号'}
          </button>
        </form>

        {/* 底部链接 */}
        <div className="text-center mt-4">
          <button
            type="button"
            onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
            className="text-sm font-bold text-forest hover:text-forest-light transition-colors"
          >
            {mode === 'login' ? '→ 还没有账号？去注册' : '→ 已有账号？去登录'}
          </button>
        </div>
      </div>

      {/* 底部版本信息 */}
      <p className="text-xs text-ink-muted mt-8 font-bold">
        温暖森林学院 v5.0
      </p>
    </div>
  );
}
