import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { usePracticeStore } from '../../stores/usePracticeStore';
import { useUserStore } from '../../stores/useUserStore';
import { useLessonProgressStore } from '../../stores/useLessonProgressStore';
import { LESSON_GROUPS } from '../../data/lessons';
import CircularProgress from '../common/CircularProgress';
import Confetti from '../common/Confetti';

interface Props {
  correctCount: number;
  totalCount: number;
  accuracy: number;
  hasWrongQuestions?: boolean;
  wrongCount?: number;
  totalTime?: number;       // 兼容旧接口
  bestCombo?: number;       // 兼容旧接口
  onBack: () => void;
  onReviewWrong: () => void;
  onContinue?: () => void;
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const step = Math.max(1, Math.floor(value / 30));
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + step, value);
      setDisplay(current);
      if (current >= value) clearInterval(timer);
    }, 30);
    return () => clearInterval(timer);
  }, [value]);
  return <>{display}</>;
}

export default function ResultScreen({
  correctCount, totalCount, accuracy, hasWrongQuestions, wrongCount: _wrongCount,
  onBack, onReviewWrong, onContinue,
}: Props) {
  const wrongCount = _wrongCount ?? (totalCount - correctCount);
  const hasWrong = hasWrongQuestions ?? (wrongCount > 0);
  const { userState, checkDailyStreak, checkAndUnlockAchievements, updateStats, grantBonusHeart } = useUserStore();
  const [showConfetti, setShowConfetti] = useState(false);
  const isPerfect = accuracy >= 1.0 && totalCount >= 3;
  const percentValue = Math.round(accuracy * 100);

  useEffect(() => {
    (async () => {
      await checkDailyStreak();
      await updateStats({ questionsAnswered: totalCount, correctCount, xpEarned: 0, minutesSpent: 1 });
      await grantBonusHeart();
      await checkAndUnlockAchievements({
        dailyCorrect: correctCount, dailyTotal: totalCount,
        totalXp: userState?.totalXp || 0, streakDays: userState?.streakDays || 0,
        totalQuestions: userState?.totalQuestionsAnswered || 0,
        totalCorrect: userState?.totalCorrect || 0,
        choiceCorrect: 0, fillCorrect: 0, translateCorrect: 0,
        reorderCorrect: 0, listeningCorrect: 0, perfectLessons: [],
        bestCombo: 0, lastAnswerTime: Date.now(),
      });
      if (isPerfect) setShowConfetti(true);
    })();
  }, []);

  const emoji = isPerfect ? '🌟' : accuracy >= 0.8 ? '💪' : accuracy >= 0.6 ? '📚' : '📖';
  const msg = isPerfect ? '完美通关！' : accuracy >= 0.8 ? '差一点满分！' : accuracy >= 0.6 ? '继续加油！' : '别灰心！';

  return (
    <div className="px-4 py-6 space-y-5 text-center">
      <Confetti active={showConfetti} />

      {/* 结果图标 */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <div className="text-6xl mb-3">{emoji}</div>
        <h2 className="text-2xl font-extrabold text-ink">
          {isPerfect && '⭐ '}{msg}{isPerfect && ' ⭐'}
        </h2>
        {isPerfect && (
          <p className="text-sm text-forest mt-1">全部正确，太厉害了！</p>
        )}
      </motion.div>

      {/* 圆形进度条 */}
      <motion.div
        className="flex justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <CircularProgress
          progress={percentValue}
          size={120}
          strokeWidth={8}
          color={isPerfect ? '#10B981' : '#22D3EE'}
          showPercentage
        />
      </motion.div>

      {/* 统计网格 */}
      <motion.div
        className="grid grid-cols-3 gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {[
          { label: '总题数', value: totalCount, color: '#F1F5F9' },
          { label: '✅ 正确', value: correctCount, color: '#10B981' },
          { label: '❌ 错误', value: wrongCount, color: '#EF4444' },
          { label: '准确率', value: `${percentValue}%`, color: isPerfect ? '#10B981' : '#22D3EE' },
          { label: '错题数', value: wrongCount, color: '#FBBF24' },
          { label: '❤️ 心数', value: userState?.hearts ?? 5, color: '#EF4444' },
        ].map(stat => (
          <div key={stat.label} className="glass-panel p-3">
            <div className="text-xl font-extrabold" style={{ color: stat.color }}>
              <AnimatedNumber value={typeof stat.value === 'number' ? stat.value : parseInt(stat.value as string) || 0} />
              {typeof stat.value === 'string' && stat.value.includes('%') ? '%' : ''}
            </div>
            <div className="text-[10px] text-ink-muted font-bold mt-0.5">{stat.label}</div>
          </div>
        ))}
      </motion.div>

      {/* 错题提示 */}
      {!isPerfect && (
        <motion.div
          className="glass-panel p-3 border-honey/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <span className="text-sm font-bold text-honey">
            🔒 需 100% 正确率才能通关 · 错了 {wrongCount} 题
          </span>
        </motion.div>
      )}

      {/* 按钮 */}
      <motion.div
        className="space-y-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        {hasWrong && (
          <button onClick={onReviewWrong} className="w-full py-3 btn-gold text-base">
            🔄 补考错题（{wrongCount}题）
          </button>
        )}
        {isPerfect && onContinue && (
          <button onClick={onContinue} className="w-full py-3 btn-primary text-base">
            🚀 继续下一块
          </button>
        )}
        {isPerfect && !onContinue && (
          <button onClick={onBack} className="w-full py-3 btn-primary text-base">
            🎉 返回课程
          </button>
        )}
        {!isPerfect && (
          <button onClick={onBack} className="w-full py-3 bg-warm-bg text-ink-light font-bold rounded-xl border border-warm-border hover:bg-warm-bg transition-colors">
            📋 返回课程列表
          </button>
        )}
      </motion.div>
    </div>
  );
}
