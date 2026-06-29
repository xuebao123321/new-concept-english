import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../db/api';
import { springs } from '../../utils/motion-tokens';
import { LESSONS } from '../../data/lessons';
import { STAGES } from '../../data/stages';
import WrongQuestionPanel from '../questions/WrongQuestionPanel';
import type { WrongQuestionItem, WrongQuestionSummary } from '../../types';

// ── 类型 ──
interface LessonItem {
  lesson_group: string; completed: boolean; best_accuracy: number; attempts: number;
  status?: string; unlocked_by?: string;
}

interface DayActivity { date: string; total: number; correct: number; }

interface ReportData {
  student: { id: number; nickname: string; username: string };
  completed_lessons: number; total_lessons: number;
  type_stats: Record<string, { total: number; correct: number; accuracy: number }>;
  lesson_list?: LessonItem[];
  recent_activity?: DayActivity[];
}

// ── 常量 ──
const ALL_GROUPS = STAGES.flatMap(s => s.groups);
const TOTAL_GROUPS = ALL_GROUPS.length;
const TYPE_LABELS: Record<string, string> = {
  choice: '选择', fill: '填空', translate: '翻译', reorder: '连词', listening: '听力',
};

function calcStageProgress(stageGroups: string[], lessonList: LessonItem[]) {
  const completed = stageGroups.filter(g =>
    lessonList.find(l => l.lesson_group === g)?.completed
  ).length;
  return { completed, total: stageGroups.length };
}

// ── Props ──
interface Props {
  userId: number;
  role: 'student' | 'parent';
  showControls?: boolean;
  refreshKey?: number;
}

