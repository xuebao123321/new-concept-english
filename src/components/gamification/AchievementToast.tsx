import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserStore } from '../../stores/useUserStore';
import type { Achievement } from '../../types';

export default function AchievementToast() {
  const { newAchievements, clearNewAchievements } = useUserStore();

  useEffect(() => {
    if (newAchievements.length > 0) {
      const timer = setTimeout(clearNewAchievements, 4000);
      return () => clearTimeout(timer);
    }
  }, [newAchievements, clearNewAchievements]);

  return (
    <AnimatePresence>
      {newAchievements.length > 0 && (
        <div className="fixed top-20 left-4 right-4 z-50 flex flex-col items-center gap-2 pointer-events-none">
          {newAchievements.map((achievement, index) => (
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
      transition={{ delay: index * 0.15, type: 'spring', stiffness: 300, damping: 25 }}
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
