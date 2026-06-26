import { db } from '../db/database';

// 检查并更新连续打卡
export async function checkAndUpdateStreak(): Promise<{
  streakDays: number;
  isNewDay: boolean;
  streakUpdated: boolean;
}> {
  const userState = await db.initUserState();
  const today = new Date().toISOString().slice(0, 10);

  // 同一天不更新
  if (userState.lastPracticeDate === today) {
    return { streakDays: userState.streakDays, isNewDay: false, streakUpdated: false };
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  let newStreak: number;

  if (userState.lastPracticeDate === yesterdayStr) {
    // 连续打卡
    newStreak = userState.streakDays + 1;
  } else if (userState.lastPracticeDate === '') {
    // 首次练习
    newStreak = 1;
  } else {
    // 中断了，重新开始
    newStreak = 1;
  }

  await db.userState.update('me', {
    streakDays: newStreak,
    lastPracticeDate: today,
  });

  return { streakDays: newStreak, isNewDay: true, streakUpdated: true };
}

// 检查并恢复心
export async function checkAndRefillHearts(): Promise<number> {
  const userState = await db.initUserState();

  if (userState.hearts >= 5) return userState.hearts;

  const now = Date.now();
  const refillInterval = 30 * 60 * 1000; // 30分钟

  if (userState.heartsRefillTime === 0 || now < userState.heartsRefillTime) {
    return userState.hearts;
  }

  // 计算应该恢复的心数
  const elapsed = now - userState.heartsRefillTime;
  const heartsToAdd = Math.min(
    Math.floor(elapsed / refillInterval),
    5 - userState.hearts
  );

  if (heartsToAdd <= 0) return userState.hearts;

  const newHearts = userState.hearts + heartsToAdd;
  const nextRefillTime = newHearts < 5 ? now + refillInterval : 0;

  await db.userState.update('me', {
    hearts: newHearts,
    heartsRefillTime: nextRefillTime,
  });

  return newHearts;
}

// 消耗一颗心
export async function loseHeart(): Promise<number> {
  const userState = await db.initUserState();

  if (userState.hearts <= 0) return 0;

  const newHearts = userState.hearts - 1;
  const refillTime = newHearts < 5 ? Date.now() + 30 * 60 * 1000 : 0;

  await db.userState.update('me', {
    hearts: newHearts,
    heartsRefillTime: refillTime,
  });

  return newHearts;
}

// ═══════════════ Phase 1.5：批次 05 新增 API ═══════════════

// 从 localStorage 读取上次活跃日期
export function getLastActiveDate(): string | null {
  try {
    return localStorage.getItem('nce_last_active_date');
  } catch {
    return null;
  }
}

// 判断是否应该重置打卡（上次活跃日期不是昨天）
export function shouldResetStreak(): boolean {
  const lastDate = getLastActiveDate();
  if (!lastDate) return false;
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  return lastDate !== today && lastDate !== yesterday;
}

// 格式化打卡天数显示
export function formatStreakDays(days: number): string {
  if (days === 0) return '记得今天来学习哦~';
  if (days < 3) return `🔥 ${days}天连续打卡`;
  if (days < 7) return `🔥 ${days}天连续打卡`;
  if (days < 30) return `💎 ${days}天连续打卡！太厉害了！`;
  return `👑 ${days}天！你是时间领主！`;
}

// ── 原有 ──

// 奖励额外的心（完成一组练习）
export async function rewardHeart(): Promise<number> {
  const userState = await db.initUserState();

  if (userState.hearts >= 5) return 5;

  const newHearts = userState.hearts + 1;

  await db.userState.update('me', {
    hearts: newHearts,
    heartsRefillTime: newHearts < 5 ? userState.heartsRefillTime : 0,
  });

  return newHearts;
}
