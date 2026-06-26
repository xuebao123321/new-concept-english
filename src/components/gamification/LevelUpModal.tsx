import { motion, AnimatePresence } from 'framer-motion';
import Confetti from '../common/Confetti';

interface RankInfo {
  icon: string;
  name: string;
  color: string;
}

interface LevelUpModalProps {
  isOpen: boolean;
  newRank: RankInfo;
  oldRank?: RankInfo;
  onClose: () => void;
}

export default function LevelUpModal({ isOpen, newRank, oldRank, onClose }: LevelUpModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <Confetti active={isOpen} />

          {/* 遮罩 */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          >
            {/* 弹窗 */}
            <motion.div
              className="card px-8 py-10 text-center mx-4 max-w-sm w-full border-honey/40"
              style={{ boxShadow: '0 0 50px rgba(255,140,66,0.12), 0 20px 60px rgba(0,0,0,0.1)' }}
              initial={{ scale: 0.5, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.5, y: 50 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 闪电图标 */}
              <motion.div
                className="text-6xl mb-4"
                animate={{ scale: [1, 1.2, 1], rotate: [0, -5, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                ⚡
              </motion.div>

              <h2 className="text-xl font-bold text-ink mb-1">恭喜升级！</h2>

              {/* 旧段位 → 新段位 */}
              {oldRank && (
                <div className="flex items-center justify-center gap-2 mb-3 text-sm text-ink-muted">
                  <span>{oldRank.icon} {oldRank.name}</span>
                  <motion.span
                    animate={{ x: [0, 6, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    →
                  </motion.span>
                  <span className="font-bold" style={{ color: newRank.color }}>
                    {newRank.icon} {newRank.name}
                  </span>
                </div>
              )}

              {!oldRank && (
                <div className="text-3xl font-extrabold mb-3" style={{ color: newRank.color }}>
                  {newRank.icon} {newRank.name}
                </div>
              )}

              <div className="bg-forest/10 rounded-xl px-4 py-2 mb-6 border border-forest/20">
                <span className="text-sm text-forest font-medium">
                  继续加油！向下一等级前进 🚀
                </span>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 btn-primary"
              >
                太棒了！
              </button>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
