import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserStore } from '../../stores/useUserStore';
import type { Achievement } from '../../types';
import { springs } from '../../utils/motion-tokens';

export default function AchievementToast() {
  const { newAchievements, clearNewAchievements } = useUserStore();

  useEffect(() => {
    if (newAchievements.length > 0) {
      const hasMilestone = newAchievements.some(a => a.category === 'milestone');
      const timer = setTimeout(clearNewAchievements, hasMilestone ? 8000 : 4000);
      return () => clearTimeout(timer);
    }
  }, [newAchievements, clearNewAchievements]);

  const milestones = newAchievements.filter(a => a.category === 'milestone');
  const normal = newAchievements.filter(a => a.category !== 'milestone');

  return (
    <AnimatePresence>
      {/* 重要成就: 全屏庆祝 */}
      {milestones.length > 0 && milestones.map(achievement => (
        <motion.div
          key={achievement.id}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={clearNewAchievements}
        >
          <motion.div
            className="card mx-4 max-w-xs w-full p-8 text-center space-y-4 border-honey/40 bg-cream"
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.5 }}
            transition={springs.popIn}
            onClick={e => e.stopPropagation()}
          >
            <motion.div
              className="text-6xl"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              {achievement.icon}
            </motion.div>
            <h2 className="text-h2 text-ink font-extrabold">🎉 成就解锁!</h2>
            <p className="text-xl font-extrabold text-forest">{achievement.name}</p>
            <p className="text-sm text-ink-light">{achievement.description}</p>
            <button
              onClick={clearNewAchievements}
              className="w-full py-3 rounded-xl bg-forest text-cream font-bold text-base
                         hover:bg-forest/90 active:scale-[0.98] transition-all shadow-sm"
            >
              太棒了!
            </button>
          </motion.div>
        </motion.div>
      ))}

      {/* 普通成就: 顶部 Toast */}
      {normal.length > 0 && (
        <div className="fixed top-20 left-4 right-4 z-50 flex flex-col items-center gap-2 pointer-events-none">
          {normal.map((achievement, index) => (
            <AchievementCard key={achievement.id} achievement={achievement} index={index} />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}

function AchievementCard({ achievement, index }: { achievement: Achievement; index: number }) {
  return (
    <motion.div
      className="card card-accent px-5 py-4 flex items-center gap-3 max-w-sm w-full pointer-events-auto"
      style={{
        boxShadow: '0 0 30px rgba(255,140,66,0.15), 0 8px 32px rgba(0,0,0,0.08)',
      }}
      initial={{ y: -80, opacity: 0, scale: 0.8 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -80, opacity: 0, scale: 0.8 }}
      transition={{ delay: index * 0.15, ...springs.enter }}
    >
      {/* 成就图标 */}
      <motion.span
        className="text-4xl flex-shrink-0"
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        {achievement.icon}
      </motion.span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-bold text-honey bg-honey/10 px-2 py-0.5 rounded-full">
            🏅 成就解锁
          </span>
          <span className="text-[10px] font-bold text-forest">+15 XP</span>
        </div>
        <div className="text-sm font-bold text-ink truncate">{achievement.name}</div>
        <div className="text-xs text-ink-light truncate">{achievement.description}</div>
      </div>
    </motion.div>
  );
}
