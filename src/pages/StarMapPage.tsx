import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { STAGES } from '../data/stages';
import { LESSONS } from '../data/lessons';
import { useLessonProgressStore } from '../stores/useLessonProgressStore';
import { springs, staggerDelay } from '../utils/motion-tokens';

// 星球颜色映射 (主题色板派生)
const PLANET_STYLES: Record<number, { gradient: string; glow: string; shadow: string }> = {
  1: { gradient: 'radial-gradient(circle at 35% 35%, #8BC48A, #5B9A5A)', glow: 'rgba(91,154,90,0.4)', shadow: '0 0 30px rgba(91,154,90,0.3)' },
  2: { gradient: 'radial-gradient(circle at 35% 35%, #FFB380, #FF8C42)', glow: 'rgba(255,140,66,0.4)', shadow: '0 0 30px rgba(255,140,66,0.3)' },
  3: { gradient: 'radial-gradient(circle at 35% 35%, #8DC5F0, #5B9ED4)', glow: 'rgba(91,158,212,0.4)', shadow: '0 0 30px rgba(91,158,212,0.3)' },
  4: { gradient: 'radial-gradient(circle at 35% 35%, #FCD34D, #B45309)', glow: 'rgba(251,191,36,0.4)', shadow: '0 0 30px rgba(251,191,36,0.3)' },
  5: { gradient: 'radial-gradient(circle at 35% 35%, #B39DDB, #7E57C2)', glow: 'rgba(126,87,194,0.4)', shadow: '0 0 30px rgba(126,87,194,0.3)' },
  6: { gradient: 'radial-gradient(circle at 35% 35%, #F8BBD0, #E57373)', glow: 'rgba(229,115,115,0.4)', shadow: '0 0 30px rgba(229,115,115,0.3)' },
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
      {/* 标题 + 太空场景背景图 */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-warm-border shadow-sm">
        <img
          src="/assets/characters/heroes-space.webp"
          alt="太空场景"
          className="w-full h-40 object-cover"
          style={{ objectPosition: 'center 30%' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-0 inset-x-0 p-4 text-white">
          <h2 className="text-xl font-extrabold drop-shadow">🌌 时间星图</h2>
          <p className="text-xs font-bold drop-shadow mt-0.5 opacity-90">
            修复全部 6 个时间点，重启未来的英语世界！
          </p>
        </div>
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
            transition={{ delay: staggerDelay(stageIdx, 'listBig'), ...springs.slideUp }}
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
              style={allDone ? { borderColor: 'rgba(91,154,90,0.3)' } : isActive ? { borderColor: 'rgba(91,158,212,0.2)' } : {}}
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
