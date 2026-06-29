import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useUserStore } from '../stores/useUserStore';
import { db } from '../db/database';
import XpBar from '../components/gamification/XpBar';
import { springs } from '../utils/motion-tokens';
import { useAuthStore } from '../stores/useAuthStore';
import { api } from '../db/api';
import { GRADE_LABELS } from '../components/onboarding/ProfileSetupModal';

export default function ProfilePage() {
  const { userState, init } = useUserStore();
  const { user } = useAuthStore();
  const [totalWrong, setTotalWrong] = useState(0);
  const [editingName, setEditingName] = useState(false);

  useEffect(() => { init(); }, [init]);

  useEffect(() => {
    if (!userState) return;
    (async () => {
      const wrong = await db.wrongQuestions.filter(wq => !wq.mastered).count();
      setTotalWrong(wrong);
    })();
  }, [userState]);

  if (!userState) return null;

  // ═══ 家长视图: 简洁卡片,不展示学习数据 ═══
  if (user?.role === 'parent') {
    const parentNickname = user?.nickname || user?.username || '家长';
    const saveParentNickname = async (name: string) => {
      try { await api.updateProfile({ nickname: name }); } catch {}
    };

    return (
      <div className="px-4 py-4 space-y-5">
        <motion.div className="glass-panel p-6 text-center border-forest/20"
          initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={springs.enter}>
          <div className="text-5xl mb-2">👨‍👩‍👧</div>
          {editingName ? (
            <input type="text" defaultValue={parentNickname}
              onBlur={e => { saveParentNickname(e.target.value); setEditingName(false); }}
              onKeyDown={e => { if (e.key === 'Enter') { saveParentNickname((e.target as HTMLInputElement).value); setEditingName(false); } }}
              className="text-h2 font-bold text-center bg-transparent border-b border-forest text-ink outline-none" autoFocus />
          ) : (
            <h2 className="text-h2 font-bold text-ink cursor-pointer hover:text-forest"
              onClick={() => setEditingName(true)}>{parentNickname} ✏️</h2>
          )}
          <p className="text-meta text-ink-light mt-1">家长账号</p>
          {user?.family_code && (
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="text-sm text-ink-light">家庭码</span>
              <span className="text-h2 font-extrabold text-ink tracking-widest">{user.family_code}</span>
              <button onClick={() => { navigator.clipboard.writeText(user.family_code || ''); }}
                className="text-xs px-2 py-0.5 rounded-full bg-forest-pale text-forest font-bold">📋</button>
            </div>
          )}
          <a href="/parent" className="inline-block mt-3 text-sm font-bold text-forest hover:underline">
            👨‍👩‍👧 进入家长面板 →
          </a>
        </motion.div>

        <SectionTitle emoji="⚙️" label="设置" />
        <div className="glass-panel p-4 space-y-3">
          <ChangePasswordForm />
          <div className="h-px bg-warm-border" />
          <DeleteAccountButton />
          <p className="text-caption text-ink-muted text-center pt-1">英语重启号 v1.0 · 温暖森林学院</p>
        </div>
      </div>
    );
  }

  // ═══ 学生视图 ═══

  const handleReset = () => {
    if (window.confirm('确定要重置所有学习数据吗？此操作不可恢复！')) {
      if (window.confirm('再次确认：所有进度、XP、成就、错题将被清空。确定要继续吗？')) {
        db.delete().then(() => window.location.reload());
      }
    }
  };

  return (
    <div className="px-4 py-4 space-y-5">
      {/* ═══ 1. Hero · 头像 + 昵称 + 段位 ═══ */}
      <motion.div
        className="glass-panel p-6 text-center border-forest/20"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={springs.enter}
      >
        <img
          src="/assets/characters/new-year.webp"
          alt="头像"
          className="w-24 h-24 mx-auto mb-2 rounded-2xl object-cover border-2 border-warm-border shadow-sm"
          style={{ objectPosition: 'center 25%' }}
        />
        <h2 className="text-h2 font-bold text-ink">
          {user?.nickname || user?.username || '时间领航员'}
        </h2>
        {(user as any)?.grade && (
          <p className="text-sm text-ink-light mt-1">
            📚 {GRADE_LABELS[(user as any).grade] || (user as any).grade}
          </p>
        )}
        {user?.role === 'student' && (
          <p className="text-caption text-ink-muted mt-1">
            💡 如需修改昵称或年级，请联系家长 👨‍👩‍👧
          </p>
        )}
        {user?.role === 'parent' && user?.family_code && (
          <p className="text-meta text-honey font-bold mt-1">👨‍👩‍👧 家长 · 邀请码: {user.family_code}</p>
        )}
        {user?.parent_id && (
          <p className="text-meta text-forest font-bold mt-1">📚 学生 · 已加入家庭</p>
        )}
        <div className="mt-4"><XpBar /></div>
      </motion.div>

      {/* ═══ 2. 快捷入口 ═══ */}
      <div className="grid grid-cols-2 gap-3">
        <a href="/wrong-book"
          className="glass-panel p-4 text-center hover:border-forest/30 transition-colors">
          <div className="text-3xl mb-1">📕</div>
          <div className="text-sm font-bold text-ink">错题本</div>
          <div className="text-caption text-berry font-bold mt-0.5">{totalWrong} 道待复习</div>
        </a>
        <a href="/review"
          className="glass-panel p-4 text-center hover:border-forest/30 transition-colors">
          <div className="text-3xl mb-1">📝</div>
          <div className="text-sm font-bold text-ink">间隔复习</div>
          <div className="text-caption text-ink-muted mt-0.5">科学记忆曲线</div>
        </a>
      </div>

      {/* ═══ 3. 分组: 设置 ═══ */}
      <SectionTitle emoji="⚙️" label="设置" />
      <div className="glass-panel p-4 space-y-3">
        {/* 修改密码 */}
        <ChangePasswordForm />
        <div className="h-px bg-warm-border" />
        {/* 重置学习数据 */}
        <button
          onClick={handleReset}
          className="text-meta text-berry/70 hover:text-berry transition-colors font-bold w-full"
        >
          ⚠️ 重置学习数据
        </button>
        <div className="h-px bg-warm-border" />
        {/* 删除账号 */}
        <DeleteAccountButton />
        <p className="text-caption text-ink-muted text-center pt-1">英语重启号 v1.0 · 温暖森林学院</p>
      </div>
    </div>
  );
}

