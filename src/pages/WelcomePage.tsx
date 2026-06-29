import { motion } from 'framer-motion';
import { springs, staggerDelay } from '../utils/motion-tokens';

const HIGHLIGHTS = [
  {
    emoji: '📚',
    title: '72 课新概念英语',
    desc: '系统覆盖第一册全部课文,从零基础到流利表达',
    color: 'bg-forest-pale border-forest/30 text-forest',
  },
  {
    emoji: '🎮',
    title: '闯关学习模式',
    desc: '词汇→语法→句型→听力→综合测试,像游戏一样学英语',
    color: 'bg-honey-pale border-honey/30 text-honey',
  },
  {
    emoji: '🏆',
    title: '积分段位系统',
    desc: 'XP 段位 + 连击激励 + 排行榜,让坚持变成习惯',
    color: 'bg-sky-pale border-sky/30 text-sky',
  },
];

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* ═══ Hero ═══ */}
      <motion.div
        className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-10
          bg-gradient-to-b from-forest-pale via-cream to-cream text-center space-y-5"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springs.enter}
      >
        {/* 角色大图 */}
        <motion.img
          src="/assets/characters/cast-group.webp"
          alt="温暖森林学院"
          className="w-56 h-36 rounded-3xl object-cover border-[3px] border-white shadow-xl"
          style={{ objectPosition: 'center 30%' }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ ...springs.popIn, delay: 0.1 }}
        />

        {/* 标题 */}
        <motion.div
          className="space-y-2"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, ...springs.enter }}
        >
          <h1 className="text-display text-ink">🌳 温暖森林学院</h1>
          <p className="text-h3 text-ink-light">和熊大熊二一起学英语!</p>
        </motion.div>

        {/* 简介 */}
        <motion.p
          className="text-meta text-ink-light max-w-sm leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          基于新概念英语,融入闯关、段位、连击等游戏化设计
          <br />
          让 6-12 岁孩子爱上英语学习 💪
        </motion.p>

        {/* ═══ 3 个亮点卡片 ═══ */}
        <div className="grid grid-cols-1 gap-3 w-full max-w-sm pt-2">
          {HIGHLIGHTS.map((h, i) => (
            <motion.div
              key={h.emoji}
              className={`card p-4 text-left flex items-center gap-4 border-2 ${h.color}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: staggerDelay(i, 'listBig') + 0.3, ...springs.slideUp }}
            >
              <div className="text-3xl flex-shrink-0">{h.emoji}</div>
              <div>
                <div className="text-h3 font-extrabold text-ink">{h.title}</div>
                <div className="text-meta text-ink-light mt-0.5">{h.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ═══ CTA 按钮 ═══ */}
        <motion.div
          className="w-full max-w-xs pt-3"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, ...springs.popIn }}
        >
          <a href="/login" className="btn-brand text-base no-underline block text-center">
            🚀 开始学习
          </a>
          <p className="text-caption text-ink-muted mt-2">
            已有账号? <a href="/login" className="text-forest font-bold">直接登录</a>
          </p>
        </motion.div>
      </motion.div>

      {/* ═══ Footer ═══ */}
      <div className="text-center py-4 space-y-1">
        <p className="text-[9px] text-ink-muted leading-relaxed">
          角色形象素材来源于公开网络 · 版权归原作者 · 本地学习使用
        </p>
        <p className="text-[9px] text-ink-muted">
          温暖森林学院 v1.0 · 家长和学生一起学英语
        </p>
      </div>
    </div>
  );
}