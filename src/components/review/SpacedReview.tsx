import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { db } from '../../db/database';
import { calculateNextReview, formatReviewInterval } from '../../utils/spaced-repetition';
import type { WrongQuestion } from '../../types';

interface SpacedReviewProps {
  refreshTrigger?: number;
}

// 阶段配置 (主题色板)
const STAGE_CONFIG = [
  { stage: 0, emoji: '📍', label: 'Stage 0', desc: '立即复习', color: '#E57373' },
  { stage: 1, emoji: '📍', label: 'Stage 1', desc: '1天后', color: '#FF8C42' },
  { stage: 2, emoji: '📍', label: 'Stage 2', desc: '3天后', color: '#FBBF24' },
  { stage: 3, emoji: '📍', label: 'Stage 3', desc: '7天后', color: '#5B9ED4' },
  { stage: 4, emoji: '📍', label: 'Stage 4', desc: '30天后', color: '#5B9A5A' },
  { stage: 5, emoji: '🏆', label: '永久掌握', desc: '已掌握', color: '#7E57C2' },
];

// 根据错误次数估算阶段
function estimateStage(wrongCount: number, mastered: boolean): number {
  if (mastered) return 5;
  if (wrongCount >= 5) return 4;
  return wrongCount;
}

function formatDueTime(ts: number): string {
  const now = Date.now();
  const diff = ts - now;
  if (diff <= 0) return '现在';
  if (diff < 3600000) return `${Math.ceil(diff / 60000)}分钟后`;
  if (diff < 86400000) return `${Math.ceil(diff / 3600000)}小时后`;
  if (diff < 604800000) return `${Math.ceil(diff / 86400000)}天后`;
  return new Date(ts).toLocaleDateString('zh-CN');
}

export default function SpacedReview({ refreshTrigger = 0 }: SpacedReviewProps) {
  const [allWrong, setAllWrong] = useState<WrongQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const loadData = async () => {
    setLoading(true);
    const due = await db.getDueReviewQuestions();
    // 也加载所有错题以显示统计
    const all = await db.wrongQuestions.toArray();
    setAllWrong(all);
    setLoading(false);
  };

  const handleReviewResult = async (questionId: string, passed: boolean) => {
    const wq = await db.wrongQuestions.get(questionId);
    if (!wq) return;

    const stage = estimateStage(wq.wrongCount, wq.mastered);
    const { nextStage, nextReviewTime } = calculateNextReview(stage, passed);

    await db.wrongQuestions.update(questionId, {
      mastered: nextStage >= 5,
      nextReviewTime,
      wrongCount: passed ? wq.wrongCount : wq.wrongCount + 1,
      lastWrongTime: passed ? wq.lastWrongTime : Date.now(),
    });

    await loadData();
  };

  // 按阶段统计
  const stageCounts = STAGE_CONFIG.map(sc => ({
    ...sc,
    count: allWrong.filter(w => estimateStage(w.wrongCount, w.mastered) === sc.stage).length,
  }));

  const dueQuestions = allWrong.filter(w => !w.mastered && w.nextReviewTime <= Date.now());
  const totalDue = dueQuestions.length;

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
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          🛡️
        </motion.div>
        <p className="text-lg font-bold text-ink mb-1">暂无复习任务</p>
        <p className="text-sm text-ink-light">所有知识点都稳固掌握！</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-ink">
          🛡️ 间隔复习
          <span className="text-sm font-normal text-ink-muted ml-2">
            今日待复习：{totalDue} 题
          </span>
        </h3>
      </div>

      {/* 阶段统计 */}
      <div className="grid grid-cols-3 gap-2">
        {stageCounts.map(sc => (
          <div
            key={sc.stage}
            className="glass-panel p-2.5 text-center"
            style={{ borderColor: sc.count > 0 ? `${sc.color}40` : undefined }}
          >
            <div className="text-lg">{sc.emoji}</div>
            <div className="text-xs text-ink-light mt-0.5">{sc.desc}</div>
            <div className="text-lg font-extrabold mt-0.5" style={{ color: sc.color }}>
              {sc.count}
            </div>
            <div className="text-[10px] text-ink-muted">题</div>
          </div>
        ))}
      </div>

      {/* 待复习列表 */}
      {totalDue === 0 ? (
        <div className="text-center py-10">
          <div className="text-3xl mb-2">🎉</div>
          <p className="text-ink-light text-sm">当前没有到期的复习任务</p>
          <p className="text-xs text-ink-muted mt-1">
            下次复习时间会根据间隔自动安排
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {dueQuestions
            .sort((a, b) => a.nextReviewTime - b.nextReviewTime)
            .map((wq, index) => {
              const stage = estimateStage(wq.wrongCount, wq.mastered);
              const intervalLabel = formatReviewInterval(stage);
              const dueLabel = formatDueTime(wq.nextReviewTime);

              return (
                <motion.div
                  key={wq.questionId}
                  className="glass-panel p-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-sm font-medium text-ink">
                        📝 {wq.questionId}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-berry">错{wq.wrongCount}次</span>
                        <span className="text-[10px] text-ink-muted">|</span>
                        <span className="text-[10px] text-forest">{intervalLabel}</span>
                        <span className="text-[10px] text-ink-muted">|</span>
                        <span className="text-[10px] text-ink-light">到期：{dueLabel}</span>
                      </div>
                    </div>
                  </div>

                  {/* 复习操作按钮 */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReviewResult(wq.questionId, false)}
                      className="flex-1 py-2 text-xs font-bold bg-berry/10 text-berry
                                 rounded-lg border border-berry/20 hover:bg-berry/20
                                 active:scale-95 transition-all"
                    >
                      ❌ 又错了
                    </button>
                    <button
                      onClick={() => handleReviewResult(wq.questionId, true)}
                      className="flex-1 py-2 text-xs font-bold bg-forest/10 text-forest
                                 rounded-lg border border-forest/20 hover:bg-forest/20
                                 active:scale-95 transition-all"
                    >
                      ✅ 答对了
                    </button>
                  </div>
                </motion.div>
              );
            })}
        </div>
      )}
    </div>
  );
}
