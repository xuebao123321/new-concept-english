import { useState } from 'react';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const API = import.meta.env.PROD
    ? 'https://new-concept-english-production.up.railway.app'
    : 'http://localhost:8000';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    setLoading(true);
    try {
      const ep = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const res = await fetch(`${API}${ep}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '1' },
        body: JSON.stringify({ username, password, nickname: username }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || '操作失败');
      localStorage.setItem('nce_token', d.access_token);
      if (mode === 'register') {
        setMsg('✅ 注册成功！跳转中...');
        setTimeout(() => { window.location.href = '/'; }, 500);
      } else {
        setMsg('✅ 登录成功！跳转中...');
        setTimeout(() => { window.location.href = '/'; }, 500);
      }
    } catch (e: any) {
      setMsg('❌ ' + (e.message || '网络错误'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#FFFBF4' }}>
      <div className="card p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <img
            src="/assets/characters/cast-group.webp"
            alt="温暖森林学院"
            className="w-20 h-20 mx-auto mb-2 rounded-2xl object-cover border-2 border-warm-border"
            style={{ objectPosition: 'center 30%' }}
          />
          <h2 className="text-xl font-extrabold text-[#3D3830]">
            {mode === 'login' ? '欢迎回来' : '创建账号'}
          </h2>
          <p className="text-sm text-[#8B8580] mt-1">新概念英语智能练习 · 本地学习</p>
        </div>

        {msg ? (
          <div className={`mb-4 p-3 rounded-xl text-center text-sm font-bold ${
            msg.startsWith('❌') ? 'bg-[#FFEBEE] text-[#E57373] border border-[#FFCDD2]' :
            'bg-[#E8F5E9] text-[#4CAF50] border border-[#B9DFBA]'
          }`}>
            {msg}
          </div>
        ) : null}

        <form onSubmit={submit} className="space-y-3">
          <input value={username} onChange={e => setUsername(e.target.value)}
            placeholder="用户名" required minLength={3} className="w-full"
            autoComplete="username" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="密码" required minLength={4} className="w-full"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          <button type="submit" disabled={loading}
            className="btn-brand w-full text-base">
            {loading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
          </button>
        </form>

        <div className="text-center mt-4 space-y-1">
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setMsg(''); }}
            className="text-sm font-bold text-[#5B9A5A] block mx-auto">
            {mode === 'login' ? '→ 创建新账号' : '→ 已有账号？登录'}
          </button>
          <button onClick={() => { alert('如需重置密码，请联系管理员'); }}
            className="text-xs text-[#8B8580] block mx-auto mt-1">
            忘记密码？
          </button>
        </div>
      </div>
    </div>
  );
}