import { motion, AnimatePresence } from 'framer-motion';
import Confetti from '../common/Confetti';
import { springs } from '../../utils/motion-tokens';

interface RankInfo {
  icon?: string;
  name: string;
  color: string;
  level?: number;
}

interface LevelUpModalProps {
  isOpen: boolean;
  newRank: RankInfo;
  oldRank?: RankInfo;
  onClose: () => void;
}

export default function LevelUpModal({ isOpen, newRank, oldRank, onClose }: LevelUpModalProps) {
  // 根据段位等级挑角色图:低段位→熊二,中段位→熊大,高段位→光头强
  const characterImg = (() => {
    const lv = newRank.level ?? 1;
    if (lv >= 5) return '/assets/characters/guangtouqiang-winter.webp';
    if (lv >= 3) return '/assets/characters/bears-cabin.webp';
    return '/assets/characters/xionger-laugh.webp';
  })();
  const characterPosition = (() => {
    const lv = newRank.level ?? 1;
    if (lv >= 5) return 'center 25%';
    if (lv >= 3) return 'center 30%';
    return 'left center';
  })();
  const rankIcon = newRank.icon ?? '⭐';

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
              className="card overflow-hidden mx-4 max-w-sm w-full border-honey/40 p-0"
              style={{ boxShadow: '0 0 50px rgba(255,140,66,0.12), 0 20px 60px rgba(0,0,0,0.1)' }}
              initial={{ scale: 0.5, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.5, y: 50 }}
              transition={springs.success}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 角色横幅 */}
              <div className="relative h-32 bg-gradient-to-b from-sun-pale to-cream">
                <motion.img
                  src={characterImg}
                  alt="升级庆祝"
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ objectPosition: characterPosition }}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.6 }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
                {/* 段位徽章 (左下角浮动) */}
                <motion.div
                  className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full bg-white border-4 flex items-center justify-center text-4xl shadow-lg"
                  style={{ borderColor: newRank.color }}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ ...springs.popIn, delay: 0.3 }}
                >
                  {rankIcon}
                </motion.div>
              </div>

              <div className="pt-10 pb-8 px-6 text-center">
                <h2 className="text-xl font-extrabold text-ink mb-1">🎉 恭喜升级!</h2>

                {/* 旧段位 → 新段位 */}
                {oldRank ? (
                  <div className="flex items-center justify-center gap-2 mb-3 text-sm text-ink-muted">
                    <span>{oldRank.icon ?? '⭐'} {oldRank.name}</span>
                    <motion.span
                      animate={{ x: [0, 6, 0] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      →
                    </motion.span>
                    <span className="font-extrabold text-base" style={{ color: newRank.color }}>
                      {rankIcon} {newRank.name}
                    </span>
                  </div>
                ) : (
                  <div className="text-2xl font-extrabold mb-3" style={{ color: newRank.color }}>
                    {rankIcon} {newRank.name}
                  </div>
                )}

                <div className="bg-forest/10 rounded-xl px-4 py-2 mb-5 border border-forest/20">
                  <span className="text-sm text-forest font-medium">
                    继续加油!向下一等级前进 🚀
                  </span>
                </div>

                <button
                  onClick={onClose}
                  className="w-full py-3 btn-primary"
                >
                  太棒了!
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
