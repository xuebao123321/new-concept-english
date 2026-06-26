import Dexie, { type Table } from 'dexie';
import type { UserState, AnswerRecord, WrongQuestion, DailyStats, LessonProgress } from '../types';

class NCEDatabase extends Dexie {
  userState!: Table<UserState, string>;
  answerRecords!: Table<AnswerRecord, number>;
  wrongQuestions!: Table<WrongQuestion, string>;
  dailyStats!: Table<DailyStats, string>;
  lessonProgress!: Table<LessonProgress, string>;

  constructor() {
    super('NewConceptEnglish');

    this.version(2).stores({
      userState: 'id',
      answerRecords: '++id, questionId, lessonGroup, questionType, correct, timestamp',
      wrongQuestions: 'questionId, nextReviewTime, mastered',
      dailyStats: 'date',
      lessonProgress: 'lessonGroup',
    });
  }

  // 初始化默认用户状态
  async initUserState(): Promise<UserState> {
    const existing = await this.userState.get('me');
    if (existing) return existing;

    const defaultState: UserState = {
      id: 'me',
      totalXp: 0,
      streakDays: 0,
      lastPracticeDate: '',
      hearts: 5,
      heartsRefillTime: 0,
      unlockedAchievements: [],
      totalQuestionsAnswered: 0,
      totalCorrect: 0,
      createdAt: new Date().toISOString(),
    };

    await this.userState.put(defaultState);
    return defaultState;
  }

  // 获取所有课程进度
  async getAllLessonProgress(): Promise<Map<string, LessonProgress>> {
    const all = await this.lessonProgress.toArray();
    const map = new Map<string, LessonProgress>();
    for (const lp of all) {
      map.set(lp.lessonGroup, lp);
    }
    return map;
  }

  // 更新课程进度（完成一组练习后调用）
  async updateLessonProgress(
    lessonGroup: string,
    correctCount: number,
    totalCount: number
  ): Promise<LessonProgress> {
    const existing = await this.lessonProgress.get(lessonGroup);
    const accuracy = totalCount > 0 ? correctCount / totalCount : 0;
    const passed = accuracy >= 1.0; // 100%正确率才能过关解锁下一课

    const progress: LessonProgress = {
      lessonGroup,
      completed: existing ? (existing.completed || passed) : passed,
      bestAccuracy: existing
        ? Math.max(existing.bestAccuracy, accuracy)
        : accuracy,
      attempts: (existing?.attempts || 0) + 1,
      lastAttemptAt: Date.now(),
      completedAt: passed && !existing?.completed ? Date.now() : (existing?.completedAt || 0),
    };

    await this.lessonProgress.put(progress);
    return progress;
  }

  // 获取今日统计
  async getTodayStats(): Promise<DailyStats | undefined> {
    const today = new Date().toISOString().slice(0, 10);
    return this.dailyStats.get(today);
  }

  // 更新或创建今日统计
  async updateTodayStats(partial: Partial<DailyStats>): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const existing = await this.dailyStats.get(today);

    if (existing) {
      await this.dailyStats.update(today, {
        ...partial,
        questionsAnswered: (existing.questionsAnswered || 0) + (partial.questionsAnswered || 0),
        correctCount: (existing.correctCount || 0) + (partial.correctCount || 0),
        xpEarned: (existing.xpEarned || 0) + (partial.xpEarned || 0),
        minutesSpent: (existing.minutesSpent || 0) + (partial.minutesSpent || 0),
      });
    } else {
      await this.dailyStats.put({
        date: today,
        questionsAnswered: partial.questionsAnswered || 0,
        correctCount: partial.correctCount || 0,
        xpEarned: partial.xpEarned || 0,
        minutesSpent: partial.minutesSpent || 0,
      });
    }
  }

  // 获取所有错题（未掌握的）
  async getActiveWrongQuestions(): Promise<WrongQuestion[]> {
    return this.wrongQuestions
      .filter(wq => !wq.mastered)
      .toArray();
  }

  // 获取待复习的错题
  async getDueReviewQuestions(): Promise<WrongQuestion[]> {
    const now = Date.now();
    return this.wrongQuestions
      .filter(wq => !wq.mastered && wq.nextReviewTime < now)
      .toArray();
  }

  // 获取最近N天的统计
  async getRecentStats(days: number): Promise<DailyStats[]> {
    const dates: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }

    const stats = await this.dailyStats.bulkGet(dates);
    return dates.map((date, i) =>
      stats[i] || {
        date,
        questionsAnswered: 0,
        correctCount: 0,
        xpEarned: 0,
        minutesSpent: 0,
      }
    );
  }
}

export const db = new NCEDatabase();
