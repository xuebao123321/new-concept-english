import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../db/database';
import { calculateNextReview } from '../utils/spaced-repetition';
import { getPrioritizedWrongs, estimateStage, type PrioritizedWrong } from '../utils/review-priority';
import { LESSONS } from '../data/lessons';
import { springs } from '../utils/motion-tokens';
import type { QuestionType } from '../types';

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
}: {
  pw: PrioritizedWrong;
  onReview: (questionId: string, passed: boolean) => void;
  onUnmaster: (questionId: string) => void;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const { question: wq, label, stage, nextReviewLabel } = pw;
  const qType = inferType(wq.questionId);
  const lg = inferLessonGroup(wq.questionId);
  const isMastered = pw.priority === 'mastered';

  return (
    <>
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
                onClick={() => setShowConfirm(true)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg
                           bg-forest-pale text-forest border border-forest/30
                           hover:bg-forest/20 active:scale-95 transition-all whitespace-nowrap"
              >
                ▶ 开始复习
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* 确认弹窗 */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 backdrop-blur-sm px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              className="card p-6 bg-cream max-w-sm w-full text-center"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <p className="text-lg mb-1">🤔</p>
              <p className="text-sm font-bold text-ink mb-1">这道题你复习得怎么样?</p>
              <p className="text-xs text-ink-muted mb-4">
                {pw.label} · 🔥{wq.wrongCount}次 · {pw.nextReviewLabel}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { onReview(wq.questionId, false); setShowConfirm(false); }}
                  className="flex-1 py-2.5 text-sm font-bold rounded-xl
                             bg-berry-pale text-berry border border-berry/30
                             hover:bg-berry/20 active:scale-95 transition-all"
                >
                  ❌ 没答对
                </button>
                <button
                  onClick={() => { onReview(wq.questionId, true); setShowConfirm(false); }}
                  className="flex-1 py-2.5 text-sm font-bold rounded-xl
                             bg-forest-pale text-forest border border-forest/30
                             hover:bg-forest/20 active:scale-95 transition-all"
                >
                  ✅ 答对了
                </button>
              </div>
              <button
                onClick={() => setShowConfirm(false)}
                className="mt-2 text-xs text-ink-muted hover:text-ink"
              >
                取消
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
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

  // 标记复习结果
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

  // 批量复习
  const handleBulkReview = async (items: PrioritizedWrong[]) => {
    for (const pw of items) {
      const wq = pw.question;
      const stage = estimateStage(wq);
      const { nextStage, nextReviewTime } = calculateNextReview(stage, true, wq.wrongCount);
      await db.wrongQuestions.update(wq.questionId, {
        mastered: nextStage >= 5,
        nextReviewTime,
        wrongCount: wq.wrongCount,
        lastWrongTime: wq.lastWrongTime,
      });
    }
    setToast(`✅ ${items.length} 题复习通过! 阶段提升`);
    setTimeout(() => setToast(''), 2000);
    await loadData();
  };

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
        <h2 className="text-h2 text-ink mb-2">📝 复习中心</h2>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
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
        >
          <button
            onClick={() => handleBulkReview(groups.urgent)}
            className="w-full py-2.5 text-sm font-bold rounded-xl
                       bg-berry-pale text-berry border border-berry/30
                       hover:bg-berry/20 active:scale-[0.98] transition-all"
          >
            🚀 复习所有到期题目 ({groups.urgent.length} 题)
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
        >
          <button
            onClick={() => handleBulkReview(groups.due)}
            className="w-full py-2.5 text-sm font-bold rounded-xl
                       bg-honey-pale text-honey border border-honey/30
                       hover:bg-honey/20 active:scale-[0.98] transition-all"
          >
            🔄 提前复习这些 ({groups.due.length} 题)
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
  children,
}: {
  config: typeof GROUP_CONFIG[string];
  items: PrioritizedWrong[];
  defaultExpanded: boolean;
  onReview: (id: string, passed: boolean) => void;
  onUnmaster: (id: string) => void;
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
              />
            ))}
            {children && <div className="pt-1">{children}</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
