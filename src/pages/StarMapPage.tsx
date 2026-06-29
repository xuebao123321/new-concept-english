import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { STAGES } from '../data/stages';
import { LESSONS } from '../data/lessons';
import { useLessonProgressStore } from '../stores/useLessonProgressStore';
import { useUserStore } from '../stores/useUserStore';
import { api } from '../db/api';
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

const TYPE_LABELS: Record<string, string> = { choice: '选择', fill: '填空', translate: '翻译', reorder: '连词', listening: '听力' };

export default function StarMapPage() {
  const navigate = useNavigate();
  const { isUnlocked, isCompleted, isLoading, getCompletedLessons } = useLessonProgressStore();
  const { userState } = useUserStore();
  const [typeStats, setTypeStats] = useState<Record<string, { accuracy: number }>>({});
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    api.myReport().then(r => {
      const ts: Record<string, { accuracy: number }> = {};
      for (const [qt, s] of Object.entries(r.type_stats || {})) {
        ts[qt] = { accuracy: (s as any).accuracy || 0 };
      }
      setTypeStats(ts);
    }).catch(() => {}).finally(() => setStatsLoading(false));
  }, []);

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
    <div className="px-4 py-5 space-y-4">
      {/* ── 学习概览 ── */}
      <div className="card p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="text-xs text-ink-light font-bold mb-1">📊 总进度</div>
            <div className="text-lg font-extrabold text-ink">
              {getCompletedLessons().length}<span className="text-sm text-ink-light font-normal">/72 课</span>
            </div>
            <div className="mt-1 h-1.5 bg-warm-bg rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-forest"
                initial={{ width: 0 }}
                animate={{ width: `${Math.round(getCompletedLessons().length / 72 * 100)}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-ink-light font-bold">⭐ XP</div>
            <div className="text-lg font-extrabold text-honey">{userState?.totalXp || 0}</div>
          </div>
        </div>
        {/* 题型正确率 */}
        {!statsLoading && Object.keys(typeStats).length > 0 && (
          <div className="flex gap-1.5 mt-3 pt-3 border-t border-warm-border">
            {['choice','fill','translate','reorder','listening'].map(qt => {
              const acc = typeStats[qt]?.accuracy || 0;
              return (
                <div key={qt} className="flex-1 text-center">
                  <div className="text-xs font-extrabold" style={{ color: acc >= 80 ? '#5B9A5A' : acc >= 50 ? '#D97706' : '#DC2626' }}>
                    {acc}%
                  </div>
                  <div className="text-[10px] text-ink-muted">{TYPE_LABELS[qt]}</div>
                </div>
              );
            })}
          </div>
        )}
        {/* 快捷入口 */}
        <div className="flex gap-2 mt-3 pt-3 border-t border-warm-border text-[10px]">
          <a href="/wrong-book" className="text-ink-muted hover:text-forest font-bold">📕 错题本</a>
          <a href="/review" className="text-ink-muted hover:text-forest font-bold">📝 间隔复习</a>
          <a href="/achievements" className="text-ink-muted hover:text-forest font-bold">🏆 成就</a>
        </div>
      </div>

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
        const hasContent = true; // 所有阶段都有内容
        const groups = stage.groups.length > 0
          ? stage.groups
          : Array.from({ length: 12 }, (_, i) =>
              `lesson-${String(stage.lessonStart + i * 2).padStart(2, '0')}-${String(stage.lessonStart + i * 2 + 1).padStart(2, '0')}`
            );
        const doneGroups = groups.filter(g => hasContent && isCompleted(g));
        const unlockedGroups = groups.filter(g => hasContent && isUnlocked(g));
        const isActive = hasContent && unlockedGroups.length > 0;
        const allDone = hasContent && groups.length > 0 && doneGroups.length === groups.length;
        const planet = PLANET_STYLES[stage.id] || PLANET_STYLES[1];

        return (
          <div
            key={stage.id}
            className="animate-fade-in"
            style={{ animationDelay: `${stageIdx * 80}ms` }}
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
              {/* 阶段即将完成提示 */}
              {isActive && !allDone && doneGroups.length >= groups.length - 2 && doneGroups.length > 0 && (
                <div className="mb-3 text-[10px] text-center bg-honey-pale text-honey font-bold rounded-lg py-1">
                  🎁 再完成 {groups.length - doneGroups.length} 课解锁阶段奖励!
                </div>
              )}
              {/* 阶段全部完成 */}
              {allDone && (
                <div className="mb-3 text-[10px] text-center bg-forest-pale text-forest font-bold rounded-lg py-1">
                  🏆 阶段已掌握! +50 XP
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
          </div>
        );
      })}
    </div>
  );
}
