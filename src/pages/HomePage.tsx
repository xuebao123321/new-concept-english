import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserStore } from '../stores/useUserStore';
import { useLessonProgressStore } from '../stores/useLessonProgressStore';
import { db } from '../db/database';
import { LESSON_GROUPS } from '../data/lessons';
import XpBar from '../components/gamification/XpBar';
import StreakBadge from '../components/gamification/StreakBadge';
import AchievementToast from '../components/gamification/AchievementToast';
import CharacterAvatar from '../components/common/CharacterAvatar';

const GREETINGS = [
  { char: 'xionger' as const, name: '熊二', text: '欢迎回来！今天也要开心学英语哦~ 🍯' },
  { char: 'xiongda' as const, name: '熊大', text: '领航员来了！坚持就是胜利，你一定能行！💪' },
  { char: 'guangtouqiang' as const, name: '光头强', text: '学习系统已就绪！按计划一步步来~ 📊' },
  { char: 'xionger' as const, name: '熊二', text: '嘿嘿，今天的能量很充沛！来几题热热身？' },
  { char: 'guangtouqiang' as const, name: '光头强', text: '数据显示你进步很快！继续保持~ 🚀' },
  { char: 'xiongda' as const, name: '熊大', text: '遇到难题别怕，有我们陪着你！慢慢来~ 🌟' },
];

