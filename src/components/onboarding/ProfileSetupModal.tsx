import { useState } from 'react';
import { motion } from 'framer-motion';
import { springs } from '../../utils/motion-tokens';

const GRADES = [
  { value: 'grade-1', label: '一年级' },
  { value: 'grade-2', label: '二年级' },
  { value: 'grade-3', label: '三年级' },
  { value: 'grade-4', label: '四年级' },
  { value: 'grade-5', label: '五年级' },
  { value: 'grade-6', label: '六年级' },
  { value: 'grade-7', label: '初一' },
  { value: 'grade-8', label: '初二' },
  { value: 'grade-9', label: '初三' },
];

export const GRADE_LABELS: Record<string, string> = Object.fromEntries(
  GRADES.map(g => [g.value, g.label]),
);

interface Props {
  onDone: (nickname: string, grade: string) => void;
  onSkip: () => void;
}

export default function ProfileSetupModal({ onDone, onSkip }: Props) {
  const [nickname, setNickname] = useState('');
  const [grade, setGrade] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const hasChinese = /[一-鿿]/.test(nickname);
    if (!hasChinese && nickname.trim().length < 2) {
      setError('请输入至少2个字符的昵称，建议使用中文~');
      return;
    }
    if (!grade) {
      setError('请选择你的年级~');
      return;
    }
    onDone(nickname.trim(), grade);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <motion.div
        className="card p-6 mx-4 mb-8 sm:mb-0 max-w-sm w-full space-y-4"
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }} transition={springs.popIn}
      >
        <div className="text-center">
          <div className="text-4xl mb-2">🐻</div>
          <h2 className="text-h2 text-ink font-extrabold">完善你的信息</h2>
          <p className="text-xs text-ink-muted mt-1">让熊二更好地认识你~</p>
        </div>

        {/* 昵称输入 */}
        <div>
          <label className="text-xs font-bold text-ink-light mb-1 block">
            🏷️ 你的昵称（建议中文）
          </label>
          <input
            type="text"
            value={nickname}
            onChange={e => { setNickname(e.target.value); setError(''); }}
            placeholder="如：小明、乐乐..."
            maxLength={12}
            className="w-full p-3 rounded-xl border-2 border-warm-border text-sm font-bold
                       focus:border-forest outline-none"
          />
        </div>

        {/* 年级选择 */}
        <div>
          <label className="text-xs font-bold text-ink-light mb-1 block">
            📚 你的年级
          </label>
          <div className="grid grid-cols-3 gap-2">
            {GRADES.map(g => (
              <button
                key={g.value}
                onClick={() => { setGrade(g.value); setError(''); }}
                className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                  grade === g.value
                    ? 'bg-forest-pale border-forest text-forest'
                    : 'bg-warm-bg border-warm-border text-ink-light hover:border-forest/30'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <p className="text-xs text-berry font-bold text-center">{error}</p>
        )}

        {/* 按钮 */}
        <div className="flex gap-2">
          <button onClick={onSkip}
            className="flex-1 py-2.5 text-sm font-bold rounded-xl bg-warm-bg text-ink-light">
            跳过
          </button>
          <button onClick={handleSubmit}
            className="flex-1 py-2.5 text-sm font-bold rounded-xl bg-forest text-cream
                       hover:bg-forest/90 active:scale-[0.98] transition-all">
            🚀 完成
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
