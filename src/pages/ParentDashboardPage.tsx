import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../db/api';
import { useAuthStore } from '../stores/useAuthStore';
import { springs, staggerDelay } from '../utils/motion-tokens';
import { LESSONS, LESSON_GROUPS } from '../data/lessons';

interface ChildItem {
  id: number;
  username: string;
  nickname: string;
  total_lessons: number;
  completed_lessons: number;
}

interface ChildReport {
  student: { id: number; nickname: string; username: string };
  completed_lessons: number;
  total_lessons: number;
  type_stats: Record<string, { total: number; correct: number; accuracy: number }>;
  lesson_list?: Array<{
    lesson_group: string;
    completed: boolean;
    best_accuracy: number;
    attempts: number;
  }>;
  recent_activity?: Array<{
    date: string;
    total: number;
    correct: number;
  }>;
}

export default function ParentDashboardPage() {
  const { user } = useAuthStore();
  const [children, setChildren] = useState<ChildItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChild, setSelectedChild] = useState<number | null>(null);
  const [report, setReport] = useState<ChildReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [lessonLoading, setLessonLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [showWrongQs, setShowWrongQs] = useState(false);
  const [wrongQuestions, setWrongQuestions] = useState<Array<{
    question_id: string; lesson_group: string; question_type: string;
    user_answer: string; created_at: string;
  }>>([]);
  const [wrongQsLoading, setWrongQsLoading] = useState(false);

  const familyCode = user?.family_code || '';

  useEffect(() => { loadChildren(); }, []);

  const loadChildren = async () => {
    try {
      const res = await api.getChildren();
      setChildren(res.children || []);
    } catch (e: any) {
      setMsg('❌ ' + (e.message || '加载失败'));
    } finally {
      setLoading(false);
    }
  };

  const loadReport = async (childId: number) => {
    setReportLoading(true);
    try {
      const r = await api.childReport(childId);
      setReport(r);
    } catch (e: any) {
      setMsg('❌ ' + (e.message || '加载报告失败'));
    } finally {
      setReportLoading(false);
    }
  };

  const handleSelectChild = async (childId: number) => {
    if (selectedChild === childId) { setSelectedChild(null); setReport(null); return; }
    setSelectedChild(childId);
    setReport(null);
    await loadReport(childId);
  };

  const handleUnlockLesson = async (childId: number, lessonGroup: string) => {
    setLessonLoading(lessonGroup);
    try {
      await api.unlockLesson(childId, lessonGroup);
      setMsg(`✅ ${lessonGroup} 已解锁`);
      const r = await api.childReport(childId);
      setReport(r);
    } catch (e: any) {
      setMsg('❌ ' + (e.message || '操作失败'));
    } finally {
      setLessonLoading(null);
    }
  };

  const handleResetLesson = async (childId: number, lessonGroup: string) => {
    setLessonLoading(lessonGroup);
    try {
      await api.resetLesson(childId, lessonGroup);
      setMsg(`✅ ${lessonGroup} 已重置`);
      const r = await api.childReport(childId);
      setReport(r);
    } catch (e: any) {
      setMsg('❌ ' + (e.message || '操作失败'));
    } finally {
      setLessonLoading(null);
    }
  };

  const handleUnlockAll = async (childId: number) => {
    if (!window.confirm(`确定要解锁该学生的全部 ${LESSON_GROUPS.length} 个课组吗?`)) return;
    setMsg('');
    try {
      for (const g of LESSON_GROUPS) {
        await api.unlockLesson(childId, g);
      }
      setMsg('✅ 已全部解锁');
      loadChildren();
      await loadReport(childId);
    } catch (e: any) {
      setMsg('❌ ' + (e.message || '操作失败'));
    }
  };

  const handleResetAll = async (childId: number) => {
    if (!window.confirm('确定要重置该学生的全部课程进度吗?此操作不可恢复。')) return;
    setMsg('');
    try {
      for (const g of LESSON_GROUPS) {
        await api.resetLesson(childId, g);
      }
      setMsg('✅ 已全部重置');
      loadChildren();
      await loadReport(childId);
    } catch (e: any) {
      setMsg('❌ ' + (e.message || '操作失败'));
    }
  };

  const loadWrongQuestions = async (childId: number) => {
    if (showWrongQs) { setShowWrongQs(false); return; }
    setShowWrongQs(true);
    if (wrongQuestions.length > 0) return;
    setWrongQsLoading(true);
    try {
      const res = await api.wrongQuestions(childId);
      setWrongQuestions(res.wrong_questions || []);
    } catch (e: any) {
      setMsg('❌ ' + (e.message || '加载失败'));
    } finally {
      setWrongQsLoading(false);
    }
  };

  const copyFamilyCode = () => {
    navigator.clipboard.writeText(familyCode).then(() => setMsg('📋 已复制'))
      .catch(() => setMsg('❌ 复制失败'));
    setTimeout(() => setMsg(''), 2000);
  };

  return (
    <div className="px-4 py-4 space-y-4">
      {/* ═══ Hero: 家庭码 ═══ */}
      <motion.div className="card p-5 text-center border-honey/30 bg-honey-pale/50"
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={springs.enter}>
        <h2 className="text-h2 text-ink">👨‍👩‍👧 我的家庭</h2>
        <div className="mt-2 flex items-center justify-center gap-3">
          <span className="text-meta text-ink-light">邀请码</span>
          <span className="text-h1 font-extrabold text-ink tracking-widest tabular-nums">{familyCode}</span>
          <button onClick={copyFamilyCode}
            className="text-xs px-2.5 py-1 rounded-full bg-forest-pale text-forest font-bold hover:bg-forest/20">
            📋 复制
          </button>
        </div>
        <p className="text-caption text-ink-muted mt-1.5">让学生注册时输入此码加入你的家庭</p>
      </motion.div>

      {/* ═══ 消息 ═══ */}
      {msg && (
        <div className={`p-2.5 rounded-xl text-center text-sm font-bold ${
          msg.startsWith('❌') ? 'bg-berry-pale text-berry' : 'bg-forest-pale text-forest'
        }`}>{msg}</div>
      )}

      {/* ═══ 学生列表 ═══ */}
      <h3 className="text-h3 text-ink pt-1">📚 我的学生</h3>

      {loading ? (
        <div className="text-center py-10 text-ink-light">加载中...</div>
      ) : children.length === 0 ? (
        <div className="card p-6 text-center text-ink-light space-y-2">
          <div className="text-4xl">📭</div>
          <p className="text-meta">还没有学生加入</p>
          <p className="text-caption">让学生注册时输入你的邀请码即可</p>
        </div>
      ) : (
        <div className="space-y-2">
          {children.map((c, i) => (
            <motion.div key={c.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: staggerDelay(i, 'listBig'), ...springs.slideUp }}>
              <button onClick={() => handleSelectChild(c.id)}
                className={`card p-4 w-full text-left transition-all ${
                  selectedChild === c.id ? 'border-forest bg-forest-pale/50' : 'hover:border-forest/30'
                }`}>
                {/* 头像行 */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-forest-pale text-forest flex items-center justify-center text-lg font-extrabold">
                    {c.nickname?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-h3 font-bold text-ink truncate">{c.nickname || c.username}</div>
                    <div className="text-meta text-ink-light">
                      已完成 {c.completed_lessons}/{LESSON_GROUPS.length} 课
                    </div>
                  </div>
                  <span className="text-ink-muted text-lg">{selectedChild === c.id ? '▼' : '→'}</span>
                </div>

                {/* ═══ 展开: 详情 ═══ */}
                {selectedChild === c.id && (
                  <motion.div className="mt-3 pt-3 border-t border-warm-border space-y-3"
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>

                    {reportLoading ? (
                      <p className="text-sm text-ink-light text-center py-2">加载报告...</p>
                    ) : report ? (
                      <>
                        {/* 统计摘要 */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-warm-bg rounded-xl py-2">
                            <div className="text-h3 font-extrabold text-forest tabular-nums">{report.completed_lessons}</div>
                            <div className="text-caption text-ink-light">已完成</div>
                          </div>
                          <div className="bg-warm-bg rounded-xl py-2">
                            <div className="text-h3 font-extrabold text-sky tabular-nums">{report.total_lessons}</div>
                            <div className="text-caption text-ink-light">总课程</div>
                          </div>
                          <div className="bg-warm-bg rounded-xl py-2">
                            <div className="text-h3 font-extrabold text-honey tabular-nums">
                              {report.completed_lessons > 0
                                ? Math.round(report.completed_lessons / report.total_lessons * 100) : 0}%
                            </div>
                            <div className="text-caption text-ink-light">完成率</div>
                          </div>
                        </div>

                        {/* 题型正确率 */}
                        <div className="text-caption text-ink-light font-bold">各题型正确率</div>
                        <div className="grid grid-cols-5 gap-1">
                          {Object.entries(report.type_stats || {}).map(([qt, s]) => (
                            <div key={qt} className="text-center bg-warm-bg rounded-lg py-1.5">
                              <div className="text-xs font-extrabold" style={{
                                color: s.accuracy >= 80 ? '#5B9A5A' : s.accuracy >= 50 ? '#FBBF24' : '#E57373'
                              }}>
                                {s.accuracy}%
                              </div>
                              <div className="text-[10px] text-ink-muted">
                                {{choice:'选择',fill:'填空',translate:'翻译',reorder:'连词',listening:'听力'}[qt] || qt}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* 本周趋势 */}
                        {report?.recent_activity && report.recent_activity.length > 0 && (() => {
                          const thisWeek = report.recent_activity;
                          const thisWeekTotal = thisWeek.reduce((s, d) => s + d.total, 0);
                          const thisWeekCorrect = thisWeek.reduce((s, d) => s + d.correct, 0);
                          const accuracy = thisWeekTotal > 0 ? Math.round(thisWeekCorrect / thisWeekTotal * 100) : 0;
                          return (
                            <div className="flex items-center justify-center gap-4 text-xs bg-warm-bg rounded-xl py-2">
                              <span className="text-ink-light">本周答题 <b className="text-ink">{thisWeekTotal}</b> 题</span>
                              <span className="text-ink-light">正确率 <b className={accuracy >= 70 ? 'text-forest' : accuracy >= 50 ? 'text-honey' : 'text-berry'}>{accuracy}%</b></span>
                            </div>
                          );
                        })()}

                        {/* 📅 7 天活跃度 */}
                        {report?.recent_activity && report.recent_activity.length > 0 && (
                          <div>
                            <div className="text-caption text-ink-light font-bold">📅 7 天活跃度</div>
                            <div className="flex items-end gap-1 h-16 mt-1">
                              {report.recent_activity.map((day) => {
                                const maxTotal = Math.max(...report.recent_activity!.map(d => d.total), 1);
                                const height = day.total > 0 ? Math.max((day.total / maxTotal) * 100, 8) : 3;
                                const isToday = day.date === new Date().toISOString().slice(0, 10);
                                return (
                                  <div key={day.date} className="flex-1 flex flex-col items-center gap-0.5">
                                    <span className="text-[10px] font-bold text-ink-light tabular-nums">
                                      {day.total || ''}
                                    </span>
                                    <div
                                      className={`w-full rounded-t-sm ${isToday ? 'bg-forest' : day.total > 0 ? 'bg-forest/40' : 'bg-warm-bg'}`}
                                      style={{ height: `${height}%` }}
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

                        {/* 全部解锁/重置 快捷按钮 */}
                        <div className="flex gap-2">
                          <button onClick={(e) => { e.stopPropagation(); handleUnlockAll(c.id); }}
                            className="flex-1 py-2 text-xs font-bold rounded-xl bg-forest-pale text-forest border border-forest/30">
                            🔓 解锁全部
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleResetAll(c.id); }}
                            className="flex-1 py-2 text-xs font-bold rounded-xl bg-berry-pale text-berry border border-berry/30">
                            🔒 重置全部
                          </button>
                        </div>

                        {/* ═══ 逐课清单 (可滚动) ═══ */}
                        <div>
                          <div className="text-caption text-ink-light font-bold mb-1">📋 课程清单</div>
                          <div className="max-h-80 overflow-y-auto space-y-0 rounded-xl border border-warm-border">
                            {report.lesson_list?.map((lesson) => {
                              const lessonData = LESSONS.filter(l => l.group === lesson.lesson_group);
                              const title = lessonData[0]?.titleCn || lesson.lesson_group;
                              const engTitle = lessonData[0]?.title || '';
                              const nums = lessonData.map(l => l.lessonNumber).join('-');

                              return (
                                <div key={lesson.lesson_group}
                                  className="px-3 py-2.5 border-b border-warm-border last:border-b-0 bg-white hover:bg-warm-bg/50">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-extrabold text-ink-muted whitespace-nowrap">
                                          L{nums}
                                        </span>
                                        <span className="text-sm font-bold text-ink truncate">{title}</span>
                                      </div>
                                      {engTitle && (
                                        <div className="text-xs text-ink-muted truncate mt-0.5">{engTitle}</div>
                                      )}
                                      <div className={`text-[11px] mt-0.5 font-medium ${
                                        lesson.completed
                                          ? 'text-forest'
                                          : lesson.attempts > 0
                                          ? 'text-honey'
                                          : 'text-ink-muted'
                                      }`}>
                                        {lesson.completed
                                          ? '✅ 已完成' + (lesson.best_accuracy > 0 ? ` (${Math.round(lesson.best_accuracy * 100)}%)` : '')
                                          : lesson.attempts > 0
                                          ? `🔄 尝试过 ${lesson.attempts} 次 (${Math.round(lesson.best_accuracy * 100)}%)`
                                          : '🔒 未解锁'}
                                      </div>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        lesson.completed
                                          ? handleResetLesson(c.id, lesson.lesson_group)
                                          : handleUnlockLesson(c.id, lesson.lesson_group);
                                      }}
                                      disabled={lessonLoading === lesson.lesson_group}
                                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                                        lessonLoading === lesson.lesson_group
                                          ? 'bg-warm-bg text-ink-muted'
                                          : lesson.completed
                                          ? 'bg-berry-pale text-berry border border-berry/30 hover:bg-berry/10'
                                          : 'bg-forest-pale text-forest border border-forest/30 hover:bg-forest/20'
                                      }`}
                                    >
                                      {lessonLoading === lesson.lesson_group ? '...' : lesson.completed ? '🔒' : '🔓'}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* ── 📕 错题本 (可折叠) ── */}
                        <button onClick={(e) => { e.stopPropagation(); loadWrongQuestions(c.id); }}
                          className="w-full text-left text-sm font-bold text-ink-light hover:text-ink pt-1">
                          {showWrongQs ? '📕 收起错题本' : '📕 查看错题本'}
                        </button>

                        {showWrongQs && (
                          <div className="max-h-48 overflow-y-auto space-y-1.5">
                            {wrongQsLoading ? (
                              <p className="text-xs text-ink-muted text-center py-2">加载中...</p>
                            ) : wrongQuestions.length === 0 ? (
                              <p className="text-xs text-ink-muted text-center py-2">暂无错题 🎉</p>
                            ) : (
                              wrongQuestions.map((wq, i) => (
                                <div key={wq.question_id + i} className="bg-warm-bg rounded-lg p-2 text-xs">
                                  <div className="flex items-center justify-between mb-0.5">
                                    <span className="font-bold text-ink-light">
                                      {wq.lesson_group} · {{choice:'选择',fill:'填空',translate:'翻译',reorder:'连词',listening:'听力'}[wq.question_type] || wq.question_type}
                                    </span>
                                    <span className="text-ink-muted">{wq.created_at?.slice(0,10)}</span>
                                  </div>
                                  <div className="text-berry">
                                    学生答案: <span className="font-bold">{wq.user_answer || '(未填写)'}</span>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </>
                    ) : null}
                  </motion.div>
                )}
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}