/* ─── 分组小标题 ─── */
function SectionTitle({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="text-caption text-ink-light uppercase tracking-wider font-extrabold">{emoji} {label}</span>
      <div className="flex-1 h-px bg-warm-border" />
    </div>
  );
}

/* ─── 修改密码表单 ─── */
function ChangePasswordForm() {
  const [show, setShow] = useState(false);
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = async () => {
    if (newPw !== confirm) { setMsg('❌ 两次输入的新密码不一致'); return; }
    if (newPw.length < 4) { setMsg('❌ 新密码至少 4 位'); return; }
    setLoading(true);
    setMsg('');
    try {
      await api.changePassword(oldPw, newPw);
      setMsg('✅ 密码已修改');
      setOldPw(''); setNewPw(''); setConfirm('');
      setTimeout(() => setShow(false), 1500);
    } catch (e: any) {
      setMsg('❌ ' + (e.message || '修改失败'));
    } finally {
      setLoading(false);
    }
  };

  if (!show) {
    return (
      <button onClick={() => setShow(true)}
        className="text-meta text-ink-light hover:text-ink font-bold w-full text-left">
        🔑 修改密码
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-meta font-bold text-ink">🔑 修改密码</div>
      {msg && <div className={`text-xs font-bold ${msg.startsWith('✅') ? 'text-forest' : 'text-berry'}`}>{msg}</div>}
      <input type="password" value={oldPw} onChange={e => setOldPw(e.target.value)}
        placeholder="原密码" className="w-full text-sm" />
      <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
        placeholder="新密码 (至少 4 位)" className="w-full text-sm" />
      <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
        placeholder="确认新密码" className="w-full text-sm" />
      <div className="flex gap-2">
        <button onClick={handleChange} disabled={loading || !oldPw || !newPw || !confirm}
          className="flex-1 py-2 text-sm btn-brand">
          {loading ? '保存中...' : '保存'}
        </button>
        <button onClick={() => { setShow(false); setMsg(''); }}
          className="flex-1 py-2 text-sm btn-ghost">取消</button>
      </div>
    </div>
  );
}

/* ─── 删除账号按钮 ─── */
function DeleteAccountButton() {
  const { logout } = useAuthStore();
  const [confirming, setConfirming] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm('确定要删除账号吗?所有学习数据将被永久删除,不可恢复。')) return;
    try {
      await api.deleteAccount();
      logout();
      window.location.href = '/welcome';
    } catch (e: any) {
      alert('删除失败: ' + (e.message || '网络错误'));
    }
  };

  return (
    <button
      onClick={handleDelete}
      className="text-meta text-berry/60 hover:text-berry transition-colors font-bold w-full text-left"
    >
      🗑️ 删除账号
    </button>
  );
}
