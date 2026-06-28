import { motion, AnimatePresence } from 'framer-motion';
import { springs } from '../../utils/motion-tokens';

interface Props { combo: number; show: boolean; }

/** 连击激励弹层: 3 / 5 / 10 连击时触发 */
export default function ComboToast({ combo, show }: Props) {
  if (!show || combo < 3) return null;

  const emoji = combo >= 10 ? '🔥🔥🔥' : combo >= 5 ? '🔥🔥' : '🔥';
  const text = combo >= 10
    ? `${combo}连击!无敌了!`
    : combo >= 5
    ? `${combo}连击!太棒了!`
    : `${combo}连击!`;
  const colorClass = combo >= 10 ? 'text-honey' : combo >= 5 ? 'text-forest' : 'text-sky';

  return (
    <AnimatePresence>
      <motion.div
        key={combo}
        className="fixed top-1/4 inset-x-0 z-50 pointer-events-none flex justify-center"
        initial={{ opacity: 0, scale: 0.6, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.6, y: -20 }}
        transition={springs.popIn}
      >
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-5 py-3 shadow-lg border-2 border-sun">
          <div className={`text-2xl font-extrabold text-center ${colorClass}`}>
            {emoji} {text}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}