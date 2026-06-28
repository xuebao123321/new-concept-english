import { motion } from 'framer-motion';
import { useUserStore } from '../../stores/useUserStore';
import { springs } from '../../utils/motion-tokens';

export default function StreakBadge() {
  const userState = useUserStore(s => s.userState);

  if (!userState) return null;

  const days = userState.streakDays;

  const getStyle = () => {
    if (days === 0) return { icon: '📅', text: '记得今天来学习哦~', className: 'text-ink-muted bg-warm-bg border-warm-border' };
    if (days < 3) return { icon: '🔥', text: `${days}天连续打卡`, className: 'text-honey bg-honey/10 border-honey/20' };
    if (days < 7) return { icon: '🔥', text: `${days}天连续打卡`, className: 'text-honey bg-honey/10 border-honey/20' };
    if (days < 30) return { icon: '💎', text: `${days}天连续打卡！太厉害了！`, className: 'text-honey bg-honey/10 border-honey/40 shadow-sm' };
    return { icon: '👑', text: `${days}天！你是时间领主！`, className: 'text-plum bg-gradient-to-r from-honey/10 to-plum/10 border-plum/40 shadow-sm' };
  };

  const { icon, text, className } = getStyle();

  return (
    <motion.div
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-bold ${className}`}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={springs.enter}
    >
      <motion.span
        className="text-base"
        key={days}
        initial={{ scale: 1.5 }}
        animate={{ scale: 1 }}
        transition={springs.hover}
      >
        {icon}
      </motion.span>
      <span>{text}</span>
    </motion.div>
  );
}
