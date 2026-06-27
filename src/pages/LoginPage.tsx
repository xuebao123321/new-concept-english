import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../db/api';

export default function LoginPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOk('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await api.login(username, password);
        localStorage.setItem('nce_token', res.access_token);
        setOk('登录成功！跳转中...');
        setTimeout(() => nav('/', { replace: true }), 500);
      } else {
        await api.register(username, password, nickname || username);
        setOk('注册成功！请切换到登录');
        setMode('login');
        setPassword('');
      }
    } catch (e: any) {
      setError(e.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#FFFBF5]">
      <motion.div className="card p-8 w-full max-w-sm" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🐻</div>
          <h2 className="text-xl font-extrabold text-[#3D3830]">{mode === 'login' ? '欢迎回来' : '创建账号'}</h2>
          <p className="text-sm text-[#8B8580] mt-1">新概念英语智能练习</p>
        </div>

        {error && <div className="mb-4 p-3 rounded-xl bg-[#FFEBEE] border border-[#E57373] text-sm text-[#E57373] font-bold text-center">{error}</div>}
        {ok && <div className="mb-4 p-3 rounded-xl bg-[#E8F5E9] border border-[#4CAF50] text-sm text-[#4CAF50] font-bold text-center">{ok}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-[#8B8580] block mb-1">用户名</label>
            <input value={username} onChange={e => setUsername(e.target.value)}
              className="w-full" placeholder="请输入用户名" required minLength={3} autoComplete="username" />
          </div>
          {mode === 'register' && (
            <div>
              <label className="text-xs font-bold text-[#8B8580] block mb-1">昵称</label>
              <input value={nickname} onChange={e => setNickname(e.target.value)}
                className="w-full" placeholder="给自己取个名字" autoComplete="name" />
            </div>
          )}
          <div>
            <label className="text-xs font-bold text-[#8B8580] block mb-1">密码</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full" placeholder="请输入密码" required minLength={4} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-2xl text-white font-extrabold text-base bg-[#5B9A5A]"
            style={{ opacity: loading ? 0.6 : 1 }}>
            {loading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
          </button>
        </form>

        <div className="text-center mt-4">
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setOk(''); }}
            className="text-sm font-bold text-[#5B9A5A]">
            {mode === 'login' ? '还没有账号？去注册 →' : '已有账号？去登录 →'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
