import { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getQuestionsByGroup } from '../data/questions';
import { db } from '../db/database';
import { api } from '../db/api';
import { springs } from '../utils/motion-tokens';
import { scheduleReview } from '../utils/review-scheduler';
import { useLessonProgressStore } from '../stores/useLessonProgressStore';
import { useUserStore } from '../stores/useUserStore';
import { LESSON_GROUPS, LESSONS } from '../data/lessons';
import { calculateTestCompleteXp } from '../utils/xp-calculator';
import QuestionCard from '../components/questions/QuestionCard';
import Confetti from '../components/common/Confetti';
import type { Question } from '../types';

export default function MasteryTestPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { markLessonComplete } = useLessonProgressStore();
  const { addXp, userState, consumeHeart } = useUserStore();
  const hearts = userState?.hearts ?? 5;

  // 构建综合测试题目：60% 当前课 + 25% 上一课 + 15% 更早旧课
  const testQ = useMemo(() => {
    if (!groupId) return [];
    const cur = getQuestionsByGroup(groupId);
    const idx = LESSON_GROUPS.indexOf(groupId);
    const prev1 = idx > 0 ? getQuestionsByGroup(LESSON_GROUPS[idx - 1]) : [];
    const older = idx > 1
      ? LESSON_GROUPS.slice(0, idx - 1).flatMap(g => getQuestionsByGroup(g))
      : [];

    const sel: Question[] = [];
    // 60% 当前课 ~9题
    sel.push(...[...cur].sort(() => Math.random() - 0.5).slice(0, Math.min(9, cur.length)));
    // 25% 上一课 ~4题
    if (prev1.length) sel.push(...[...prev1].sort(() => Math.random() - 0.5).slice(0, Math.min(4, prev1.length)));
    // 15% 更早课 ~2题
    if (older.length) sel.push(...[...older].sort(() => Math.random() - 0.5).slice(0, 2));

    return sel.sort(() => Math.random() - 0.5);
  }, [groupId]);

  const [idx, setIdx] = useState(0);
  const [wrongList, setWrongList] = useState<Question[]>([]);
  const [phase, setPhase] = useState<'main' | 'review'>('main');
  const [done, setDone] = useState(false);
  const [passed, setPassed] = useState(false);

  const cur = phase === 'main' ? testQ[idx] : wrongList[0];

  const handleAnswer = useCallback(async (_answer: string, correct: boolean, _timeSpent: number) => {
    if (!cur) return;

    // 综合测试答错扣 2 颗心
    if (!correct) {
      consumeHeart().catch(() => {});
      consumeHeart().catch(() => {});
    }

    if (!correct && phase === 'main') {
      setWrongList(prev => [...prev, cur]);
    }

    setTimeout(async () => {
      if (phase === 'main') {
        if (idx < testQ.length - 1) {
          setIdx(prev => prev + 1);
        } else {
          // 主轮结束，检查错题
          const wl = !correct ? [...wrongList, cur] : wrongList;
          setWrongList(wl);
          if (wl.length > 0) {
            setPhase('review');
          } else {
            // 100% 通过！
            await finishTest(true);
          }
        }
      } else {
        // 补考轮
        const rest = wrongList.slice(1);
        setWrongList(rest);
        if (rest.length === 0) {
          await finishTest(true);
        }
      }
    }, 800);
  }, [idx, phase, wrongList, testQ, cur]);

  const finishTest = async (isPassed: boolean) => {
    if (groupId && isPassed) {
      await markLessonComplete(groupId);
      await scheduleReview(groupId);
      await addXp(calculateTestCompleteXp());
    }
    // 异步向后端推送进度
    const totalQ = testQ.length;
    const correctInTest = isPassed ? totalQ : 0;
    api.updateProgress(groupId || '', correctInTest, totalQ).catch(() => {});
    setPassed(isPassed);
    setDone(true);
  };

  // 结果页
  if (done) {
    return (
      <div className="min-h-screen flex flex-col bg-cream">
        <Confetti active={passed} />
        <motion.div
          className="flex-1 flex flex-col items-center justify-center px-4 gap-5"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={springs.success}
        >
          {/* 角色横幅 */}
          <motion.div
            className="relative w-48 h-48 rounded-3xl overflow-hidden border-4 border-white shadow-xl"
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ ...springs.popIn, delay: 0.15 }}
          >
            <img
              src={passed ? '/assets/characters/new-year.webp' : '/assets/characters/bears-cabin.webp'}
              alt=""
              className="w-full h-full object-cover"
              style={{ objectPosition: passed ? 'center 25%' : 'center 30%' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          </motion.div>

          {/* 奖杯/emoji */}
          <motion.div
            className="text-7xl"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            {passed ? '🏆' : '💪'}
          </motion.div>

          <div className="text-center space-y-2">
            <h2 className="text-h1 text-ink">
              {passed ? '时间跃迁成功!' : '跃迁未完成'}
            </h2>
            <p className="text-meta text-ink-light font-medium max-w-xs mx-auto leading-relaxed">
              {passed
                ? `第 ${LESSONS.filter(l => l.group === groupId).map(l => l.lessonNumber).join('-')} 课已通关! 下一时间点已解锁 +${calculateTestCompleteXp()}XP 🚀`
                : `还有 ${wrongList.length} 个信号不稳定,需要全部修复`}
            </p>
          </div>

          {passed ? (
            <motion.div
              className="space-y-3 w-full max-w-xs mt-2"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <button onClick={() => navigate('/star-map')} className="w-full py-3 btn-gold text-base">
                🌌 查看星图
              </button>
              <button onClick={() => navigate(`/lesson/${groupId}`)} className="w-full py-3 bg-warm-bg text-ink-light font-bold rounded-xl border border-warm-border">
                📋 返回课程
              </button>
            </motion.div>
          ) : (
            <button
              onClick={() => { setPhase('review'); setDone(false); }}
              className="w-full max-w-xs py-3 btn-gold mt-2"
            >
              🔄 补考错题（{wrongList.length}题）
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  if (!cur) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <div className="text-4xl mb-3">🏁</div>
          <p className="text-ink-light font-bold">题库不足，无法综合测试</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-sm text-forest font-bold">
            ← 返回
          </button>
        </div>
      </div>
    );
  }

  // 心不足
  if (hearts === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-cream gap-4">
        <img
          src="/assets/characters/bears-cabin.webp"
          alt="心已用完"
          className="w-32 h-32 rounded-2xl object-cover border-2 border-warm-border shadow-sm"
          style={{ objectPosition: 'center 30%' }}
        />
        <h2 className="text-h2 text-ink">❤️ 心已用完</h2>
        <p className="text-meta text-ink-light text-center max-w-xs">
          综合测试消耗更大,每道错题扣 2 颗心~
          <br />休息一会儿再来挑战吧!
        </p>
        <button onClick={() => navigate(-1)} className="btn-ghost text-base w-40">
          ← 返回
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-4 bg-cream">
      {/* 顶部 */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => navigate(-1)} className="text-sm font-bold text-ink-muted hover:text-ink-light">
          ← 退出
        </button>
        <div className="flex items-center gap-1.5">
          <span className="text-sm">🏁</span>
          <span className="text-xs font-bold text-ink">时间跃迁</span>
          {phase === 'review' && (
            <span className="text-[10px] px-2 py-0.5 bg-honey/15 text-honey rounded-full font-bold">
              🔄 补考
            </span>
          )}
        </div>
        <span className="text-xs font-bold text-ink-muted">
          {phase === 'main' ? `${idx + 1}/${testQ.length}` : `补考 ${wrongList.length}题`}
        </span>
      </div>

      {/* 进度条 */}
      <div className="h-1.5 bg-warm-bg rounded-full mb-4 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            phase === 'review' ? 'bg-honey' : 'progress-shimmer'
          }`}
          style={{ width: phase === 'main' ? `${(idx / testQ.length) * 100}%` : '50%' }}
        />
      </div>

      {/* 题目构成提示 */}
      {phase === 'main' && idx === 0 && (
        <div className="mb-3 flex items-center gap-2 text-[10px] text-ink-muted">
          <span>📋 本题综合了当前课(60%) + 上一课(25%) + 旧课(15%)</span>
        </div>
      )}

      <QuestionCard
        question={cur}
        questionNumber={phase === 'main' ? idx + 1 : 1}
        totalQuestions={phase === 'main' ? testQ.length : wrongList.length}
        onAnswer={handleAnswer}
      />
    </div>
  );
}
