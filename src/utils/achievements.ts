import type { Achievement, AchievementCheckStats } from '../types';

// 成就定义列表
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-practice',
    name: '初次练习',
    description: '完成第一次练习',
    icon: '🎯',
    category: 'milestone',
    check: (s: AchievementCheckStats) => s.totalQuestions > 0,
  },
  {
    id: 'streak-7',
    name: '连续7天',
    description: '连续打卡7天',
    icon: '🔥',
    category: 'milestone',
    check: (s: AchievementCheckStats) => s.streakDays >= 7,
  },
  {
    id: 'streak-30',
    name: '连续30天',
    description: '连续打卡30天',
    icon: '💪',
    category: 'milestone',
    check: (s: AchievementCheckStats) => s.streakDays >= 30,
  },
  {
    id: 'lightning-answer',
    name: '闪电答题',
    description: '5秒内答对一题',
    icon: '⚡',
    category: 'special',
    check: (s: AchievementCheckStats) => {
      // 由组件在答题瞬间检测，此处返回false作为默认
      return false;
    },
  },
  {
    id: 'perfect-lesson',
    name: '完美一课',
    description: '一组练习全部答对',
    icon: '🎖️',
    category: 'skill',
    check: (s: AchievementCheckStats) => s.perfectLessons.length > 0,
  },
  {
    id: 'vocab-hunter',
    name: '词汇猎人',
    description: '累计答对100道词汇题',
    icon: '📚',
    category: 'skill',
    check: (s: AchievementCheckStats) => s.choiceCorrect >= 100,
  },
  {
    id: 'grammar-master',
    name: '语法专家',
    description: '累计答对100道语法题',
    icon: '🧠',
    category: 'skill',
    check: (s: AchievementCheckStats) =>
      s.fillCorrect + s.reorderCorrect >= 100,
  },
  {
    id: 'combo-10',
    name: '十连击',
    description: '连续答对10题',
    icon: '🔟',
    category: 'skill',
    check: (s: AchievementCheckStats) => s.bestCombo >= 10,
  },
  {
    id: 'stage-graduate',
    name: '阶段毕业',
    description: '完成1-24课所有练习',
    icon: '🏅',
    category: 'milestone',
    check: (s: AchievementCheckStats) => s.totalQuestions >= 200,
  },
  {
    id: 'grinder',
    name: '刷题王',
    description: '累计答题500道',
    icon: '📖',
    category: 'milestone',
    check: (s: AchievementCheckStats) => s.totalQuestions >= 500,
  },
  {
    id: 'night-owl',
    name: '夜猫子',
    description: '晚上9点后完成练习',
    icon: '🦉',
    category: 'special',
    check: (s: AchievementCheckStats) => {
      const hour = new Date(s.lastAnswerTime).getHours();
      return hour >= 21 || hour < 5;
    },
  },
  {
    id: 'perfect-day',
    name: '满分日',
    description: '单日正确率100%',
    icon: '🌟',
    category: 'special',
    check: (s: AchievementCheckStats) =>
      s.dailyTotal >= 10 && s.dailyCorrect === s.dailyTotal,
  },
];

// 检查是否有新成就解锁
export function checkAchievements(
  stats: AchievementCheckStats,
  alreadyUnlocked: string[]
): Achievement[] {
  return ACHIEVEMENTS.filter(
    a => !alreadyUnlocked.includes(a.id) && a.check(stats)
  );
}

// 按分类获取成就
export function getAchievementsByCategory(
  category: Achievement['category']
): Achievement[] {
  return ACHIEVEMENTS.filter(a => a.category === category);
}

// Phase 1.5：ALL_ACHIEVEMENTS 别名（兼容批次 05 命名）
export const ALL_ACHIEVEMENTS = ACHIEVEMENTS;

// 获取成就定义
export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find(a => a.id === id);
}
