import { create } from 'zustand';
import { db } from '../db/database';
import { getLevelByXp, getXpToNextLevel } from '../utils/xp-calculator';
import { checkAndUpdateStreak, checkAndRefillHearts, loseHeart, rewardHeart } from '../utils/streak';
import { checkAchievements } from '../utils/achievements';
import type { UserState, Achievement, AchievementCheckStats } from '../types';

interface UserStore {
  // 状态
  userState: UserState | null;
  isLoading: boolean;

  // 推导状态
  currentRank: ReturnType<typeof getLevelByXp> | null;
  xpProgress: ReturnType<typeof getXpToNextLevel> | null;
  newAchievements: Achievement[];

  // 升级事件 (rank 在 addXp 时跨级触发)
  pendingLevelUp: { newRank: ReturnType<typeof getLevelByXp>; oldRank?: ReturnType<typeof getLevelByXp> } | null;

  // 操作
  init: () => Promise<void>;
  refreshUser: () => Promise<void>;
  addXp: (amount: number) => Promise<void>;
  consumeHeart: () => Promise<boolean>;  // 返回true表示还有心
  grantBonusHeart: () => Promise<void>;
  checkDailyStreak: () => Promise<void>;
  checkAndUnlockAchievements: (extraStats?: Partial<AchievementCheckStats>) => Promise<Achievement[]>;
  clearNewAchievements: () => void;
  clearLevelUp: () => void;
  updateStats: (params: {
    questionsAnswered: number;
    correctCount: number;
    xpEarned: number;
    minutesSpent: number;
  }) => Promise<void>;
  getAchievementStats: () => Promise<AchievementCheckStats>;
}

export const useUserStore = create<UserStore>((set, get) => ({
  userState: null,
  isLoading: true,
  currentRank: null,
  xpProgress: null,
  newAchievements: [],
  pendingLevelUp: null,

  init: async () => {
    const userState = await db.initUserState();
    await checkAndRefillHearts();
    const refreshed = (await db.userState.get('me'))!;
    const rank = getLevelByXp(refreshed.totalXp);
    const progress = getXpToNextLevel(refreshed.totalXp);

    set({
      userState: refreshed,
      currentRank: rank,
      xpProgress: progress,
      isLoading: false,
    });
  },

  refreshUser: async () => {
    const userState = await db.userState.get('me');
    if (!userState) return;

    const rank = getLevelByXp(userState.totalXp);
    const progress = getXpToNextLevel(userState.totalXp);

    set({ userState, currentRank: rank, xpProgress: progress });
  },

  addXp: async (amount: number) => {
    const { userState } = get();
    if (!userState) return;

    const newXp = userState.totalXp + amount;
    const newCorrect = userState.totalCorrect + 1;
    const newTotal = userState.totalQuestionsAnswered + 1;

    await db.userState.update('me', {
      totalXp: newXp,
      totalCorrect: newCorrect,
      totalQuestionsAnswered: newTotal,
    });

    const refreshed = (await db.userState.get('me'))!;
    const rank = getLevelByXp(newXp);
    const progress = getXpToNextLevel(newXp);

    // 检查是否升级
    const oldRank = get().currentRank;
    const leveledUp = oldRank && rank.level > oldRank.level;

    set({
      userState: refreshed,
      currentRank: rank,
      xpProgress: progress,
      pendingLevelUp: leveledUp
        ? { newRank: rank, oldRank }
        : get().pendingLevelUp,
    });
  },

  consumeHeart: async () => {
    const hearts = await loseHeart();
    const { userState } = get();
    if (userState) {
      set({ userState: { ...userState, hearts } });
    }
    return hearts > 0;
  },

  grantBonusHeart: async () => {
    const hearts = await rewardHeart();
    const { userState } = get();
    if (userState) {
      set({ userState: { ...userState, hearts } });
    }
  },

  checkDailyStreak: async () => {
    const { userState } = get();
    if (!userState) return;

    const result = await checkAndUpdateStreak();
    if (result.streakUpdated) {
      set({
        userState: { ...userState, streakDays: result.streakDays },
      });
    }
  },

  checkAndUnlockAchievements: async (extraStats = {}) => {
    const { userState } = get();
    if (!userState) return [];

    const stats = await get().getAchievementStats();
    const mergedStats = { ...stats, ...extraStats };

    const newAchievements = checkAchievements(
      mergedStats,
      userState.unlockedAchievements
    );

    if (newAchievements.length > 0) {
      const updatedUnlocks = [
        ...userState.unlockedAchievements,
        ...newAchievements.map(a => a.id),
      ];
      await db.userState.update('me', {
        unlockedAchievements: updatedUnlocks,
      });
      set({
        userState: { ...userState, unlockedAchievements: updatedUnlocks },
        newAchievements,
      });
    }

    return newAchievements;
  },

  clearNewAchievements: () => {
    set({ newAchievements: [] });
  },

  clearLevelUp: () => {
    set({ pendingLevelUp: null });
  },

  updateStats: async ({ questionsAnswered, correctCount, xpEarned, minutesSpent }) => {
    await db.updateTodayStats({ questionsAnswered, correctCount, xpEarned, minutesSpent });
  },

  getAchievementStats: async () => {
    const { userState } = get();
    if (!userState) {
      return {
        totalXp: 0, streakDays: 0, totalQuestions: 0, totalCorrect: 0,
        choiceCorrect: 0, fillCorrect: 0, translateCorrect: 0,
        reorderCorrect: 0, listeningCorrect: 0, perfectLessons: [],
        bestCombo: 0, lastAnswerTime: 0, dailyCorrect: 0, dailyTotal: 0,
      };
    }

    // 统计各题型答对数
    const choiceCorrect = await db.answerRecords
      .where({ questionType: 'choice', correct: true })
      .count();
    const fillCorrect = await db.answerRecords
      .where({ questionType: 'fill', correct: true })
      .count();
    const translateCorrect = await db.answerRecords
      .where({ questionType: 'translate', correct: true })
      .count();
    const reorderCorrect = await db.answerRecords
      .where({ questionType: 'reorder', correct: true })
      .count();
    const listeningCorrect = await db.answerRecords
      .where({ questionType: 'listening', correct: true })
      .count();

    // 今日统计
    const todayStats = await db.getTodayStats();

    return {
      totalXp: userState.totalXp,
      streakDays: userState.streakDays,
      totalQuestions: userState.totalQuestionsAnswered,
      totalCorrect: userState.totalCorrect,
      choiceCorrect, fillCorrect, translateCorrect,
      reorderCorrect, listeningCorrect,
      perfectLessons: [],
      bestCombo: 0,
      lastAnswerTime: Date.now(),
      dailyCorrect: todayStats?.correctCount || 0,
      dailyTotal: todayStats?.questionsAnswered || 0,
    };
  },
}));
