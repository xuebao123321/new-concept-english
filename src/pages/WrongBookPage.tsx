import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { api } from '../db/api';
import { db } from '../db/database';
import { useUserStore } from '../stores/useUserStore';
import { LESSONS } from '../data/lessons';
import { findQuestion } from '../utils/find-question';
import ReviewQuestionCard from '../components/questions/ReviewQuestionCard';
import type { WrongQuestionItem, WrongQuestionSummary, Question } from '../types';

type GroupMode = 'lesson' | 'type';

const TYPE_LABELS: Record<string, string> = {
  choice: '选择题', fill: '填空题', translate: '翻译题',
  reorder: '连词成句', listening: '听力题', speak: '口语题',
};

export default function WrongBookPage() {
  const [questions, setQuestions] = useState<WrongQuestionItem[]>([]);
  const [summary, setSummary] = useState<WrongQuestionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [groupMode, setGroupMode] = useState<GroupMode>('lesson');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // 订正状态
  const [correctingId, setCorrectingId] = useState<string | null>(null);
  const [correctionQ, setCorrectionQ] = useState<Question | null>(null);
  const [correctionFallback, setCorrectionFallback] = useState<{
    question_text: string; correct_answer: string; question_type: string;
  } | null>(null);
  const [correctedIds, setCorrectedIds] = useState<Record<string, boolean>>(() => {
    // 从 localStorage 恢复已订正的题
    try {
      const saved = localStorage.getItem('nce_wrongbook_corrected');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [toast, setToast] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. 从服务器 API 获取
      const data = await api.myWrongQuestions();
      let items = data.wrong_questions || [];
      let sum = data.summary || null;

      // 2. 如果服务器为空，降级到本地 Dexie
      if (items.length === 0) {
        const localWrongs = await db.wrongQuestions.filter(w => !w.mastered).toArray();
        if (localWrongs.length > 0) {
          items = localWrongs.map(w => ({
            question_id: w.questionId,
            lesson_group: w.lessonGroup || '',
            question_type: w.questionType || 'choice',
            user_answer: w.userAnswer || '',
            question_text: w.questionText || '',
            correct_answer: w.correctAnswer || '',
            difficulty: 'medium' as string,
            wrong_count: w.wrongCount || 1,
            created_at: new Date(w.lastWrongTime).toISOString(),
            has_corrected: false,
          }));
          sum = { total_wrong: items.length, corrected: 0, by_type: {}, by_lesson: {}, most_missed_type: '', most_missed_lesson: '' };
        }
      }

      const saved: Record<string, boolean> = correctedIds;
      const filtered = items.filter((q: WrongQuestionItem) => !saved[q.question_id]);
      setQuestions(filtered);
      setSummary(sum);
    } catch { /* 静默 */ }
    finally { setLoading(false); }
  };

  // 按课组分组
  const byLesson: Record<string, WrongQuestionItem[]> = {};
  for (const q of questions) {
    const lg = q.lesson_group || 'unknown';
    if (!byLesson[lg]) byLesson[lg] = [];
    byLesson[lg].push(q);
  }

  // 按题型分组
  const byType: Record<string, WrongQuestionItem[]> = {};
  for (const q of questions) {
    const qt = q.question_type || 'choice';
    if (!byType[qt]) byType[qt] = [];
    byType[qt].push(q);
  }

  const groups = groupMode === 'lesson'
    ? Object.entries(byLesson).sort(([a], [b]) => a.localeCompare(b))
    : Object.entries(byType).sort(([a], [b]) => (byType[b]?.length || 0) - (byType[a]?.length || 0));

  const toggleExpand = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getGroupTitle = (key: string): string => {
    if (groupMode === 'lesson') {
      const ls = LESSONS.filter(l => l.group === key);
      return ls[0] ? `L${ls.map(l => l.lessonNumber).join('-')} ${ls[0].titleCn}` : key;
    }
    return TYPE_LABELS[key] || key;
  };

  // 开始订正
  const startCorrect = async (item: WrongQuestionItem) => {
    if (correctingId === item.question_id) {
      setCorrectingId(null);
      return;
    }
    setCorrectingId(item.question_id);
    const result = await findQuestion(item.question_id);
    if (result?.found) {
      setCorrectionQ(result.question || null);
      setCorrectionFallback(result.fallback || null);
    } else {
      setCorrectionQ(null);
      setCorrectionFallback({
        question_text: item.question_text,
        correct_answer: item.correct_answer,
        question_type: item.question_type,
      });
    }
  };

  // 订正结果
  const handleCorrection = useCallback((questionId: string, correct: boolean) => {
    if (correct) {
      // XP 奖励
      useUserStore.getState().addXp(5);
      // 标记为已掌握（Dexie + localStorage）
      db.wrongQuestions.update(questionId, { mastered: true }).catch(() => {});
      setCorrectedIds(prev => {
        const next = { ...prev, [questionId]: true };
        localStorage.setItem('nce_wrongbook_corrected', JSON.stringify(next));
        return next;
      });
      setToast('✅ 订正成功! +5 XP');
    } else {
      setToast('💪 再试一次吧');
    }
    setCorrectingId(null);
    setCorrectionQ(null);
    setCorrectionFallback(null);
    setTimeout(() => setToast(''), 1800);
  }, []);

  const totalCount = questions.length;
  const correctedCount = Object.keys(correctedIds).length;
  const isCorrected = (qid: string) => !!correctedIds[qid];
  const activeQuestions = questions.filter(q => !correctedIds[q.question_id]);

  if (loading) {
    return (
      <div className="px-4 py-4">
        <div className="space-y-3 animate-pulse">
          <div className="h-4 bg-warm-bg rounded w-32" />
          {[1,2,3].map(i => <div key={i} className="h-16 bg-warm-bg rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl
                        text-sm font-bold shadow-lg bg-forest-pale text-forest">
          {toast}
        </div>
      )}

      {/* 头部 */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-h2 text-ink">📕 错题订正本</h2>
          <a href="/review"
            className="text-xs font-bold text-forest hover:underline">
            间隔复习 →
          </a>
        </div>
        {summary && (
          <div className="flex gap-2 text-xs flex-wrap mb-3">
            <span className="px-2 py-1 rounded-full bg-berry-pale text-berry font-bold">
              {totalCount} 道错题
            </span>
            {correctedCount > 0 && (
              <span className="px-2 py-1 rounded-full bg-forest-pale text-forest font-bold">
                ✅ 已订正 {correctedCount} 道
              </span>
            )}
            {summary.most_missed_type && (
              <span className="px-2 py-1 rounded-full bg-honey-pale text-honey font-bold">
                弱项: {TYPE_LABELS[summary.most_missed_type] || summary.most_missed_type}
              </span>
            )}
          </div>
        )}
        {/* 订正进度条 */}
        {totalCount > 0 && (
          <div>
            <div className="flex justify-between text-[10px] font-bold mb-1">
              <span className="text-ink-muted">订正进度</span>
              <span className="text-forest">{correctedCount}/{totalCount} ({Math.round(correctedCount / totalCount * 100)}%)</span>
            </div>
            <div className="h-2 bg-warm-bg rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-forest"
                initial={{ width: 0 }}
                animate={{ width: `${Math.round(correctedCount / totalCount * 100)}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 分组切换 */}
      <div className="flex gap-1.5">
        {(['lesson', 'type'] as GroupMode[]).map(mode => (
          <button
            key={mode}
            onClick={() => setGroupMode(mode)}
            className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all ${
              groupMode === mode ? 'bg-forest text-cream' : 'bg-warm-bg text-ink-light'
            }`}
          >
            {mode === 'lesson' ? '📚 按课组' : '🏷️ 按题型'}
          </button>
        ))}
        {correctedCount > 0 && (
          <button
            onClick={() => {
              setCorrectedIds({}); localStorage.removeItem('nce_wrongbook_corrected');
              setToast('🔄 已重置，所有错题重新显示');
              setTimeout(() => setToast(''), 1500);
            }}
            className="px-3 py-1.5 text-[10px] font-bold rounded-full bg-warm-bg text-ink-muted ml-auto"
          >
            显示全部
          </button>
        )}
      </div>

      {/* 分组列表 */}
      {totalCount === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-5xl mb-3">🎉</div>
          <p className="text-lg font-bold text-ink">暂无错题!</p>
          <p className="text-sm text-ink-light mt-1">继续保持，你是最棒的!</p>
        </div>
      ) : activeQuestions.length === 0 && correctedCount > 0 ? (
        <div className="card p-10 text-center">
          <div className="text-5xl mb-3">🏆</div>
          <p className="text-lg font-bold text-ink">全部订正完成!</p>
          <p className="text-sm text-ink-light mt-1">太厉害了，{correctedCount} 道错题全部消灭!</p>
          <button onClick={() => setCorrectedIds({})}
            className="mt-3 text-xs font-bold text-forest hover:underline">
            🔄 重新查看
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map(([key, items]) => {
            const activeItems = items.filter(q => !!!correctedIds[q.question_id]);
            if (activeItems.length === 0) return null;

            return (
              <div key={key} className="card bg-white overflow-hidden">
                <button
                  onClick={() => toggleExpand(key)}
                  className="w-full p-3 flex items-center justify-between text-left hover:bg-warm-bg/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-ink truncate">
                      {getGroupTitle(key)}
                    </div>
                    <div className="text-xs text-ink-muted mt-0.5">
                      {activeItems.length} 道错题
                      {items.length > activeItems.length && (
                        <span className="text-forest ml-1">· {items.length - activeItems.length} 已订正</span>
                      )}
                    </div>
                  </div>
                  <motion.span
                    className="text-ink-muted text-xs ml-2"
                    animate={{ rotate: expanded[key] ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    ▼
                  </motion.span>
                </button>

                {expanded[key] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="px-3 pb-3 space-y-2"
                  >
                    {items.map((item, i) => {
                      const isCorrected = !!correctedIds[item.question_id];
                      const isCorrecting = correctingId === item.question_id;

                      return (
                        <div key={i}>
                          <div className={`bg-warm-bg rounded-lg p-2.5 ${isCorrected ? 'opacity-50' : ''}`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-ink truncate">
                                  {item.question_text || '(原题未记录)'}
                                </p>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-berry-pale text-berry font-bold">
                                    ❌ {item.wrong_count}次
                                  </span>
                                  <span className="text-[10px] text-ink-muted">
                                    {TYPE_LABELS[item.question_type] || item.question_type}
                                  </span>
                                </div>
                                {/* 答案对比 */}
                                <div className="mt-1.5 text-[10px] space-y-0.5">
                                  <div><span className="text-ink-muted">你的答案: </span>
                                    <span className="text-berry font-bold">{item.user_answer || '(空)'}</span>
                                  </div>
                                  <div><span className="text-ink-muted">正确答案: </span>
                                    <span className="text-forest font-bold">{item.correct_answer}</span>
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => isCorrected ? null : startCorrect(item)}
                                disabled={isCorrected}
                                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${
                                  isCorrected
                                    ? 'bg-forest-pale text-forest'
                                    : isCorrecting
                                    ? 'bg-honey-pale text-honey'
                                    : 'bg-forest text-cream hover:bg-forest/90 active:scale-95'
                                }`}
                              >
                                {isCorrected ? '✅ 已订正' : isCorrecting ? '收起 ▲' : '✏️ 订正此题'}
                              </button>
                            </div>
                          </div>

                          {/* 内联答题区 */}
                          {isCorrecting && (
                            <div className="mt-2 pl-2 border-l-2 border-forest/30">
                              <ReviewQuestionCard
                                question={correctionQ}
                                fallback={correctionFallback || undefined}
                                onAnswer={(correct) => handleCorrection(item.question_id, correct)}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
