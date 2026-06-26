import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TranslateQuestion } from '../../types';

interface TranslationInputProps {
  question: TranslateQuestion;
  onAnswer: (answer: string, correct: boolean, timeSpent: number) => void;
  startTime: number;
}

export default function TranslationInput({ question, onAnswer, startTime }: TranslationInputProps) {
  const [input, setInput] = useState('');
  const [charCount, setCharCount] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [matchScore, setMatchScore] = useState(0);

  const checkTranslation = (
    userInput: string,
    acceptable: string[],
    keywords: string[]
  ): { correct: boolean; score: number } => {
    const normalized = userInput.toLowerCase().trim();

    if (acceptable.some(a => normalized === a.toLowerCase().trim())) {
      return { correct: true, score: 100 };
    }

    if (keywords.length > 0) {
      const matchedKeywords = keywords.filter(k => normalized.includes(k.toLowerCase()));
      const score = (matchedKeywords.length / keywords.length) * 100;
      return { correct: score >= 70, score };
    }

    if (
      acceptable.some(a => {
        const aNorm = a.toLowerCase().trim();
        return normalized.includes(aNorm) || aNorm.includes(normalized);
      })
    ) {
      return { correct: true, score: 80 };
    }

    return { correct: false, score: 0 };
  };

  const handleSubmit = () => {
    if (!input.trim() || showResult) return;

    const result = checkTranslation(input.trim(), question.acceptableAnswers, question.keywords);
    setIsCorrect(result.correct);
    setMatchScore(result.score);
    setShowResult(true);

    const timeSpent = (Date.now() - startTime) / 1000;

    setTimeout(() => {
      onAnswer(input.trim(), result.correct, timeSpent);
    }, 1200);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    setCharCount(e.target.value.length);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-light">
        {question.prompt}
        <span className="ml-2 text-xs text-ink-muted">
          ({question.direction === 'cn2en' ? '中→英' : '英→中'})
        </span>
      </p>

      {/* 源文本 */}
      <div className="p-4 rounded-xl bg-forest/5 border-l-4 border-forest">
        <p className="text-base font-semibold text-ink">
          {question.direction === 'cn2en' ? '🇨🇳 ' : '🇬🇧 '}
          {question.sourceText}
        </p>
      </div>

      {/* 输入区 */}
      {!showResult && (
        <>
          <div className="relative">
            <textarea
              value={input}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              className="glass-panel w-full p-3 text-ink placeholder-[#64748B]
                         focus:border-forest/50 focus:outline-none resize-none text-base
                         min-h-[80px]"
              rows={2}
              placeholder={question.direction === 'cn2en' ? '请输入英文翻译...' : '请输入中文翻译...'}
              autoFocus
            />
            <span className="absolute bottom-2 right-3 text-[10px] text-ink-muted">
              {charCount} 字
            </span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!input.trim()}
            className="w-full py-3 btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            提交翻译
          </button>
        </>
      )}

      {/* 结果反馈 */}
      <AnimatePresence>
        {showResult && (
          <motion.div className="space-y-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div
              className={`p-3 rounded-xl border ${
                isCorrect ? 'bg-forest/5 border-forest/20' : 'bg-berry/5 border-berry/20'
              }`}
            >
              <div className="flex items-center gap-2 text-sm">
                {isCorrect ? (
                  <span className="text-forest">✅ 翻译正确！匹配度 {Math.round(matchScore)}%</span>
                ) : (
                  <span className="text-berry">❌ 还需要改进（匹配度 {Math.round(matchScore)}%）</span>
                )}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-forest/5 border border-forest/20">
              <div className="text-xs text-forest mb-1">📖 参考答案：</div>
              {question.acceptableAnswers.map((ans, i) => (
                <div key={i} className="text-sm text-ink font-medium">
                  {ans}
                </div>
              ))}
            </div>

            <div className="text-xs text-ink-light leading-relaxed whitespace-pre-line">
              {question.explanation}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
