import { motion } from 'framer-motion';
import { useUserStore } from '../../stores/useUserStore';

// 温暖森林段位系统
const RANK_SYSTEM = [
  { minXp: 0,    icon: '🌱', name: '时间学徒',   color: '#94A3B8' },
  { minXp: 100,  icon: '⚡', name: '能量学徒',   color: '#FBBF24' },
  { minXp: 300,  icon: '🔧', name: '时空技师',   color: '#22D3EE' },
  { minXp: 600,  icon: '🛡️', name: '时间守护者', color: '#10B981' },
  { minXp: 1000, icon: '🌟', name: '时空大师',   color: '#8B5CF6' },
  { minXp: 2000, icon: '🏛️', name: '时间领主',   color: '#EC4899' },
];

function getRank(xp: number) {
  let current = RANK_SYSTEM[0];
  for (const rank of RANK_SYSTEM) {
    if (xp >= rank.minXp) current = rank;
    else break;
  }
  return current;
}

interface XpBarProps {
  compact?: boolean;
  showLabel?: boolean;
}

export default function XpBar({ compact = false, showLabel = true }: XpBarProps) {
  const userState = useUserStore(s => s.userState);
  if (!userState) return null;

  const rank = getRank(userState.totalXp);
  const nextIdx = RANK_SYSTEM.indexOf(rank) + 1;
  const nextRank = RANK_SYSTEM[nextIdx] || rank;
  const xpInRank = userState.totalXp - rank.minXp;
  const xpNeeded = nextRank.minXp - rank.minXp || 1;
  const progress = Math.min(xpInRank / xpNeeded, 1);

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-sm">{rank.icon}</span>
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
              transition={{ type: 'spring', stiffness: 400 }}
            >
              {rank.icon}
            </motion.span>
            <span className="text-sm font-bold text-[#F1F5F9]" style={{ color: rank.color }}>
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
