import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../db/api';
import { useAuthStore } from '../stores/useAuthStore';
import { springs, staggerDelay } from '../utils/motion-tokens';
import LearningReport from '../components/report/LearningReport';
import { STAGES } from '../data/stages';

const ALL_GROUPS = STAGES.flatMap(s => s.groups);

interface ChildItem {
  id: number; username: string; nickname: string;
  total_lessons: number; completed_lessons: number;
}

interface ChildReport {
  student: { id: number; nickname: string; username: string };
  completed_lessons: number; total_lessons: number;
  type_stats: Record<string, { total: number; correct: number; accuracy: number }>;
  lesson_list?: { lesson_group: string; completed: boolean; best_accuracy: number; attempts: number }[];
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
                        已完成 {report?.completed_lessons ?? c.completed_lessons}/{report?.total_lessons ?? c.total_lessons} 课组 · 共 {(report?.total_lessons ?? c.total_lessons) * 2} 节单课
                      </p>
                    </div>
                  </div>

                  {isLoading ? (
                    <p className="text-sm text-ink-light text-center py-4">加载数据...</p>
                  ) : report ? (
                    <div className="space-y-4">
                      <LearningReport userId={c.id} role="parent" showControls={true} />

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