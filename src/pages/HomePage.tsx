import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserStore } from '../stores/useUserStore';
import { useLessonProgressStore } from '../stores/useLessonProgressStore';
import { db } from '../db/database';
import { getReviewReminder } from '../utils/review-priority';
import { checkAndUpdateStreak } from '../utils/streak';
import { LESSONS, LESSON_GROUPS } from '../data/lessons';
import XpBar from '../components/gamification/XpBar';
import StreakBadge from '../components/gamification/StreakBadge';
import AchievementToast from '../components/gamification/AchievementToast';
import StreakCelebration from '../components/gamification/StreakCelebration';
import CharacterAvatar from '../components/common/CharacterAvatar';
import { springs, staggerDelay } from '../utils/motion-tokens';
import { useAuthStore } from '../stores/useAuthStore';

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
  const { user } = useAuthStore();
  const { load, isCompleted, getNextUnlocked, progressMap } = useLessonProgressStore();
  const [stats, setStats] = useState({ done: 0, correct: 0, xp: 0 });
  const [dueReview, setDueReview] = useState(0);
  const [greeting] = useState(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showStreakToast, setShowStreakToast] = useState(false);
  const [nickname] = useState(() => {
    try { return localStorage.getItem('nce_nickname') || ''; }
    catch { return ''; }
  });

  useEffect(() => { init(); load(); }, [init, load]);

  useEffect(() => {
    if (!userState) return;
    (async () => {
      const t = await db.getTodayStats();
      if (t) setStats({ done: t.questionsAnswered, correct: t.correctCount, xp: t.xpEarned });
      const due = await getReviewReminder();
      setDueReview(due);
      // 每日打卡检测
      const streakResult = await checkAndUpdateStreak();
      if (streakResult.isNewDay && streakResult.streakDays >= 1) {
        setShowStreakToast(true);
        setTimeout(() => setShowStreakToast(false), 2500);
      }
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

  // ── 进行中课程 + 推荐课程 ──
  const nextLesson = getNextUnlocked();
  const doneCount = LESSON_GROUPS.filter(g => isCompleted(g)).length;

  // 查找进行中的课程 (有块完成但未全部完成)
  const inProgressGroup = LESSON_GROUPS.find(g => {
    const bp = progressMap.get(g)?.blockProgress;
    if (!bp) return false;
    const done = [bp.vocabulary, bp.grammar, bp.sentence, bp.listening].filter(Boolean).length;
    return done > 0 && done < 4;
  });

  const displayGroup = inProgressGroup || nextLesson;
  const isInProgress = !!inProgressGroup;
  const allDone = !nextLesson && !inProgressGroup;

  const groupLessons = LESSONS.filter(l => l.group === displayGroup);
  const totalTitle = groupLessons[0]?.titleCn || '';
  const bp = displayGroup ? progressMap.get(displayGroup)?.blockProgress : undefined;
  const blocksDone = bp
    ? [bp.vocabulary, bp.grammar, bp.sentence, bp.listening].filter(Boolean).length
    : 0;
  const groupIndex = displayGroup ? LESSON_GROUPS.indexOf(displayGroup) + 1 : 0;

  // 时间问候
  function getTimeGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return '上午好';
    if (h < 18) return '下午好';
    return '晚上好';
  }

  const dismissOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem('nce_onboarding_done', '1');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center pt-32 gap-5">
        <img
          src="/assets/characters/xionger-laugh.webp"
          alt="加载中"
          width={96}
          height={96}
          className="rounded-2xl object-cover border-2 border-warm-shadow animate-bounce-slight"
          style={{ objectPosition: 'left center' }}
        />
        <p className="text-base text-ink-light font-bold animate-pulse">🐻 正在准备学习森林...</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4 relative z-10">
      <AchievementToast />
      <StreakCelebration />

      {/* ═══ 每日打卡 Toast ═══ */}
      <AnimatePresence>
        {showStreakToast && (
          <motion.div
            className="fixed top-20 inset-x-0 z-40 flex justify-center pointer-events-none px-4"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={springs.popIn}
          >
            <div className="bg-white/95 backdrop-blur rounded-2xl px-5 py-3 shadow-lg border-2 border-sun">
              <p className="text-base font-extrabold text-center text-ink">
                🔥 连续第 {userState?.streakDays} 天打卡! 今天也要加油哦~
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              transition={springs.popIn}
              onClick={e => e.stopPropagation()}
            >
              <CharacterAvatar
                imageSrc="/assets/characters/guangtouqiang-winter.webp"
                imagePosition="center 25%"
                size="lg"
                animation="bounce"
              />
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
              <p className="text-[9px] text-ink-muted pt-1">角色形象素材来源: 公开网络 · 本地学习使用</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ 1. Hero · 角色问候 + 今日推荐 (A 级卡片) ═══ */}
      <motion.div
        className="card card-accent overflow-hidden relative"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springs.enter}
      >
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #FF8C42 0%, transparent 70%)' }} />

        {/* 顶部: 角色头像 + 问候 */}
        <div className="flex items-center gap-3 mb-3">
          <CharacterAvatar
            imageSrc="/assets/characters/heroes-space.webp"
            imagePosition={
              greeting.char === 'xionger' ? 'left center' :
              greeting.char === 'xiongda' ? 'center' :
              'right center'
            }
            size="lg"
            animation="float"
          />
          <div className="flex-1 min-w-0">
            <p className="text-base font-extrabold text-ink">
              {getTimeGreeting()}{nickname ? `, ${nickname}` : ''}!
            </p>
            <p className="text-xs text-ink-light mt-0.5">
              连续 <b className="text-honey">{userState?.streakDays ?? 0}</b> 天打卡
              {user?.parent_id && (
                <span className="text-forest ml-2">👨‍👩‍👧 家庭成员</span>
              )}
            </p>
          </div>
        </div>

        {/* 中部: 今日推荐卡片 */}
        {!allDone && displayGroup && (
          <motion.div
            className="bg-cream/80 rounded-2xl p-3.5 border border-warm-border"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-sm">📖</span>
              <span className="text-xs font-bold text-ink">
                {isInProgress ? '继续学习' : '今日推荐'}
              </span>
            </div>
            <p className="text-sm font-extrabold text-ink mb-1">
              第 {groupIndex} 课 · {totalTitle}
            </p>
            {isInProgress ? (
              <>
                <div className="flex justify-between text-[10px] font-bold mb-1">
                  <span className="text-ink-muted">已完成 {blocksDone}/4 块</span>
                  <span className="text-forest">{Math.round(blocksDone / 4 * 100)}%</span>
                </div>
                <div className="h-1.5 bg-warm-bg rounded-full overflow-hidden mb-2.5">
                  <motion.div
                    className="h-full rounded-full bg-forest"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.round(blocksDone / 4 * 100)}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
              </>
            ) : (
              <p className="text-xs text-ink-muted mb-2.5">全新课程,准备好了吗?</p>
            )}
            <button
              onClick={() => {
                localStorage.setItem('nce_last_lesson', displayGroup);
                nav(`/lesson/${displayGroup}`);
              }}
              className="w-full py-2 text-sm font-bold rounded-xl
                         bg-forest text-cream hover:bg-forest/90
                         active:scale-[0.98] transition-all shadow-sm"
            >
              🚀 {isInProgress ? '继续学习' : '开始学习'}
            </button>
          </motion.div>
        )}

        {/* 全部完成 */}
        {allDone && (
          <motion.div
            className="bg-cream/80 rounded-2xl p-4 text-center border border-warm-border"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <p className="text-2xl mb-1">🎉</p>
            <p className="text-sm font-extrabold text-ink mb-1">全部课程已完成!</p>
            <p className="text-xs text-ink-muted mb-3">太厉害了,你是温暖森林的骄傲!</p>
            <button
              onClick={() => nav('/lesson')}
              className="px-6 py-2 text-sm font-bold rounded-xl
                         bg-forest text-cream hover:bg-forest/90
                         active:scale-[0.98] transition-all shadow-sm"
            >
              🔄 自由练习
            </button>
          </motion.div>
        )}

        {/* 复习提醒 */}
        {dueReview > 0 && (
          <motion.div
            className="flex items-center gap-2 mt-3 bg-berry-pale rounded-xl px-3 py-1.5"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <span className="text-sm">🔴</span>
            <span className="text-xs font-bold text-berry">
              {dueReview} 道错题该复习了
            </span>
            <a href="/review" className="text-xs font-bold text-forest ml-auto hover:underline">
              去复习 →
            </a>
          </motion.div>
        )}

        <p className="text-[9px] text-ink-muted mt-2 text-right">
          角色形象素材来源: 公开网络 · 版权归原作者 · 本地学习使用
        </p>
      </motion.div>

      {/* ═══ 2. Status Bar · 段位 + 打卡 + 心数 (横向条) ═══ */}
      <motion.div
        className="card p-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: staggerDelay(1), ...springs.enter }}
      >
        <XpBar />
        <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-warm-border gap-2">
          <StreakBadge />
          <div className="flex items-center gap-3 text-xs text-ink-light font-bold tabular-nums">
            <span className="flex items-center gap-0.5">
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} className={i < (userState?.hearts ?? 5) ? '' : 'grayscale opacity-25'}>
                  ❤️
                </span>
              ))}
            </span>
            <span className="text-ink-muted">·</span>
            <span>⭐ {userState?.totalXp ?? 0}</span>
          </div>
        </div>
      </motion.div>

      {/* ═══ 3. Quick · 快捷入口 2x2 ═══ */}
      <motion.div
        className="grid grid-cols-2 gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: staggerDelay(2), ...springs.enter }}
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

      {/* ═══ 4. Divider · 今日学习 分组标题 ═══ */}
      <div className="flex items-center gap-2 pt-1">
        <span className="text-xs font-extrabold text-ink-light uppercase tracking-wider">📊 今日学习</span>
        <div className="flex-1 h-px bg-warm-border" />
      </div>

      {/* ═══ 5. 今日进度 ═══ */}
      <motion.div
        className="card card-highlight"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: staggerDelay(3), ...springs.enter }}
      >
        <div className="grid grid-cols-3 gap-3 mb-3">
          {[
            { label: '已答题', value: stats.done, color: '#5B9ED4' },
            { label: '正确', value: stats.correct, color: '#5B9A5A' },
            { label: 'XP', value: `+${stats.xp}`, color: '#FF8C42' },
          ].map(s => (
            <div key={s.label} className="text-center bg-warm-bg rounded-2xl py-2.5 tabular-nums">
              <div className="text-xl font-extrabold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[11px] text-ink-light font-bold mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-bold">
            <span className="text-ink-light">🎯 今日目标</span>
            <span className="text-ink-muted tabular-nums">{Math.min(stats.done, 15)}/15 题</span>
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
