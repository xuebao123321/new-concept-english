import type { Rank } from '../types';

// 段位定义（20级）
export const RANKS: Rank[] = [
  { level: 1, name: '初级学者', minXp: 0, color: '#94A3B8', icon: '🌱' },
  { level: 2, name: '初级学者 II', minXp: 50, color: '#94A3B8', icon: '🌱' },
  { level: 3, name: '初级学者 III', minXp: 120, color: '#A8A29E', icon: '🌿' },
  { level: 4, name: '上进学员', minXp: 200, color: '#A8A29E', icon: '🌿' },
  { level: 5, name: '上进学员 II', minXp: 300, color: '#737373', icon: '⚡' },
  { level: 6, name: '上进学员 III', minXp: 500, color: '#737373', icon: '⚡' },
  { level: 7, name: '勤奋学员', minXp: 750, color: '#FBBF24', icon: '🔆' },
  { level: 8, name: '勤奋学员 II', minXp: 1000, color: '#FBBF24', icon: '🔆' },
  { level: 9, name: '勤奋学员 III', minXp: 1300, color: '#F59E0B', icon: '⭐' },
  { level: 10, name: '学习能手', minXp: 1600, color: '#F59E0B', icon: '⭐' },
  { level: 11, name: '学习能手 II', minXp: 2000, color: '#4FD1C5', icon: '✨' },
  { level: 12, name: '英语达人', minXp: 2500, color: '#4FD1C5', icon: '✨' },
  { level: 13, name: '英语达人 II', minXp: 3000, color: '#3B82F6', icon: '💫' },
  { level: 14, name: '英语达人 III', minXp: 3500, color: '#3B82F6', icon: '💫' },
  { level: 15, name: '学霸精英', minXp: 4000, color: '#3B82F6', icon: '🌟' },
  { level: 16, name: '学霸精英 II', minXp: 5000, color: '#9F7AEA', icon: '🌟' },
  { level: 17, name: '学霸精英 III', minXp: 6000, color: '#9F7AEA', icon: '💎' },
  { level: 18, name: '新概念大师', minXp: 7500, color: '#FF8C42', icon: '👑' },
  { level: 19, name: '新概念大师 II', minXp: 9000, color: '#FF8C42', icon: '👑' },
  { level: 20, name: '英语传奇', minXp: 11000, color: '#E57373', icon: '🏆' },
];

// 每题基础XP
export const BASE_XP: Record<string, number> = {
  choice: 10,
  fill: 15,
  translate: 20,
  reorder: 15,
  listening: 10,
};

// 难度系数
export const DIFFICULTY_MULTIPLIER: Record<string, number> = {
  easy: 1.0,
  medium: 1.5,
  hard: 2.0,
};

// 连击bonus
export function getComboBonus(combo: number): number {
  if (combo >= 10) return 6;
  if (combo >= 5) return 4;
  if (combo >= 3) return 2;
  return 0;
}

// 计算单题获得XP
export function calcQuestionXp(
  questionType: string,
  difficulty: string,
  correct: boolean,
  combo: number
): number {
  if (!correct) return 0;

  const base = BASE_XP[questionType] || 10;
  const multiplier = DIFFICULTY_MULTIPLIER[difficulty] || 1.0;
  const bonus = getComboBonus(combo);

  return Math.round(base * multiplier) + bonus;
}

// ═══════════════ Phase 1.5：批次 05 新增 API ═══════════════

// 首次答对一题：+10 XP / 补考答对：+5 XP
export function calculateQuestionXp(isFirstAttempt: boolean, isCorrect: boolean): number {
  if (!isCorrect) return 0;
  return isFirstAttempt ? 10 : 5;
}

// 完成一个学习块：+30 XP
export function calculateBlockCompleteXp(): number { return 30; }

// 综合测试 100% 通过：+50 XP
export function calculateTestCompleteXp(): number { return 50; }

// 连续打卡 7 天额外奖励：+20 XP
export function calculateStreakBonus(streakDays: number): number {
  return streakDays >= 7 ? 20 : 0;
}

// 解锁新成就：+15 XP
export function calculateAchievementXp(): number { return 15; }

// ── 原有 ──

// 根据XP计算等级
export function getLevelByXp(totalXp: number): Rank {
  let currentRank = RANKS[0];
  for (const rank of RANKS) {
    if (totalXp >= rank.minXp) {
      currentRank = rank;
    } else {
      break;
    }
  }
  return currentRank;
}

// 计算到下一级的XP
export function getXpToNextLevel(totalXp: number): { current: number; needed: number; progress: number } {
  const currentRank = getLevelByXp(totalXp);
  const nextRank = RANKS.find(r => r.level === currentRank.level + 1);

  if (!nextRank) {
    return { current: totalXp, needed: currentRank.minXp, progress: 1 };
  }

  const xpInLevel = totalXp - currentRank.minXp;
  const xpNeededForNext = nextRank.minXp - currentRank.minXp;

  return {
    current: xpInLevel,
    needed: xpNeededForNext,
    progress: Math.min(xpInLevel / xpNeededForNext, 1),
  };
}
