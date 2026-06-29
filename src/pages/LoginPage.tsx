import { useState } from 'react';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<'student' | 'parent'>('student');
  const [familyCode, setFamilyCode] = useState('');
  const [parentFamilyCode, setParentFamilyCode] = useState(''); // 家长注册成功后展示

  // 忘记密码子状态
  const [showForgot, setShowForgot] = useState(false);
  const [forgotUsername, setForgotUsername] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetCodeSent, setResetCodeSent] = useState(false);
  const [resetDone, setResetDone] = useState(false);

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
        body: JSON.stringify({ username, password, nickname: username, role, family_code: familyCode }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || '操作失败');
      localStorage.setItem('nce_token', d.access_token);
      if (mode === 'register') {
        if (role === 'parent' && d.user?.family_code) {
          setParentFamilyCode(d.user.family_code);
          setMsg(`✅ 注册成功! 你的家庭码: ${d.user.family_code}`);
          setMode('login');
          setPassword('');
        } else {
          setMsg('✅ 注册成功！跳转中...');
          setTimeout(() => { window.location.href = '/'; }, 500);
        }
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

  // 发送重置码
  const handleForgot = async () => {
    setMsg('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: forgotUsername }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || '操作失败');
      if (d.code) {
        setResetCode(d.code);
        setResetCodeSent(true);
        setMsg('💡 重置码已生成,有效期 10 分钟');
      } else {
        setMsg('💡 如果账号存在,重置码已生成');
      }
    } catch (e: any) {
      setMsg('❌ ' + (e.message || '网络错误'));
    } finally {
      setLoading(false);
    }
  };

  // 执行重置密码
  const handleReset = async () => {
    setMsg('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: forgotUsername, code: resetCode, new_password: newPassword }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || '操作失败');
      setResetDone(true);
      setMsg('✅ 密码已重置! 请用新密码登录');
      setTimeout(() => {
        setShowForgot(false);
        setResetCodeSent(false);
        setResetDone(false);
        setUsername(forgotUsername);
        setPassword('');
        setMode('login');
      }, 2000);
    } catch (e: any) {
      setMsg('❌ ' + (e.message || '网络错误'));
    } finally {
      setLoading(false);
    }
  };

  // 忘记密码面板
  if (showForgot) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#FFFBF4' }}>
        <div className="card p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <h2 className="text-xl font-extrabold text-[#3D3830]">🔑 重置密码</h2>
            <p className="text-sm text-[#8B8580] mt-1">输入用户名获取重置码</p>
          </div>

          {msg ? (
            <div className={`mb-4 p-3 rounded-xl text-center text-sm font-bold ${
              msg.startsWith('❌') ? 'bg-[#FFEBEE] text-[#E57373] border border-[#FFCDD2]' :
              'bg-[#E8F5E9] text-[#4CAF50] border border-[#B9DFBA]'
            }`}>
              {msg}
            </div>
          ) : null}

          {!resetDone ? (
            <div className="space-y-3">
              <input value={forgotUsername} onChange={e => setForgotUsername(e.target.value)}
                placeholder="用户名" required minLength={3} className="w-full"
                disabled={resetCodeSent} />

              {!resetCodeSent ? (
                <button onClick={handleForgot} disabled={loading || !forgotUsername}
                  className="btn-brand w-full text-base">
                  {loading ? '发送中...' : '发送重置码'}
                </button>
              ) : (
                <>
                  <input value={resetCode} onChange={e => setResetCode(e.target.value)}
                    placeholder="输入 6 位重置码" maxLength={6} className="w-full" />
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    placeholder="新密码 (至少 4 位)" minLength={4} className="w-full" />
                  <button onClick={handleReset} disabled={loading || !resetCode || !newPassword}
                    className="btn-brand w-full text-base">
                    {loading ? '重置中...' : '重置密码'}
                  </button>
                </>
              )}

              <button onClick={() => { setShowForgot(false); setResetCodeSent(false); setResetDone(false); setMsg(''); }}
                className="text-sm text-[#8B8580] block mx-auto">
                ← 返回登录
              </button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

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

          {/* 角色选择 (仅注册) */}
          {mode === 'register' && (
            <div className="flex gap-2">
              <button type="button" onClick={() => setRole('student')}
                className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                  role === 'student' ? 'border-forest bg-forest-pale text-forest' : 'border-warm-border text-ink-light'
                }`}>
                📚 我是学生
              </button>
              <button type="button" onClick={() => setRole('parent')}
                className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                  role === 'parent' ? 'border-honey bg-honey-pale text-honey' : 'border-warm-border text-ink-light'
                }`}>
                👨‍👩‍👧 我是家长
              </button>
            </div>
          )}

          {/* 学生注册: 家庭码输入 */}
          {mode === 'register' && role === 'student' && (
            <input value={familyCode} onChange={e => setFamilyCode(e.target.value.toUpperCase())}
              placeholder="家长给你的家庭码 (6位)" maxLength={6} className="w-full"
              autoComplete="off" />
          )}

          {/* 家长注册成功展示家庭码 */}
          {mode === 'login' && parentFamilyCode && (
            <div className="p-3 rounded-xl bg-honey-pale border border-honey/30 text-center">
              <p className="text-sm font-bold text-honey">👨‍👩‍👧 你的家庭码</p>
              <p className="text-2xl font-extrabold text-ink tracking-widest mt-1">{parentFamilyCode}</p>
              <p className="text-xs text-ink-muted mt-1">让学生注册时输入此码加入家庭</p>
            </div>
          )}

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
          <button onClick={() => { setShowForgot(true); setMsg(''); setResetCodeSent(false); setResetDone(false); }}
            className="text-xs text-[#8B8580] block mx-auto mt-1">
            忘记密码？
          </button>
          <a href="/welcome" className="text-xs text-ink-muted block text-center mt-3 hover:text-ink-light">
            ← 了解温暖森林学院
          </a>
        </div>
      </div>
    </div>
  );
}