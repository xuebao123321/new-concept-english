import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/useAuthStore';

export default function LoginPage() {
  const nav = useNavigate();
  const { login, register, isLoading, error, clearError } = useAuthStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'login') {
      await login(username, password);
    } else {
      await register(username, password, nickname || username);
    }
    // 等一小段确保 state 更新完毕
    setTimeout(() => {
      const st = useAuthStore.getState();
      if (st.token && st.isLoggedIn) {
        nav('/', { replace: true });
      }
    }, 200);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#FFFBF5' }}>
      <motion.div
        className="card p-8 w-full max-w-sm"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🐻</div>
          <h2 className="text-xl font-extrabold text-[#3D3830]">
            {mode === 'login' ? '欢迎回来' : '加入我们'}
          </h2>
          <p className="text-sm text-[#8B8580] mt-1">新概念英语智能练习</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[#FFEBEE] border border-[#E57373] text-sm text-[#E57373] font-bold text-center">
            {error}
            <button onClick={clearError} className="ml-2 underline">关闭</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-[#8B8580] block mb-1">用户名</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)}
              className="w-full" placeholder="请输入用户名" required minLength={3} />
          </div>
          {mode === 'register' && (
            <div>
              <label className="text-xs font-bold text-[#8B8580] block mb-1">昵称</label>
              <input type="text" value={nickname} onChange={e => setNickname(e.target.value)}
                className="w-full" placeholder="给自己取个名字" />
            </div>
          )}
          <div>
            <label className="text-xs font-bold text-[#8B8580] block mb-1">密码</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full" placeholder="请输入密码" required minLength={4} />
          </div>
          <button type="submit" disabled={isLoading}
            className="btn-brand w-full py-3 rounded-2xl text-white font-extrabold text-base"
            style={{ opacity: isLoading ? 0.6 : 1 }}>
            {isLoading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
          </button>
        </form>

        <div className="text-center mt-4">
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); clearError(); }}
            className="text-sm font-bold text-[#5B9A5A]">
            {mode === 'login' ? '还没有账号？去注册 →' : '已有账号？去登录 →'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
