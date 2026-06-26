import { motion } from 'framer-motion';

interface HeartDisplayProps {
  hearts: number;
  maxHearts?: number;
}

export default function HeartDisplay({ hearts, maxHearts = 5 }: HeartDisplayProps) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: maxHearts }, (_, i) => (
        <motion.span
          key={i}
          className="text-lg"
          initial={false}
          animate={{
            scale: i < hearts ? 1 : 0.8,
            opacity: i < hearts ? 1 : 0.25,
            filter: i < hearts ? 'none' : 'grayscale(1)',
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          {i < hearts ? '❤️' : '💔'}
        </motion.span>
      ))}
      {hearts === 0 && (
        <span className="text-[10px] text-[#EF4444] ml-1 font-bold animate-pulse">
          心已用完
        </span>
      )}
      {hearts > 0 && hearts < maxHearts && (
        <span className="text-[10px] text-[#64748B] ml-1">
          恢复中
        </span>
      )}
    </div>
  );
}
