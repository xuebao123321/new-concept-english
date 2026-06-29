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
import CircularProgress from '../components/common/CircularProgress';
import { springs, staggerDelay } from '../utils/motion-tokens';
import { useAuthStore } from '../stores/useAuthStore';
import { api, API_BASE } from '../db/api';
import ProfileSetupModal, { GRADE_LABELS } from '../components/onboarding/ProfileSetupModal';

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
  const [showTargetDone, setShowTargetDone] = useState(false);
  const [streakRewards, setStreakRewards] = useState<Array<{type:string; lesson_group:string; message:string}>>([]);
  const [nickname] = useState(() => {
    try { return localStorage.getItem('nce_nickname') || ''; }
    catch { return ''; }
  });

  // ── 迷你排行榜 ──
  interface MiniEntry { id: number; username: string; nickname: string; completed: number; xp: number; grade?: string; }
  const [miniLeaderboard, setMiniLeaderboard] = useState<MiniEntry[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/leaderboard?limit=10`)
      .then(r => r.json())
      .then(d => setMiniLeaderboard(d.leaderboard || []))
      .catch(() => {});
  }, []);

  // 复习累计计数
  const [reviewCount] = useState(() => {
    try { return Number(localStorage.getItem('nce_review_count') || '0'); }
    catch { return 0; }
  });

  useEffect(() => { init(); load(); }, [init, load]);

  useEffect(() => {
    if (!userState) return;
    (async () => {
      const t = await db.getTodayStats();
      if (t) setStats({ done: t.questionsAnswered, correct: t.correctCount, xp: t.xpEarned });
      const due = await getReviewReminder();
      setDueReview(due);
      // 每日目标完成检测
      if (t && t.questionsAnswered >= 15) {
        const todayStr = new Date().toISOString().slice(0, 10);
        if (localStorage.getItem('nce_target_done_today') !== todayStr) {
          setShowTargetDone(true);
          localStorage.setItem('nce_target_done_today', todayStr);
          setTimeout(() => setShowTargetDone(false), 3000);
        }
      }
      // 每日打卡检测
      const streakResult = await checkAndUpdateStreak();
      if (streakResult.isNewDay && streakResult.streakDays >= 1) {
        setShowStreakToast(true);
        // 打卡里程碑 XP 奖励（7/14/30天各一次）
        const STREAK_XP_DAYS = [7, 14, 30];
        if (STREAK_XP_DAYS.includes(streakResult.streakDays)) {
          const key = `nce_streak_xp_${streakResult.streakDays}`;
          if (!localStorage.getItem(key)) {
            localStorage.setItem(key, '1');
            useUserStore.getState().addXp(20);
          }
        }
        setTimeout(() => setShowStreakToast(false), 2500);
      }
      // 打卡 7 天奖励
      if (streakResult.streakDays >= 7) {
        const today = new Date().toISOString().slice(0, 10);
        const lastCheck = localStorage.getItem('nce_streak_reward');
        if (lastCheck !== today) {
          api.checkRewards({ check_type: 'review_master' }).then(res => {
            localStorage.setItem('nce_streak_reward', today);
            if (res?.rewards?.length > 0) {
              setStreakRewards(res.rewards);
            }
          }).catch(() => {});
        }
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

  // 奖励课优先
  const rewardLesson = LESSON_GROUPS.find(g => {
    const p = progressMap.get(g);
    return p && (p as any).status === 'unlocked' && (p as any).unlocked_by === 'reward';
  });

  const displayGroup = rewardLesson || inProgressGroup || nextLesson;
  const isReward = !!rewardLesson && !inProgressGroup;
  const isInProgress = !!inProgressGroup;
  const allDone = !nextLesson && !inProgressGroup && !rewardLesson;

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

  // ── 信息完善引导 ──
  const [showProfileSetup, setShowProfileSetup] = useState(false);

  useEffect(() => {
    if (!isLoading && user && user.role === 'student') {
      const hasNickname = user.nickname && user.nickname !== '' && user.nickname !== user.username;
      const hasGrade = !!(user as any).grade && (user as any).grade !== '';
      const profileDone = localStorage.getItem('nce_profile_setup_done');
      if ((!hasNickname || !hasGrade) && !profileDone) {
        setShowProfileSetup(true);
      }
    }
  }, [isLoading, user]);

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
        {showTargetDone && (
          <motion.div
            className="fixed top-1/3 inset-x-0 z-40 flex justify-center pointer-events-none px-4"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={springs.popIn}
          >
            <div className="bg-white/95 backdrop-blur rounded-2xl px-5 py-3 shadow-lg border-2 border-forest">
              <p className="text-xl font-extrabold text-center text-forest">
                🎉 今日目标完成! 熊二为你骄傲~
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

        {/* 信息完善引导弹窗 */}
        {showProfileSetup && (
          <ProfileSetupModal
            onDone={(nickname, grade) => {
              api.updateProfile({ nickname, grade }).then(() => {
                localStorage.setItem('nce_profile_setup_done', '1');
                setShowProfileSetup(false);
                useAuthStore.getState().loadFromStorage();
              }).catch(() => {});
            }}
            onSkip={() => {
              localStorage.setItem('nce_profile_setup_done', '1');
              setShowProfileSetup(false);
            }}
          />
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
            className={`rounded-2xl p-3.5 ${
              isReward
                ? 'bg-honey-pale border-2 border-honey/40'
                : 'bg-cream/80 border border-warm-border'
            }`}
            initial={{ opacity: 0, y: 6 }}
            animate={isReward ? { opacity: 1, y: 0, scale: [1, 1.01, 1] } : { opacity: 1, y: 0 }}
            transition={isReward
              ? { delay: 0.15, scale: { repeat: Infinity, duration: 2 } }
              : { delay: 0.15 }}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-sm">{isReward ? '🎁' : '📖'}</span>
              <span className={`text-xs font-bold ${isReward ? 'text-honey' : 'text-ink'}`}>
                {isReward ? '奖励课' : isInProgress ? '继续学习' : '今日推荐'}
              </span>
            </div>
            <p className="text-sm font-extrabold text-ink mb-1">
              第 {groupIndex} 课 · {totalTitle}
            </p>
            {isReward ? (
              <p className="text-xs text-ink-muted mb-2.5">
                因为你的优秀表现,这堂课已提前解锁!
              </p>
            ) : isInProgress ? (
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
              className={`w-full py-2 text-sm font-bold rounded-xl
                         active:scale-[0.98] transition-all shadow-sm ${
                isReward
                  ? 'bg-honey text-cream hover:bg-honey/90'
                  : 'bg-forest text-cream hover:bg-forest/90'
              }`}
            >
              🚀 {isReward ? '领取奖励课' : isInProgress ? '继续学习' : '开始学习'}
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
            className="mt-3 bg-berry-pale rounded-xl p-3 border border-berry/20"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">📝</span>
              <div className="flex-1">
                <p className="text-xs font-bold text-berry">
                  {dueReview} 道题待复习 · 完成可得 <b>+{dueReview * 5} XP</b>
                </p>
                {dueReview > 5 && (
                  <p className="text-[10px] text-berry/70 mt-0.5">
                    其中含过期题，完成有额外 XP 奖励!
                  </p>
                )}
              </div>
              <a href="/review" className="px-3 py-1.5 text-xs font-bold rounded-lg bg-berry text-white hover:bg-berry/90">
                去复习 →
              </a>
            </div>
            <div className="mt-2 text-center">
              <a href="/wrong-book" className="text-[10px] text-ink-muted hover:text-forest font-bold">
                📕 或按课组查看错题本
              </a>
            </div>
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
          badge={reviewCount < 20 ? `复习${20 - reviewCount}题解锁新课` : '🎁 可领奖励'}
          bg="bg-honey-pale" border="border-honey/30" text="text-honey"
          onClick={() => nav(dueReview > 0 ? '/review' : '/star-map')}
        />
        <QuickCard
          emoji="🔍" title="水平测试"
          subtitle="通过可解锁新课"
          badge="🎁 有奖励"
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
        <div className="flex items-center justify-center gap-3">
          <CircularProgress
            progress={Math.min((stats.done / 15) * 100, 100)}
            size={80}
            strokeWidth={6}
            color="#5B9A5A"
            showPercentage
          />
          <div className="text-left">
            <div className="text-xs text-ink-light font-bold">🎯 今日目标</div>
            <div className="text-h2 font-extrabold text-ink tabular-nums">
              {Math.min(stats.done, 15)}<span className="text-sm text-ink-light font-normal">/15 题</span>
            </div>
            <div className="text-[11px] text-ink-muted font-medium">
              {stats.done >= 15 ? '🎉 目标完成!' : `还差 ${15 - stats.done} 题`}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ═══ 6. 迷你排行榜 ═══ */}
      <motion.div
        className="card p-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: staggerDelay(4), ...springs.enter }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-extrabold text-ink">🏆 闯关排行</h3>
          <button onClick={() => nav('/leaderboard')}
            className="text-xs font-bold text-forest hover:underline">
            查看全部 →
          </button>
        </div>

        {miniLeaderboard.length > 0 ? (
          <div className="space-y-2">
            {miniLeaderboard.slice(0, 3).map((entry, i) => (
              <div key={entry.id}
                className={`flex items-center gap-2 p-2 rounded-lg ${
                  entry.id === user?.id ? 'bg-forest-pale border border-forest/20' : 'bg-warm-bg'
                }`}
              >
                <span className="text-sm font-bold w-6 text-center">
                  {['🥇','🥈','🥉'][i]}
                </span>
                <span className="text-xs font-bold text-ink flex-1 truncate">
                  {entry.nickname || entry.username}
                  {entry.grade && <span className="text-ink-muted ml-1 text-[10px]">· {GRADE_LABELS[entry.grade] || entry.grade}</span>}
                  {entry.id === user?.id && <span className="text-forest ml-1 text-[10px]">(你)</span>}
                </span>
                <span className="text-xs font-bold text-forest tabular-nums">{entry.xp} XP</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-ink-muted text-center py-2">暂无排行数据</p>
        )}
      </motion.div>
    </div>
  );
}

function QuickCard({ emoji, title, subtitle, bg, border, text, highlight, badge, onClick }: {
  emoji: string; title: string; subtitle: string;
  bg: string; border: string; text: string;
  highlight?: boolean; badge?: string; onClick: () => void;
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
      {badge && (
        <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full bg-honey-pale text-honey font-bold">
          {badge}
        </span>
      )}
    </motion.button>
  );
}
