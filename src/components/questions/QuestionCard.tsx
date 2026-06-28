import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MultipleChoice from './MultipleChoice';
import FillInBlank from './FillInBlank';
import TranslationInput from './TranslationInput';
import SentenceReorder from './SentenceReorder';
import ListeningQuestionComp from './ListeningQuestion';
import { playCorrect, playWrong } from '../common/SoundManager';
import type { Question, QuestionType } from '../../types';

interface Props {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (a: string, c: boolean, t: number) => void;
}

const TYPE_LABELS: Record<QuestionType, string> = {
  choice: '📋 选择',
  fill: '✏️ 填空',
  translate: '🌐 翻译',
  reorder: '🧩 连词',
  listening: '🎧 听力',
};

export default function QuestionCard({ question, questionNumber, totalQuestions, onAnswer }: Props) {
  const [startTime] = useState(() => Date.now());
  const [showResult, setShowResult] = useState(false);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);

  const handleAnswer = (answer: string, correct: boolean, timeSpent: number) => {
    setLastCorrect(correct);
    setShowResult(true);
    if (correct) playCorrect(); else playWrong();
    setTimeout(() => {
      setShowResult(false);
      setLastCorrect(null);
      onAnswer(answer, correct, timeSpent);
    }, correct ? 600 : 1200);
  };

  const render = () => {
    switch (question.type) {
      case 'choice': return <MultipleChoice question={question} onAnswer={handleAnswer} startTime={startTime} />;
      case 'fill': return <FillInBlank question={question} onAnswer={handleAnswer} startTime={startTime} />;
      case 'translate': return <TranslationInput question={question} onAnswer={handleAnswer} startTime={startTime} />;
      case 'reorder': return <SentenceReorder question={question} onAnswer={handleAnswer} startTime={startTime} />;
      case 'listening': return <ListeningQuestionComp question={question} onAnswer={handleAnswer} startTime={startTime} />;
      default: return <div className="text-ink-light">未知题型</div>;
    }
  };

  return (
    <motion.div
      key={question.id}
      className={`glass-panel p-5 transition-shadow duration-300 ${
        showResult && lastCorrect === true
          ? 'border-forest/50 shadow-[0_0_20px_rgba(91,154,90,0.2)]'
          : showResult && lastCorrect === false
          ? 'border-berry/50 animate-pulse'
          : ''
      }`}
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* 顶部：进度 + 题型标签 + 难度 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-forest/15 text-forest font-bold">
            {TYPE_LABELS[question.type]}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
            question.difficulty === 'easy'
              ? 'bg-forest/15 text-forest'
              : question.difficulty === 'medium'
              ? 'bg-honey/15 text-honey'
              : 'bg-berry/15 text-berry'
          }`}>
            {'⭐'.repeat(question.difficulty === 'easy' ? 1 : question.difficulty === 'medium' ? 2 : 3)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs font-bold text-ink-light">
            第 {questionNumber}/{totalQuestions} 题
          </span>
          {/* 进度点 */}
          {Array.from({ length: Math.min(totalQuestions, 15) }, (_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i < questionNumber - 1 ? 'bg-forest' : i === questionNumber - 1 ? 'bg-forest' : 'bg-warm-bg'
              }`}
            />
          ))}
        </div>
      </div>

      {/* 知识点标签 */}
      {'tags' in question && (question as any).tags && (
        <div className="flex flex-wrap gap-1 mb-3">
          {(question as any).tags.slice(0, 4).map((tag: string) => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-warm-bg text-ink-light font-medium">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* 题目内容 */}
      <AnimatePresence mode="wait">{render()}</AnimatePresence>

      {/* 正确/错误 flash 指示器 */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            className={`mt-3 py-2 px-4 rounded-xl text-center text-sm font-bold ${
              lastCorrect ? 'bg-forest/15 text-forest' : 'bg-berry/15 text-berry'
            }`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            {lastCorrect ? '✅ 回答正确！' : '❌ 答错了'}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
