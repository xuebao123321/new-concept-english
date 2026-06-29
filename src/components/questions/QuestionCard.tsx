import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MultipleChoice from './MultipleChoice';
import FillInBlank from './FillInBlank';
import TranslationInput from './TranslationInput';
import SentenceReorder from './SentenceReorder';
import ListeningQuestionComp from './ListeningQuestion';
import AnswerFeedback from './AnswerFeedback';
import ComboToast from './ComboToast';
import { playCorrect, playWrong } from '../common/SoundManager';
import { springs } from '../../utils/motion-tokens';
import { useUserStore } from '../../stores/useUserStore';
import { api } from '../../db/api';
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
  const [combo, setCombo] = useState(0);
  const [showCombo, setShowCombo] = useState(false);
  const [wrongStreak, setWrongStreak] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const { consumeHeart } = useUserStore();

  const handleAnswer = (answer: string, correct: boolean, timeSpent: number) => {
    setLastCorrect(correct);
    setShowResult(true);
    // 异步推送答题记录到后端 (家长面板依赖此数据)
    api.submitAnswer({
      question_id: question.id,
      correct,
      user_answer: answer,
      time_spent: timeSpent,
      lesson_group: question.lessonGroup,
      question_type: question.type,
    }).catch(() => {});
    if (correct) {
      playCorrect();
      const newCombo = combo + 1;
      setCombo(newCombo);
      if (newCombo === 3 || newCombo === 5 || newCombo === 10) {
        setShowCombo(true);
        setTimeout(() => setShowCombo(false), 2000);
      }
      setWrongStreak(0);
      setShowHint(false);
    } else {
      playWrong();
      setCombo(0);
      setShowCombo(false);
      consumeHeart().catch(() => {});
      const newWrongStreak = wrongStreak + 1;
      setWrongStreak(newWrongStreak);
      if (newWrongStreak >= 3) {
        setShowHint(true);
        setWrongStreak(0);
      }
    }
    setTimeout(() => {
      setShowResult(false);
      setLastCorrect(null);
      onAnswer(answer, correct, timeSpent);
    }, correct ? 800 : 1400);
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
    <>
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
        transition={springs.slideUp}
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

        {/* 连续答错提示 */}
        {showHint && (
          <motion.div
            className="mt-3 p-3 rounded-xl bg-sky-pale border border-sky/30 text-sm text-ink font-medium text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springs.enter}
          >
            💡 连续答错了,建议看看下面的解析,或者休息一下再试~
          </motion.div>
        )}
      </motion.div>

      {/* 全屏角色化答题反馈 */}
      <AnswerFeedback show={showResult} correct={lastCorrect} />

      {/* 连击激励弹层 */}
      <ComboToast combo={combo} show={showCombo} />
    </>
  );
}
