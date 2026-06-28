import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePracticeStore } from '../stores/usePracticeStore';
import { useUserStore } from '../stores/useUserStore';
import { useLessonProgressStore } from '../stores/useLessonProgressStore';
import { checkAndRefillHearts } from '../utils/streak';
import { db } from '../db/database';
import LessonSelector from '../components/practice/LessonSelector';
import PracticeSession from '../components/practice/PracticeSession';
import ResultScreen from '../components/practice/ResultScreen';
import { preloadGroups, getCachedQuestions } from '../hooks/useQuestions';
import type { QuestionType, Question } from '../types';

type Screen = 'select' | 'practice' | 'result';

export default function PracticePage() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>('select');
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>([]);
  const [lastResult, setLastResult] = useState<{
    correctCount: number;
    totalCount: number;
    accuracy: number;
    totalTime: number;
    bestCombo: number;
  } | null>(null);
  const { startSession, endSession } = usePracticeStore();
  const { userState } = useUserStore();

  useEffect(() => {
    checkAndRefillHearts();
  }, []);

  const handleStart = useCallback(
    async (lessonGroups: string[], questionCount: number, types: QuestionType[]) => {
      // 心不足禁止练习
      if ((userState?.hearts ?? 5) === 0) {
        alert('❤️ 心已用完,休息一会儿再来吧!');
        return;
      }
      // 预加载题库
      await preloadGroups(lessonGroups);
      // 从缓存中选题
      const allQ = lessonGroups.flatMap(g => getCachedQuestions(g));
      const filtered = allQ.filter(
        q => lessonGroups.includes(q.lessonGroup) && types.includes(q.type)
      );

      // 随机抽取并打乱
      const shuffled = [...filtered].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, questionCount * lessonGroups.length);

      if (selected.length === 0) {
        alert('当前选择的课文和题型组合没有题目，请调整选择！');
        return;
      }

      setSessionQuestions(selected);
      startSession(selected, {
        lessonGroups,
        questionCount: selected.length,
        types,
        shuffle: true,
      });
      setScreen('practice');
    },
    [startSession]
  );

  const handleComplete = useCallback(async () => {
    const session = endSession();

    // 保存结果数据（因为 endSession 会清空 store）
    const correctCount = session.answers.filter(a => a.correct).length;
    const totalCount = session.answers.length;
    setLastResult({
      correctCount,
      totalCount,
      accuracy: totalCount > 0 ? correctCount / totalCount : 0,
      totalTime: Math.round((Date.now() - session.startTime) / 1000),
      bestCombo: session.bestCombo,
    });

    setScreen('result');

    // 保存错题到错题本
    const wrongAnswers = session.answers.filter(a => !a.correct);
    for (const wa of wrongAnswers) {
      const existing = await db.wrongQuestions.get(wa.questionId);
      if (existing) {
        await db.wrongQuestions.update(wa.questionId, {
          wrongCount: existing.wrongCount + 1,
          lastWrongTime: Date.now(),
          nextReviewTime: Date.now() + 24 * 60 * 60 * 1000, // 1天后复习
        });
      } else {
        const q = session.questions.find(q => q.id === wa.questionId);
        await db.wrongQuestions.put({
          questionId: wa.questionId,
          wrongCount: 1,
          lastWrongTime: Date.now(),
          nextReviewTime: Date.now() + 24 * 60 * 60 * 1000,
          mastered: false,
        });
      }
    }

    // 保存答题记录
    const records = session.answers.map(a => {
      const q = session.questions.find(q => q.id === a.questionId);
      return {
        questionId: a.questionId,
        lessonGroup: q?.lessonGroup || '',
        questionType: q?.type || 'choice' as QuestionType,
        correct: a.correct,
        userAnswer: a.userAnswer,
        timestamp: Date.now(),
        timeSpent: a.timeSpent,
      };
    });
    await db.answerRecords.bulkAdd(records);

    // 更新课程闯关进度
    const { config } = session;
    for (const group of config.lessonGroups) {
      const groupAnswers = session.answers.filter(a => {
        const q = session.questions.find(q => q.id === a.questionId);
        return q?.lessonGroup === group;
      });
      const correct = groupAnswers.filter(a => a.correct).length;
      await db.updateLessonProgress(group, correct, groupAnswers.length);
    }

    // 刷新课程进度 store
    await useLessonProgressStore.getState().refresh();
  }, [endSession]);

  const handleBackToSelect = () => {
    setScreen('select');
  };

  const handleReviewWrong = () => {
    navigate('/review');
  };

  // 直接进入练习选择界面（移除了心的限制）
  return (
    <div className="px-4 py-4">
      {screen === 'select' && (
        <LessonSelector onStart={handleStart} />
      )}
      {screen === 'practice' && (
        <PracticeSession onComplete={handleComplete} />
      )}
      {screen === 'result' && lastResult && (
        <ResultScreen
          correctCount={lastResult.correctCount}
          totalCount={lastResult.totalCount}
          accuracy={lastResult.accuracy}
          totalTime={lastResult.totalTime}
          bestCombo={lastResult.bestCombo}
          onBack={handleBackToSelect}
          onReviewWrong={handleReviewWrong}
        />
      )}
    </div>
  );
}
