import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../db/api';
import { useAuthStore } from '../stores/useAuthStore';
import { springs, staggerDelay } from '../utils/motion-tokens';
import { LESSONS } from '../data/lessons';
import { STAGES } from '../data/stages';

interface ChildItem {
  id: number; username: string; nickname: string;
  total_lessons: number; completed_lessons: number;
}

interface WrongQ { question_id: string; lesson_group: string; question_type: string;
  user_answer: string; created_at: string; }

interface LessonItem { lesson_group: string; completed: boolean; best_accuracy: number; attempts: number; }

interface DayActivity { date: string; total: number; correct: number; }

interface ChildReport {
  student: { id: number; nickname: string; username: string };
  completed_lessons: number; total_lessons: number;
  type_stats: Record<string, { total: number; correct: number; accuracy: number }>;
  lesson_list?: LessonItem[];
  recent_activity?: DayActivity[];
}

const ALL_GROUPS = STAGES.flatMap(s => s.groups);
const TOTAL_GROUPS = ALL_GROUPS.length;  // 72 课组 = 144 节单课

/** 计算某阶段的完成情况 */
function calcStageProgress(stageGroups: string[], lessonList: LessonItem[]) {
  const completed = stageGroups.filter(g =>
    lessonList.find(l => l.lesson_group === g)?.completed
  ).length;
  return { completed, total: stageGroups.length };
}

