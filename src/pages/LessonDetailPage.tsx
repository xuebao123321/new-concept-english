import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LESSONS } from '../data/lessons';
import { getStageByGroup } from '../data/stages';
import { preloadGroups, getCachedQuestions } from '../hooks/useQuestions';
import { useLessonProgressStore } from '../stores/useLessonProgressStore';
import type { BlockType } from '../types';
import { springs, staggerDelay } from '../utils/motion-tokens';

const BLOCKS: { id: BlockType; icon: string; name: string; desc: string; color: string; bg: string }[] = [
  { id: 'vocabulary', icon: '📡', name: '单词森林', desc: '认识新单词，打下基础', color: '#5B9ED4', bg: '#E8F2FC' },
  { id: 'grammar', icon: '🔧', name: '语法工坊', desc: '学习语法规则和句型', color: '#7E57C2', bg: '#EDE7F6' },
  { id: 'sentence', icon: '🗣️', name: '句子城堡', desc: '练习中英互译，提升表达', color: '#5B9A5A', bg: '#E8F5E8' },
  { id: 'listening', icon: '🎤', name: '听说花园', desc: '听音频选答案 + 口语朗读', color: '#FF8C42', bg: '#FFF2E8' },
];

export default function LessonDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { isBlockUnlocked, areAllBlocksDone, progressMap } = useLessonProgressStore();

  useEffect(() => { if (groupId) preloadGroups([groupId]); }, [groupId]);
  if (!groupId) return null;

  const lessons = LESSONS.filter(l => l.group === groupId);
  const stage = getStageByGroup(groupId);
  const main = lessons[0];
  const progress = progressMap.get(groupId);
  const bp = progress?.blockProgress;

  const allDone = areAllBlocksDone(groupId);

  return (
    <div className="px-4 py-5 space-y-5">
      {/* 返回 */}
      <button onClick={() => navigate(-1)} className="text-sm font-bold text-ink-muted hover:text-ink-light transition-colors">
        ← 返回
      </button>

      {/* 课头信息 */}
      <motion.div
        className="glass-panel p-5 border-forest/20"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springs.enter}
      >
        <div className="flex items-center gap-2 text-xs font-bold text-ink-muted mb-2">
          <span>{stage?.icon} {stage?.name}</span>
          <span>·</span>
          <span>第 {lessons.map(l => l.lessonNumber).join('-')} 课</span>
        </div>
        <h2 className="text-xl font-extrabold text-ink">{main?.titleCn}</h2>
        <p className="text-sm text-ink-light font-bold mt-0.5">{main?.title}</p>

        {/* 词汇 chip 列表 */}
        {main?.vocabulary && main.vocabulary.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {main.vocabulary.slice(0, 12).map(w => (
              <span key={w} className="text-[10px] px-2 py-0.5 rounded-full bg-forest/10 text-forest font-medium">
                {w}
              </span>
            ))}
            {main.vocabulary.length > 12 && (
              <span className="text-[10px] text-ink-muted">+{main.vocabulary.length - 12} 词</span>
            )}
          </div>
        )}

        {/* 语法点 */}
        {main?.grammarTopics && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {main.grammarTopics.map(t => (
              <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-plum/10 text-plum font-medium">
                {t}
              </span>
            ))}
          </div>
        )}
      </motion.div>

      {/* 4 个学习块 */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-ink-light">🧩 学习关卡</h3>
        {BLOCKS.map((b, i) => {
          const unlocked = isBlockUnlocked(groupId, b.id);
          const done = bp?.[b.id] === true;
          const cached = getCachedQuestions(groupId);
          const questionCount = cached.filter(q => (q as any).block === b.id).length || cached.filter(q => {
            if (b.id === 'vocabulary') return q.type === 'choice';
            if (b.id === 'grammar') return q.type === 'fill' || q.type === 'reorder';
            if (b.id === 'sentence') return q.type === 'translate';
            if (b.id === 'listening') return q.type === 'listening' || q.type === 'speak';
            return true;
          }).length;

          return (
            <button
              key={b.id}
              onClick={() => unlocked && navigate(`/lesson/${groupId}/block/${b.id}`)}
              disabled={!unlocked}
              className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-4 ${
                done
                  ? 'glass-panel border-forest/30'
                  : unlocked
                  ? 'glass-panel hover:border-forest/40'
                  : 'bg-white border-warm-border opacity-50 cursor-not-allowed'
              }`}
            >
              {/* 图标 */}
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{
                  background: done ? b.bg : unlocked ? `${b.color}10` : 'transparent',
                  border: `2px solid ${done ? b.color : unlocked ? `${b.color}40` : '#E8E0D5'}`,
                }}
              >
                {b.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-ink">{b.name}</span>
                  {done && <span className="text-[10px] text-forest">✅</span>}
                  {!unlocked && <span className="text-[10px] text-ink-muted">🔒</span>}
                  {unlocked && !done && <span className="text-[10px] text-forest">⚡</span>}
                </div>
                <p className="text-xs text-ink-muted mt-0.5">{b.desc}</p>
                {unlocked && (
                  <div className="text-[10px] text-ink-light mt-1">
                    {questionCount > 0 ? `${questionCount} 题` : ''}
                    <span className="ml-1.5 text-forest font-bold">+30 XP</span>
                  </div>
                )}
              </div>

              <span className="text-ink-muted text-lg flex-shrink-0">→</span>
            </button>
          );
        })}
      </div>

      {/* 综合测试按钮 */}
      {allDone ? (
        <div className="text-center space-y-1">
          <motion.button
            onClick={() => navigate(`/lesson/${groupId}/test`)}
            className="w-full py-3.5 btn-gold text-base"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={springs.popIn}
            whileTap={{ scale: 0.97 }}
          >
            🏁 时间跃迁（综合测试）
          </motion.button>
          <p className="text-xs text-forest font-bold">通过可获得 +50 XP</p>
        </div>
      ) : (
        <div className="w-full py-3.5 text-center text-sm font-bold text-ink-muted bg-warm-bg rounded-xl border border-warm-border">
          🔒 请先完成全部 4 个学习块
        </div>
      )}
    </div>
  );
}
