import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { LESSONS, LESSON_GROUPS } from '../../data/lessons';
import { useLessonProgressStore } from '../../stores/useLessonProgressStore';
import type { QuestionType } from '../../types';

interface LessonSelectorProps {
  onStart: (lessonGroups: string[], questionCount: number, types: QuestionType[]) => void;
}

const ALL_TYPES: { type: QuestionType; label: string; icon: string }[] = [
  { type: 'choice', label: '选择题', icon: '🅰️' },
  { type: 'fill', label: '填空题', icon: '✏️' },
  { type: 'translate', label: '翻译题', icon: '🌐' },
  { type: 'reorder', label: '连词成句', icon: '🧩' },
  { type: 'listening', label: '听力题', icon: '🎧' },
];

export default function LessonSelector({ onStart }: LessonSelectorProps) {
  const {
    progressMap, isLoading, load,
    isUnlocked, isCompleted, getNextUnlocked, getUnlockedCount,
  } = useLessonProgressStore();

  useEffect(() => { load(); }, [load]);

  const handleStartLesson = (lessonGroup: string) => {
    if (!isUnlocked(lessonGroup)) return;
    onStart([lessonGroup], 15, ALL_TYPES.map(t => t.type));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <motion.div className="text-3xl" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}>
          ⏳
        </motion.div>
      </div>
    );
  }

  const unlockedCount = getUnlockedCount();
  const completedCount = LESSON_GROUPS.filter(g => isCompleted(g)).length;
  const nextUnlocked = getNextUnlocked();

  return (
    <div className="space-y-4">
      {/* 顶部进度概览 */}
      <div className="glass-panel p-4 border-forest/20">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-ink-muted">闯关进度</div>
            <div className="text-2xl font-extrabold text-ink">
              {completedCount}<span className="text-sm text-ink-muted">/{LESSON_GROUPS.length}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-ink-muted">已解锁</div>
            <div className="text-lg font-bold text-forest">{unlockedCount} 课</div>
          </div>
        </div>
        <div className="mt-3 h-2 bg-warm-bg rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full progress-shimmer"
            initial={{ width: 0 }}
            animate={{ width: `${(completedCount / LESSON_GROUPS.length) * 100}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* 关卡列表 */}
      <div>
        <h3 className="font-bold text-ink mb-3 flex items-center gap-2">
          📖 选择关卡
          <span className="text-xs font-normal text-ink-muted">
            （共{LESSON_GROUPS.length}关，完成一关解锁下一关）
          </span>
        </h3>

        <div className="space-y-2">
          {LESSON_GROUPS.map((group, index) => {
            const lessons = LESSONS.filter(l => l.group === group);
            const unlocked = isUnlocked(group);
            const completed = isCompleted(group);
            const isRecommended = group === nextUnlocked;
            const lessonNums = lessons.map(l => l.lessonNumber);
            const mainLesson = lessons[0];
            const progress = progressMap.get(group);

            // 计算块完成数
            const bp = progress?.blockProgress;
            const blocksDone = bp
              ? [bp.vocabulary, bp.grammar, bp.sentence, bp.listening].filter(Boolean).length
              : 0;

            return (
              <motion.div
                key={group}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                {index > 0 && (
                  <div className="flex justify-center py-1">
                    <div
                      className={`w-0.5 h-4 rounded ${
                        completed ? 'bg-forest' : unlocked ? 'bg-forest/40' : 'bg-warm-bg'
                      }`}
                    />
                  </div>
                )}

                <motion.button
                  onClick={() => handleStartLesson(group)}
                  disabled={!unlocked}
                  className={`w-full text-left rounded-2xl border p-4 transition-all ${
                    !unlocked
                      ? 'bg-white border-warm-border opacity-50 cursor-not-allowed'
                      : isRecommended
                      ? 'glass-panel border-forest/40 neon-border'
                      : completed
                      ? 'glass-panel border-forest/30'
                      : 'glass-panel hover:border-forest/30'
                  }`}
                  whileTap={unlocked ? { scale: 0.98 } : {}}
                >
                  <div className="flex items-center gap-4">
                    {/* 状态图标 */}
                    <div className="flex-shrink-0">
                      {!unlocked ? (
                        <div className="w-10 h-10 rounded-full bg-warm-bg flex items-center justify-center text-xl">
                          🔒
                        </div>
                      ) : completed ? (
                        <div className="w-10 h-10 rounded-full bg-forest/20 flex items-center justify-center text-lg font-bold text-forest">
                          ✓
                        </div>
                      ) : isRecommended ? (
                        <motion.div
                          className="w-10 h-10 rounded-full bg-forest/20 flex items-center justify-center text-sm font-bold text-forest"
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          {index + 1}
                        </motion.div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-warm-bg flex items-center justify-center text-sm font-bold text-ink-light">
                          {index + 1}
                        </div>
                      )}
                    </div>

                    {/* 内容 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${!unlocked ? 'text-ink-muted' : 'text-ink'}`}>
                          第{lessonNums.join('-')}课
                        </span>
                        {isRecommended && !completed && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-forest/20 text-forest rounded-full">
                            推荐
                          </span>
                        )}
                        {completed && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-forest/20 text-forest rounded-full">
                            已通关
                          </span>
                        )}
                      </div>
                      <div className={`text-xs mt-0.5 ${!unlocked ? 'text-ink-muted' : 'text-ink-light'}`}>
                        {mainLesson.titleCn} · {mainLesson.title}
                      </div>
                      {/* 块进度条 */}
                      {unlocked && (
                        <div className="mt-2 flex gap-1">
                          {(['vocabulary', 'grammar', 'sentence', 'listening'] as const).map((block, bi) => (
                            <div
                              key={block}
                              className={`flex-1 h-1 rounded-full transition-colors ${
                                bp?.[block] ? 'bg-forest' : bi < blocksDone + 1 ? 'bg-forest/30' : 'bg-warm-bg'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {mainLesson.grammarTopics.slice(0, 3).map(topic => (
                          <span
                            key={topic}
                            className={`px-1.5 py-0.5 text-[10px] rounded-full ${
                              !unlocked ? 'bg-warm-bg text-ink-muted' : 'bg-forest/10 text-forest'
                            }`}
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* 右侧信息 */}
                    <div className="flex-shrink-0 text-right">
                      {completed && progress ? (
                        <div className="space-y-0.5">
                          <div className="text-xs text-forest font-medium">
                            🎯 {Math.round(progress.bestAccuracy * 100)}%
                          </div>
                          <div className="text-[10px] text-ink-muted">{progress.attempts}次</div>
                        </div>
                      ) : progress && !completed ? (
                        <div className="text-xs text-ink-light">
                          <div>最佳 {Math.round(progress.bestAccuracy * 100)}%</div>
                          <div className="text-[10px]">需 100% 通关</div>
                        </div>
                      ) : !unlocked ? (
                        <div className="text-xs text-ink-muted">先通关前一关</div>
                      ) : (
                        <div className="text-xs text-forest font-medium">🚀 开始</div>
                      )}
                    </div>
                  </div>
                </motion.button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 全部通关提示 */}
      {unlockedCount === LESSON_GROUPS.length && completedCount === LESSON_GROUPS.length && (
        <motion.div
          className="glass-panel p-4 text-center border-honey/30"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="text-3xl mb-2">🎉</div>
          <p className="text-sm font-bold text-honey">全部通关！太厉害了！</p>
          <p className="text-xs text-ink-light mt-1">可以复习错题巩固薄弱环节</p>
        </motion.div>
      )}
    </div>
  );
}
