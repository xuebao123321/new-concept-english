import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { springs } from '../../utils/motion-tokens';

type Role = 'guangtouqiang' | 'xiongda' | 'xionger';

interface DialogConfig {
  id: string;
  role: Role;
  text: string;
}

const ROLE_INFO: Record<Role, { name: string; emoji: string; color: string }> = {
  guangtouqiang: { name: '光头强', emoji: '🔬', color: 'border-sky-200 bg-sky-50' },
  xiongda: { name: '熊大', emoji: '🐻', color: 'border-honey/40 bg-honey-pale' },
  xionger: { name: '熊二', emoji: '🐻', color: 'border-forest/30 bg-forest-pale' },
};

// 预设对话库
export const DIALOGS = {
  // 首页
  welcome_morning: { id: 'w1', role: 'xionger' as Role, text: '领航员你来啦！今天我们要修哪颗星？🌅' },
  welcome_afternoon: { id: 'w2', role: 'xionger' as Role, text: '嘿，领航员！下午好！能量充满了吗？⚡' },
  welcome_evening: { id: 'w3', role: 'xionger' as Role, text: '晚上好！今天也别忘了充能哦～🌟' },
  streak_7: { id: 's1', role: 'xiongda' as Role, text: '七天连续充能！你比森林里最能坚持的啄木鸟还厉害！🔥' },
  streak_30: { id: 's2', role: 'xiongda' as Role, text: '三十天了！光头强说你的毅力比他的发明还靠谱！🏆' },
  perfect_lesson: { id: 'p1', role: 'guangtouqiang' as Role, text: '全部正确！这台时间机器的运转比我想象的还要完美！⚡' },
  retry_encourage: { id: 'r1', role: 'xiongda' as Role, text: '别急！我第一次穿越时空也撞了一头包。再来！💪' },
  idle_tip: { id: 'i1', role: 'guangtouqiang' as Role, text: '领航员，每天坚持练习就像给时间机器充电，别让它停下来！🔋' },
};

export function getGreetingDialog(): DialogConfig {
  const hour = new Date().getHours();
  if (hour < 12) return DIALOGS.welcome_morning;
  if (hour < 18) return DIALOGS.welcome_afternoon;
  return DIALOGS.welcome_evening;
}

export function getRandomTip(): DialogConfig {
  const tips = [DIALOGS.idle_tip];
  return tips[Math.floor(Math.random() * tips.length)];
}

interface RoleDialogProps {
  dialog: DialogConfig;
  className?: string;
}

export default function RoleDialog({ dialog, className = '' }: RoleDialogProps) {
  const info = ROLE_INFO[dialog.role];

  return (
    <motion.div
      className={`rounded-2xl p-4 border-2 ${info.color} ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springs.enter}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl flex-shrink-0">{info.emoji}</div>
        <div>
          <div className="text-xs text-ink-light font-bold mb-0.5">{info.name}</div>
          <p className="text-sm text-ink leading-relaxed font-medium">{dialog.text}</p>
        </div>
      </div>
    </motion.div>
  );
}
