import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useUserStore } from '../stores/useUserStore';
import { useLessonProgressStore } from '../stores/useLessonProgressStore';
import { db } from '../db/database';
import { LESSON_GROUPS } from '../data/lessons';
import XpBar from '../components/gamification/XpBar';
import CircularProgress from '../components/common/CircularProgress';
import type { DailyStats } from '../types';
import { springs } from '../utils/motion-tokens';

export default function ProfilePage() {
  const { userState, init } = useUserStore();
  const { progressMap, load: loadProgress } = useLessonProgressStore();
  const [recentStats, setRecentStats] = useState<DailyStats[]>([]);
  const [totalWrong, setTotalWrong] = useState(0);
  const [nickname, setNickname] = useState(() => {
    try { return localStorage.getItem('nce_nickname') || '时间领航员'; }
    catch { return '时间领航员'; }
  });
  const [editingName, setEditingName] = useState(false);

  useEffect(() => { init(); loadProgress(); }, [init, loadProgress]);

  useEffect(() => {
    if (!userState) return;
    (async () => {
      const stats = await db.getRecentStats(7);
      setRecentStats(stats);
      const wrong = await db.wrongQuestions.filter(wq => !wq.mastered).count();
      setTotalWrong(wrong);
    })();
  }, [userState]);

  if (!userState) return null;

  const totalQuestions = userState.totalQuestionsAnswered;
  const overallAccuracy = totalQuestions > 0
    ? Math.round((userState.totalCorrect / totalQuestions) * 100)
    : 0;
  const completedCount = LESSON_GROUPS.filter(g => progressMap.get(g)?.completed).length;

  const maxDaily = Math.max(...recentStats.map(s => s.questionsAnswered), 1);

  const handleReset = () => {
    if (window.confirm('确定要重置所有学习数据吗？此操作不可恢复！')) {
      if (window.confirm('再次确认：所有进度、XP、成就、错题将被清空。确定要继续吗？')) {
        db.delete().then(() => window.location.reload());
      }
    }
  };

  const saveNickname = (name: string) => {
    setNickname(name);
    try { localStorage.setItem('nce_nickname', name); } catch {}
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
        {editingName ? (
          <input
            type="text"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            onBlur={() => { saveNickname(nickname); setEditingName(false); }}
            onKeyDown={e => { if (e.key === 'Enter') { saveNickname(nickname); setEditingName(false); } }}
            className="text-h2 font-bold text-center bg-transparent border-b border-forest text-ink outline-none"
            autoFocus
          />
        ) : (
          <h2
            className="text-h2 font-bold text-ink cursor-pointer hover:text-forest"
            onClick={() => setEditingName(true)}
          >
            {nickname} ✏️
          </h2>
        )}
        <div className="mt-4"><XpBar /></div>
      </motion.div>

      {/* ═══ 2. 分组: 学习概览 ═══ */}
      <SectionTitle emoji="📊" label="学习概览" />
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '总答题', value: totalQuestions, color: '#5B9ED4' },
          { label: '总正确', value: userState.totalCorrect, color: '#5B9A5A' },
          { label: '正确率', value: `${overallAccuracy}%`, color: '#FBBF24' },
          { label: '打卡天', value: userState.streakDays, color: '#E57373' },
          { label: '成就', value: userState.unlockedAchievements.length, color: '#7E57C2' },
          { label: '总XP', value: userState.totalXp, color: '#FF8C42' },
        ].map(stat => (
          <div key={stat.label} className="glass-panel p-3 text-center tabular-nums">
            <div className="text-h3 font-extrabold" style={{ color: stat.color }}>
              {stat.value}
            </div>
            <div className="text-caption text-ink-muted font-bold mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ═══ 3. 分组: 7天趋势 ═══ */}
      <SectionTitle emoji="📅" label="7天练习记录" />
      <div className="glass-panel p-4">
        <div className="flex items-end gap-2 h-24">
          {recentStats.map((stat, i) => {
            const height = stat.questionsAnswered > 0
              ? Math.max((stat.questionsAnswered / maxDaily) * 100, 10) : 4;
            const date = new Date(stat.date);
            const isToday = stat.date === new Date().toISOString().slice(0, 10);
            return (
              <div key={stat.date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-caption font-bold text-ink-light tabular-nums">{stat.questionsAnswered || ''}</span>
                <motion.div
                  className={`w-full rounded-t-md ${isToday ? 'bg-forest' : stat.questionsAnswered > 0 ? 'bg-forest/40' : 'bg-warm-bg'}`}
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                />
                <span className={`text-caption ${isToday ? 'font-bold text-forest' : 'text-ink-muted'}`}>
                  {['日','一','二','三','四','五','六'][date.getDay()]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ 4. 分组: 学习数据明细 ═══ */}
      <SectionTitle emoji="📋" label="学习数据" />
      <div className="glass-panel p-4 space-y-3">
        {[
          ['📝 已掌握课程', `${completedCount}/${LESSON_GROUPS.length} 课`],
          ['📕 错题待复习', `${totalWrong} 题`],
          ['🔥 连续打卡', `${userState.streakDays} 天`],
          ['🏆 已解锁成就', `${userState.unlockedAchievements.length} 个`],
          ['📅 加入时间', new Date(userState.createdAt).toLocaleDateString('zh-CN')],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between items-center">
            <span className="text-meta text-ink-light">{label}</span>
            <span className="text-meta font-semibold text-ink tabular-nums">{value}</span>
          </div>
        ))}
      </div>

      {/* ═══ 5. 分组: 设置 ═══ */}
      <SectionTitle emoji="⚙️" label="设置" />
      <div className="glass-panel p-4 text-center">
        <button
          onClick={handleReset}
          className="text-meta text-berry/70 hover:text-berry transition-colors font-bold"
        >
          ⚠️ 重置学习数据
        </button>
        <p className="text-caption text-ink-muted mt-2">英语重启号 v1.0 · 熊出没·重启未来</p>
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
