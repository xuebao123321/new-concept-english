import { useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../db/api';
import { useAuthStore } from '../../stores/useAuthStore';
import { springs } from '../../utils/motion-tokens';

/**
 * 家庭绑定守卫: 学生没有 parent_id → 必须输入家庭码绑定后才能继续
 * 显示全屏遮罩,绑定成功后关闭
 */
export default function FamilyBindGate() {
  const { user } = useAuthStore();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  // 只在学生 + 未绑定家庭时显示
  if (user?.role !== 'student' || user?.parent_id) return null;
  if (done) return null;

  const handleBind = async () => {
    if (code.length !== 6) { setError('家庭码为 6 位字母数字'); return; }
    setLoading(true);
    setError('');
    try {
      await api.bindFamily(code);
      // 刷新 token 中的 user 信息 (重新 getProfile)
      window.location.reload();
    } catch (e: any) {
      setError(e.message || '绑定失败,请检查家庭码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-cream px-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
    >
      <motion.div
        className="card p-8 max-w-sm w-full text-center space-y-4"
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
        transition={springs.popIn}
      >
        <div className="text-5xl">👨‍👩‍👧</div>
        <h2 className="text-h2 text-ink">加入家庭学习小组</h2>
        <p className="text-meta text-ink-light leading-relaxed">
          请向你的家长索要 6 位家庭码,<br/>绑定后即可开始学习
        </p>

        <input
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="输入 6 位家庭码"
          maxLength={6}
          className="w-full text-center text-xl tracking-widest font-extrabold"
          autoFocus
          autoComplete="off"
        />

        {error && (
          <p className="text-sm text-berry font-bold">{error}</p>
        )}

        <button onClick={handleBind} disabled={loading || code.length < 6}
          className="btn-brand w-full text-base">
          {loading ? '绑定中...' : '🔗 绑定家庭'}
        </button>

        <p className="text-caption text-ink-muted">
          没有家庭码? 请让家长先注册获取家庭码
        </p>
      </motion.div>
    </motion.div>
  );
}