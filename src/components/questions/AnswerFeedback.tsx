import { motion, AnimatePresence } from 'framer-motion';
import { variants } from '../../utils/motion-tokens';

interface Props {
  show: boolean;
  correct: boolean | null;
}

/**
 * 答题反馈弹层 — 角色化庆祝 / 鼓励
 * - correct: 熊二大笑图 + 🎉 答对啦
 * - wrong:   熊大木屋图 + 💪 别灰心,再来
 */
export default function AnswerFeedback({ show, correct }: Props) {
  const isCorrect = correct === true;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-x-0 top-1/2 -translate-y-1/2 z-40 pointer-events-none flex justify-center"
          {...(isCorrect ? variants.correct : variants.wrong)}
        >
          <div className={`relative rounded-3xl px-6 py-4 shadow-2xl border-4 flex items-center gap-3 max-w-xs pointer-events-auto ${
            isCorrect
              ? 'bg-forest-pale border-forest'
              : 'bg-honey-pale border-honey'
          }`}>
            {/* 角色图片 */}
            <img
              src={isCorrect ? '/assets/characters/xionger-laugh.webp' : '/assets/characters/bears-cabin.webp'}
              alt={isCorrect ? '答对' : '答错'}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-white flex-shrink-0"
              style={{ objectPosition: isCorrect ? 'left center' : 'center 30%' }}
            />
            <div className="flex-1 min-w-0">
              <div className={`text-base font-extrabold ${isCorrect ? 'text-forest' : 'text-honey'}`}>
                {isCorrect ? '🎉 答对啦!' : '💪 别灰心'}
              </div>
              <div className="text-xs text-ink-light mt-0.5">
                {isCorrect ? '继续保持~' : '再来一次!'}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}