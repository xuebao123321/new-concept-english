/**
 * 动效设计 Token — 全局统一 spring 系数 + 时长
 *
 * 使用规范:
 *   import { motionTokens } from '@/utils/motion-tokens';
 *   <motion.div transition={motionTokens.enter} />
 *   <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={motionTokens.fade} />
 *
 * 设计原则:
 *   · 元素进入用 enter,弹窗用 popIn,列表项用 slideUp
 *   · 反馈用 correct/wrong,升级/完成用 success
 *   · 时长分 fast(0.15s 微反馈) / normal(0.25s 页面切换) / slow(0.4s 仪式感)
 */

/* ═══════════════ Spring 配置 ═══════════════ */
export const springs = {
  /** 元素淡入卡片 */
  enter: { type: 'spring' as const, stiffness: 300, damping: 28 },

  /** 弹窗出现 (更有弹性) */
  popIn: { type: 'spring' as const, stiffness: 400, damping: 18 },

  /** 列表项依次进入 */
  slideUp: { type: 'spring' as const, stiffness: 280, damping: 26 },

  /** 答题答对庆祝 (夸张) */
  correct: { type: 'spring' as const, stiffness: 500, damping: 15 },

  /** 答题答错抖动 */
  wrong: { type: 'spring' as const, stiffness: 600, damping: 12 },

  /** 升级 / 完成 (沉稳) */
  success: { type: 'spring' as const, stiffness: 200, damping: 22 },

  /** hover 缩放 (轻) */
  hover: { type: 'spring' as const, stiffness: 400, damping: 15 },
};

/* ═══════════════ 时长 Token (用于非 spring 的 tween) ═══════════════ */
export const durations = {
  fast: 0.15,    // 微反馈:按钮按下、状态切换
  normal: 0.25,  // 页面切换、卡片淡入
  slow: 0.4,     // 仪式感:弹窗、完成页
  page: 0.3,     // 页面切换
  list: 0.04,    // 列表项 stagger 间隔 (40ms)
  listBig: 0.06, // 大卡片 stagger 间隔 (60ms)
};

/* ═══════════════ Stagger Delay 工具 ═══════════════ */
/** 给定索引返回 delay 秒数 */
export const staggerDelay = (index: number, type: 'list' | 'listBig' = 'list') =>
  index * (type === 'listBig' ? durations.listBig : durations.list);

/* ═══════════════ 组合预设 (页面/弹窗常用) ═════════════== */
export const motionTokens = {
  ...springs,
  ...durations,
  staggerDelay,
};

/* ═══════════════ 预定义 Variant (AnimatePresence 用) ═════════════== */
export const variants = {
  /** 页面切换 fade + slide */
  page: {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
    transition: { duration: durations.page },
  },

  /** 卡片淡入 */
  card: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: springs.enter,
  },

  /** 弹窗缩放 */
  modal: {
    initial: { opacity: 0, scale: 0.6, y: -20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.6, y: -20 },
    transition: springs.popIn,
  },

  /** 答对弹层 */
  correct: {
    initial: { opacity: 0, scale: 0.6, y: -20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.6, y: -20 },
    transition: springs.correct,
  },

  /** 答错弹层 (抖动) */
  wrong: {
    initial: { opacity: 0, scale: 0.6, x: -10 },
    animate: { opacity: 1, scale: 1, x: [-10, 10, -8, 8, -4, 4, 0] },
    exit: { opacity: 0, scale: 0.6 },
    transition: { ...springs.wrong, x: { duration: 0.5 } },
  },
};

/* ═══════════════ reduced-motion 兼容 ═════════════== */
/** 给 prefers-reduced-motion 用户返回低动效版本 */
export const reducedMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.1 },
};