export default function ParentDashboardPage() {
  const { user } = useAuthStore();
  const [children, setChildren] = useState<ChildItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  // 每个学生的展开报告 (key=childId)
  const [reports, setReports] = useState<Record<number, ChildReport>>({});
  const [reportLoading, setReportLoading] = useState<Record<number, boolean>>({});
  const [lessonLoading, setLessonLoading] = useState<string | null>(null);
  const [wrongQs, setWrongQs] = useState<Record<number, WrongQ[]>>({});
  const [wrongQsLoading, setWrongQsLoading] = useState(false);

  const familyCode = user?.family_code || '';

  useEffect(() => { loadChildren(); }, []);

  const loadChildren = async () => {
    try {
      const res = await api.getChildren();
      const list = res.children || [];
      setChildren(list);
      // 自动加载所有学生的报告
      for (const c of list) {
        loadReport(c.id);
      }
    } catch (e: any) {
      setMsg('❌ ' + (e.message || '加载失败'));
    } finally {
      setLoading(false);
    }
  };

  const loadReport = async (childId: number) => {
    setReportLoading(prev => ({ ...prev, [childId]: true }));
    try {
      const r: ChildReport = await api.childReport(childId);
      setReports(prev => ({ ...prev, [childId]: r }));
    } catch (e: any) {
      setMsg('❌ ' + (e.message || '加载失败'));
    } finally {
      setReportLoading(prev => ({ ...prev, [childId]: false }));
    }
  };

  const handleUnlockLesson = async (childId: number, lessonGroup: string) => {
    setLessonLoading(lessonGroup);
    try {
      await api.unlockLesson(childId, lessonGroup);
      setMsg(`✅ ${lessonGroup} 已解锁`);
      await loadReport(childId);
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
      await loadReport(childId);
    } catch (e: any) {
      setMsg('❌ ' + (e.message || '操作失败'));
    } finally {
      setLessonLoading(null);
    }
  };

  const handleUnlockAll = async (childId: number) => {
    if (!window.confirm(`确定要解锁全部 ${ALL_GROUPS.length} 个课组吗?`)) return;
    setMsg('');
    try {
      for (const g of ALL_GROUPS) { await api.unlockLesson(childId, g); }
      setMsg('✅ 已全部解锁');
      await loadReport(childId);
      await loadChildren();
    } catch (e: any) { setMsg('❌ ' + (e.message || '操作失败')); }
  };

  const handleResetAll = async (childId: number) => {
    if (!window.confirm('确定要重置全部课程进度吗?此操作不可恢复。')) return;
    setMsg('');
    try {
      for (const g of ALL_GROUPS) { await api.resetLesson(childId, g); }
      setMsg('✅ 已全部重置');
      await loadReport(childId);
      await loadChildren();
    } catch (e: any) { setMsg('❌ ' + (e.message || '操作失败')); }
  };

  const loadWrongQuestions = async (childId: number) => {
    if (wrongQs[childId]) { setWrongQs(prev => { const n = { ...prev }; delete n[childId]; return n; }); return; }
    setWrongQsLoading(true);
    try {
      const res = await api.wrongQuestions(childId);
      setWrongQs(prev => ({ ...prev, [childId]: res.wrong_questions || [] }));
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
    <div className="px-4 py-4 space-y-5">
      {/* ═══ 家庭码 ═══ */}
      <motion.div className="card p-4 text-center border-honey/30 bg-honey-pale/50"
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={springs.enter}>
        <h2 className="text-h2 text-ink">👨‍👩‍👧 我的家庭</h2>
        <div className="mt-1.5 flex items-center justify-center gap-2">
          <span className="text-meta text-ink-light">邀请码</span>
          <span className="text-h1 font-extrabold text-ink tracking-widest tabular-nums">{familyCode}</span>
          <button onClick={copyFamilyCode}
            className="text-xs px-2.5 py-1 rounded-full bg-forest-pale text-forest font-bold">📋 复制</button>
        </div>
        <p className="text-caption text-ink-muted mt-1">让学生注册时输入此码加入家庭</p>
      </motion.div>

      {/* ═══ 消息 ═══ */}
      {msg && (
        <div className={`p-2.5 rounded-xl text-center text-sm font-bold ${
          msg.startsWith('❌') ? 'bg-berry-pale text-berry' : 'bg-forest-pale text-forest'
        }`}>{msg}</div>
      )}

      {loading ? (
        <div className="text-center py-10 text-ink-light">加载中...</div>
      ) : children.length === 0 ? (
        <div className="card p-6 text-center text-ink-light space-y-2">
          <div className="text-4xl">📭</div>
          <p className="text-meta">还没有学生加入</p>
          <p className="text-caption">让学生注册时输入你的邀请码即可</p>
        </div>
      ) : (
        <div className="space-y-5">
          {children.map((c, i) => {
            const report = reports[c.id];
            const isLoading = reportLoading[c.id];
            const childWrongQs = wrongQs[c.id];

            // 阶段完成统计
            const stageStats = STAGES.map(stage => {
              const st = calcStageProgress(stage.groups, report?.lesson_list || []);
              return { ...stage, ...st };
            });

            const totalCompleted = stageStats.reduce((s, st) => s + st.completed, 0);

            return (
              <motion.div key={c.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: staggerDelay(i, 'listBig'), ...springs.slideUp }}>

                {/* ═══ 学生卡片 (始终展开) ═══ */}
                <div className="card p-5 border-forest/20 bg-white">
                  {/* 头部 */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-forest-pale text-forest flex items-center justify-center text-xl font-extrabold">
                      {c.nickname?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-h2 text-ink">{c.nickname || c.username}</h3>
                      <p className="text-meta text-ink-light">
                        已完成 {totalCompleted}/{TOTAL_GROUPS} 课组 · 共 {TOTAL_GROUPS * 2} 节单课
                      </p>
                    </div>
                  </div>

                  {isLoading ? (
                    <p className="text-sm text-ink-light text-center py-4">加载数据...</p>
                  ) : report ? (
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
                          <div className="h-full rounded-full progress-shimmer"
                            style={{ width: `${Math.round(totalCompleted / TOTAL_GROUPS * 100)}%` }} />
                        </div>
                      </div>

                      {/* ── 6 阶段完成率 ── */}
                      <div>
                        <div className="text-caption text-ink-light font-bold mb-2">📚 分阶段完成率</div>
                        <div className="grid grid-cols-2 gap-2">
                          {stageStats.map(st => {
                            const pct = Math.round(st.completed / st.total * 100);
                            return (
                              <div key={st.id}
                                className="bg-warm-bg rounded-xl p-2.5">
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
                                <div className="h-1.5 bg-white rounded-full overflow-hidden">
                                  <div className="h-full rounded-full bg-forest/60"
                                    style={{ width: `${pct}%` }} />
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
                              <div className="text-[10px] text-ink-muted">
                                {{choice:'选择',fill:'填空',translate:'翻译',reorder:'连词',listening:'听力'}[qt] || qt}
                              </div>
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
                                  <div className={`w-full rounded-t-sm ${isToday ? 'bg-forest' : day.total > 0 ? 'bg-forest/40' : 'bg-warm-bg'}`}
                                    style={{ height: `${h}%` }} />
                                  <span className={`text-[10px] ${isToday ? 'font-bold text-forest' : 'text-ink-muted'}`}>
                                    {['日','一','二','三','四','五','六'][new Date(day.date + 'T00:00:00').getDay()]}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* ── 快捷操作 ── */}
                      <div className="flex gap-2">
                        <button onClick={() => handleUnlockAll(c.id)}
                          className="flex-1 py-2 text-xs font-bold rounded-xl bg-forest-pale text-forest border border-forest/30">
                          🔓 解锁全部
                        </button>
                        <button onClick={() => handleResetAll(c.id)}
                          className="flex-1 py-2 text-xs font-bold rounded-xl bg-berry-pale text-berry border border-berry/30">
                          🔒 重置全部
                        </button>
                      </div>

                      {/* ── 📋 课组清单 (可滚动) ── */}
                      <div>
                        <div className="text-caption text-ink-light font-bold mb-1">📋 课组详情</div>
                        <div className="max-h-96 overflow-y-auto rounded-xl border border-warm-border">
                          {report.lesson_list?.map(lesson => {
                            const ld = LESSONS.filter(l => l.group === lesson.lesson_group);
                            const title = ld[0]?.titleCn || lesson.lesson_group;
                            const engTitle = ld[0]?.title || '';
                            const nums = ld.map(l => l.lessonNumber).join('-');
                            const stage = STAGES.find(s => s.groups.includes(lesson.lesson_group));

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
                                    {(ld[0]?.vocabulary?.length > 0 || ld[0]?.grammarTopics?.length > 0) && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {ld[0]?.vocabulary?.slice(0, 3).map((w: string) => (
                                          <span key={w} className="text-[10px] px-1.5 py-0.5 rounded-full bg-forest/10 text-forest font-medium">{w}</span>
                                        ))}
                                        {ld[0]?.grammarTopics?.slice(0, 2).map((g: string) => (
                                          <span key={g} className="text-[10px] px-1.5 py-0.5 rounded-full bg-plum/10 text-plum font-medium">{g}</span>
                                        ))}
                                      </div>
                                    )}
                                    <div className={`text-[11px] mt-0.5 font-medium ${
                                      lesson.completed ? 'text-forest' : lesson.attempts > 0 ? 'text-honey' : 'text-ink-muted'
                                    }`}>
                                      {lesson.completed
                                        ? `✅ 已完成 (${Math.round(lesson.best_accuracy * 100)}%)`
                                        : lesson.attempts > 0
                                        ? `🔄 ${lesson.attempts} 次尝试 (${Math.round(lesson.best_accuracy * 100)}%)`
                                        : '未解锁'}
                                    </div>
                                  </div>
                                  <button onClick={() =>
                                    lesson.completed
                                      ? handleResetLesson(c.id, lesson.lesson_group)
                                      : handleUnlockLesson(c.id, lesson.lesson_group)
                                  } disabled={lessonLoading === lesson.lesson_group}
                                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
                                      lessonLoading === lesson.lesson_group ? 'bg-warm-bg text-ink-muted'
                                      : lesson.completed
                                      ? 'bg-berry-pale text-berry border border-berry/30'
                                      : 'bg-forest-pale text-forest border border-forest/30'
                                    }`}>
                                    {lessonLoading === lesson.lesson_group ? '...' : lesson.completed ? '🔒' : '🔓'}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* ── 📕 错题本 ── */}
                      <div>
                        <button onClick={() => loadWrongQuestions(c.id)}
                          className="text-sm font-bold text-ink-light hover:text-ink">
                          {childWrongQs ? '📕 收起错题本' : '📕 查看错题本'}
                        </button>
                        {childWrongQs && (
                          <div className="max-h-44 overflow-y-auto space-y-1.5 mt-1.5">
                            {wrongQsLoading ? (
                              <p className="text-xs text-ink-muted text-center py-2">加载中...</p>
                            ) : childWrongQs.length === 0 ? (
                              <p className="text-xs text-ink-muted text-center py-2">暂无错题 🎉</p>
                            ) : (
                              childWrongQs.map((wq, idx) => (
                                <div key={wq.question_id + idx} className="bg-warm-bg rounded-lg p-2 text-xs">
                                  <div className="flex justify-between mb-0.5">
                                    <span className="font-bold text-ink-light">
                                      {wq.lesson_group} · {{choice:'选择',fill:'填空',translate:'翻译',reorder:'连词',listening:'听力'}[wq.question_type] || wq.question_type}
                                    </span>
                                    <span className="text-ink-muted">{wq.created_at?.slice(0, 10)}</span>
                                  </div>
                                  <div className="text-berry">答案: <b>{wq.user_answer || '(空)'}</b></div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-ink-muted text-center py-4">暂无数据</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}