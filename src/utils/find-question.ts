import { getQuestionsByGroup, preloadGroups } from '../data/questions';
import { db } from '../db/database';
import type { Question } from '../types';

/**
 * 根据 questionId 查找完整题目数据。
 * 优先从题目数据文件中查找，降级到本地 answerRecords 文本记录。
 *
 * questionId 格式: "L01-ch-001" (L{课号}-{类型缩写}-{序号})
 */
export async function findQuestion(questionId: string): Promise<{
  found: boolean;
  question?: Question;
  fallback?: { question_text: string; correct_answer: string; question_type: string };
} | null> {
  // 1. 从 questionId 解析课组并加载题目数据
  const match = questionId.match(/^L(\d+)-/);
  if (match) {
    const lessonNum = parseInt(match[1], 10);
    const groupFirst = Math.floor((lessonNum - 1) / 2) * 2 + 1;
    const group = `lesson-${String(groupFirst).padStart(2, '0')}-${String(groupFirst + 1).padStart(2, '0')}`;

    try {
      await preloadGroups([group]);
      const questions = getQuestionsByGroup(group);
      const found = questions.find(q => q.id === questionId);
      if (found) return { found: true, question: found };
    } catch { /* 课组文件不存在时继续降级 */ }
  }

  // 2. 降级: 从本地 answerRecords 查找文本记录
  try {
    const records = await db.answerRecords
      .where('questionId').equals(questionId)
      .toArray();

    if (records.length > 0) {
      const latest = records[records.length - 1];
      const rec = latest as any;
      return {
        found: true,
        fallback: {
          question_text: rec.question_text || rec.questionText || '',
          correct_answer: rec.correct_answer || rec.correctAnswer || '',
          question_type: latest.questionType || 'choice',
        },
      };
    }
  } catch { /* Dexie 查询失败 */ }

  return null;
}

/**
 * 预加载一批题目的数据到缓存
 */
export async function preloadQuestions(questionIds: string[]): Promise<Map<string, Question | null>> {
  const results = new Map<string, Question | null>();

  // 收集所有涉及的课组
  const groups = new Set<string>();
  for (const qid of questionIds) {
    const match = qid.match(/^L(\d+)-/);
    if (match) {
      const lessonNum = parseInt(match[1], 10);
      const groupFirst = Math.floor((lessonNum - 1) / 2) * 2 + 1;
      const group = `lesson-${String(groupFirst).padStart(2, '0')}-${String(groupFirst + 1).padStart(2, '0')}`;
      groups.add(group);
    }
  }

  // 并行加载所有课组
  await preloadGroups(Array.from(groups));

  // 从缓存中查找每道题
  for (const qid of questionIds) {
    let found: Question | null = null;
    for (const group of groups) {
      const qs = getQuestionsByGroup(group);
      const q = qs.find(x => x.id === qid);
      if (q) { found = q; break; }
    }
    results.set(qid, found);
  }

  return results;
}
