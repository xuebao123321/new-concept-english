import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FillQuestion } from '../../types';

interface FillInBlankProps {
  question: FillQuestion;
  onAnswer: (answer: string, correct: boolean, timeSpent: number) => void;
  startTime: number;
}

export default function FillInBlank({ question, onAnswer, startTime }: FillInBlankProps) {
  const [input, setInput] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const handleSubmit = () => {
    if (!input.trim() || showResult) return;

    const userAnswer = input.trim().toLowerCase();
    const correctAnswer = question.answer.toLowerCase();
    const acceptable = question.acceptableAnswers.map(a => a.toLowerCase());
    const allValid = [correctAnswer, ...acceptable];

    const correct = allValid.some(a => userAnswer === a || userAnswer.includes(a) || a.includes(userAnswer));
    setIsCorrect(correct);
    setShowResult(true);

    const timeSpent = (Date.now() - startTime) / 1000;

    setTimeout(() => {
      onAnswer(input.trim(), correct, timeSpent);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const parts = question.sentence.split('___');

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-light">{question.prompt}</p>

      {/* 句子展示 */}
      <div className="p-4 rounded-xl bg-warm-bg border border-warm-border">
        {parts.length === 1 ? (
          <p className="text-lg text-ink">{question.sentence}</p>
        ) : (
          <p className="text-lg text-ink leading-relaxed flex flex-wrap items-center gap-x-1">
            <span>{parts[0]}</span>
            {showResult ? (
              <span
                className={`inline-block px-3 py-0.5 rounded-md font-bold border ${
                  isCorrect
                    ? 'bg-forest/15 text-forest border-forest/40'
                    : 'bg-berry/15 text-berry border-berry/40'
                }`}
              >
                {isCorrect ? input || question.answer : input || '(未填写)'}
              </span>
            ) : (
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-28 px-3 py-1 bg-transparent border-b-2 border-forest/50
                           focus:border-honey focus:outline-none text-center
                           text-forest font-bold placeholder:text-ink-ghost"
                placeholder="_____"
                autoFocus
              />
            )}
            <span>{parts[1]}</span>
          </p>
        )}
      </div>

      {question.hint && !showResult && (
        <p className="text-xs text-ink-muted">💡 提示：{question.hint}</p>
      )}

      {!showResult && (
        <button
          onClick={handleSubmit}
          disabled={!input.trim()}
          className="w-full py-3 btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          确认答案
        </button>
      )}

      <AnimatePresence>
        {showResult && (
          <motion.div
            className={`p-3 rounded-xl border ${
              isCorrect ? 'bg-forest/5 border-forest/20' : 'bg-berry/5 border-berry/20'
            }`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-sm">
              {isCorrect ? (
                <span className="text-forest">✅ 回答正确！</span>
              ) : (
                <span className="text-berry">
                  ❌ 正确答案是：<strong>{question.answer}</strong>
                </span>
              )}
            </div>
            <div className="text-xs text-ink-light mt-1 leading-relaxed whitespace-pre-line">
              {question.explanation}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
