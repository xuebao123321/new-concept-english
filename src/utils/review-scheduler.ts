import { db } from '../db/database';
import { LESSON_GROUPS } from '../data/lessons';

// 综合测试通过后自动排4次复习
export async function scheduleReview(lessonGroup: string): Promise<void> {
  const stages = [
    { stage: 1, days: 1, count: 5, olderCount: 0 },
    { stage: 3, days: 3, count: 5, olderCount: 2 },
    { stage: 7, days: 7, count: 8, olderCount: 3 },
    { stage: 30, days: 30, count: 10, olderCount: 0 },
  ];

  for (const s of stages) {
    const dueAt = Date.now() + s.days * 24 * 60 * 60 * 1000;
    await db.reviewSchedule.put({
      lessonGroup,
      stage: s.stage,
      dueAt,
      status: 'pending',
    });
  }
}

// 获取今日到期的复习任务
export async function getDueReviews(): Promise<{ lessonGroup: string; stage: number; dueAt: number; olderCount: number; questionCount: number }[]> {
  const now = Date.now();
  const all = await db.reviewSchedule.where('status').equals('pending').toArray();
  const due = all.filter(r => r.dueAt <= now);

  return due.map(r => {
    const stageConfig: Record<number, { count: number; olderCount: number }> = {
      1: { count: 5, olderCount: 0 },
      3: { count: 5, olderCount: 2 },
      7: { count: 8, olderCount: 3 },
      30: { count: 10, olderCount: 0 },
    };
    const cfg = stageConfig[r.stage] || { count: 5, olderCount: 0 };
    return { lessonGroup: r.lessonGroup, stage: r.stage, dueAt: r.dueAt, olderCount: cfg.olderCount, questionCount: cfg.count };
  });
}

// 完成复习
export async function completeReview(lessonGroup: string, stage: number, passed: boolean, score: number): Promise<void> {
  const record = await db.reviewSchedule.where({ lessonGroup, stage }).first();
  if (record && record.id) {
    await db.reviewSchedule.update(record.id, {
      status: passed ? 'completed' : 'failed',
      score,
    });
  }
}

// 复习失败 → 课程降级
export async function resetLesson(lessonGroup: string): Promise<void> {
  await db.lessonProgress.update(lessonGroup, { completed: false });
  // 删除所有已排期的复习
  const records = await db.reviewSchedule.where({ lessonGroup }).toArray();
  for (const r of records) {
    if (r.id) await db.reviewSchedule.delete(r.id);
  }
}

// 获取待复习数量（用于首页提醒）
export async function getDueCount(): Promise<number> {
  const now = Date.now();
  return db.reviewSchedule.where('status').equals('pending').filter(r => r.dueAt <= now).count();
}
