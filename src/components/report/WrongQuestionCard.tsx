import { useState } from 'react';
import { motion } from 'framer-motion';
import type { WrongQuestionItem } from '../../types';

export const TYPE_CN_MAP: Record<string, string> = {
  choice: '选择题', fill: '填空题', translate: '翻译题',
  reorder: '连词成句', listening: '听力题', speak: '口语题',
};

export default function WrongQuestionCard({ item }: { item: WrongQuestionItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-warm-bg rounded-lg p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-ink truncate">
            {item.question_text || '(原题内容未记录)'}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-berry-pale text-berry font-bold">
              ❌ {item.wrong_count}次
            </span>
            <span className="text-[10px] text-ink-muted">
              {TYPE_CN_MAP[item.question_type] || item.question_type}
            </span>
            <span className="text-[10px] text-ink-muted">
              {item.created_at?.slice(0, 10) || ''}
            </span>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-ink-muted hover:text-ink flex-shrink-0"
        >
          {expanded ? '收起 ▲' : '详情 ▼'}
        </button>
      </div>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="mt-2 pt-2 border-t border-warm-border space-y-1.5"
        >
          <div className="text-xs">
            <span className="text-ink-muted">你的答案: </span>
            <span className="text-berry font-bold">{item.user_answer || '(空)'}</span>
          </div>
          <div className="text-xs">
            <span className="text-ink-muted">正确答案: </span>
            <span className="text-forest font-bold">{item.correct_answer}</span>
          </div>
          <div className="text-xs">
            <span className="text-ink-muted">难度: </span>
            <span className="capitalize">{item.difficulty || 'medium'}</span>
          </div>
          <div className="text-xs">
            <span className="text-ink-muted">课组: </span>
            <span>{item.lesson_group}</span>
          </div>
          <div className="text-xs">
            <span className="text-ink-muted">时间: </span>
            <span>{item.created_at || ''}</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
