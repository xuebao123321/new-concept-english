// 题库入口 — 兼容旧代码，实际使用动态加载
export { getQuestionsByGroup, preloadGroups, useQuestions, preloadFirstLesson } from '../../hooks/useQuestions';

export async function getAllQuestions() {
  const { useQuestions } = await import('../../hooks/useQuestions');
  // 此函数仅诊断模式全量使用，按需加载
  const all: any[] = [];
  for (let i = 1; i <= 143; i += 2) {
    const group = `lesson-${String(i).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
    const qs = (await import('../../hooks/useQuestions')).getQuestionsByGroup(group);
    if (qs.length === 0) {
      // 触发加载
      const mod = await import(/* @vite-ignore */ `./${group}.ts`);
      const key = Object.keys(mod).find(k => k.endsWith('Questions'));
      if (key) all.push(...mod[key]);
    } else {
      all.push(...qs);
    }
  }
  return all;
}

export async function getQuestionsByType(type: string) {
  const all = await getAllQuestions();
  return all.filter((q: any) => q.type === type);
}

export async function getQuestionsByBlock(group: string, block: string) {
  const all = (await import('../../hooks/useQuestions')).getQuestionsByGroup(group);
  return all.filter((q: any) => q.block === block);
}
