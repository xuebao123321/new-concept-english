import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../db/api';
import { useAuthStore } from '../stores/useAuthStore';
import { springs, staggerDelay } from '../utils/motion-tokens';
import LearningReport from '../components/report/LearningReport';
import { STAGES } from '../data/stages';
import { LESSONS } from '../data/lessons';
import { GRADE_LABELS } from '../components/onboarding/ProfileSetupModal';
import WrongQuestionCard from '../components/report/WrongQuestionCard';
import type { WrongQuestionItem, WrongQuestionSummary } from '../types';

const ALL_GROUPS = STAGES.flatMap(s => s.groups);

interface ChildItem {
  id: number; username: string; nickname: string;
  total_lessons: number; completed_lessons: number;
}

interface ChildReport {
  student: { id: number; nickname: string; username: string };
  completed_lessons: number; total_lessons: number;
  type_stats: Record<string, { total: number; correct: number; accuracy: number }>;
  lesson_list?: { lesson_group: string; completed: boolean; best_accuracy: number; attempts: number; status?: string; unlocked_by?: string }[];
  recent_activity?: { date: string; total: number; correct: number }[];
}

export default function ParentDashboardPage() {
  const { user } = useAuthStore();
  const [children, setChildren] = useState<ChildItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  // 每个学生的展开报告 (key=childId)
  const [reports, setReports] = useState<Record<number, ChildReport>>({});
  const [reportLoading, setReportLoading] = useState<Record<number, boolean>>({});

  const familyCode = user?.family_code || '';

  useEffect(() => { loadChildren(); }, []);

  const loadChildren = async () => {
    try {
      const res = await api.getChildren();
      const list = res.children || [];
      setChildren(list);
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

  const [showBulkUnlock, setShowBulkUnlock] = useState<Record<number, boolean>>({});
  const [editingChild, setEditingChild] = useState<number | null>(null);
  const [childEditNickname, setChildEditNickname] = useState('');
  const [childEditGrade, setChildEditGrade] = useState('');
  const [busyChild, setBusyChild] = useState<number | null>(null);
  const [reportRefresh, setReportRefresh] = useState<Record<number, number>>({});

  // ── 错题分析 ──
  const [wrongData, setWrongData] = useState<Record<number, {
    wrong_questions: WrongQuestionItem[];
    summary: WrongQuestionSummary;
  }>>({});
  const [wrongLoading, setWrongLoading] = useState<Record<number, boolean>>({});
  const [showAllWrong, setShowAllWrong] = useState<Record<number, boolean>>({});

  const loadWrongQuestions = async (childId: number) => {
    setWrongLoading(prev => ({ ...prev, [childId]: true }));
    try {
      const data = await api.wrongQuestions(childId);
      setWrongData(prev => ({ ...prev, [childId]: data }));
    } catch (e: any) {
      setMsg('❌ 错题加载失败: ' + (e.message || '未知错误'));
    }
    finally { setWrongLoading(prev => ({ ...prev, [childId]: false })); }
  };

  const startEditChild = (child: ChildItem) => {
    setEditingChild(child.id);
    setChildEditNickname(child.nickname);
    setChildEditGrade((child as any).grade || '');
  };

  const saveChildProfile = async (childId: number) => {
    try {
      await api.updateChildProfile(childId, { nickname: childEditNickname, grade: childEditGrade });
      setEditingChild(null);
      setMsg('✅ 已保存');
      setTimeout(() => setMsg(''), 2000);
      // 更新本地 children 列表中该学生的昵称（无需全量刷新）
      setChildren(prev => prev.map(c =>
        c.id === childId ? { ...c, nickname: childEditNickname } : c
      ));
    } catch (e: any) { setMsg('❌ ' + (e.message || '保存失败')); }
  };

  const bulkUnlockStage = async (childId: number, groups: string[]) => {
    if (!window.confirm(`确定要解锁该阶段全部 ${groups.length} 个课组吗?`)) return;
    setMsg('⏳ 正在解锁...');
    try {
      await Promise.all(groups.map(g => api.unlockLesson(childId, g)));
      setMsg('✅ 已解锁');
      await loadReport(childId);
    } catch (e: any) { setMsg('❌ ' + (e.message || '操作失败')); }
  };

  const handleLockAll = async (childId: number) => {
    if (!window.confirm('确定要锁定全部课程吗？学生将暂时无法访问，但已完成的学习数据不会丢失。')) return;
    setBusyChild(childId);
    setMsg('⏳ 正在锁定全部课程...');
    try {
      const BATCH = 8;
      for (let i = 0; i < ALL_GROUPS.length; i += BATCH) {
        const batch = ALL_GROUPS.slice(i, i + BATCH);
        setMsg(`⏳ 正在锁定... ${Math.min(i + BATCH, ALL_GROUPS.length)}/${ALL_GROUPS.length}`);
        await Promise.all(batch.map(g => api.resetLesson(childId, g)));
      }
      setMsg('✅ 已锁定全部课程');
      setReportRefresh(prev => ({ ...prev, [childId]: (prev[childId] || 0) + 1 }));
      await loadReport(childId);
    } catch (e: any) { setMsg('❌ ' + (e.message || '操作失败')); }
    finally { setBusyChild(null); }
  };

  const handleUnlockAll = async (childId: number) => {
    if (!window.confirm('确定要解锁全部课程吗？')) return;
    setBusyChild(childId);
    setMsg('⏳ 正在解锁全部课程...');
    try {
      const BATCH = 8;
      for (let i = 0; i < ALL_GROUPS.length; i += BATCH) {
        const batch = ALL_GROUPS.slice(i, i + BATCH);
        setMsg(`⏳ 正在解锁... ${Math.min(i + BATCH, ALL_GROUPS.length)}/${ALL_GROUPS.length}`);
        await Promise.all(batch.map(g => api.unlockLesson(childId, g)));
      }
      setMsg('✅ 已解锁全部课程');
      setReportRefresh(prev => ({ ...prev, [childId]: (prev[childId] || 0) + 1 }));
      await loadReport(childId);
    } catch (e: any) { setMsg('❌ ' + (e.message || '操作失败')); }
    finally { setBusyChild(null); }
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

      {/* ═══ 消息 Toast（固定顶部） ═══ */}
      {msg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl
                        text-sm font-bold shadow-lg animate-bounce-slight"
          style={{
            background: msg.startsWith('❌') ? '#FEE2E2' : msg.startsWith('⏳') ? '#FEF3C7' : '#DCFCE7',
            color: msg.startsWith('❌') ? '#DC2626' : msg.startsWith('⏳') ? '#D97706' : '#16A34A',
          }}>
          {msg}
        </div>
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
                      <div className="flex items-center gap-2">
                        <h3 className="text-h2 text-ink">{c.nickname || c.username}</h3>
                        <button
                          onClick={() => startEditChild(c)}
                          className="text-xs text-ink-muted hover:text-forest"
                          title="编辑资料"
                        >
                          ✏️
                        </button>
                      </div>
                      <p className="text-meta text-ink-light">
                        已完成 {report?.completed_lessons ?? c.completed_lessons}/{report?.total_lessons ?? c.total_lessons} 课组
                        {(() => {
                          const list = report?.lesson_list;
                          if (!list) return null;
                          const locked = list.filter(l => l.status === 'locked' || (!l.completed && l.status !== 'unlocked')).length;
                          const unlocked = list.filter(l => l.status === 'unlocked' || l.status === 'in_progress').length;
                          return <span className="ml-2">· 🔒{locked} 🔓{unlocked}</span>;
                        })()}
                      </p>
                    </div>
                  </div>

                  {/* 编辑学生资料 */}
                  {editingChild === c.id && (
                    <div className="mb-4 p-3 bg-warm-bg rounded-xl space-y-2">
                      <div>
                        <label className="text-[10px] font-bold text-ink-light mb-0.5 block">🏷️ 昵称</label>
                        <input
                          type="text"
                          value={childEditNickname}
                          onChange={e => setChildEditNickname(e.target.value)}
                          maxLength={12}
                          className="w-full p-2 text-sm font-bold rounded-lg border border-warm-border focus:border-forest outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-ink-light mb-0.5 block">📚 年级</label>
                        <select
                          value={childEditGrade}
                          onChange={e => setChildEditGrade(e.target.value)}
                          className="w-full p-2 text-sm font-bold rounded-lg border border-warm-border focus:border-forest outline-none"
                        >
                          <option value="">未设置</option>
                          {Object.entries(GRADE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveChildProfile(c.id)}
                          className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-forest text-cream hover:bg-forest/90"
                        >
                          保存
                        </button>
                        <button
                          onClick={() => setEditingChild(null)}
                          className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-warm-bg text-ink-light"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  )}

                  {isLoading ? (
                    <p className="text-sm text-ink-light text-center py-4">加载数据...</p>
                  ) : report ? (
                    <div className="space-y-4">
                      <LearningReport userId={c.id} role="parent" showControls={true} refreshKey={reportRefresh[c.id] || 0} />

                      {/* ── 快捷操作 ── */}
                      <div className="flex gap-1.5">
                        <button onClick={() => handleUnlockAll(c.id)}
                          disabled={busyChild === c.id}
                          className="flex-1 py-2 text-xs font-bold rounded-xl bg-forest-pale text-forest border border-forest/30
                                     disabled:opacity-40 disabled:cursor-wait">
                          {busyChild === c.id ? '⏳ 处理中...' : '🔓 全部解锁'}
                        </button>
                        <button onClick={() => handleLockAll(c.id)}
                          disabled={busyChild === c.id}
                          className="flex-1 py-2 text-xs font-bold rounded-xl bg-honey-pale text-honey border border-honey/30
                                     disabled:opacity-40 disabled:cursor-wait">
                          {busyChild === c.id ? '⏳ 处理中...' : '🔒 全部锁定'}
                        </button>
                        <div className="relative flex-1">
                          <button
                            onClick={() => setShowBulkUnlock(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
                            className="w-full py-2 text-xs font-bold rounded-xl bg-forest-pale text-forest border border-forest/30"
                          >
                            🔓 批量解锁 ▾
                          </button>
                          {showBulkUnlock[c.id] && (
                            <div className="absolute top-full mt-1 left-0 right-0 bg-cream rounded-xl border border-warm-border shadow-lg z-10 max-h-48 overflow-y-auto">
                              {STAGES.map(stage => (
                                <button
                                  key={stage.id}
                                  onClick={() => {
                                    setShowBulkUnlock(prev => ({ ...prev, [c.id]: false }));
                                    bulkUnlockStage(c.id, stage.groups);
                                  }}
                                  className="w-full text-left px-3 py-2 text-xs font-bold text-ink hover:bg-warm-bg transition-colors"
                                >
                                  {stage.icon} {stage.name} (L{stage.lessonStart}-{stage.lessonEnd})
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ── 错题分析 ── */}
                      <div className="border-t border-warm-border pt-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-bold text-ink">📝 错题分析</h4>
                          <button
                            onClick={() => loadWrongQuestions(c.id)}
                            className="text-xs font-bold text-forest hover:underline"
                          >
                            {wrongData[c.id] ? '🔄 刷新' : '📊 加载错题'}
                          </button>
                        </div>

                        {wrongData[c.id] && (() => {
                          const wd = wrongData[c.id];
                          const items = wd.wrong_questions;
                          const s = wd.summary;
                          const corrected = s.corrected || 0;
                          // 按课组分组
                          const byLesson: Record<string, WrongQuestionItem[]> = {};
                          for (const item of items) {
                            const lg = item.lesson_group || 'unknown';
                            if (!byLesson[lg]) byLesson[lg] = [];
                            byLesson[lg].push(item);
                          }
                          const lessonGroups = Object.entries(byLesson).sort(([a], [b]) => a.localeCompare(b));
                          const showCount = showAllWrong[c.id] ? 999 : 5;

                          return (
                            <div className="space-y-2">
                              {/* 摘要统计 */}
                              <div className="flex gap-2 text-xs flex-wrap">
                                <span className="px-2 py-1 rounded-full bg-berry-pale text-berry font-bold">
                                  {s.total_wrong} 道错题
                                </span>
                                {corrected > 0 && (
                                  <span className="px-2 py-1 rounded-full bg-forest-pale text-forest font-bold">
                                    ✅ 已订正 {corrected} 道
                                  </span>
                                )}
                                {corrected > 0 && s.total_wrong > 0 && (
                                  <span className="px-2 py-1 rounded-full bg-sky-pale text-sky font-bold">
                                    {Math.round(corrected / s.total_wrong * 100)}% 完成
                                  </span>
                                )}
                                {s.most_missed_type && (
                                  <span className="px-2 py-1 rounded-full bg-honey-pale text-honey font-bold">
                                    弱项: {s.most_missed_type}
                                  </span>
                                )}
                              </div>
                              {/* 订正进度条 */}
                              {s.total_wrong > 0 && (
                                <div className="h-1 bg-warm-bg rounded-full overflow-hidden">
                                  <motion.div
                                    className="h-full rounded-full bg-forest"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.round(corrected / s.total_wrong * 100)}%` }}
                                  />
                                </div>
                              )}

                              {/* 按课组分组展示 */}
                              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                                {lessonGroups.map(([lg, groupItems]) => {
                                  const groupLabel = (() => {
                                    const ls = LESSONS.filter(l => l.group === lg);
                                    return ls[0] ? `L${ls.map(l => l.lessonNumber).join('-')} ${ls[0].titleCn}` : lg;
                                  })();
                                  const groupCorrected = groupItems.filter(q => q.has_corrected).length;
                                  return (
                                    <div key={lg} className="bg-warm-bg rounded-lg p-2.5">
                                      <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs font-bold text-ink truncate flex-1">{groupLabel}</span>
                                        <span className="text-[10px] text-ink-muted ml-2">
                                          {groupItems.length}题
                                          {groupCorrected > 0 && <span className="text-forest"> · {groupCorrected}已订</span>}
                                        </span>
                                      </div>
                                      {groupItems.slice(0, showCount).map((item, i) => (
                                        <div key={i} className="flex items-start gap-2 text-[10px] py-1 border-t border-warm-border first:border-t-0">
                                          <span className={`mt-0.5 ${item.has_corrected ? '' : 'grayscale'}`}>
                                            {item.has_corrected ? '✅' : '❌'}
                                          </span>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-ink font-medium truncate">{item.question_text || '(原题未记录)'}</p>
                                            <p className="text-ink-muted mt-0.5">
                                              <span className="text-berry">答: {item.user_answer || '空'}</span>
                                              <span className="mx-1">→</span>
                                              <span className="text-forest">正解: {item.correct_answer}</span>
                                            </p>
                                            <p className="text-ink-muted mt-0.5">
                                              {item.wrong_count}次 · {item.question_type}
                                              {item.has_corrected && item.corrected_at && (
                                                <span className="text-forest ml-1">· 订正于 {item.corrected_at.slice(0, 10)}</span>
                                              )}
                                              {!item.has_corrected && item.last_attempt_at && (
                                                <span className="ml-1">· 最近 {item.last_attempt_at.slice(0, 10)}</span>
                                              )}
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })}
                              </div>
                              {items.length > 5 && (
                                <button
                                  onClick={() => setShowAllWrong(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
                                  className="text-xs text-forest font-bold hover:underline"
                                >
                                  {showAllWrong[c.id] ? '收起' : `查看全部 ${items.length} 道`}
                                </button>
                              )}
                            </div>
                          );
                        })()}

                        {wrongLoading[c.id] && (
                          <p className="text-xs text-ink-muted text-center py-2">加载中...</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-3">
                      <button onClick={() => loadReport(c.id)}
                        className="px-4 py-2 text-xs font-bold rounded-xl bg-forest-pale text-forest hover:bg-forest/20">
                        📊 加载学习报告
                      </button>
                    </div>
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