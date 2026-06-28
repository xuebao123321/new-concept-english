import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserStore } from '../../stores/useUserStore';
import { springs } from '../../utils/motion-tokens';

/**
 * 打卡里程碑庆祝 — 7/14/30/60 天时弹全屏祝贺
 * 每天首次打卡时检查,同一天不重复弹
 */
export default function StreakCelebration() {
  const userState = useUserStore(s => s.userState);
  const [show, setShow] = useState(false);
  const [milestone, setMilestone] = useState<{ emoji: string; text: string } | null>(null);

  useEffect(() => {
    if (!userState) return;

    const days = userState.streakDays;
    const today = new Date().toISOString().slice(0, 10);
    const lastShown = localStorage.getItem('nce_streak_celebration');

    // 只在里程碑日触发,且今天还没弹过
    const milestones = [7, 14, 30, 60];
    if (!milestones.includes(days) || lastShown === today) return;

    const config: Record<number, { emoji: string; text: string }> = {
      7: { emoji: '🔥', text: '连续 7 天练习! 你已经养成了好习惯~' },
      14: { emoji: '💎', text: '连续 14 天! 比半个月前强太多了!' },
      30: { emoji: '👑', text: '30 天了! 你是时间领主!' },
      60: { emoji: '🏆', text: '60 天不间断! 英语传奇就是这样练成的!' },
    };

    setMilestone(config[days] || config[7]);
    setShow(true);
    localStorage.setItem('nce_streak_celebration', today);

    // 3 秒后自动消失
    const t = setTimeout(() => setShow(false), 3500);
    return () => clearTimeout(t);
  }, [userState]);

  if (!milestone) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="card mx-4 max-w-xs w-full text-center p-8 space-y-4 border-sun/40"
            style={{ boxShadow: '0 0 60px rgba(251,191,36,0.2)' }}
            initial={{ scale: 0.5, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.5, y: 40 }}
            transition={springs.popIn}
          >
            <motion.div
              className="text-6xl"
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              {milestone.emoji}
            </motion.div>
            <h2 className="text-h2 text-ink">
              {userState?.streakDays} 天连续打卡! 🎉
            </h2>
            <p className="text-meta text-ink-light leading-relaxed">
              {milestone.text}
            </p>
            <div className="bg-forest/10 rounded-xl px-4 py-2 border border-forest/20">
              <span className="text-sm text-forest font-bold">
                继续加油,你的英语越来越强了!
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}