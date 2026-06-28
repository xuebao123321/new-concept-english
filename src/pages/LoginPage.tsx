import { useState } from 'react';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [msg, setMsg] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('请求中...');
    try {
      const ep = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const res = await fetch(`https://haven-girdle-chitchat.ngrok-free.dev${ep}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '1' },
        body: JSON.stringify({ username: u, password: p, nickname: u }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || 'err');
      localStorage.setItem('nce_token', d.access_token);
      if (mode === 'register') { setMsg('注册成功，切到登录'); setMode('login'); setP(''); }
      else { setMsg('登录成功'); setTimeout(() => location.href = '/', 500); }
    } catch (e: any) { setMsg(e.message); }
  };

  return (
    <div style={{ maxWidth: 380, margin: '40px auto', padding: 24, background: '#fff', borderRadius: 16, border: '2px solid #E8E0D5' }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 40 }}>🐻</div>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#3D3830', margin: '8px 0 0' }}>{mode === 'login' ? '登录' : '注册'}</h2>
      </div>
      {msg ? <div style={{ padding: 10, margin: '0 0 12px', borderRadius: 10, textAlign: 'center', fontSize: 14, fontWeight: 700, background: msg.includes('成功') ? '#E8F5E9' : '#FFEBEE', color: msg.includes('成功') ? '#4CAF50' : '#E57373' }}>{msg}</div> : null}
      <form onSubmit={submit}>
        <input value={u} onChange={e => setU(e.target.value)} placeholder="用户名" required minLength={3}
          style={{ display: 'block', width: '100%', padding: 10, margin: '0 0 10px', border: '2px solid #E8E0D5', borderRadius: 12, fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />
        <input type="password" value={p} onChange={e => setP(e.target.value)} placeholder="密码" required minLength={4}
          style={{ display: 'block', width: '100%', padding: 10, margin: '0 0 12px', border: '2px solid #E8E0D5', borderRadius: 12, fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />
        <button type="submit"
          style={{ display: 'block', width: '100%', padding: 12, background: '#5B9A5A', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 800, cursor: 'pointer' }}>
          {mode === 'login' ? '登录' : '注册'}
        </button>
      </form>
      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setMsg(''); }}
          style={{ background: 'none', border: 'none', color: '#5B9A5A', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          {mode === 'login' ? '去注册 →' : '去登录 →'}
        </button>
      </div>
    </div>
  );
}
