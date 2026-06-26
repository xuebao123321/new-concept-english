import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChoiceQuestion } from '../../types';

interface MultipleChoiceProps {
  question: ChoiceQuestion;
  onAnswer: (answer: string, correct: boolean, timeSpent: number) => void;
  startTime: number;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export default function MultipleChoice({ question, onAnswer, startTime }: MultipleChoiceProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleSelect = (index: number) => {
    if (showResult) return;
    setSelected(index);
    setShowResult(true);

    const timeSpent = (Date.now() - startTime) / 1000;
    const correct = index === question.correctIndex;

    setTimeout(() => {
      onAnswer(question.options[index], correct, timeSpent);
    }, 800);
  };

  const getOptionStyle = (index: number) => {
    if (!showResult || selected === null) {
      if (index === selected) {
        return 'border-forest/60 bg-forest/10 neon-border scale-[1.01]';
      }
      return 'border-warm-border bg-warm-bg hover:border-forest/30 hover:bg-warm-bg';
    }
    if (index === question.correctIndex) {
      return 'border-forest/60 bg-forest/10';
    }
    if (index === selected && index !== question.correctIndex) {
      return 'border-berry/60 bg-berry/10';
    }
    return 'border-warm-border bg-white opacity-40';
  };

  return (
    <div className="space-y-4">
      {/* 题干 */}
      <p className="text-sm text-ink-light">{question.prompt}</p>
      {question.question && (
        <p className="text-lg font-semibold text-ink">{question.question}</p>
      )}

      {/* 选项 */}
      <div className="space-y-2.5">
        {question.options.map((option, index) => (
          <motion.button
            key={index}
            onClick={() => handleSelect(index)}
            className={`w-full text-left p-3.5 rounded-xl border transition-all ${getOptionStyle(index)}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08 }}
            whileTap={{ scale: 0.98 }}
            disabled={showResult}
          >
            <div className="flex items-center gap-3">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  !showResult && selected === index
                    ? 'bg-forest text-[#0F172A]'
                    : showResult && index === question.correctIndex
                    ? 'bg-forest text-white'
                    : showResult && index === selected && index !== question.correctIndex
                    ? 'bg-berry text-white'
                    : 'bg-warm-bg text-ink-light'
                }`}
              >
                {OPTION_LABELS[index]}
              </span>
              <span className="font-medium text-ink">{option}</span>
              {showResult && index === question.correctIndex && (
                <motion.span className="ml-auto text-lg" initial={{ scale: 0 }} animate={{ scale: 1 }}>✅</motion.span>
              )}
              {showResult && index === selected && index !== question.correctIndex && (
                <motion.span className="ml-auto text-lg" initial={{ scale: 0 }} animate={{ scale: 1 }}>❌</motion.span>
              )}
            </div>
          </motion.button>
        ))}
      </div>

      {/* 解析 */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            className="p-3 rounded-xl bg-forest/5 border border-forest/20"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-sm text-ink-light leading-relaxed whitespace-pre-line">
              💡 {question.explanation}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
