import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getQuestionsByBlock } from '../data/questions';
import { useQuestions } from '../hooks/useQuestions';
import { db } from '../db/database';
import { api } from '../db/api';
import { useLessonProgressStore } from '../stores/useLessonProgressStore';
import { useUserStore } from '../stores/useUserStore';
import { calculateBlockCompleteXp } from '../utils/xp-calculator';
import QuestionCard from '../components/questions/QuestionCard';
import Confetti from '../components/common/Confetti';
import { springs } from '../utils/motion-tokens';
import type { Question, BlockType } from '../types';

const BLOCK_INFO: Record<BlockType, { icon: string; name: string; color: string; bg: string }> = {
  vocabulary: { icon: '📡', name: '单词森林',   color: '#5B9ED4', bg: '#E8F2FC' },
  grammar:    { icon: '🔧', name: '语法工坊',   color: '#7E57C2', bg: '#EDE7F6' },
  sentence:   { icon: '🗣️', name: '句子城堡',   color: '#5B9A5A', bg: '#E8F5E8' },
  listening:  { icon: '🎤', name: '听说花园',   color: '#FF8C42', bg: '#FFF2E8' },
};

export default function BlockSessionPage() {
  const { groupId, block } = useParams<{ groupId: string; block: string }>();
  const navigate = useNavigate();
  const { completeBlock } = useLessonProgressStore();
  const { addXp, userState } = useUserStore();
  const hearts = userState?.hearts ?? 5;

  const blockType = (block || 'vocabulary') as BlockType;
  const info = BLOCK_INFO[blockType] || BLOCK_INFO.vocabulary;

  // 异步加载题目
  const { questions: blockQuestions, loading } = useQuestions(groupId ? [groupId] : []);
  const filteredQuestions = blockQuestions.filter(q => {
    if (blockType === 'vocabulary') return q.type === 'choice' || (q.type === 'fill' && q.tags?.some((t: string) => t.includes('词汇')));
    if (blockType === 'grammar') return q.type === 'fill' || q.type === 'reorder';
    if (blockType === 'sentence') return q.type === 'translate';
    if (blockType === 'listening') return q.type === 'listening' || q.type === 'speak';
    return true;
  });

  const [sessionQ, setSessionQ] = useState<Question[]>([]);
  useEffect(() => { if (filteredQuestions.length > 0) setSessionQ([...filteredQuestions].sort(() => Math.random() - 0.5)); }, [filteredQuestions.length]);

  // 检测上次未完成的练习
  useEffect(() => {
    if (!groupId) return;
    const key = `nce_block_${groupId}_${blockType}`;
    const lastState = localStorage.getItem(key);
    if (lastState === 'in_progress') {
      setMsg('💡 上次有未完成的练习,从头开始吧~');
      setTimeout(() => setMsg(''), 3000);
    }
  }, [groupId, blockType]);

  // 进入练习时标记进行中
  useEffect(() => {
    if (sessionQ.length > 0 && groupId) {
      localStorage.setItem(`nce_block_${groupId}_${blockType}`, 'in_progress');
    }
  }, [sessionQ.length > 0, groupId, blockType]);
  const [idx, setIdx] = useState(0);
  const [wrongList, setWrongList] = useState<Question[]>([]);
  const [round, setRound] = useState<'main' | 'review'>('main');
  const [reviewIdx, setReviewIdx] = useState(0);
  const [initialWrongCount, setInitialWrongCount] = useState(0);
  const [done, setDone] = useState(false);
  const [allCorrect, setAllCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [msg, setMsg] = useState('');
  const [rewards, setRewards] = useState<Array<{type:string; lesson_group:string; message:string}>>([]);
  const [showRewards, setShowRewards] = useState(false);

  const cur = round === 'main' ? sessionQ[idx] : wrongList[0];

  const handleAnswer = useCallback(async (_answer: string, correct: boolean, _timeSpent: number) => {
    if (!cur) return;
    if (correct) setCorrectCount(prev => prev + 1);

    // 本地追踪错题（避免 React 状态异步问题）
    const newWrongList = (!correct && round === 'main')
      ? [...wrongList, cur]
      : wrongList;

    if (!correct && round === 'main') {
      setWrongList(newWrongList);
      // 保存错题到本地 Dexie（同步等待）+ 后端（异步不阻塞）
      const qText = 'prompt' in cur ? (cur as any).prompt : '';
      const qCorrect = 'options' in cur ? (cur as any).options[(cur as any).correctIndex] || '' :
                       'answer' in cur ? (cur as any).answer : '';
      await db.wrongQuestions.put({
        questionId: cur.id,
        nextReviewTime: Date.now(),
        mastered: false,
        lastWrongTime: Date.now(),
        wrongCount: 1,
        questionText: qText,
        correctAnswer: qCorrect,
        userAnswer: _answer,
        lessonGroup: groupId || '',
        questionType: cur.type,
      });
      api.submitAnswer({
        question_id: cur.id,
        correct: false,
        user_answer: _answer,
        time_spent: _timeSpent,
        lesson_group: groupId || '',
        question_type: cur.type,
        question_text: qText,
        correct_answer: qCorrect,
        difficulty: cur.difficulty || 'medium',
      }).catch(() => {});
    }

    setTimeout(() => {
      if (round === 'main') {
        if (idx < sessionQ.length - 1) {
          setIdx(prev => prev + 1);
        } else if (newWrongList.length > 0) {
          setInitialWrongCount(newWrongList.length);
          setReviewIdx(0);
          setRound('review');
        } else {
          finishBlock(true);
        }
      } else {
        // 补考轮 — 追踪已答题数
        setReviewIdx(prev => prev + 1);
        // 答对：从错题列表移除；答错：保留
        const rest = correct ? newWrongList.slice(1) : newWrongList;
        setWrongList(rest);
        if (rest.length === 0) {
          finishBlock(true);
        }
      }
    }, 800);
  }, [idx, round, wrongList, sessionQ, cur]);

  const finishBlock = async (perfect: boolean) => {
    if (groupId) {
      await completeBlock(groupId, blockType);
      localStorage.setItem(`nce_block_${groupId}_${blockType}`, 'done');
    }
    await addXp(calculateBlockCompleteXp());
    // 异步向后端推送进度
    api.updateProgress(groupId || '', correctCount, sessionQ.length).catch(() => {});
    setAllCorrect(perfect);
    setDone(true);

    // 全对完成 → 检查连跳奖励
    if (perfect) {
      api.checkRewards().then(res => {
        const r = res?.rewards || [];
        if (r.length > 0) { setRewards(r); setShowRewards(true); }
      }).catch(() => {});
    }
  };

  // 完成页
  if (done) {
    return (
      <div className="min-h-screen flex flex-col bg-cream">
        <Confetti active={allCorrect} />

        {/* ═══ 奖励弹窗 ═══ */}
        {showRewards && rewards.length > 0 && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setShowRewards(false)}
          >
            <motion.div
              className="card mx-4 max-w-xs w-full p-6 text-center space-y-4 border-honey/40 bg-cream"
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={springs.popIn}
              onClick={e => e.stopPropagation()}
            >
              <div className="text-5xl">🎁</div>
              <h2 className="text-h2 text-ink font-extrabold">获得奖励!</h2>
              {rewards.map((r, i) => (
                <div key={i} className="bg-honey-pale rounded-xl p-3 border border-honey/30">
                  <p className="text-sm font-bold text-ink">{r.message}</p>
                  <p className="text-xs text-ink-muted mt-0.5">已解锁,去课程列表看看吧~</p>
                </div>
              ))}
              <button
                onClick={() => setShowRewards(false)}
                className="w-full py-3 rounded-xl bg-forest text-cream font-bold text-base
                           hover:bg-forest/90 active:scale-[0.98] transition-all shadow-sm"
              >
                🎉 太棒了!
              </button>
            </motion.div>
          </motion.div>
        )}

        <motion.div
          className="flex-1 flex flex-col items-center justify-center px-4 gap-4"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={springs.success}
        >
          {/* 角色横幅 */}
          <motion.div
            className="relative w-40 h-40 rounded-3xl overflow-hidden border-4 border-white shadow-xl"
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ ...springs.popIn, delay: 0.1 }}
          >
            <img
              src={allCorrect ? '/assets/characters/xionger-laugh.webp' : '/assets/characters/bears-cabin.webp'}
              alt=""
              className="w-full h-full object-cover"
              style={{ objectPosition: allCorrect ? 'left center' : 'center 30%' }}
            />
            <div className={allCorrect
              ? 'absolute inset-0 bg-gradient-to-t from-forest/40 via-transparent to-transparent'
              : 'absolute inset-0 bg-gradient-to-t from-honey/40 via-transparent to-transparent'}
            />
          </motion.div>

          <div className="text-center space-y-2">
            <motion.div
              className="text-5xl"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {allCorrect ? '🎉' : '💪'}
            </motion.div>
            <h2 className="text-h1 text-ink">
              {allCorrect ? '太棒了!' : '还差一点!'}
            </h2>
            <p className="text-meta text-ink-light font-medium max-w-xs mx-auto leading-relaxed">
              {allCorrect
                ? `${info.name} 已掌握! 熊二为你鼓掌~ 👏 +${calculateBlockCompleteXp()}XP`
                : `${info.name} 还有 ${wrongList.length} 道题需要再练习`}
            </p>
          </div>

          {allCorrect ? (
            <div className="space-y-3 w-full max-w-xs mt-2">
              <button onClick={() => navigate(`/lesson/${groupId}`)} className="w-full py-3 btn-primary">
                🚀 继续下一块
              </button>
              <button onClick={() => navigate(-1)} className="w-full py-3 bg-warm-bg text-ink-light font-bold rounded-xl border border-warm-border">
                📋 返回课程
              </button>
              <a href="/wrong-book" className="block text-center text-xs text-ink-muted hover:text-forest font-bold">
                📕 错题本 → 随时回顾巩固
              </a>
            </div>
          ) : (
            <div className="space-y-3 w-full max-w-xs mt-2">
              <button onClick={() => { setRound('review'); setDone(false); }} className="w-full py-3 btn-gold">
                🔄 补考错题（{wrongList.length}题）
              </button>
              <a href="/wrong-book" className="block text-center text-xs text-ink-muted hover:text-forest font-bold">
                📕 这些错题已加入错题本
              </a>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // 加载中
  if (loading || sessionQ.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background:'#FFFBF5'}}>
        <div className="text-center"><div className="text-4xl animate-bounce mb-3">🐻</div>
        <p className="text-[#8B8580] font-bold">正在加载题目...</p></div></div>);
  }

  // 无题目状态
  if (!cur) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background:'#FFFBF5'}}>
        <div className="text-center">
          <div className="text-4xl mb-3">🐻</div>
          <p className="text-[#8B8580] font-bold">该模块暂无题目</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-sm text-[#5B9A5A] font-bold">← 返回</button>
        </div>
      </div>
    );
  }


  // 计算已完成题数 (用于退出确认)
  const completedCount = round === 'main' ? idx : (initialWrongCount - wrongList.length);
  const totalCount = round === 'main' ? sessionQ.length : initialWrongCount;

  // 练习中
  return (
    <div className="min-h-screen px-4 py-4 bg-cream">
      {/* 顶部消息 */}
      {msg && (
        <motion.div
          className="mb-3 p-2.5 rounded-xl bg-honey-pale text-honey text-sm font-bold text-center"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {msg}
        </motion.div>
      )}

      {/* 顶部栏 */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setShowExitConfirm(true)} className="text-sm font-bold text-ink-muted hover:text-ink-light">
          ← 退出
        </button>
        <div className="flex items-center gap-1.5">
          <span>{info.icon}</span>
          <span className="text-xs font-bold text-ink">{info.name}</span>
          {round === 'review' && (
            <span className="text-[10px] px-2 py-0.5 bg-honey/15 text-honey rounded-full font-bold">
              🔄 补考
            </span>
          )}
        </div>
        <span className="text-xs font-bold text-ink-muted">
          {round === 'main' ? `${idx + 1}/${sessionQ.length}` : `补考 ${wrongList.length}题`}
        </span>
      </div>

      {/* 进度条 */}
      <div className="h-1.5 bg-warm-bg rounded-full mb-4 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            round === 'review' ? 'bg-honey' : 'progress-shimmer'
          }`}
          style={{
            width: round === 'main'
              ? `${((idx) / sessionQ.length) * 100}%`
              : `${initialWrongCount > 0 ? ((reviewIdx) / initialWrongCount) * 100 : 0}%`,
          }}
        />
      </div>

      {/* 题目 */}
      <QuestionCard
        question={cur}
        questionNumber={round === 'main' ? idx + 1 : 1}
        totalQuestions={round === 'main' ? sessionQ.length : wrongList.length}
        onAnswer={handleAnswer}
      />

      {/* ═══ 退出确认弹窗 ═══ */}
      <AnimatePresence>
        {showExitConfirm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowExitConfirm(false)}
          >
            <motion.div
              className="card p-6 max-w-xs w-full text-center space-y-4 bg-cream"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={springs.popIn}
              onClick={e => e.stopPropagation()}
            >
              <div className="text-4xl">🤔</div>
              <h3 className="text-h3 text-ink font-bold">确定要退出吗?</h3>
              <p className="text-sm text-ink-light">
                已完成 {completedCount} 题
                {round === 'main' ? ` / ${totalCount}` : ''}
              </p>
              <p className="text-xs text-ink-muted">
                退出后下次进入将从第一题重新开始
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-2.5 text-sm font-bold rounded-xl bg-warm-bg text-ink-light"
                >
                  继续做题
                </button>
                <button
                  onClick={() => navigate(-1)}
                  className="flex-1 py-2.5 text-sm font-bold rounded-xl bg-berry-pale text-berry border border-berry/30"
                >
                  退出
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
