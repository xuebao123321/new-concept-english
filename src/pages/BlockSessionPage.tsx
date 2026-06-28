import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getQuestionsByBlock } from '../data/questions';
import { useQuestions } from '../hooks/useQuestions';
import { useLessonProgressStore } from '../stores/useLessonProgressStore';
import { useUserStore } from '../stores/useUserStore';
import { calculateBlockCompleteXp } from '../utils/xp-calculator';
import QuestionCard from '../components/questions/QuestionCard';
import Confetti from '../components/common/Confetti';
import { springs } from '../utils/motion-tokens';
import { api } from '../db/api';
import type { Question, BlockType } from '../types';

const BLOCK_INFO: Record<BlockType, { icon: string; name: string; color: string; bg: string }> = {
  vocabulary: { icon: '📡', name: '单词森林',   color: '#5B9ED4', bg: '#E8F2FC' },
  grammar:    { icon: '🔧', name: '语法工坊',   color: '#7E57C2', bg: '#EDE7F6' },
  sentence:   { icon: '🗣️', name: '句子城堡',   color: '#5B9A5A', bg: '#E8F5E8' },
  listening:  { icon: '📻', name: '听力花园',   color: '#FF8C42', bg: '#FFF2E8' },
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
    if (blockType === 'listening') return q.type === 'listening';
    return true;
  });

  const [sessionQ, setSessionQ] = useState<Question[]>([]);
  useEffect(() => { if (filteredQuestions.length > 0) setSessionQ([...filteredQuestions].sort(() => Math.random() - 0.5)); }, [filteredQuestions.length]);
  const [idx, setIdx] = useState(0);
  const [wrongList, setWrongList] = useState<Question[]>([]);
  const [round, setRound] = useState<'main' | 'review'>('main');
  const [reviewIdx, setReviewIdx] = useState(0);
  const [initialWrongCount, setInitialWrongCount] = useState(0);
  const [done, setDone] = useState(false);
  const [allCorrect, setAllCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

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
    }
    await addXp(calculateBlockCompleteXp());
    // 异步向后端推送进度
    api.updateProgress(groupId || '', correctCount, sessionQ.length).catch(() => {});
    setAllCorrect(perfect);
    setDone(true);
  };

  // 完成页
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-cream">
        <Confetti active={allCorrect} />
        <motion.div
          className="text-center space-y-5"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={springs.success}
        >
          <div className="text-6xl">{allCorrect ? '🎉' : '💪'}</div>
          <h2 className="text-2xl font-extrabold text-ink">
            {allCorrect ? '信号修复完成！' : '还需要修复！'}
          </h2>
          <p className="text-ink-light font-bold">
            {allCorrect
              ? `${info.name}已恢复正常 ⚡ +${calculateBlockCompleteXp()}XP`
              : `还有 ${wrongList.length} 个信号不稳定`}
          </p>

          {allCorrect ? (
            <div className="space-y-3">
              <button onClick={() => navigate(`/lesson/${groupId}`)} className="w-full py-3 btn-primary">
                🚀 继续下一块
              </button>
              <button onClick={() => navigate(-1)} className="w-full py-3 bg-warm-bg text-ink-light font-bold rounded-xl border border-warm-border">
                📋 返回课程
              </button>
            </div>
          ) : (
            <button onClick={() => { setRound('review'); setDone(false); }} className="w-full py-3 btn-gold">
              🔄 补考错题（{wrongList.length}题）
            </button>
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
          答错会消耗一颗心,每 30 分钟自动恢复一颗~
          <br />休息一会儿再来吧!
        </p>
        <button onClick={() => navigate(-1)} className="btn-ghost text-base w-40">
          ← 返回
        </button>
      </div>
    );
  }

  // 练习中
  return (
    <div className="min-h-screen px-4 py-4 bg-cream">
      {/* 顶部栏 */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => navigate(-1)} className="text-sm font-bold text-ink-muted hover:text-ink-light">
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
    </div>
  );
}
