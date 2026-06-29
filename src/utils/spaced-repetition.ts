// 间隔复习算法（简化版SM-2）

export interface ReviewSchedule {
  interval: number;      // 当前复习间隔（天）
  easeFactor: number;    // 难度系数（1.3 ~ 2.5）
  repetitions: number;   // 复习次数
}

// 计算下一次复习时间
export function calcNextReview(
  current: ReviewSchedule,
  quality: 0 | 1 | 2 | 3 | 4 | 5  // 0=完全忘记, 5=完全掌握
): ReviewSchedule {
  let { interval, easeFactor, repetitions } = current;

  if (quality < 3) {
    // 答错了，重置
    return {
      interval: 1,
      easeFactor: Math.max(1.3, easeFactor - 0.2),
      repetitions: 0,
    };
  }

  // 答对了，更新间隔
  let newInterval: number;
  if (repetitions === 0) {
    newInterval = 1;
  } else if (repetitions === 1) {
    newInterval = 3;
  } else {
    newInterval = Math.round(interval * easeFactor);
  }

  // 更新难度系数
  const newEaseFactor = Math.min(
    2.5,
    Math.max(
      1.3,
      easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    )
  );

  return {
    interval: newInterval,
    easeFactor: newEaseFactor,
    repetitions: repetitions + 1,
  };
}

// 根据复习状态计算下次复习的时间戳
export function getNextReviewTimestamp(
  schedule: ReviewSchedule
): number {
  const daysMs = schedule.interval * 24 * 60 * 60 * 1000;
  return Date.now() + daysMs;
}

// 默认复习计划（首次遇到错题）
export function getDefaultReviewSchedule(): ReviewSchedule {
  return {
    interval: 1,
    easeFactor: 2.5,
    repetitions: 0,
  };
}

// ═══════════════ Phase 1.5：阶段式间隔复习 API ═══════════════

// 复习阶段定义
export const SPACED_STAGES = [
  { stage: 0, label: '初始（立即复习）', intervalDays: 0 },
  { stage: 1, label: '1天后', intervalDays: 1 },
  { stage: 2, label: '3天后', intervalDays: 3 },
  { stage: 3, label: '7天后', intervalDays: 7 },
  { stage: 4, label: '30天后', intervalDays: 30 },
  { stage: 5, label: '永久掌握', intervalDays: Infinity },
];

// 计算下一次复习（阶段式）
export function calculateNextReview(
  stage: number,
  passed: boolean,
  wrongCount?: number
): { nextStage: number; nextReviewTime: number } {
  // 如果提供了 wrongCount,用它校准当前阶段
  const effectiveStage = wrongCount !== undefined
    ? (wrongCount >= 5 ? 4 : Math.max(0, wrongCount))
    : stage;

  if (!passed) {
    // 任何阶段失败 → 回炉 stage 0
    return { nextStage: 0, nextReviewTime: Date.now() };
  }
  const nextStage = Math.min(effectiveStage + 1, 5);
  const stageInfo = SPACED_STAGES[nextStage];
  const intervalMs = stageInfo.intervalDays === Infinity
    ? Number.MAX_SAFE_INTEGER  // 永久掌握，设为遥远的未来
    : stageInfo.intervalDays * 24 * 60 * 60 * 1000;
  return { nextStage, nextReviewTime: Date.now() + intervalMs };
}

// 获取所有到期需要复习的题目
export function getDueReviews(
  wrongQuestions: Array<{ questionId: string; lessonGroup?: string; nextReviewTime: number; mastered: boolean; wrongCount: number }>
): Array<{ questionId: string; lessonGroup: string; stage: number; dueAt: number; status: 'pending' }> {
  const now = Date.now();
  return wrongQuestions
    .filter(wq => !wq.mastered && wq.nextReviewTime <= now)
    .map(wq => ({
      questionId: wq.questionId,
      lessonGroup: (wq as any).lessonGroup || '',
      stage: wq.wrongCount > 4 ? 4 : wq.wrongCount, // 根据错误次数估算 stage
      dueAt: wq.nextReviewTime,
      status: 'pending' as const,
    }));
}

// 判断是否到复习时间
export function isReviewDue(nextReviewTime: number): boolean {
  return Date.now() >= nextReviewTime;
}

// 格式化复习间隔显示
export function formatReviewInterval(stage: number): string {
  const info = SPACED_STAGES.find(s => s.stage === stage);
  return info?.label || '未知';
}
