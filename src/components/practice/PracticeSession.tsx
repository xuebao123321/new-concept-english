import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { usePracticeStore } from '../../stores/usePracticeStore';
import { useUserStore } from '../../stores/useUserStore';
import { calcQuestionXp } from '../../utils/xp-calculator';
import QuestionCard from '../questions/QuestionCard';
import HeartDisplay from '../gamification/HeartDisplay';
import XpBar from '../gamification/XpBar';

interface PracticeSessionProps {
  onComplete: (stats: { correctCount: number; totalCount: number; wrongCount: number }) => void;
}

export default function PracticeSession({ onComplete }: PracticeSessionProps) {
  const navigate = useNavigate();
  const {
    questions, currentIndex, combo,
    answers, wrongQuestions, isReviewRound,
    submitAnswer, nextQuestion, getCurrentQuestion, getProgress,
  } = usePracticeStore();
  const { userState, addXp, refreshUser } = useUserStore();

  const [isTransitioning, setIsTransitioning] = useState(false);

  const currentQuestion = getCurrentQuestion();
  const { current, total } = getProgress();
  const displayNumber = current + 1;

  const handleAnswer = useCallback(
    async (answer: string, correct: boolean, timeSpent: number) => {
      if (isTransitioning || !currentQuestion) return;

      setIsTransitioning(true);

      const xp = calcQuestionXp(
        currentQuestion.type,
        currentQuestion.difficulty,
        correct,
        combo
      );

      submitAnswer(currentQuestion.id, correct, answer, timeSpent);

      if (xp > 0) {
        await addXp(xp);
        await refreshUser();
      }

      // 判断是否是最后一题
      if (currentIndex >= questions.length - 1) {
        setTimeout(() => {
          // 收集统计数据
          const allAnswers = usePracticeStore.getState().answers;
          const correctCount = allAnswers.filter(a => a.correct).length;
          const totalCount = allAnswers.length;
          const wrongCount = totalCount - correctCount;

          onComplete({ correctCount, totalCount, wrongCount });
          setIsTransitioning(false);
        }, 500);
      } else {
        setTimeout(() => {
          nextQuestion();
          setIsTransitioning(false);
        }, correct ? 600 : 1200);
      }
    },
    [
      currentQuestion, currentIndex, questions.length, combo,
      submitAnswer, addXp, refreshUser, nextQuestion, onComplete, isTransitioning,
    ]
  );

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-4">📋</div>
          <p className="text-ink-light">题目加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 space-y-3">
      {/* 顶部状态栏 */}
      <div className="flex items-center justify-between">
        <HeartDisplay hearts={userState?.hearts ?? 5} />
        <div className="flex items-center gap-3">
          {isReviewRound && (
            <span className="text-xs font-bold text-honey bg-honey/10 px-2 py-0.5 rounded-full">
              🔄 补考模式
            </span>
          )}
          <XpBar compact />
        </div>
      </div>

      {/* 进度条 */}
      <div className="h-1.5 bg-warm-bg rounded-full overflow-hidden">
        <div
          className="h-full rounded-full progress-shimmer transition-all duration-500"
          style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
        />
      </div>

      {/* 轮次指示 */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-ink-light">
          第 {displayNumber}/{total} 题
        </span>
        {wrongQuestions.length > 0 && !isReviewRound && (
          <span className="text-honey">
            ⚠️ 已错 {wrongQuestions.length} 题
          </span>
        )}
        {combo >= 3 && (
          <span className="text-honey font-bold">
            🔥 {combo}连击
          </span>
        )}
      </div>

      {/* 题目卡片 */}
      <QuestionCard
        key={`${currentQuestion.id}-${isReviewRound ? 'r' : 'n'}`}
        question={currentQuestion}
        questionNumber={displayNumber}
        totalQuestions={total}
        onAnswer={handleAnswer}
      />
    </div>
  );
}
