import { db } from '../db/database';
import { SPACED_STAGES } from './spaced-repetition';
import type { WrongQuestion } from '../types';

/** 复习优先级等级 */
export type ReviewPriority = 'urgent' | 'due' | 'weak' | 'mastered';

/** 带优先级标签的错题 */
export interface PrioritizedWrong {
  question: WrongQuestion;
  priority: ReviewPriority;
  label: string;
  stage: number;
  nextReviewLabel: string;
}

const STAGE_LABELS = ['现在', '1天后', '3天后', '7天后', '30天后', '已掌握'] as const;

/** 根据错误次数估算阶段 */
export function estimateStage(wq: WrongQuestion): number {
  if (wq.mastered) return 5;
  if (wq.wrongCount >= 5) return 4;
  return Math.max(0, wq.wrongCount);
}

/** 根据遗忘曲线 + 错误频率,对所有错题排序并标优先级 */
export async function getPrioritizedWrongs(): Promise<{
  urgent: PrioritizedWrong[];
  due: PrioritizedWrong[];
  weak: PrioritizedWrong[];
  mastered: PrioritizedWrong[];
}> {
  const all = await db.wrongQuestions.toArray();
  const now = Date.now();

  const result = {
    urgent: [] as PrioritizedWrong[],
    due: [] as PrioritizedWrong[],
    weak: [] as PrioritizedWrong[],
    mastered: [] as PrioritizedWrong[],
  };

  for (const wq of all) {
    // 刚复习完（1分钟内）的题跳过，不立即显示
    if (wq.lastWrongTime > 0 && now - wq.lastWrongTime < 60000) continue;

    const stage = estimateStage(wq);
    const nextLabel = STAGE_LABELS[stage] || '现在';

    const overdue = wq.nextReviewTime > 0 && now > wq.nextReviewTime;
    const overdueHours = overdue
      ? Math.floor((now - wq.nextReviewTime) / 3600000)
      : 0;
    const dueSoon = wq.nextReviewTime > 0 && now < wq.nextReviewTime
      && wq.nextReviewTime - now < 4 * 60 * 60 * 1000;

    let priority: ReviewPriority;
    let label: string;

    if (wq.mastered) {
      priority = 'mastered';
      label = '已掌握';
    } else if (overdue && overdueHours > 24) {
      priority = 'urgent';
      label = `已过期 ${overdueHours} 小时`;
    } else if (overdue || dueSoon) {
      priority = 'due';
      label = overdue ? '今天该复习了' : '明天到期';
    } else if (wq.wrongCount >= 3) {
      priority = 'weak';
      label = `错了 ${wq.wrongCount} 次`;
    } else {
      priority = 'due';
      label = wq.nextReviewTime > 0
        ? `下次: ${new Date(wq.nextReviewTime).toLocaleDateString('zh-CN')}`
        : '待安排';
    }

    result[priority].push({
      question: wq,
      priority,
      label,
      stage,
      nextReviewLabel: nextLabel,
    });
  }

  // 组内排序: 错误次数多的排前面
  for (const key of ['urgent', 'due', 'weak'] as const) {
    result[key].sort((a, b) => b.question.wrongCount - a.question.wrongCount);
  }

  return result;
}

/** 获取首页复习提醒 (未掌握且需要复习的题目数，与复习中心一致) */
export async function getReviewReminder(): Promise<number> {
  const { urgent, due, weak } = await getPrioritizedWrongs();
  return urgent.length + due.length + weak.length;
}
