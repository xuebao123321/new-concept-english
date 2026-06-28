import { motion } from 'framer-motion';
import { useUserStore } from '../../stores/useUserStore';
import { springs } from '../../utils/motion-tokens';
import { getLevelByXp, RANKS } from '../../utils/xp-calculator';

interface XpBarProps {
  compact?: boolean;
  showLabel?: boolean;
}

export default function XpBar({ compact = false, showLabel = true }: XpBarProps) {
  const userState = useUserStore(s => s.userState);
  if (!userState) return null;

  const rank = getLevelByXp(userState.totalXp);
  const nextRank = RANKS.find(r => r.level === rank.level + 1) || rank;
  const xpInRank = userState.totalXp - rank.minXp;
  const xpNeeded = nextRank.minXp - rank.minXp || 1;
  const progress = Math.min(xpInRank / xpNeeded, 1);

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-sm">{rank.icon ?? '🌱'}</span>
        <div className="w-10 h-1.5 bg-warm-bg rounded-full overflow-hidden border border-warm-border">
          <motion.div
            className="h-full rounded-full progress-shimmer"
            initial={{ width: 0 }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <span className="text-[10px] font-bold text-ink-light">{userState.totalXp}</span>
      </div>
    );
  }

  return (
    <div>
      {showLabel && (
        <div className="flex justify-between items-center mb-1.5">
          <div className="flex items-center gap-1.5">
            <motion.span
              className="text-lg"
              key={rank.icon}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={springs.hover}
            >
              {rank.icon ?? '⭐'}
            </motion.span>
            <span className="text-sm font-extrabold" style={{ color: rank.color }}>
              {rank.name}
            </span>
          </div>
          <span className="text-xs font-bold text-ink-light">
            {xpInRank}/{xpNeeded} XP
          </span>
        </div>
      )}
      <div className="h-2.5 bg-warm-bg rounded-full overflow-hidden border border-warm-border">
        <motion.div
          className="h-full rounded-full progress-shimmer"
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}