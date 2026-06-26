import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ReorderQuestion } from '../../types';

interface SentenceReorderProps {
  question: ReorderQuestion;
  onAnswer: (answer: string, correct: boolean, timeSpent: number) => void;
  startTime: number;
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function SentenceReorder({ question, onAnswer, startTime }: SentenceReorderProps) {
  const shuffledWords = useMemo(() => {
    const words = question.words.map((word, i) => ({ word, id: i }));
    let shuffled = shuffleArray(words);
    let attempts = 0;
    while (shuffled.every((w, i) => w.id === i) && attempts < 10) {
      shuffled = shuffleArray(words);
      attempts++;
    }
    return shuffled;
  }, [question.id]);

  // candidateWords: 候选区（待选） / selectedWords: 选择区（已排）
  const [candidateWords, setCandidateWords] = useState(shuffledWords);
  const [selectedWords, setSelectedWords] = useState<typeof shuffledWords>([]);
  const [showResult, setShowResult] = useState(false);

  const moveToSelected = (item: typeof shuffledWords[0]) => {
    if (showResult) return;
    setCandidateWords(prev => prev.filter(w => w.id !== item.id));
    setSelectedWords(prev => [...prev, item]);
  };

  const moveToCandidate = (item: typeof shuffledWords[0]) => {
    if (showResult) return;
    setSelectedWords(prev => prev.filter(w => w.id !== item.id));
    setCandidateWords(prev => [...prev, item]);
  };

  const handleSubmit = () => {
    if (showResult || selectedWords.length === 0) return;
    setShowResult(true);
    const timeSpent = (Date.now() - startTime) / 1000;
    const correct = selectedWords.every((w, i) => w.id === question.correctOrder[i])
      && selectedWords.length === question.correctOrder.length;

    setTimeout(() => {
      const answer = selectedWords.map(w => w.word).join(' ');
      onAnswer(answer, correct, timeSpent);
    }, 1200);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-light">{question.prompt}</p>

      {/* 选择区（已排列的单词） */}
      <div className="p-4 rounded-xl border-2 border-dashed border-forest/30 min-h-[56px] flex flex-wrap gap-2 items-center">
        {selectedWords.length === 0 && !showResult && (
          <span className="text-xs text-ink-muted">👇 点击下方单词排列到这里</span>
        )}
        {selectedWords.map(item => (
          <motion.button
            key={item.id}
            onClick={() => moveToCandidate(item)}
            className="px-4 py-2 rounded-xl font-medium text-ink border border-forest/40
                       bg-forest/10 cursor-pointer hover:bg-forest/20 transition-colors"
            layout
            whileTap={{ scale: 0.95 }}
            disabled={showResult}
          >
            {item.word}
          </motion.button>
        ))}
        {showResult && (
          <span className="text-sm text-ink ml-2">
            （正确答案：<strong className="text-forest">{question.correctSentence}</strong>）
          </span>
        )}
      </div>

      {/* 候选区 */}
      {!showResult && candidateWords.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {candidateWords.map(item => (
            <motion.button
              key={item.id}
              onClick={() => moveToSelected(item)}
              className="px-4 py-2 rounded-xl font-medium text-ink border border-warm-border
                         bg-warm-bg cursor-pointer hover:bg-warm-bg hover:border-forest/30 transition-colors"
              layout
              whileTap={{ scale: 0.95 }}
            >
              {item.word}
            </motion.button>
          ))}
        </div>
      )}

      {!showResult && (
        <button
          onClick={handleSubmit}
          disabled={candidateWords.length > 0}
          className="w-full py-3 btn-gold disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {candidateWords.length > 0 ? '请将所有单词移到上方' : '确认排序'}
        </button>
      )}

      {/* 解析 */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            className="space-y-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="p-3 rounded-xl bg-forest/5 border border-forest/20">
              <div className="text-xs text-forest mb-1">📝 正确句子：</div>
              <div className="text-base font-bold text-ink">{question.correctSentence}</div>
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
