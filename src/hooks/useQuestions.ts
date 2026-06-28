import { useState, useEffect } from 'react';
import type { Question } from '../types';

// 动态导入缓存
const cache = new Map<string, Question[]>();

const GROUP_PATH_MAP: Record<string, string> = {};
for (let i = 1; i <= 143; i += 2) {
  const group = `lesson-${String(i).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
  GROUP_PATH_MAP[group] = `../data/questions/${group}.ts`;
}

async function loadGroup(group: string): Promise<Question[]> {
  if (cache.has(group)) return cache.get(group)!;
  const path = GROUP_PATH_MAP[group];
  if (!path) return [];
  try {
    const mod = await import(/* @vite-ignore */ path);
    const key = Object.keys(mod).find(k => k.endsWith('Questions'));
    const questions: Question[] = key ? mod[key] : [];
    cache.set(group, questions);
    return questions;
  } catch { return []; }
}

// 预加载多个课组
export async function preloadGroups(groups: string[]): Promise<void> {
  await Promise.all(groups.map(loadGroup));
}

// Hook: 加载一组课组的题目
export function useQuestions(groups: string[]): { questions: Question[]; loading: boolean } {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const all: Question[] = [];
      for (const g of groups) {
        const qs = await loadGroup(g);
        if (!cancelled) all.push(...qs);
      }
      if (!cancelled) { setQuestions(all); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [groups.join(',')]);

  return { questions, loading };
}

// 同步获取（仅返回已缓存的）
export function getQuestionsByGroup(group: string): Question[] {
  return cache.get(group) || [];
}

export function getCachedQuestions(group: string): Question[] {
  return cache.get(group) || [];
}

// 预加载首页需要的课组
export function preloadFirstLesson() {
  loadGroup('lesson-01-02');
}
