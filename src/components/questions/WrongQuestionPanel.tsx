import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { springs } from '../../utils/motion-tokens';
import type { WrongQuestionItem, WrongQuestionSummary } from '../../types';

// ── 常量 ──
const TYPE_LABELS: Record<string, string> = {
  choice: '📋 选择',
  fill: '✏️ 填空',
  translate: '🌐 翻译',
  reorder: '🧩 连词',
  listening: '🎧 听力',
};

const TYPE_ORDER = ['choice', 'fill', 'translate', 'reorder', 'listening'];

const DIFFICULTY_STARS: Record<string, string> = {
  easy: '⭐',
  medium: '⭐⭐',
  hard: '⭐⭐⭐',
};

// ── 课组标签格式化 ──
function formatLessonGroup(lg: string): string {
  const m = lg.match(/lesson-(\d+)-(\d+)/);
  if (m) return `L${m[1]}-${m[2]}`;
  return lg;
}

// ── 时间分组 ──
type TimeBucket = 'today' | 'week' | 'earlier';

function getTimeBucket(dateStr: string): TimeBucket {
  if (!dateStr) return 'earlier';
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 86400000);
  if (d >= today) return 'today';
  if (d >= weekAgo) return 'week';
  return 'earlier';
}

const TIME_LABELS: Record<TimeBucket, string> = {
  today: '📅 今天',
  week: '📆 本周',
  earlier: '📚 更早',
};

// ── Props ──
interface Props {
  wrongQuestions: WrongQuestionItem[];
  summary: WrongQuestionSummary;
  loading: boolean;
  role: 'student' | 'parent';
  childId?: number;
}

