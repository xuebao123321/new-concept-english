import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../db/database';
import { LESSONS } from '../../data/lessons';
import type { WrongQuestion, QuestionType } from '../../types';

interface WrongBookProps {
  refreshTrigger?: number;
  onStartReview?: (questionIds: string[]) => void;
}

const TYPE_FILTERS: { label: string; value: QuestionType | 'all' }[] = [
  { label: '全部', value: 'all' },
  { label: '选择', value: 'choice' },
  { label: '填空', value: 'fill' },
  { label: '翻译', value: 'translate' },
  { label: '连词', value: 'reorder' },
  { label: '听力', value: 'listening' },
];

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - ts;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

// 从 questionId 推断题型
function inferType(id: string): QuestionType {
  if (id.includes('-ch-') || id.includes('choice')) return 'choice';
  if (id.includes('-fill') || id.includes('fill')) return 'fill';
  if (id.includes('-trans') || id.includes('translate')) return 'translate';
  if (id.includes('-reorder') || id.includes('reorder')) return 'reorder';
  if (id.includes('-listen') || id.includes('listening')) return 'listening';
  return 'choice';
}

// 从 questionId 推断课号
function inferLessonNumber(id: string): number {
  const match = id.match(/L(\d+)/i);
  return match ? parseInt(match[1]) : 1;
}

export default function WrongBook({ refreshTrigger = 0, onStartReview }: WrongBookProps) {
  const [allWrong, setAllWrong] = useState<WrongQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<QuestionType | 'all'>('all');
  const [showMastered, setShowMastered] = useState(false);

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const loadData = async () => {
    setLoading(true);
    const all = await db.wrongQuestions.toArray();
    setAllWrong(all);
    setLoading(false);
  };

  const handleMastered = async (questionId: string) => {
    await db.wrongQuestions.update(questionId, { mastered: true });
    setAllWrong(prev => prev.map(w => w.questionId === questionId ? { ...w, mastered: true } : w));
  };

  // 筛选
  const filtered = allWrong.filter(w => {
    if (!showMastered && w.mastered) return false;
    if (typeFilter !== 'all' && inferType(w.questionId) !== typeFilter) return false;
    return true;
  });

  const unmasteredCount = allWrong.filter(w => !w.mastered).length;
  const masteredCount = allWrong.filter(w => w.mastered).length;

  // 加载中
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <motion.div className="text-2xl" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}>
          ⏳
        </motion.div>
      </div>
    );
  }

  // 空状态
  if (allWrong.length === 0) {
    return (
      <div className="text-center py-16">
        <motion.div
          className="text-6xl mb-4"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          🎉
        </motion.div>
        <p className="text-lg font-bold text-ink mb-1">太棒了！没有错题记录</p>
        <p className="text-sm text-ink-light">继续保持，你是最棒的领航员！</p>
        <div className="text-4xl mt-6 opacity-30">🐻</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 标题 + 统计 */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-ink">
          📕 错题本
          <span className="text-sm font-normal text-ink-muted ml-2">
            {unmasteredCount}题未掌握 / {masteredCount}题已掌握
          </span>
        </h3>
      </div>

      {/* 筛选栏 */}
      <div className="flex flex-wrap items-center gap-2">
        {TYPE_FILTERS.map(t => (
          <button
            key={t.value}
            onClick={() => setTypeFilter(t.value)}
            className={`text-xs px-3 py-1 rounded-full font-bold transition-all ${
              typeFilter === t.value
                ? 'bg-forest/20 text-forest border border-forest/40'
                : 'bg-warm-bg text-ink-muted border border-warm-border hover:border-warm-border'
            }`}
          >
            {t.label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => setShowMastered(!showMastered)}
          className={`text-xs px-3 py-1 rounded-full font-bold transition-all ${
            showMastered
              ? 'bg-forest/20 text-forest border border-forest/40'
              : 'bg-warm-bg text-ink-muted border border-warm-border'
          }`}
        >
          {showMastered ? '含已掌握' : '仅未掌握'}
        </button>
      </div>

      {/* 错题列表 */}
      <AnimatePresence>
        {filtered.length === 0 ? (
          <motion.div
            className="text-center py-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-3xl mb-2">📭</div>
            <p className="text-ink-light text-sm">没有符合条件的错题</p>
          </motion.div>
        ) : (
          filtered.map((wq, index) => {
            const lessonNum = inferLessonNumber(wq.questionId);
            const lesson = LESSONS.find(l =>
              l.lessonNumber <= lessonNum && lessonNum <= (l.lessonNumber + 1)
            );
            const qType = inferType(wq.questionId);

            return (
              <motion.div
                key={wq.questionId}
                className="glass-panel p-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.04 }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        wq.wrongCount >= 3
                          ? 'bg-berry/15 text-berry'
                          : wq.wrongCount >= 2
                          ? 'bg-honey/15 text-honey'
                          : 'bg-honey/10 text-honey'
                      }`}>
                        错{wq.wrongCount}次
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-warm-bg text-ink-light">
                        {TYPE_FILTERS.find(t => t.value === qType)?.label || qType}
                      </span>
                      <span className="text-xs text-ink-muted">
                        {lesson?.titleCn || `第${lessonNum}课`}
                      </span>
                      {wq.mastered && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-forest/15 text-forest rounded-full font-bold">
                          ✅ 已掌握
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-muted font-mono mb-1">{wq.questionId}</p>
                    <p className="text-[10px] text-ink-muted">
                      最后错误：{formatTime(wq.lastWrongTime)}
                    </p>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex-shrink-0 ml-3 flex flex-col gap-2">
                    {!wq.mastered && onStartReview && (
                      <button
                        onClick={() => onStartReview([wq.questionId])}
                        className="px-3 py-1.5 text-xs font-bold bg-forest/15 text-forest
                                   rounded-lg hover:bg-forest/25 active:scale-95 transition-all"
                      >
                        重新练习
                      </button>
                    )}
                    {!wq.mastered && (
                      <button
                        onClick={() => handleMastered(wq.questionId)}
                        className="px-3 py-1.5 text-xs font-medium bg-forest/15 text-forest
                                   rounded-lg hover:bg-forest/25 active:scale-95 transition-all"
                      >
                        已掌握
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </AnimatePresence>

      {/* 底部操作 */}
      {unmasteredCount > 0 && (
        <div className="pt-2">
          <button
            onClick={() => {
              const ids = allWrong.filter(w => !w.mastered).map(w => w.questionId);
              onStartReview?.(ids);
            }}
            className="w-full py-3 btn-gold text-sm"
          >
            🔄 一键复习全部未掌握错题（{unmasteredCount}题）
          </button>
        </div>
      )}
    </div>
  );
}