export default function LearningReport({ userId, role, showControls = false, refreshKey = 0 }: Props) {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lessonLoading, setLessonLoading] = useState<string | null>(null);

  // ── 错题数据 ──
  const [wrongQuestions, setWrongQuestions] = useState<WrongQuestionItem[]>([]);
  const [wrongSummary, setWrongSummary] = useState<WrongQuestionSummary>({
    total_wrong: 0, by_type: {}, by_lesson: {},
    most_missed_type: '', most_missed_lesson: '',
  });
  const [wrongLoading, setWrongLoading] = useState(false);

  useEffect(() => { loadReport(); }, [userId, role, refreshKey]);

  const loadReport = async () => {
    setLoading(true);
    setError('');
    try {
      const r: ReportData = role === 'student'
        ? await api.myReport()
        : await api.childReport(userId);
      setReport(r);
      // 同时加载错题
      loadWrongQuestions(r);
    } catch (e: any) {
      setError(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const loadWrongQuestions = async (_report?: ReportData) => {
    setWrongLoading(true);
    try {
      const res = role === 'student'
        ? await api.myWrongQuestions()
        : await api.wrongQuestions(userId);
      setWrongQuestions(res.wrong_questions || []);
      setWrongSummary(res.summary || {
        total_wrong: 0, by_type: {}, by_lesson: {},
        most_missed_type: '', most_missed_lesson: '',
      });
    } catch {
      // 错题加载失败不影响报告展示
    } finally {
      setWrongLoading(false);
    }
  };

  const handleUnlockLesson = async (lessonGroup: string) => {
    if (role !== 'parent') return;
    setLessonLoading(lessonGroup);
    try {
      await api.unlockLesson(userId, lessonGroup);
      await loadReport();
    } finally {
      setLessonLoading(null);
    }
  };

  const handleResetLesson = async (lessonGroup: string) => {
    if (role !== 'parent') return;
    setLessonLoading(lessonGroup);
    try {
      await api.resetLesson(userId, lessonGroup);
      await loadReport();
    } finally {
      setLessonLoading(null);
    }
  };

  // ── 加载态 ──
  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-3 bg-warm-bg rounded w-24" />
        <div className="h-2.5 bg-warm-bg rounded-full" />
        <div className="grid grid-cols-2 gap-2">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-14 bg-warm-bg rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // ── 错误态 ──
  if (error || !report) {
    return (
      <div className="text-center py-6">
        <p className="text-ink-light text-sm">{error || '暂无数据'}</p>
        <button onClick={loadReport}
          className="mt-2 text-xs font-bold text-forest hover:underline">
          🔄 重新加载
        </button>
      </div>
    );
  }

  // ── 阶段统计 ──
  const stageStats = STAGES.map(stage => {
    const st = calcStageProgress(stage.groups, report.lesson_list || []);
    return { ...stage, ...st };
  });
  const totalCompleted = stageStats.reduce((s, st) => s + st.completed, 0);

  return (
    <div className="space-y-4">
      {/* ── 总完成率进度条 ── */}
      <div>
        <div className="flex justify-between text-xs font-bold mb-1">
          <span className="text-ink-light">📊 总进度</span>
          <span className="text-forest tabular-nums">
            {Math.round(totalCompleted / TOTAL_GROUPS * 100)}%
          </span>
        </div>
        <div className="h-2.5 bg-warm-bg rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-forest"
            initial={{ width: 0 }}
            animate={{ width: `${Math.round(totalCompleted / TOTAL_GROUPS * 100)}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* ── 6 阶段完成率 ── */}
      <div>
        <div className="text-caption text-ink-light font-bold mb-2">📚 分阶段完成率</div>
        <div className="grid grid-cols-2 gap-2">
          {stageStats.map(st => {
            const pct = Math.round(st.completed / st.total * 100);
            return (
              <div key={st.id} className="bg-warm-bg rounded-xl p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm">{st.icon}</span>
                  <span className="text-xs font-extrabold text-ink truncate">{st.name}</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold mb-0.5">
                  <span className="text-ink-muted">L{st.lessonStart}-{st.lessonEnd}</span>
                  <span style={{ color: pct >= 80 ? '#5B9A5A' : pct >= 40 ? '#FBBF24' : '#E57373' }}>
                    {st.completed}/{st.total} ({pct}%)
                  </span>
                </div>
                <div className="h-1.5 bg-cream rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-forest/60"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 各题型正确率 + 本周趋势 ── */}
      <div>
        <div className="text-caption text-ink-light font-bold mb-1.5">🎯 各题型正确率</div>
        <div className="grid grid-cols-5 gap-1 mb-2">
          {Object.entries(report.type_stats || {}).map(([qt, s]) => (
            <div key={qt} className="text-center bg-warm-bg rounded-lg py-1.5">
              <div className="text-xs font-extrabold" style={{
                color: s.accuracy >= 80 ? '#5B9A5A' : s.accuracy >= 50 ? '#FBBF24' : '#E57373'
              }}>{s.accuracy}%</div>
              <div className="text-[10px] text-ink-muted">{TYPE_LABELS[qt] || qt}</div>
            </div>
          ))}
        </div>
        {/* 本周趋势 */}
        {report.recent_activity && report.recent_activity.length > 0 && (() => {
          const tw = report.recent_activity;
          const total = tw.reduce((s, d) => s + d.total, 0);
          const correct = tw.reduce((s, d) => s + d.correct, 0);
          const acc = total > 0 ? Math.round(correct / total * 100) : 0;
          return (
            <div className="flex items-center justify-center gap-4 text-xs bg-warm-bg rounded-xl py-1.5">
              <span>本周 <b className="text-ink">{total}</b> 题</span>
              <span>正确率 <b className={acc >= 70 ? 'text-forest' : acc >= 50 ? 'text-honey' : 'text-berry'}>{acc}%</b></span>
            </div>
          );
        })()}
      </div>

      {/* ── 📅 7天活跃度 ── */}
      {report.recent_activity && report.recent_activity.length > 0 && (
        <div>
          <div className="text-caption text-ink-light font-bold mb-1">📅 7 天活跃度</div>
          <div className="flex items-end gap-1 h-14">
            {report.recent_activity.map(day => {
              const maxT = Math.max(...report.recent_activity!.map(d => d.total), 1);
              const h = day.total > 0 ? Math.max((day.total / maxT) * 100, 8) : 3;
              const isToday = day.date === new Date().toISOString().slice(0, 10);
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-0.5">
                  <span className="text-[10px] font-bold text-ink-light tabular-nums">{day.total || ''}</span>
                  <motion.div
                    className={`w-full rounded-t-sm ${isToday ? 'bg-forest' : day.total > 0 ? 'bg-forest/40' : 'bg-warm-bg'}`}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ duration: 0.4 }}
                  />
                  <span className={`text-[10px] ${isToday ? 'font-bold text-forest' : 'text-ink-muted'}`}>
                    {['日','一','二','三','四','五','六'][new Date(day.date + 'T00:00:00').getDay()]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 📋 课组清单 ── */}
      <div>
        <div className="text-caption text-ink-light font-bold mb-1">📋 课组详情</div>
        <div className="max-h-96 overflow-y-auto rounded-xl border border-warm-border">
          {report.lesson_list?.map(lesson => {
            const ld = LESSONS.filter(l => l.group === lesson.lesson_group);
            const title = ld[0]?.titleCn || lesson.lesson_group;
            const engTitle = ld[0]?.title || '';
            const nums = ld.map(l => l.lessonNumber).join('-');
            const stage = STAGES.find(s => s.groups.includes(lesson.lesson_group));
            const hasVocab = (ld[0] as any)?.vocabulary?.length > 0;
            const hasGrammar = (ld[0] as any)?.grammarTopics?.length > 0;

            return (
              <div key={lesson.lesson_group}
                className="px-3 py-2.5 border-b border-warm-border last:border-b-0 bg-white hover:bg-warm-bg/50">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-warm-bg text-ink-muted font-bold whitespace-nowrap">
                        {stage?.icon} L{nums}
                      </span>
                      <span className="text-sm font-bold text-ink truncate">{title}</span>
                    </div>
                    {engTitle && <div className="text-xs text-ink-muted truncate mt-0.5">{engTitle}</div>}
                    {/* 词汇 + 语法预览 */}
                    {(hasVocab || hasGrammar) && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(ld[0] as any)?.vocabulary?.slice(0, 3).map((w: string) => (
                          <span key={w} className="text-[10px] px-1.5 py-0.5 rounded-full bg-forest/10 text-forest font-medium">{w}</span>
                        ))}
                        {(ld[0] as any)?.grammarTopics?.slice(0, 2).map((g: string) => (
                          <span key={g} className="text-[10px] px-1.5 py-0.5 rounded-full bg-plum/10 text-plum font-medium">{g}</span>
                        ))}
                      </div>
                    )}
                    <div className={`text-[11px] mt-0.5 font-medium ${
                      lesson.completed ? 'text-forest' : lesson.status === 'locked' ? 'text-berry' : lesson.attempts > 0 ? 'text-honey' : 'text-ink-muted'
                    }`}>
                      {lesson.completed
                        ? `✅ 已完成 (${Math.round(lesson.best_accuracy * 100)}%)`
                        : lesson.status === 'locked'
                        ? '🔒 已锁定'
                        : lesson.attempts > 0
                        ? `🔄 ${lesson.attempts} 次尝试 (${Math.round(lesson.best_accuracy * 100)}%)`
                        : lesson.status === 'unlocked' || lesson.status === 'in_progress'
                        ? '🔓 待学习'
                        : '未解锁'}
                    </div>
                  </div>
                  {/* 操作按钮 (仅家长模式) */}
                  {showControls && (() => {
                    const isLocked = lesson.status === 'locked' && lesson.unlocked_by === 'parent_locked';
                    const actionLabel = lessonLoading === lesson.lesson_group ? '...'
                      : isLocked ? '🔓 解锁'
                      : '🔒 锁定';
                    const actionStyle = lessonLoading === lesson.lesson_group
                      ? 'bg-warm-bg text-ink-muted'
                      : isLocked
                      ? 'bg-forest-pale text-forest border border-forest/30'
                      : 'bg-berry-pale text-berry border border-berry/30';
                    return (
                      <button onClick={() =>
                        isLocked
                          ? handleUnlockLesson(lesson.lesson_group)
                          : handleResetLesson(lesson.lesson_group)
                      } disabled={lessonLoading === lesson.lesson_group}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${actionStyle}`}>
                        {actionLabel}
                      </button>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 📕 错题分析面板 ── */}
      <div>
        <WrongQuestionPanel
          wrongQuestions={wrongQuestions}
          summary={wrongSummary}
          loading={wrongLoading}
          role={role}
          childId={role === 'parent' ? userId : undefined}
        />
      </div>
    </div>
  );
}
