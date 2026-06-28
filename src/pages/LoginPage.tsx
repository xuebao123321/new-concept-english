import { useState } from 'react';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const API = import.meta.env.PROD
    ? 'https://haven-girdle-chitchat.ngrok-free.dev'
    : 'http://localhost:8000';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '1' },
        body: JSON.stringify({ username, password, nickname: username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || '操作失败');
      localStorage.setItem('nce_token', data.access_token);
      if (mode === 'register') {
        setMsg('✅ 注册成功！请登录');
        setMode('login');
        setPassword('');
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
    <div className="px-4 py-10">
      <div className="card p-6 max-w-sm mx-auto">
        <div className="text-center mb-5">
          <div className="text-4xl mb-2">🐻</div>
          <h2 className="text-xl font-extrabold text-[#3D3830]">
            {mode === 'login' ? '欢迎回来' : '创建账号'}
          </h2>
          <p className="text-sm text-[#8B8580] mt-1">新概念英语智能练习</p>
        </div>

        {msg && (
          <div className={`mb-4 p-3 rounded-xl text-center text-sm font-bold ${
            msg.startsWith('❌') ? 'bg-[#FFEBEE] text-[#E57373]' : 'bg-[#E8F5E9] text-[#4CAF50]'
          }`}>
            {msg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
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

        <div className="text-center mt-4">
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setMsg(''); }}
            className="text-sm font-bold text-[#5B9A5A]">
            {mode === 'login' ? '还没有账号？去注册 →' : '已有账号？去登录 →'}
          </button>
        </div>
      </div>
    </div>
  );
}