export default function HomePage() {
  const nav = useNavigate();
  const { userState, init, isLoading } = useUserStore();
  const { load, isCompleted, getNextUnlocked } = useLessonProgressStore();
  const [stats, setStats] = useState({ done: 0, correct: 0, xp: 0 });
  const [dueReview, setDueReview] = useState(0);
  const [greeting] = useState(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => { init(); load(); }, [init, load]);

  useEffect(() => {
    if (!userState) return;
    (async () => {
      const t = await db.getTodayStats();
      if (t) setStats({ done: t.questionsAnswered, correct: t.correctCount, xp: t.xpEarned });
      const due = await db.getDueReviewQuestions();
      setDueReview(due.length);
    })();
  }, [userState]);

  // 新用户引导：没有任何完成记录
  useEffect(() => {
    if (!isLoading) {
      const completedCount = LESSON_GROUPS.filter(g => isCompleted(g)).length;
      const seenOnboarding = localStorage.getItem('nce_onboarding_done');
      if (completedCount === 0 && !seenOnboarding) {
        setShowOnboarding(true);
      }
    }
  }, [isLoading]);

  const dismissOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem('nce_onboarding_done', '1');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center pt-32 gap-5">
        <CharacterAvatar character="xionger" size="lg" animation="bounce" />
        <p className="text-base text-ink-light font-bold animate-pulse">🐻 正在准备学习森林...</p>
      </div>
    );
  }

  const nextLesson = getNextUnlocked();
  const doneCount = LESSON_GROUPS.filter(g => isCompleted(g)).length;

  return (
    <div className="px-4 py-4 space-y-4 relative z-10">
      <AchievementToast />

      {/* ═══ 新用户引导浮层 ═══ */}
      <AnimatePresence>
        {showOnboarding && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismissOnboarding}
          >
            <motion.div
              className="card p-6 mx-4 mb-8 sm:mb-0 max-w-sm w-full text-center space-y-4"
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              onClick={e => e.stopPropagation()}
            >
              <CharacterAvatar character="guangtouqiang" size="lg" animation="bounce" />
              <div>
                <p className="text-lg font-extrabold text-ink">欢迎来到温暖森林学院！🌳</p>
                <p className="text-sm text-ink-light mt-1">我是光头强，让我带你快速入门~</p>
              </div>
              <div className="space-y-2 text-left text-sm text-ink-light">
                <div className="flex items-center gap-3 bg-forest-pale p-3 rounded-2xl">
                  <span className="text-2xl">①</span>
                  <span>点击底部 <strong className="text-forest">📚 学习</strong> 开始第一课</span>
                </div>
                <div className="flex items-center gap-3 bg-honey-pale p-3 rounded-2xl">
                  <span className="text-2xl">②</span>
                  <span>完成 <strong className="text-honey">词汇→语法→句型→听力</strong> 四个关卡</span>
                </div>
                <div className="flex items-center gap-3 bg-sky-pale p-3 rounded-2xl">
                  <span className="text-2xl">③</span>
                  <span>通过 <strong className="text-sky">综合测试</strong> 解锁下一课！</span>
                </div>
              </div>
              <button onClick={dismissOnboarding} className="btn-brand text-base">
                🚀 开始冒险！
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ 角色问候 ═══ */}
      <motion.div
        className="card card-accent overflow-hidden relative"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #FF8C42 0%, transparent 70%)' }} />
        <div className="flex items-center gap-4">
          <CharacterAvatar character={greeting.char} size="lg" animation="float" />
          <div className="flex-1">
            <p className="text-lg font-extrabold text-ink">
              {greeting.char === 'xionger' ? '🐻 熊二' : greeting.char === 'xiongda' ? '🐻 熊大' : '🔬 光头强'}
            </p>
            <p className="text-sm text-ink-light font-medium mt-0.5 leading-relaxed">{greeting.text}</p>
          </div>
        </div>
      </motion.div>

      {/* ═══ XP 段位 + 打卡 ═══ */}
      <motion.div
        className="card p-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
      >
        <XpBar />
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-warm-border">
          <StreakBadge />
          <span className="text-xs text-ink-light font-bold">
            ❤️ {userState?.hearts ?? 5} · ⭐ {userState?.totalXp ?? 0}XP
          </span>
        </div>
      </motion.div>

      {/* ═══ 快捷入口 2x2 ═══ */}
      <motion.div
        className="grid grid-cols-2 gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <QuickCard
          emoji="📚" title="开始学习"
          subtitle={nextLesson ? `第${LESSON_GROUPS.indexOf(nextLesson)+1}关` : '已全部完成'}
          bg="bg-forest-pale" border="border-forest" text="text-forest"
          highlight
          onClick={() => nav(nextLesson ? `/lesson/${nextLesson}` : '/lesson')}
        />
        <QuickCard
          emoji={dueReview > 0 ? '📝' : '🌟'} title={dueReview > 0 ? `${dueReview}题待复习` : '学习星图'}
          subtitle={dueReview > 0 ? '点击复习' : `${doneCount}/${LESSON_GROUPS.length}课`}
          bg="bg-honey-pale" border="border-honey/30" text="text-honey"
          onClick={() => nav(dueReview > 0 ? '/review' : '/star-map')}
        />
        <QuickCard
          emoji="🔍" title="水平测试"
          subtitle="看看学到哪了"
          bg="bg-sky-pale" border="border-sky/30" text="text-sky"
          onClick={() => nav('/diagnosis')}
        />
        <QuickCard
          emoji="🏆" title="荣誉勋章"
          subtitle={`${userState?.unlockedAchievements.length || 0}个`}
          bg="bg-plum-pale" border="border-plum/30" text="text-plum"
          onClick={() => nav('/achievements')}
        />
      </motion.div>

      {/* ═══ 今日进度 ═══ */}
      <motion.div
        className="card card-highlight"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14 }}
      >
        <h3 className="text-sm font-extrabold text-ink mb-3">📊 今日学习</h3>
        <div className="grid grid-cols-3 gap-3 mb-3">
          {[
            { label: '已答题', value: stats.done, color: '#5B9ED4' },
            { label: '正确', value: stats.correct, color: '#5B9A5A' },
            { label: 'XP', value: `+${stats.xp}`, color: '#FF8C42' },
          ].map(s => (
            <div key={s.label} className="text-center bg-warm-bg rounded-2xl py-2.5">
              <div className="text-xl font-extrabold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[11px] text-ink-light font-bold mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-bold">
            <span className="text-ink-light">🎯 今日目标</span>
            <span className="text-ink-muted">{Math.min(stats.done, 15)}/15 题</span>
          </div>
          <div className="progress-track">
            <motion.div
              className="progress-fill progress-brand"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((stats.done / 15) * 100, 100)}%` }}
              transition={{ duration: 0.8 }}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function QuickCard({ emoji, title, subtitle, bg, border, text, highlight, onClick }: {
  emoji: string; title: string; subtitle: string;
  bg: string; border: string; text: string;
  highlight?: boolean; onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      className={`p-4 rounded-2xl text-left font-bold transition-all border-2 ${bg} ${
        highlight ? `${border} shadow-sm` : 'border-transparent'
      }`}
      whileTap={{ scale: 0.95 }}
    >
      <div className="text-2xl mb-2">{emoji}</div>
      <div className={`text-sm ${text}`}>{title}</div>
      <div className="text-[11px] text-ink-light font-medium mt-0.5">{subtitle}</div>
    </motion.button>
  );
}
