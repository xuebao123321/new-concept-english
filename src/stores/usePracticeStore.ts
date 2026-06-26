import { create } from 'zustand';
import type { Question, PracticeConfig, PracticeSession, SessionAnswer, QuestionType, BlockType } from '../types';
import { db } from '../db/database';

interface PracticeStore {
  // ── 原有：配置驱动会话 ──
  config: PracticeConfig | null;
  isActive: boolean;
  questions: Question[];
  currentIndex: number;
  answers: SessionAnswer[];
  combo: number;
  bestCombo: number;
  startTime: number;

  // ── Phase 1.5 新增：块驱动会话 ──
  lessonGroup: string | null;
  currentBlock: BlockType | null;
  wrongQuestions: Question[];
  isReviewRound: boolean;
  sessionStatus: 'idle' | 'active' | 'review' | 'completed';

  // ── 原有操作 ──
  startSession: (questions: Question[], config: PracticeConfig) => void;
  submitAnswer: (questionId: string, correct: boolean, userAnswer: string, timeSpent: number) => void;
  nextQuestion: () => void;
  endSession: () => PracticeSession;
  getProgress: () => { current: number; total: number; correct: number };
  getCurrentQuestion: () => Question | null;

  // ── Phase 1.5 新增：块驱动操作 ──
  startBlockSession: (lessonGroup: string, block: BlockType, questions: Question[]) => void;
  submitBlockAnswer: (questionId: string, answer: string, isCorrect: boolean) => void;
  moveToReviewRound: () => boolean;  // 返回 true 表示有错题需要补考
  completeBlockSession: () => Promise<{ correctCount: number; totalCount: number; isPerfect: boolean }>;
  resetSession: () => void;
}

export const usePracticeStore = create<PracticeStore>((set, get) => ({
  // ── 初始状态 ──
  config: null,
  isActive: false,
  questions: [],
  currentIndex: 0,
  answers: [],
  combo: 0,
  bestCombo: 0,
  startTime: 0,
  lessonGroup: null,
  currentBlock: null,
  wrongQuestions: [],
  isReviewRound: false,
  sessionStatus: 'idle',

  // ═══════════════ 原有操作 ═══════════════
  startSession: (questions, config) => {
    set({
      config,
      isActive: true,
      questions,
      currentIndex: 0,
      answers: [],
      combo: 0,
      bestCombo: 0,
      startTime: Date.now(),
    });
  },

  submitAnswer: (questionId, correct, userAnswer, timeSpent) => {
    const { combo, bestCombo } = get();
    const newCombo = correct ? combo + 1 : 0;
    const newBestCombo = Math.max(bestCombo, newCombo);

    set({
      answers: [
        ...get().answers,
        { questionId, correct, userAnswer, timeSpent },
      ],
      combo: newCombo,
      bestCombo: newBestCombo,
    });
  },

  nextQuestion: () => {
    const { currentIndex, questions } = get();
    if (currentIndex < questions.length - 1) {
      set({ currentIndex: currentIndex + 1 });
    }
  },

  endSession: () => {
    const { config, questions, answers, startTime, bestCombo, combo } = get();
    set({
      config: null,
      isActive: false,
      questions: [],
      currentIndex: 0,
      answers: [],
      combo: 0,
      bestCombo: 0,
      startTime: 0,
    });
    return {
      config: config!,
      questions,
      answers,
      startTime,
      bestCombo,
      combo,
      currentIndex: questions.length,
    };
  },

  getProgress: () => {
    const { answers, questions } = get();
    return {
      current: answers.length,
      total: questions.length,
      correct: answers.filter(a => a.correct).length,
    };
  },

  getCurrentQuestion: () => {
    const { questions, currentIndex } = get();
    if (currentIndex >= questions.length) return null;
    return questions[currentIndex];
  },

  // ═══════════════ Phase 1.5：块驱动操作 ═══════════════
  startBlockSession: (lessonGroup, block, questions) => {
    set({
      lessonGroup,
      currentBlock: block,
      questions,
      currentIndex: 0,
      answers: [],
      wrongQuestions: [],
      isReviewRound: false,
      sessionStatus: 'active',
      combo: 0,
      bestCombo: 0,
      startTime: Date.now(),
      isActive: true,
      config: null,
    });
  },

  submitBlockAnswer: (questionId, answer, isCorrect) => {
    const { combo, bestCombo, questions, currentIndex } = get();
    const newCombo = isCorrect ? combo + 1 : 0;
    const newBestCombo = Math.max(bestCombo, newCombo);

    // 答错的题加入错题池
    const wrongQs = [...get().wrongQuestions];
    if (!isCorrect) {
      const q = questions[currentIndex];
      if (q && !wrongQs.find(wq => wq.id === q.id)) {
        wrongQs.push(q);
      }
    }

    set({
      answers: [
        ...get().answers,
        { questionId, correct: isCorrect, userAnswer: answer, timeSpent: 0 },
      ],
      combo: newCombo,
      bestCombo: newBestCombo,
      wrongQuestions: wrongQs,
    });
  },

  moveToReviewRound: () => {
    const { wrongQuestions } = get();
    if (wrongQuestions.length === 0) return false;

    set({
      questions: [...wrongQuestions],
      wrongQuestions: [],
      currentIndex: 0,
      isReviewRound: true,
      sessionStatus: 'review',
      answers: [],
    });
    return true;
  },

  completeBlockSession: async () => {
    const { answers, lessonGroup, currentBlock, questions, wrongQuestions } = get();
    const correctCount = answers.filter(a => a.correct).length;
    const totalCount = answers.length;
    const isPerfect = correctCount === totalCount && wrongQuestions.length === 0;

    // 持久化答题记录
    const now = Date.now();
    for (const ans of answers) {
      const q = questions.find(qq => qq.id === ans.questionId);
      if (q) {
        await db.answerRecords.put({
          questionId: ans.questionId,
          lessonGroup: lessonGroup || '',
          questionType: q.type,
          correct: ans.correct,
          userAnswer: ans.userAnswer,
          timestamp: now,
          timeSpent: ans.timeSpent,
          isFirstAttempt: !get().isReviewRound,
        });

        // 记录错题
        if (!ans.correct) {
          const existing = await db.wrongQuestions.get(ans.questionId);
          await db.wrongQuestions.put({
            questionId: ans.questionId,
            wrongCount: (existing?.wrongCount || 0) + 1,
            lastWrongTime: now,
            nextReviewTime: now + 24 * 60 * 60 * 1000, // 1天后复习
            mastered: false,
          });
        }
      }
    }

    set({ sessionStatus: 'completed', isActive: false });

    return { correctCount, totalCount, isPerfect };
  },

  resetSession: () => {
    set({
      lessonGroup: null,
      currentBlock: null,
      questions: [],
      currentIndex: 0,
      answers: [],
      wrongQuestions: [],
      isReviewRound: false,
      sessionStatus: 'idle',
      combo: 0,
      bestCombo: 0,
      startTime: 0,
      isActive: false,
      config: null,
    });
  },
}));