// ── 子组件: 单个错题卡片 ──
function WrongCard({ item }: { item: WrongQuestionItem }) {
  const stars = DIFFICULTY_STARS[item.difficulty] || '⭐⭐';
  const typeLabel = TYPE_LABELS[item.question_type] || item.question_type;
  const dateStr = item.created_at
    ? new Date(item.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
    : '';

  return (
    <motion.div
      className="card p-4 mb-3"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springs.enter}
    >
      {/* 顶部标签行 */}
      <div className="flex items-center flex-wrap gap-2 mb-3">
        <span className="text-xs px-2 py-0.5 rounded-full bg-forest-pale text-forest font-bold">
          {formatLessonGroup(item.lesson_group)}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-sky-pale text-sky font-bold">
          {typeLabel}
        </span>
        {item.wrong_count > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-berry-pale text-berry font-bold">
            🔥{item.wrong_count}次
          </span>
        )}
        <span className="text-xs text-ink-light ml-auto">
          {stars} {dateStr}
        </span>
      </div>

      {/* 原题文本 */}
      {item.question_text && (
        <div className="mb-3 p-3 rounded-xl bg-warm-bg border border-warm-border text-sm text-ink leading-relaxed">
          {item.question_text}
        </div>
      )}

      {/* 答案对比 */}
      <div className="flex gap-3 text-sm">
        <div className="flex-1 p-2 rounded-lg bg-berry-pale border border-berry/20">
          <span className="text-xs text-berry font-bold">❌ 你的答案</span>
          <p className="text-ink mt-0.5 font-medium break-all">{item.user_answer || '(未作答)'}</p>
        </div>
        <div className="flex-1 p-2 rounded-lg bg-forest-pale border border-forest/20">
          <span className="text-xs text-forest font-bold">✅ 正确答案</span>
          <p className="text-ink mt-0.5 font-medium break-all">{item.correct_answer || '-'}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ── 子组件: 分布条 ──
function DistributionBars({ byType }: { byType: Record<string, number> }) {
  const total = Object.values(byType).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      <p className="text-xs font-bold text-ink-light mb-2">题型分布</p>
      {TYPE_ORDER.map((qt) => {
        const count = byType[qt] || 0;
        if (count === 0) return null;
        const pct = Math.round((count / total) * 100);
        const label = TYPE_LABELS[qt] || qt;
        return (
          <div key={qt} className="flex items-center gap-2">
            <span className="text-xs w-14 text-ink-light flex-shrink-0">{label}</span>
            <div className="flex-1 h-3 rounded-full bg-warm-bg overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-forest"
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(pct, 4)}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
            <span className="text-xs font-bold text-ink w-8 text-right flex-shrink-0">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── 主组件 ──
export default function WrongQuestionPanel({ wrongQuestions, summary, loading, role, childId: _childId }: Props) {
  const [viewMode, setViewMode] = useState<'type' | 'lesson' | 'time'>('lesson');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  // 按分组字段归类
  const grouped = useMemo(() => {
    const groups: Record<string, WrongQuestionItem[]> = {};

    for (const item of wrongQuestions) {
      let key: string;
      switch (viewMode) {
        case 'type':
          key = item.question_type || 'unknown';
          break;
        case 'lesson':
          key = item.lesson_group || 'unknown';
          break;
        case 'time':
          key = getTimeBucket(item.created_at);
          break;
        default:
          key = 'unknown';
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return groups;
  }, [wrongQuestions, viewMode]);

  // 分组排序
  const sortedKeys = useMemo(() => {
    const keys = Object.keys(grouped);
    if (viewMode === 'type') {
      return keys.sort((a, b) => (grouped[b].length || 0) - (grouped[a].length || 0));
    }
    if (viewMode === 'lesson') {
      return keys.sort((a, b) => (grouped[b].length || 0) - (grouped[a].length || 0));
    }
    // time: today → week → earlier
    const order: TimeBucket[] = ['today', 'week', 'earlier'];
    return keys.sort((a, b) => order.indexOf(a as TimeBucket) - order.indexOf(b as TimeBucket));
  }, [grouped, viewMode]);

  // ── 加载态 ──
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="card p-4 animate-pulse">
          <div className="h-4 bg-warm-bg rounded w-24 mb-3" />
          <div className="flex gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex-1 h-16 bg-warm-bg rounded-xl" />
            ))}
          </div>
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="card p-4 animate-pulse">
            <div className="h-3 bg-warm-bg rounded w-3/4 mb-2" />
            <div className="h-3 bg-warm-bg rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  // ── 空状态 ──
  if (wrongQuestions.length === 0) {
    return (
      <motion.div
        className="card p-8 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springs.enter}
      >
        <p className="text-4xl mb-3">🎉</p>
        <p className="text-lg font-bold text-ink mb-1">暂无错题</p>
        <p className="text-sm text-ink-light">继续保持，你是最棒的！</p>
      </motion.div>
    );
  }

  // 最弱信息
  const weakestType = summary.most_missed_type
    ? (TYPE_LABELS[summary.most_missed_type] || summary.most_missed_type)
    : '-';
  const weakestLesson = summary.most_missed_lesson
    ? formatLessonGroup(summary.most_missed_lesson)
    : '-';
  const weakestLessonCount = summary.most_missed_lesson
    ? (summary.by_lesson[summary.most_missed_lesson] || 0)
    : 0;

  return (
    <div>
      {/* ── 概览卡片 ── */}
      <motion.div
        className="card p-4 mb-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springs.enter}
      >
        <div className="flex items-center gap-1 text-sm font-bold text-ink mb-3">
          📕 {role === 'parent' ? '错题分析' : '我的错题本'}
        </div>

        {/* 3 个统计数字横排 */}
        <div className="flex gap-3 mb-3">
          <div className="flex-1 p-3 rounded-xl bg-forest-pale text-center">
            <p className="text-2xl font-extrabold text-forest">{summary.total_wrong}</p>
            <p className="text-xs text-ink-light mt-0.5">错题总数</p>
          </div>
          <div className="flex-1 p-3 rounded-xl bg-honey-pale text-center">
            <p className="text-sm font-extrabold text-honey leading-tight">{weakestType}</p>
            <p className="text-xs text-ink-light mt-0.5">最弱题型</p>
          </div>
          <div className="flex-1 p-3 rounded-xl bg-sky-pale text-center">
            <p className="text-sm font-extrabold text-sky leading-tight">
              {weakestLesson}
            </p>
            <p className="text-xs text-ink-light mt-0.5">
              最弱课组 {weakestLessonCount > 0 && `(${weakestLessonCount}题)`}
            </p>
          </div>
        </div>

        {/* 题型分布条 */}
        <DistributionBars byType={summary.by_type} />
      </motion.div>

      {/* ── Tab 切换 ── */}
      <div className="flex gap-1 mb-3 bg-warm-bg rounded-xl p-1">
        {([
          ['lesson', '📗 按课组'],
          ['type', '📘 按题型'],
          ['time', '📙 按时间'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => {
              setViewMode(key);
              setExpandedGroup(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              viewMode === key
                ? 'bg-cream text-ink shadow-sm'
                : 'text-ink-light hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── 错题列表 ── */}
      <div>
        {sortedKeys.map((key) => {
          const items = grouped[key];
          const isExpanded = expandedGroup === key || expandedGroup === null;
          let groupLabel: string;
          if (viewMode === 'type') {
            groupLabel = TYPE_LABELS[key] || key;
          } else if (viewMode === 'lesson') {
            groupLabel = formatLessonGroup(key);
          } else {
            groupLabel = TIME_LABELS[key as TimeBucket] || key;
          }

          return (
            <div key={key} className="mb-2">
              {/* 分组头 */}
              <button
                onClick={() => setExpandedGroup(isExpanded ? key : null)}
                className="w-full flex items-center justify-between card p-3 text-left"
              >
                <span className="text-sm font-bold text-ink">
                  {groupLabel}
                  <span className="ml-2 text-xs text-ink-light font-normal">
                    {items.length} 题
                  </span>
                </span>
                <motion.span
                  className="text-ink-light text-xs"
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  ▼
                </motion.span>
              </button>

              {/* 展开的错题列表 */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    className="mt-2 ml-2 pl-3 border-l-2 border-warm-border"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    {items.map((item) => (
                      <WrongCard key={item.question_id + (item.created_at || '')} item={item} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
