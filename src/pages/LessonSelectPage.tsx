import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLessonProgressStore } from '../stores/useLessonProgressStore';
import { LESSONS, LESSON_GROUPS } from '../data/lessons';
import { STAGES } from '../data/stages';
import { motion } from 'framer-motion';
import { springs, staggerDelay } from '../utils/motion-tokens';

// 轻量课程选择页 — 点击课组直接进入课程详情（块练习流程）
export default function LessonSelectPage() {
  const nav = useNavigate();
  const { isUnlocked, isCompleted, isLoading, getNextUnlocked, progressMap } = useLessonProgressStore();
  const [activeStage, setActiveStage] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <motion.div className="text-3xl" animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}>⏳</motion.div>
      </div>
    );
  }

  const nextUnlocked = getNextUnlocked();
  const completedCount = LESSON_GROUPS.filter(g => isCompleted(g)).length;

  return (
    <div className="px-4 py-4 space-y-4">
      {/* 进度概览 */}
      <div className="card card-highlight p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-ink-light">学习进度</div>
            <div className="text-2xl font-extrabold text-ink">
              {completedCount}<span className="text-sm text-ink-light">/{LESSON_GROUPS.length}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-ink-light">下一关</div>
            <div className="text-lg font-bold text-forest">
              {nextUnlocked ? `第${LESSON_GROUPS.indexOf(nextUnlocked) + 1}关` : '已全部完成'}
            </div>
          </div>
        </div>
        <div className="mt-3 h-2 bg-warm-bg rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full progress-shimmer"
            initial={{ width: 0 }}
            animate={{ width: `${(completedCount / LESSON_GROUPS.length) * 100}%` }}
            transition={{ duration: 0.8 }}
          />
        </div>
      </div>

      {/* 阶段筛选 */}
      <div className="flex gap-1.5 overflow-x-auto py-1 no-scrollbar">
        <button
          onClick={() => setActiveStage(null)}
          className={`px-3 py-1.5 text-xs font-bold rounded-full whitespace-nowrap transition-all ${
            activeStage === null ? 'bg-forest text-cream' : 'bg-warm-bg text-ink-light'
          }`}
        >
          📚 全部
        </button>
        {STAGES.map(stage => (
          <button
            key={stage.id}
            onClick={() => setActiveStage(prev => prev === stage.id ? null : stage.id)}
            className={`px-3 py-1.5 text-xs font-bold rounded-full whitespace-nowrap transition-all ${
              activeStage === stage.id ? 'bg-forest text-cream' : 'bg-warm-bg text-ink-light'
            }`}
          >
            {stage.icon} {stage.name}
          </button>
        ))}
      </div>

      {/* 课组列表 */}
      <div className="space-y-2">
        {LESSON_GROUPS.filter(g => {
          if (activeStage === null) return true;
          const stage = STAGES.find(s => s.groups.includes(g));
          return stage?.id === activeStage;
        }).map((group, index) => {
          const lessons = LESSONS.filter(l => l.group === group);
          const hasData = lessons.length > 0;
          const unlocked = hasData && isUnlocked(group);
          const completed = hasData && isCompleted(group);
          const isRecommended = group === nextUnlocked;
          // V10: 四态标签
          const progress = progressMap.get(group);
          const pStatus: string = (progress as any)?.status
            || (completed ? 'completed' : unlocked ? 'unlocked' : 'locked');
          const unlockedBy: string = (progress as any)?.unlocked_by || '';
          const lessonNums = hasData ? lessons.map(l => l.lessonNumber) : [];
          const main = lessons[0];

          // 未解锁课的提示
          const prevGroup = index > 0 ? LESSON_GROUPS[index - 1] : null;
          const prevCompleted = prevGroup ? isCompleted(prevGroup) : false;
          const prevLessons = prevGroup ? LESSONS.filter(l => l.group === prevGroup) : [];
          const prevTitle = prevLessons[0]?.titleCn || '';

          return (
            <motion.button
              key={group}
              onClick={() => unlocked && nav(`/lesson/${group}`)}
              disabled={!unlocked}
              className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${
                !hasData
                  ? 'bg-warm-bg border-warm-border opacity-40 cursor-not-allowed'
                  : !unlocked
                  ? 'bg-warm-bg border-warm-border opacity-70 cursor-not-allowed'
                  : completed
                  ? 'card-success'
                  : isRecommended
                  ? 'card-highlight'
                  : 'card hover:border-forest/30'
              }`}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: staggerDelay(index), ...springs.slideUp }}
              whileTap={unlocked ? { scale: 0.98 } : {}}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                  !hasData ? 'bg-warm-bg text-ink-muted' :
                  pStatus === 'completed' ? 'bg-forest-pale text-forest' :
                  pStatus === 'unlocked' && unlockedBy === 'reward'
                    ? 'bg-honey-pale text-honey' :
                  pStatus === 'unlocked' ? 'bg-sky-pale text-sky' :
                  pStatus === 'in_progress' ? 'bg-honey-pale text-honey' :
                  'bg-warm-bg text-ink-muted'
                }`}>
                  {!hasData ? '⏳' :
                   pStatus === 'completed' ? '✅' :
                   pStatus === 'unlocked' && unlockedBy === 'reward' ? '🎁' :
                   pStatus === 'unlocked' ? '🔓' :
                   pStatus === 'in_progress' ? '🔄' : '🔒'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-ink">
                      第 {hasData ? lessonNums.join('-') : '??'} 课
                    </span>
                    {isRecommended && pStatus === 'unlocked' && unlockedBy !== 'reward' && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-forest-pale text-forest rounded-full">推荐</span>
                    )}
                    {pStatus === 'completed' && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-forest-pale text-forest rounded-full">已通关</span>
                    )}
                    {pStatus === 'unlocked' && unlockedBy === 'reward' && (
                      <motion.span
                        className="px-1.5 py-0.5 text-[10px] font-bold bg-honey-pale text-honey rounded-full"
                        animate={{ scale: [1, 1.08, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                      >
                        🎁 奖励解锁
                      </motion.span>
                    )}
                    {pStatus === 'unlocked' && unlockedBy === 'parent' && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-sky-pale text-sky rounded-full">
                        👨‍👩‍👧 家长解锁
                      </span>
                    )}
                    {pStatus === 'in_progress' && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-honey-pale text-honey rounded-full">
                        🔄 进行中
                      </span>
                    )}
                  </div>
                  {!hasData ? (
                    <p className="text-xs text-ink-muted mt-0.5">⏳ 内容即将上线</p>
                  ) : (
                    <p className="text-xs text-ink-light mt-0.5">{main?.titleCn} · {main?.title}</p>
                  )}
                  {!hasData ? (
                    <p className="text-[10px] text-ink-muted mt-0.5">⏳ 开发中,敬请期待</p>
                  ) : !unlocked && (
                    <p className="text-[10px] text-ink-muted mt-0.5">
                      {prevCompleted
                        ? `🔒 先完成「${prevTitle}」即可解锁`
                        : '🔒 完成前面课程后解锁'}
                    </p>
                  )}
                </div>
                <span className="text-ink-muted text-lg">→</span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
