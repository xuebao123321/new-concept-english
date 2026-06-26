import { useNavigate } from 'react-router-dom';
import { useLessonProgressStore } from '../stores/useLessonProgressStore';
import { LESSONS, LESSON_GROUPS } from '../data/lessons';
import { motion } from 'framer-motion';

// 轻量课程选择页 — 点击课组直接进入课程详情（块练习流程）
export default function LessonSelectPage() {
  const nav = useNavigate();
  const { isUnlocked, isCompleted, isLoading, load, getNextUnlocked } = useLessonProgressStore();

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

      {/* 课组列表 */}
      <div className="space-y-2">
        {LESSON_GROUPS.map((group, index) => {
          const lessons = LESSONS.filter(l => l.group === group);
          const unlocked = isUnlocked(group);
          const completed = isCompleted(group);
          const isRecommended = group === nextUnlocked;
          const lessonNums = lessons.map(l => l.lessonNumber);
          const main = lessons[0];

          return (
            <motion.button
              key={group}
              onClick={() => unlocked && nav(`/lesson/${group}`)}
              disabled={!unlocked}
              className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${
                !unlocked
                  ? 'bg-warm-bg border-warm-border opacity-50 cursor-not-allowed'
                  : completed
                  ? 'card-success'
                  : isRecommended
                  ? 'card-highlight'
                  : 'card hover:border-forest/30'
              }`}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              whileTap={unlocked ? { scale: 0.98 } : {}}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                  !unlocked ? 'bg-warm-bg text-ink-muted' :
                  completed ? 'bg-forest-pale text-forest' :
                  'bg-sky-pale text-sky'
                }`}>
                  {!unlocked ? '🔒' : completed ? '✓' : index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-ink">
                      第 {lessonNums.join('-')} 课
                    </span>
                    {isRecommended && !completed && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-forest-pale text-forest rounded-full">推荐</span>
                    )}
                    {completed && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-forest-pale text-forest rounded-full">已通关</span>
                    )}
                  </div>
                  <p className="text-xs text-ink-light mt-0.5">{main?.titleCn} · {main?.title}</p>
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
