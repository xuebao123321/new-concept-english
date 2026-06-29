import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../db/api';
import { useAuthStore } from '../stores/useAuthStore';
import { springs, staggerDelay } from '../utils/motion-tokens';
import { LESSON_GROUPS } from '../data/lessons';

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
}

export default function ParentDashboardPage() {
  const { user } = useAuthStore();
  const [children, setChildren] = useState<ChildItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChild, setSelectedChild] = useState<number | null>(null);
  const [report, setReport] = useState<ChildReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [msg, setMsg] = useState('');

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

  const handleSelectChild = async (childId: number) => {
    if (selectedChild === childId) { setSelectedChild(null); setReport(null); return; }
    setSelectedChild(childId);
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

  const handleUnlockAll = async (childId: number) => {
    if (!window.confirm(`确定要解锁该学生的全部 ${LESSON_GROUPS.length} 个课组吗?`)) return;
    setMsg('');
    try {
      for (const g of LESSON_GROUPS) {
        await api.unlockLesson(childId, g);
      }
      setMsg('✅ 已全部解锁');
      loadChildren();
      if (selectedChild === childId) handleSelectChild(childId);
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
      if (selectedChild === childId) handleSelectChild(childId);
    } catch (e: any) {
      setMsg('❌ ' + (e.message || '操作失败'));
    }
  };

  const copyFamilyCode = () => {
    navigator.clipboard.writeText(familyCode).then(() => setMsg('📋 已复制'))
      .catch(() => setMsg('❌ 复制失败'));
    setTimeout(() => setMsg(''), 2000);
  };

  const selectedName = children.find(c => c.id === selectedChild)?.nickname || '';

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

                {/* 展开: 报告 + 操作 */}
                {selectedChild === c.id && (
                  <motion.div className="mt-3 pt-3 border-t border-warm-border space-y-2"
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                    {reportLoading ? (
                      <p className="text-sm text-ink-light text-center py-2">加载报告...</p>
                    ) : report ? (
                      <>
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
                        {/* 题型统计 */}
                        <div className="text-caption text-ink-light font-bold mt-1">各题型正确率</div>
                        <div className="grid grid-cols-5 gap-1">
                          {Object.entries(report.type_stats || {}).map(([qt, s]) => (
                            <div key={qt} className="text-center bg-warm-bg rounded-lg py-1.5">
                              <div className="text-xs font-extrabold" style={{ color: s.accuracy >= 80 ? '#5B9A5A' : s.accuracy >= 50 ? '#FBBF24' : '#E57373' }}>
                                {s.accuracy}%
                              </div>
                              <div className="text-[10px] text-ink-muted">
                                {{choice:'选择',fill:'填空',translate:'翻译',reorder:'连词',listening:'听力'}[qt] || qt}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : null}

                    {/* 操作按钮 */}
                    <div className="flex gap-2 pt-1">
                      <button onClick={(e) => { e.stopPropagation(); handleUnlockAll(c.id); }}
                        className="flex-1 py-2 text-xs font-bold rounded-xl bg-forest-pale text-forest border border-forest/30">
                        🔓 解锁全部
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleResetAll(c.id); }}
                        className="flex-1 py-2 text-xs font-bold rounded-xl bg-berry-pale text-berry border border-berry/30">
                        🔒 重置全部
                      </button>
                    </div>
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