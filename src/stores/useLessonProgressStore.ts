import { create } from 'zustand';
import { db } from '../db/database';
import { LESSON_GROUPS } from '../data/lessons';
import { getQuestionsByGroup } from '../data/questions';
import type { LessonProgress, BlockType, ComprehensiveTest, Question } from '../types';

// 块解锁顺序
const BLOCK_ORDER: BlockType[] = ['vocabulary', 'grammar', 'sentence', 'listening'];

interface LessonProgressStore {
  progressMap: Map<string, LessonProgress>;
  isLoading: boolean;

  // ── 原有操作 ──
  load: () => Promise<void>;
  refresh: () => Promise<void>;
  isUnlocked: (lessonGroup: string) => boolean;
  isCompleted: (lessonGroup: string) => boolean;
  getNextUnlocked: () => string | null;
  getUnlockedCount: () => number;

  // ── Phase 1.5 新增：块进度 ──
  isBlockUnlocked: (lessonGroup: string, block: BlockType) => boolean;
  completeBlock: (lessonGroup: string, block: BlockType) => Promise<void>;
  areAllBlocksDone: (lessonGroup: string) => boolean;

  // ── Phase 1.5 新增：综合测试 ──
  buildTestQuestions: (groupId: string) => Question[];
  markLessonComplete: (lessonGroup: string) => Promise<void>;

  // ── Phase 1.5 新增：查询 ──
  getOverallAccuracy: () => number;
  getCompletedLessons: () => string[];
}

export const useLessonProgressStore = create<LessonProgressStore>((set, get) => ({
  progressMap: new Map(),
  isLoading: true,

  // ═══════════════ 原有操作 ═══════════════
  load: async () => {
    const map = await db.getAllLessonProgress();
    set({ progressMap: map, isLoading: false });
  },

  refresh: async () => {
    const map = await db.getAllLessonProgress();
    set({ progressMap: map });
  },

  isUnlocked: (lessonGroup: string) => {
    const { progressMap } = get();
    const idx = LESSON_GROUPS.indexOf(lessonGroup);
    if (idx === 0) return true;
    if (idx === -1) return false;

    const prevGroup = LESSON_GROUPS[idx - 1];
    const prevProgress = progressMap.get(prevGroup);
    return prevProgress?.completed === true;
  },

  isCompleted: (lessonGroup: string) => {
    const { progressMap } = get();
    return progressMap.get(lessonGroup)?.completed === true;
  },

  getNextUnlocked: () => {
    const { isUnlocked, isCompleted } = get();
    for (const group of LESSON_GROUPS) {
      if (isUnlocked(group) && !isCompleted(group)) {
        return group;
      }
    }
    return LESSON_GROUPS[LESSON_GROUPS.length - 1];
  },

  getUnlockedCount: () => {
    const { isUnlocked } = get();
    return LESSON_GROUPS.filter(g => isUnlocked(g)).length;
  },

  // ═══════════════ Phase 1.5：块进度 ═══════════════

  // 判断某个学习块是否解锁
  isBlockUnlocked: (lessonGroup: string, block: BlockType) => {
    const { progressMap } = get();
    const progress = progressMap.get(lessonGroup);

    // 词汇块始终解锁
    if (block === 'vocabulary') return true;

    // 其他块需要前一个块完成
    const blockIdx = BLOCK_ORDER.indexOf(block);
    const prevBlock = BLOCK_ORDER[blockIdx - 1];
    return progress?.blockProgress?.[prevBlock] === true;
  },

  // 标记一个学习块为已完成
  completeBlock: async (lessonGroup: string, block: BlockType) => {
    const { progressMap } = get();
    const existing = progressMap.get(lessonGroup);

    const blockProgress = {
      vocabulary: existing?.blockProgress?.vocabulary || false,
      grammar: existing?.blockProgress?.grammar || false,
      sentence: existing?.blockProgress?.sentence || false,
      listening: existing?.blockProgress?.listening || false,
      [block]: true,
    };

    const progress: LessonProgress = {
      lessonGroup,
      completed: existing?.completed || false,
      bestAccuracy: existing?.bestAccuracy || 0,
      attempts: (existing?.attempts || 0) + 1,
      lastAttemptAt: Date.now(),
      completedAt: existing?.completedAt || 0,
      blockProgress,
    };

    await db.lessonProgress.put(progress);

    const newMap = new Map(progressMap);
    newMap.set(lessonGroup, progress);
    set({ progressMap: newMap });
  },

  // 检查是否全部 4 个块都已完成
  areAllBlocksDone: (lessonGroup: string) => {
    const { progressMap } = get();
    const bp = progressMap.get(lessonGroup)?.blockProgress;
    if (!bp) return false;
    return bp.vocabulary && bp.grammar && bp.sentence && bp.listening;
  },

  // ═══════════════ Phase 1.5：综合测试 ═══════════════

  // 构建综合测试题目：60%当前课 + 25%上一课 + 15%更早课
  buildTestQuestions: (groupId: string): Question[] => {
    // 当前课题目（60%，9题）
    const currentQuestions = getQuestionsByGroup(groupId);
    const shuffled = [...currentQuestions].sort(() => Math.random() - 0.5);
    const currentPicked = shuffled.slice(0, Math.min(9, shuffled.length));

    const result: Question[] = [...currentPicked];

    // 上一课题目（25%，4题）
    const idx = LESSON_GROUPS.indexOf(groupId);
    if (idx > 0) {
      const prevGroup = LESSON_GROUPS[idx - 1];
      const prevQuestions = getQuestionsByGroup(prevGroup);
      const prevShuffled = [...prevQuestions].sort(() => Math.random() - 0.5);
      result.push(...prevShuffled.slice(0, Math.min(4, prevShuffled.length)));
    }

    // 更早旧课题目（15%，2题）—— 优先从已掌握课组中抽取曾答错的题
    if (idx > 1) {
      const olderGroups = LESSON_GROUPS.slice(0, idx - 1);
      const olderQuestions = olderGroups.flatMap(g => getQuestionsByGroup(g));
      const olderShuffled = [...olderQuestions].sort(() => Math.random() - 0.5);
      result.push(...olderShuffled.slice(0, Math.min(2, olderShuffled.length)));
    }

    // 打乱最终顺序
    return result.sort(() => Math.random() - 0.5);
  },

  // 标记课程为已完成（综合测试 80% 正确率即可通过）
  markLessonComplete: async (lessonGroup: string) => {
    const { progressMap } = get();
    const existing = progressMap.get(lessonGroup);

    const progress: LessonProgress = {
      lessonGroup,
      completed: true,
      bestAccuracy: existing?.bestAccuracy || 1,
      attempts: (existing?.attempts || 0) + 1,
      lastAttemptAt: Date.now(),
      completedAt: existing?.completedAt || Date.now(),
      blockProgress: existing?.blockProgress || {
        vocabulary: true,
        grammar: true,
        sentence: true,
        listening: true,
      },
    };

    await db.lessonProgress.put(progress);

    const newMap = new Map(progressMap);
    newMap.set(lessonGroup, progress);
    set({ progressMap: newMap });
  },

  // ═══════════════ Phase 1.5：查询 ═══════════════
  getOverallAccuracy: () => {
    const { progressMap } = get();
    const values = Array.from(progressMap.values());
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, p) => acc + p.bestAccuracy, 0);
    return Math.round((sum / values.length) * 100);
  },

  getCompletedLessons: () => {
    const { progressMap } = get();
    return LESSON_GROUPS.filter(g => progressMap.get(g)?.completed === true);
  },
}));
