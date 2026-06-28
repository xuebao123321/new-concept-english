import { useState } from 'react';

const s = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: '#FFFBF5', fontFamily: 'sans-serif' } as React.CSSProperties,
  card: { width: '100%', maxWidth: 380, background: '#fff', borderRadius: 20, padding: 28, border: '2px solid #E8E0D5', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' } as React.CSSProperties,
  emoji: { fontSize: 44, textAlign: 'center' as const, marginBottom: 8 },
  title: { fontSize: 20, fontWeight: 800, color: '#3D3830', textAlign: 'center' as const, margin: '0 0 4px' },
  sub: { fontSize: 13, color: '#8B8580', textAlign: 'center' as const, marginBottom: 20 },
  input: { display: 'block', width: '100%', padding: 12, marginBottom: 10, border: '2px solid #E8E0D5', borderRadius: 14, fontSize: 15, outline: 'none', boxSizing: 'border-box' as const, background: '#fff' },
  btn: { display: 'block', width: '100%', padding: 14, background: '#5B9A5A', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 800, cursor: 'pointer', marginTop: 4 },
  link: { background: 'none', border: 'none', color: '#5B9A5A', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'block', margin: '16px auto 0', textAlign: 'center' as const },
  msg: (ok: boolean) => ({ padding: 12, marginBottom: 12, borderRadius: 12, textAlign: 'center' as const, fontSize: 14, fontWeight: 700, background: ok ? '#E8F5E9' : '#FFEBEE', color: ok ? '#4CAF50' : '#E57373' }),
};

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    setLoading(true);
    try {
      const ep = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const url = `https://new-concept-english-production.up.railway.app${ep}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '1' },
        body: JSON.stringify({ username: u, password: p, nickname: u }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || '操作失败');
      localStorage.setItem('nce_token', d.access_token);
      if (mode === 'register') {
        setMsg('✅ 注册成功！请登录');
        setMode('login');
        setP('');
      } else {
        setMsg('✅ 登录成功！跳转中...');
        setTimeout(() => { location.href = '/'; }, 500);
      }
    } catch (e: any) {
      setMsg('❌ ' + (e.message || '网络错误'));
    } finally {
      setLoading(false);
    }
  };

  const isOk = msg.includes('✅');

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.emoji}>🐻</div>
        <h2 style={s.title}>{mode === 'login' ? '欢迎回来' : '创建账号'}</h2>
        <p style={s.sub}>新概念英语智能练习</p>
        {msg ? <div style={s.msg(isOk)}>{msg}</div> : null}
        <form onSubmit={submit}>
          <input style={s.input} value={u} onChange={e => setU(e.target.value)} placeholder="用户名" required minLength={3} autoComplete="username" />
          <input style={s.input} type="password" value={p} onChange={e => setP(e.target.value)} placeholder="密码" required minLength={4} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          <button type="submit" disabled={loading} style={{ ...s.btn, opacity: loading ? 0.6 : 1 }}>
            {loading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
          </button>
        </form>
        <button style={s.link} onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setMsg(''); }}>
          {mode === 'login' ? '→ 去注册' : '→ 去登录'}
        </button>
      </div>
    </div>
  );
}
