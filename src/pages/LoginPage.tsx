import { useState } from 'react';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');

  const API = import.meta.env.PROD
    ? 'https://haven-girdle-chitchat.ngrok-free.dev'
    : 'http://localhost:8000';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, nickname: username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error');
      localStorage.setItem('nce_token', data.access_token);
      setMsg(mode === 'login' ? '登录成功！' : '注册成功！请切换到登录');
      if (mode === 'register') { setMode('login'); setPassword(''); }
      if (mode === 'login') { window.location.href = '/'; }
    } catch (e: any) {
      setMsg('❌ ' + (e.message || '网络错误'));
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '60px auto', padding: 30, background: '#fff', borderRadius: 16 }}>
      <h2 style={{ textAlign: 'center' }}>🐻 {mode === 'login' ? '登录' : '注册'}</h2>
      {msg && <p style={{ textAlign: 'center', color: msg.startsWith('❌') ? 'red' : 'green' }}>{msg}</p>}
      <form onSubmit={handleSubmit}>
        <input value={username} onChange={e => setUsername(e.target.value)}
          placeholder="用户名" required minLength={3}
          style={{ width: '100%', padding: 10, margin: '8px 0', borderRadius: 8, border: '1px solid #ddd' }} />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          placeholder="密码" required minLength={4}
          style={{ width: '100%', padding: 10, margin: '8px 0', borderRadius: 8, border: '1px solid #ddd' }} />
        <button type="submit"
          style={{ width: '100%', padding: 12, margin: '8px 0', background: '#5B9A5A', color: '#fff', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 'bold', cursor: 'pointer' }}>
          {mode === 'login' ? '登录' : '注册'}
        </button>
      </form>
      <p style={{ textAlign: 'center', cursor: 'pointer', color: '#5B9A5A' }}
        onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setMsg(''); }}>
        {mode === 'login' ? '去注册 →' : '去登录 →'}
      </p>
    </div>
  );
}
