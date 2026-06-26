import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { STAGES } from '../data/stages';
import { LESSONS } from '../data/lessons';
import { useLessonProgressStore } from '../stores/useLessonProgressStore';

// 星球颜色映射
const PLANET_STYLES: Record<number, { gradient: string; glow: string; shadow: string }> = {
  1: { gradient: 'radial-gradient(circle at 35% 35%, #94A3B8, #475569)', glow: 'rgba(100,116,139,0.4)', shadow: '0 0 30px rgba(100,116,139,0.3)' },
  2: { gradient: 'radial-gradient(circle at 35% 35%, #FDE68A, #B45309)', glow: 'rgba(251,191,36,0.4)', shadow: '0 0 30px rgba(251,191,36,0.3)' },
  3: { gradient: 'radial-gradient(circle at 35% 35%, #FCD34D, #92400E)', glow: 'rgba(245,158,11,0.4)', shadow: '0 0 30px rgba(245,158,11,0.3)' },
  4: { gradient: 'radial-gradient(circle at 35% 35%, #D97706, #78350F)', glow: 'rgba(180,83,9,0.4)', shadow: '0 0 30px rgba(180,83,9,0.3)' },
  5: { gradient: 'radial-gradient(circle at 35% 35%, #A78BFA, #4C1D95)', glow: 'rgba(139,92,246,0.4)', shadow: '0 0 30px rgba(139,92,246,0.3)' },
  6: { gradient: 'radial-gradient(circle at 35% 35%, #F9A8D4, #831843)', glow: 'rgba(236,72,153,0.4)', shadow: '0 0 30px rgba(236,72,153,0.3)' },
};

export default function StarMapPage() {
  const navigate = useNavigate();
  const { isUnlocked, isCompleted, isLoading } = useLessonProgressStore();

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <motion.div className="text-4xl" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}>
          🌌
        </motion.div>
      </div>
    );
  }

  return (
    <div className="px-4 py-5 space-y-6">
      {/* 标题 */}
      <div className="text-center">
        <div className="text-5xl mb-2">🌌</div>
        <h2 className="text-xl font-extrabold text-ink">时间星图</h2>
        <p className="text-sm text-ink-muted font-bold mt-1">
          修复全部 6 个时间点，重启未来的英语世界！
        </p>
      </div>

      {/* 星球列表 */}
      {STAGES.map((stage, stageIdx) => {
        const groups = stage.groups.length > 0
          ? stage.groups
          : Array.from({ length: 12 }, (_, i) =>
              `lesson-${String(stage.lessonStart + i * 2).padStart(2, '0')}-${String(stage.lessonStart + i * 2 + 1).padStart(2, '0')}`
            );
        const doneGroups = groups.filter(g => isCompleted(g));
        const unlockedGroups = groups.filter(g => isUnlocked(g));
        const isActive = unlockedGroups.length > 0;
        const allDone = groups.length > 0 && doneGroups.length === groups.length;
        const planet = PLANET_STYLES[stage.id] || PLANET_STYLES[1];

        return (
          <motion.div
            key={stage.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: stageIdx * 0.1 }}
          >
            {/* 连接线 */}
            {stageIdx > 0 && (
              <div className="flex justify-center py-1">
                <div className={`w-0.5 h-6 rounded ${isActive ? 'bg-forest/30' : 'bg-warm-bg'}`} />
              </div>
            )}

            {/* 星球卡片 */}
            <div
              className={`glass-panel p-5 ${!isActive ? 'opacity-50' : ''}`}
              style={allDone ? { borderColor: 'rgba(16,185,129,0.3)' } : isActive ? { borderColor: 'rgba(34,211,238,0.2)' } : {}}
            >
              <div className="flex items-center gap-4 mb-4">
                {/* CSS 星球 */}
                <div
                  className="w-14 h-14 rounded-full flex-shrink-0 flex items-center justify-center relative"
                  style={{
                    background: planet.gradient,
                    boxShadow: isActive ? planet.shadow : 'none',
                    opacity: isActive ? 1 : 0.4,
                  }}
                >
                  {isActive && (
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        animation: 'glow 2s ease-in-out infinite',
                        boxShadow: `0 0 15px ${planet.glow}`,
                      }}
                    />
                  )}
                  <span className="text-xl relative z-10">
                    {allDone ? '⭐' : stage.icon}
                  </span>
                </div>

                <div className="flex-1">
                  <h3 className="font-extrabold text-ink">{stage.name}</h3>
                  <p className="text-xs text-ink-muted font-bold">
                    L{stage.lessonStart}-{stage.lessonEnd} · {groups.length} 课组
                  </p>
                  <p className="text-[10px] text-ink-light mt-0.5">{stage.description}</p>
                </div>

                <div className="text-right flex-shrink-0">
                  {allDone ? (
                    <span className="font-extrabold text-forest text-sm">✅ 已修复</span>
                  ) : isActive ? (
                    <span className="font-extrabold text-forest text-sm">
                      {doneGroups.length}/{groups.length}
                    </span>
                  ) : (
                    <span className="text-xl">🔒</span>
                  )}
                </div>
              </div>

              {/* 进度条 */}
              {isActive && !allDone && (
                <div className="h-1.5 bg-warm-bg rounded-full mb-3 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full progress-shimmer"
                    initial={{ width: 0 }}
                    animate={{ width: `${(doneGroups.length / groups.length) * 100}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
              )}

              {/* 课组网格 */}
              {isActive && (
                <div className="grid grid-cols-3 gap-2">
                  {groups.map(g => {
                    const ls = LESSONS.filter(x => x.group === g);
                    const unlocked = isUnlocked(g);
                    const done = isCompleted(g);
                    return (
                      <button
                        key={g}
                        onClick={() => unlocked && navigate(`/lesson/${g}`)}
                        disabled={!unlocked}
                        className={`p-2.5 rounded-xl text-center font-bold border transition-all ${
                          done
                            ? 'bg-forest/10 border-forest/30'
                            : unlocked
                            ? 'bg-warm-bg border-forest/20 hover:border-forest/50'
                            : 'bg-white border-warm-border opacity-40 cursor-not-allowed'
                        }`}
                      >
                        <div className="text-xs text-ink">
                          L{ls.map(x => x.lessonNumber).join('-')}
                        </div>
                        <div className="text-[10px] text-ink-muted mt-0.5">
                          {done ? '✅' : unlocked ? '⚡' : '🌑'} {ls[0]?.titleCn}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
