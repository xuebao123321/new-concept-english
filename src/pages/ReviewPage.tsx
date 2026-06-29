import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../db/database';
import { calculateNextReview } from '../utils/spaced-repetition';
import { getPrioritizedWrongs, estimateStage, type PrioritizedWrong } from '../utils/review-priority';
import { findQuestion } from '../utils/find-question';
import ReviewQuestionCard from '../components/questions/ReviewQuestionCard';
import { useUserStore } from '../stores/useUserStore';
import { api } from '../db/api';
import { LESSONS } from '../data/lessons';
import { springs } from '../utils/motion-tokens';
import type { Question, QuestionType } from '../types';

// ── 分组配置 ──
const GROUP_CONFIG: Record<string, { emoji: string; label: string; color: string; bg: string }> = {
  urgent:  { emoji: '🔴', label: '今天必须复习', color: 'text-berry', bg: 'bg-berry-pale border-berry/20' },
  due:     { emoji: '🟠', label: '近期该复习',   color: 'text-honey', bg: 'bg-honey-pale border-honey/20' },
  weak:    { emoji: '🟡', label: '高频错题 (错 ≥3 次)', color: 'text-ink-light', bg: 'bg-warm-bg border-warm-border' },
  mastered:{ emoji: '🟢', label: '已掌握',       color: 'text-forest', bg: 'bg-forest-pale border-forest/20' },
};

const STAGE_PROGRESS = [
  { stage: 0, label: '①', desc: '初始' },
  { stage: 1, label: '②', desc: '1天' },
  { stage: 2, label: '③', desc: '3天' },
  { stage: 3, label: '④', desc: '7天' },
  { stage: 4, label: '⑤', desc: '30天' },
  { stage: 5, label: '✅', desc: '掌握' },
];

// ── 工具 ──
function inferType(id: string): QuestionType {
  if (id.includes('-ch-') || id.includes('choice')) return 'choice';
  if (id.includes('-fill') || id.includes('fill')) return 'fill';
  if (id.includes('-trans') || id.includes('translate')) return 'translate';
  if (id.includes('-reorder') || id.includes('reorder')) return 'reorder';
  if (id.includes('-listen') || id.includes('listening')) return 'listening';
  return 'choice';
}

function inferLessonGroup(id: string): string {
  const m = id.match(/L(\d+)/i);
  if (!m) return '';
  const num = parseInt(m[1]);
  const lesson = LESSONS.find(l => l.lessonNumber <= num && num <= (l.lessonNumber + 1));
  return lesson?.group || `lesson-${String(num).padStart(2, '0')}`;
}

function formatLessonGroup(lg: string): string {
  const m = lg.match(/lesson-(\d+)-(\d+)/);
  if (m) return `L${m[1]}-${m[2]}`;
  return lg;
}

const TYPE_LABELS: Record<string, string> = {
  choice: '选择', fill: '填空', translate: '翻译', reorder: '连词', listening: '听力',
};

