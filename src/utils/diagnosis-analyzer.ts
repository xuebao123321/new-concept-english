import type { QuestionType, BlockType } from '../types';

export interface DiagnosisAnswer {
  questionId: string;
  lessonGroup: string;
  questionType: QuestionType;
  block: BlockType;
  correct: boolean;
}

export interface DiagnosisResult {
  // 四维能力 (0-100)
  vocabularyAccuracy: number;
  grammarAccuracy: number;
  sentenceAccuracy: number;
  listeningAccuracy: number;

  // 课组正确率
  lessonGroupAccuracies: Record<string, number>;

  // 薄弱点
  weakGroups: string[];       // 正确率 < 60%
  weakTypes: string[];        // 正确率 < 60% 的题型

  // 评估
  overallLevel: 'beginner' | 'elementary' | 'intermediate' | 'advanced';
  estimatedDaysToMaster: number;
}

export function analyzeDiagnosis(answers: DiagnosisAnswer[]): DiagnosisResult {
  if (answers.length === 0) {
    return {
      vocabularyAccuracy: 0, grammarAccuracy: 0,
      sentenceAccuracy: 0, listeningAccuracy: 0,
      lessonGroupAccuracies: {}, weakGroups: [], weakTypes: [],
      overallLevel: 'beginner', estimatedDaysToMaster: 30,
    };
  }

  // 按块统计
  const blockStats = { vocabulary: { total: 0, correct: 0 }, grammar: { total: 0, correct: 0 }, sentence: { total: 0, correct: 0 }, listening: { total: 0, correct: 0 } };
  const groupStats: Record<string, { total: number; correct: number }> = {};
  const typeStats: Record<string, { total: number; correct: number }> = {};

  for (const ans of answers) {
    // 按块
    if (ans.block && blockStats[ans.block]) {
      blockStats[ans.block].total++;
      if (ans.correct) blockStats[ans.block].correct++;
    }

    // 按课组
    if (!groupStats[ans.lessonGroup]) {
      groupStats[ans.lessonGroup] = { total: 0, correct: 0 };
    }
    groupStats[ans.lessonGroup].total++;
    if (ans.correct) groupStats[ans.lessonGroup].correct++;

    // 按题型
    if (!typeStats[ans.questionType]) {
      typeStats[ans.questionType] = { total: 0, correct: 0 };
    }
    typeStats[ans.questionType].total++;
    if (ans.correct) typeStats[ans.questionType].correct++;
  }

  // 四维能力
  const calcPct = (c: number, t: number) => t > 0 ? Math.round((c / t) * 100) : 0;
  const vocabularyAccuracy = calcPct(blockStats.vocabulary.correct, blockStats.vocabulary.total);
  const grammarAccuracy = calcPct(blockStats.grammar.correct, blockStats.grammar.total);
  const sentenceAccuracy = calcPct(blockStats.sentence.correct, blockStats.sentence.total);
  const listeningAccuracy = calcPct(blockStats.listening.correct, blockStats.listening.total);

  // 课组正确率
  const lessonGroupAccuracies: Record<string, number> = {};
  for (const [group, stats] of Object.entries(groupStats)) {
    lessonGroupAccuracies[group] = calcPct(stats.correct, stats.total);
  }

  // 薄弱课组（< 60%）
  const weakGroups = Object.entries(lessonGroupAccuracies)
    .filter(([, acc]) => acc < 60)
    .map(([group]) => group);

  // 薄弱题型（< 60%）
  const weakTypes = Object.entries(typeStats)
    .filter(([, stats]) => calcPct(stats.correct, stats.total) < 60)
    .map(([type]) => type);

  // 整体水平
  const overallAcc = calcPct(
    answers.filter(a => a.correct).length,
    answers.length
  );
  let overallLevel: DiagnosisResult['overallLevel'] = 'beginner';
  if (overallAcc >= 90) overallLevel = 'advanced';
  else if (overallAcc >= 70) overallLevel = 'intermediate';
  else if (overallAcc >= 40) overallLevel = 'elementary';

  // 预估巩固天数
  let estimatedDaysToMaster = 30;
  if (overallLevel === 'advanced') estimatedDaysToMaster = Math.max(1, weakGroups.length * 1);
  else if (overallLevel === 'intermediate') estimatedDaysToMaster = Math.max(3, weakGroups.length * 2);
  else if (overallLevel === 'elementary') estimatedDaysToMaster = Math.max(7, weakGroups.length * 3);
  else estimatedDaysToMaster = Math.max(14, weakGroups.length * 5);

  return {
    vocabularyAccuracy, grammarAccuracy, sentenceAccuracy, listeningAccuracy,
    lessonGroupAccuracies, weakGroups, weakTypes,
    overallLevel, estimatedDaysToMaster,
  };
}