// ── 单题卡片 ──
function QuestionCard({
  pw,
  onReview,
  onUnmaster,
  onStartReview,
  isReviewing,
  reviewQuestion,
  reviewFallback,
  onReviewAnswer,
}: {
  pw: PrioritizedWrong;
  onReview: (questionId: string, passed: boolean) => void;
  onUnmaster: (questionId: string) => void;
  onStartReview: (pw: PrioritizedWrong) => void;
  isReviewing: boolean;
  reviewQuestion: Question | null;
  reviewFallback: { question_text: string; correct_answer: string; question_type: string } | null;
  onReviewAnswer: (questionId: string, correct: boolean) => void;
}) {
  const { question: wq, label, stage, nextReviewLabel } = pw;
  const qType = inferType(wq.questionId);
  const lg = inferLessonGroup(wq.questionId);
  const isMastered = pw.priority === 'mastered';

  return (
    <motion.div
      className="card p-3.5 bg-white"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springs.enter}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* 标签行 */}
          <div className="flex items-center flex-wrap gap-1.5 mb-1.5">
            {lg && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-forest-pale text-forest font-bold">
                {formatLessonGroup(lg)}
              </span>
            )}
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-pale text-sky font-bold">
              {TYPE_LABELS[qType] || qType}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              wq.wrongCount >= 3 ? 'bg-berry-pale text-berry' : 'bg-honey-pale text-honey'
            }`}>
              🔥{wq.wrongCount}次
            </span>
            {isMastered && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-forest/15 text-forest font-bold">
                ✅ 已掌握
              </span>
            )}
          </div>

          {/* 阶段条 */}
          <div className="flex items-center gap-0.5 mb-1">
            <span className="text-[10px] text-ink-muted mr-1">复习阶段:</span>
            {STAGE_PROGRESS.map(sp => (
              <span
                key={sp.stage}
                className={`text-[11px] ${sp.stage <= stage ? 'opacity-100' : 'opacity-25'}`}
                title={sp.desc}
              >
                {sp.label}
              </span>
            ))}
          </div>

          {/* 下次复习标签 */}
          <p className={`text-[11px] font-medium ${
            pw.priority === 'urgent' ? 'text-berry' :
            pw.priority === 'due' ? 'text-honey' :
            'text-ink-muted'
          }`}>
            下次: {nextReviewLabel}
            {label && !isMastered && (
              <span className="ml-1.5">({label})</span>
            )}
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="flex-shrink-0">
          {isMastered ? (
            <button
              onClick={() => onUnmaster(wq.questionId)}
              className="px-2.5 py-1.5 text-[10px] font-bold rounded-lg
                         bg-warm-bg text-ink-muted hover:bg-berry-pale hover:text-berry
                         active:scale-95 transition-all whitespace-nowrap"
              title="取消掌握,重新加入复习"
            >
              ↩ 取消掌握
            </button>
          ) : (
            <button
              onClick={() => onStartReview(pw)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg
                         bg-forest-pale text-forest border border-forest/30
                         hover:bg-forest/20 active:scale-95 transition-all whitespace-nowrap"
            >
              ▶ 开始复习
            </button>
          )}
        </div>
      </div>

      {/* 内联复习区域 */}
      {isReviewing && (
        <div className="mt-3 pt-3 border-t border-warm-border">
          <ReviewQuestionCard
            question={reviewQuestion}
            fallback={reviewFallback || undefined}
            onAnswer={(correct) => onReviewAnswer(wq.questionId, correct)}
          />
        </div>
      )}
    </motion.div>
  );
}

// ── 主页面 ──
export default function ReviewPage() {
  const [groups, setGroups] = useState<{
    urgent: PrioritizedWrong[];
    due: PrioritizedWrong[];
    weak: PrioritizedWrong[];
    mastered: PrioritizedWrong[];
  }>({ urgent: [], due: [], weak: [], mastered: [] });
  const [loading, setLoading] = useState(true);
  const [showMastered, setShowMastered] = useState(false);
  const [toast, setToast] = useState('');

  // ── 逐题复习状态 ──
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewQuestion, setReviewQuestion] = useState<Question | null>(null);
  const [reviewFallback, setReviewFallback] = useState<{
    question_text: string; correct_answer: string; question_type: string;
  } | null>(null);

  // ── 批量复习状态 ──
  const [batchMode, setBatchMode] = useState(false);
  const [batchIndex, setBatchIndex] = useState(0);
  const [batchItems, setBatchItems] = useState<PrioritizedWrong[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const g = await getPrioritizedWrongs();
      setGroups(g);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── 加载题目数据并开始复习 ──
  const handleStartReview = async (pw: PrioritizedWrong) => {
    const qid = pw.question.questionId;
    const result = await findQuestion(qid);
    if (result?.found) {
      setReviewQuestion(result.question || null);
      setReviewFallback(result.fallback || null);
    } else {
      setReviewQuestion(null);
      setReviewFallback(null);
    }
    setReviewingId(qid);
  };

  // ── 复习作答回调 ──
  const handleReviewAnswer = async (questionId: string, correct: boolean) => {
    // 更新错题复习进度
    const wq = await db.wrongQuestions.get(questionId);
    if (wq) {
      const wc = correct ? wq.wrongCount : wq.wrongCount + 1;
      const stage = estimateStage(wq);
      const { nextStage, nextReviewTime } = calculateNextReview(stage, correct, wc);

      await db.wrongQuestions.update(questionId, {
        mastered: nextStage >= 5,
        nextReviewTime,
        wrongCount: wc,
        lastWrongTime: Date.now(),
      });
    }

    // 答对才给 XP（过期题 +8，正常 +5）
    let xpAmount = 0;
    if (correct) {
      const isUrgent = groups.urgent.some(p => p.question.questionId === questionId)
                    || (batchMode && batchItems.some(p => p.question.questionId === questionId && p.priority === 'urgent'));
      xpAmount = isUrgent ? 8 : 5;
      useUserStore.getState().addXp(xpAmount);
    }

    // 立即从本地列表中移除此题（不再重复出现）
    setGroups(prev => ({
      urgent: prev.urgent.filter(p => p.question.questionId !== questionId),
      due: prev.due.filter(p => p.question.questionId !== questionId),
      weak: prev.weak.filter(p => p.question.questionId !== questionId),
      mastered: prev.mastered,
    }));

    // 复习累计计数 + 奖励检测（答对才计数）
    if (correct) {
      const count = Number(localStorage.getItem('nce_review_count') || '0') + 1;
      localStorage.setItem('nce_review_count', String(count));
      if (count >= 20 && !localStorage.getItem('nce_review_reward_done')) {
        api.checkRewards({ check_type: 'review_20' }).then(res => {
          if (res?.rewards?.length > 0) {
            localStorage.setItem('nce_review_reward_done', '1');
            const msgs = res.rewards.map((r: any) => r.message).join('\n');
            setToast(`🎁 ${msgs}`);
            setTimeout(() => setToast(''), 3000);
          }
        }).catch(() => {});
      }
    }

    // 批量模式：自动跳到下一题
    if (batchMode && batchIndex < batchItems.length - 1) {
      const nextIdx = batchIndex + 1;
      const nextPw = batchItems[nextIdx];
      setBatchIndex(nextIdx);
      const result = await findQuestion(nextPw.question.questionId);
      if (result?.found) {
        setReviewQuestion(result.question || null);
        setReviewFallback(result.fallback || null);
      } else {
        setReviewQuestion(null);
        setReviewFallback(null);
      }
      setReviewingId(nextPw.question.questionId);
    } else if (batchMode) {
      // 批量模式全部完成
      setBatchMode(false);
      setBatchItems([]);
      setBatchIndex(0);
      setReviewingId(null);
      setReviewQuestion(null);
      setReviewFallback(null);
      setToast(`🎉 完成批复习! XP 已到账`);
      setTimeout(() => setToast(''), 2500);
    } else {
      // 单题模式
      setToast(correct
        ? `✅ 复习通过 · +${xpAmount} XP`
        : '💪 答错了，继续努力!');
      setTimeout(() => setToast(''), 2000);
      setReviewingId(null);
      setReviewQuestion(null);
      setReviewFallback(null);
    }
  };

  // ── 启动批量复习 ──
  const startBatchReview = async (items: PrioritizedWrong[]) => {
    if (items.length === 0) return;
    setBatchItems(items);
    setBatchIndex(0);
    setBatchMode(true);
    // 自动加载第一题
    const first = items[0];
    const result = await findQuestion(first.question.questionId);
    if (result?.found) {
      setReviewQuestion(result.question || null);
      setReviewFallback(result.fallback || null);
    } else {
      setReviewQuestion(null);
      setReviewFallback(null);
    }
    setReviewingId(first.question.questionId);
  };

  // 标记复习结果（保留兼容 GroupSection 的 onReview prop，实际已不再使用）
  const handleReview = async (questionId: string, passed: boolean) => {
    const wq = await db.wrongQuestions.get(questionId);
    if (!wq) return;

    const wc = passed ? wq.wrongCount : wq.wrongCount + 1;
    const stage = estimateStage(wq);
    const { nextStage, nextReviewTime } = calculateNextReview(stage, passed, wc);

    await db.wrongQuestions.update(questionId, {
      mastered: nextStage >= 5,
      nextReviewTime,
      wrongCount: wc,
      lastWrongTime: passed ? wq.lastWrongTime : Date.now(),
    });

    setToast(passed ? '✅ 复习通过! 阶段提升' : '💪 没关系,再来一次');
    setTimeout(() => setToast(''), 2000);
    await loadData();
  };

  // 取消掌握
  const handleUnmaster = async (questionId: string) => {
    await db.wrongQuestions.update(questionId, {
      mastered: false,
      nextReviewTime: Date.now(),
    });
    setToast('↩ 已移回复习列表');
    setTimeout(() => setToast(''), 2000);
    await loadData();
  };

  const [showHelp, setShowHelp] = useState(false);

  const totalAll = groups.urgent.length + groups.due.length + groups.weak.length;
  const needsReview = groups.urgent.length + groups.due.length;

  // ── 加载态 ──
  if (loading) {
    return (
      <div className="px-4 py-4">
        <div className="space-y-3 animate-pulse">
          <div className="h-4 bg-warm-bg rounded w-40" />
          {[1,2,3].map(i => (
            <div key={i} className="h-20 bg-warm-bg rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // ── 全部为空 ──
  if (totalAll === 0 && groups.mastered.length === 0) {
    return (
      <div className="px-4 py-4">
        <motion.div
          className="card p-10 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springs.enter}
        >
          <motion.div
            className="text-6xl mb-4"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            🎉
          </motion.div>
          <p className="text-lg font-bold text-ink mb-1">暂无待复习题目!</p>
          <p className="text-sm text-ink-light">继续保持,你是最棒的!</p>
          <div className="text-4xl mt-4 opacity-30">🐻</div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4">
      {/* ── 顶部概览 ── */}
      <motion.div
        className="card p-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springs.enter}
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-h2 text-ink">📝 复习中心</h2>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="text-xs text-ink-muted hover:text-forest font-bold"
          >
            {showHelp ? '收起说明 ▲' : '📖 为什么总有题？'}
          </button>
        </div>
        {showHelp && (
          <div className="mb-3 p-3 bg-sky-pale rounded-xl text-xs space-y-2">
            <p className="font-bold text-ink">🧠 基于艾宾浩斯遗忘曲线</p>
            <p className="text-ink-muted">一次答对≠永远记住！系统会在关键时间点提醒你重温：</p>
            <div className="grid grid-cols-5 gap-1 text-center">
              {[
                { s: '①', d: '立即', c: 'bg-berry-pale text-berry' },
                { s: '②', d: '1天后', c: 'bg-honey-pale text-honey' },
                { s: '③', d: '3天后', c: 'bg-sky-pale text-sky' },
                { s: '④', d: '7天后', c: 'bg-plum-pale text-plum' },
                { s: '⑤', d: '30天后', c: 'bg-forest-pale text-forest' },
              ].map(st => (
                <div key={st.s} className={`rounded-lg py-1.5 ${st.c}`}>
                  <div className="text-sm font-extrabold">{st.s}</div>
                  <div className="text-[10px] font-bold">{st.d}</div>
                </div>
              ))}
            </div>
            <p className="text-ink-muted leading-relaxed">
              答对 → <b className="text-forest">阶段+1</b>，间隔翻倍 · 答错 → <b className="text-berry">回到阶段0</b>，5分钟后重来<br/>
              连续答对 5 次到达 <b className="text-forest">✅ 永久掌握</b>，这道题就再也不会出现了！
            </p>
          </div>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mb-2">
          <span className="text-ink-light">
            共 <b className="text-ink">{totalAll + groups.mastered.length}</b> 道错题
          </span>
          <span className="text-berry font-bold">
            {groups.urgent.length} 道过期
          </span>
          <span className="text-honey font-bold">
            {needsReview} 道该复习
          </span>
          <span className="text-forest font-bold">
            {groups.mastered.length} 道已掌握
          </span>
        </div>
        {needsReview > 0 && (
          <div className="flex items-center gap-2 bg-forest-pale rounded-xl px-3 py-2">
            <span className="text-lg">🎁</span>
            <div className="flex-1">
              <p className="text-xs font-bold text-forest">每复习 1 题 +5 XP</p>
              <p className="text-[10px] text-ink-muted">
                今日完成 {needsReview} 题可得 <b className="text-forest">+{needsReview * 5} XP</b>
                {groups.urgent.length > 0 && (
                  <span className="text-berry ml-1">· 过期题额外 +3 XP!</span>
                )}
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5
                       rounded-xl bg-forest-pale text-forest text-sm font-bold shadow-lg"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 🔴 Urgent: 今天必须复习 ── */}
      {groups.urgent.length > 0 && (
        <GroupSection
          config={GROUP_CONFIG.urgent}
          items={groups.urgent}
          defaultExpanded={true}
          onReview={handleReview}
          onUnmaster={handleUnmaster}
          onStartReview={handleStartReview}
          reviewingId={reviewingId}
          reviewQuestion={reviewQuestion}
          reviewFallback={reviewFallback}
          onReviewAnswer={handleReviewAnswer}
        >
          <button
            onClick={() => startBatchReview(groups.urgent)}
            className="w-full py-2.5 text-sm font-bold rounded-xl
                       bg-berry-pale text-berry border border-berry/30
                       hover:bg-berry/20 active:scale-[0.98] transition-all"
          >
            🚀 逐题复习 ({groups.urgent.length} 题)
          </button>
        </GroupSection>
      )}

      {/* ── 🟠 Due: 近期该复习 ── */}
      {groups.due.length > 0 && (
        <GroupSection
          config={GROUP_CONFIG.due}
          items={groups.due}
          defaultExpanded={true}
          onReview={handleReview}
          onUnmaster={handleUnmaster}
          onStartReview={handleStartReview}
          reviewingId={reviewingId}
          reviewQuestion={reviewQuestion}
          reviewFallback={reviewFallback}
          onReviewAnswer={handleReviewAnswer}
        >
          <button
            onClick={() => startBatchReview(groups.due)}
            className="w-full py-2.5 text-sm font-bold rounded-xl
                       bg-honey-pale text-honey border border-honey/30
                       hover:bg-honey/20 active:scale-[0.98] transition-all"
          >
            🔄 逐题复习这些 ({groups.due.length} 题)
          </button>
        </GroupSection>
      )}

      {/* ── 🟡 Weak: 高频错题 ── */}
      {groups.weak.length > 0 && (
        <GroupSection
          config={GROUP_CONFIG.weak}
          items={groups.weak}
          defaultExpanded={true}
          onReview={handleReview}
          onUnmaster={handleUnmaster}
          onStartReview={handleStartReview}
          reviewingId={reviewingId}
          reviewQuestion={reviewQuestion}
          reviewFallback={reviewFallback}
          onReviewAnswer={handleReviewAnswer}
        />
      )}

      {/* ── 🟢 Mastered: 已掌握 (可折叠) ── */}
      {groups.mastered.length > 0 && (
        <div>
          <button
            onClick={() => setShowMastered(!showMastered)}
            className="w-full flex items-center justify-between card p-3"
          >
            <span className={`text-sm font-bold ${GROUP_CONFIG.mastered.color}`}>
              {GROUP_CONFIG.mastered.emoji} {GROUP_CONFIG.mastered.label} ({groups.mastered.length} 题)
            </span>
            <motion.span
              className="text-ink-light text-xs"
              animate={{ rotate: showMastered ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              ▼
            </motion.span>
          </button>

          <AnimatePresence>
            {showMastered && (
              <motion.div
                className="mt-2 ml-2 pl-3 border-l-2 border-forest/20 space-y-2"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                {groups.mastered.map(pw => (
                  <QuestionCard
                    key={pw.question.questionId}
                    pw={pw}
                    onReview={handleReview}
                    onUnmaster={handleUnmaster}
                    onStartReview={handleStartReview}
                    isReviewing={reviewingId === pw.question.questionId}
                    reviewQuestion={reviewQuestion}
                    reviewFallback={reviewFallback}
                    onReviewAnswer={handleReviewAnswer}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── 全部已掌握,待复习为空 ── */}
      {totalAll === 0 && groups.mastered.length > 0 && (
        <motion.div
          className="card p-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springs.enter}
        >
          <p className="text-4xl mb-3">🎉</p>
          <p className="text-lg font-bold text-ink mb-1">全部已掌握!</p>
          <p className="text-sm text-ink-light">继续保持,你是最棒的!</p>
        </motion.div>
      )}
    </div>
  );
}

// ── 分组区块组件 ──
function GroupSection({
  config,
  items,
  defaultExpanded,
  onReview,
  onUnmaster,
  onStartReview,
  reviewingId,
  reviewQuestion,
  reviewFallback,
  onReviewAnswer,
  children,
}: {
  config: typeof GROUP_CONFIG[string];
  items: PrioritizedWrong[];
  defaultExpanded: boolean;
  onReview: (id: string, passed: boolean) => void;
  onUnmaster: (id: string) => void;
  onStartReview: (pw: PrioritizedWrong) => void;
  reviewingId: string | null;
  reviewQuestion: Question | null;
  reviewFallback: { question_text: string; correct_answer: string; question_type: string } | null;
  onReviewAnswer: (id: string, correct: boolean) => void;
  children?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between rounded-xl p-3 border ${config.bg}`}
      >
        <span className={`text-sm font-bold ${config.color}`}>
          {config.emoji} {config.label} ({items.length} 题)
        </span>
        <motion.span
          className="text-ink-light text-xs"
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          ▼
        </motion.span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            className="mt-2 space-y-2"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {items.map(pw => (
              <QuestionCard
                key={pw.question.questionId}
                pw={pw}
                onReview={onReview}
                onUnmaster={onUnmaster}
                onStartReview={onStartReview}
                isReviewing={reviewingId === pw.question.questionId}
                reviewQuestion={reviewQuestion}
                reviewFallback={reviewFallback}
                onReviewAnswer={onReviewAnswer}
              />
            ))}
            {children && <div className="pt-1">{children}</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
