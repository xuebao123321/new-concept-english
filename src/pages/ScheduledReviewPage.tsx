import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LESSONS, LESSON_GROUPS } from '../data/lessons';
import { getQuestionsByGroup } from '../data/questions';
import { getDueReviews, completeReview, resetLesson } from '../utils/review-scheduler';
import QuestionCard from '../components/questions/QuestionCard';
import type { Question } from '../types';

export default function ScheduledReviewPage() {
  const nav = useNavigate();
  const [tasks, setTasks] = useState<Awaited<ReturnType<typeof getDueReviews>>>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<{ lessonGroup: string; stage: number; questions: Question[] } | null>(null);
  const [idx, setIdx] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    getDueReviews().then(t => { setTasks(t); setLoading(false); });
  }, []);

  const startReview = (task: typeof tasks[0]) => {
    const current = getQuestionsByGroup(task.lessonGroup);
    const older = getOlderQuestions(task.lessonGroup, task.olderCount);
    const all = [...current, ...older].sort(() => Math.random() - 0.5).slice(0, task.questionCount);
    setActive({ lessonGroup: task.lessonGroup, stage: task.stage, questions: all });
    setIdx(0);
    setWrongCount(0);
    setDone(false);
  };

  const handleAnswer = async (_a: string, ok: boolean, _t: number) => {
    if (!ok) setWrongCount(c => c + 1);
    setTimeout(async () => {
      if (idx < (active?.questions.length || 0) - 1) {
        setIdx(prev => prev + 1);
      } else {
        const passed = wrongCount === 0;
        await completeReview(active!.lessonGroup, active!.stage, passed, Math.round(((active!.questions.length - wrongCount) / active!.questions.length) * 100));
        if (!passed) await resetLesson(active!.lessonGroup);
        setDone(true);
      }
    }, 600);
  };

  if (loading) return <div className="text-center py-20 text-gray-400">加载中...</div>;

  if (done) {
    const passed = wrongCount === 0;
    return (
      <div className="px-4 py-10 text-center space-y-4">
        <div className="text-6xl">{passed ? '🎉' : '💪'}</div>
        <h2 className="text-xl font-extrabold text-[#3D3830]">{passed ? '复习通过！' : '复习未通过'}</h2>
        <p className="text-gray-400">{passed ? '该课时间锚点已稳定' : '该课已降级，需重新综合测试'}</p>
        <button onClick={() => nav('/')} className="btn-brand text-base">返回首页</button>
      </div>
    );
  }

  if (active) {
    return (
      <div className="min-h-screen px-4 py-4" style={{ background: '#FFFBF5' }}>
        <div className="flex justify-between mb-3">
          <button onClick={() => setActive(null)} className="text-sm font-bold text-gray-400">← 返回</button>
          <span className="tag-accent">🛡️ 第{active.stage}天巩固</span>
          <span className="text-xs font-bold text-gray-400">{idx + 1}/{active.questions.length}</span>
        </div>
        <div className="progress-track mb-4">
          <div className="progress-fill progress-accent" style={{ width: `${(idx / active.questions.length) * 100}%` }} />
        </div>
        <QuestionCard question={active.questions[idx]} questionNumber={idx + 1}
          totalQuestions={active.questions.length} onAnswer={handleAnswer} />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="px-4 py-10 text-center space-y-4">
        <div className="text-6xl">🧘</div>
        <h2 className="text-xl font-extrabold text-[#3D3830]">暂无待复习</h2>
        <p className="text-gray-400">所有时间锚点都很稳定！</p>
        <button onClick={() => nav('/')} className="btn-brand text-base">返回首页</button>
      </div>
    );
  }

  return (
    <div className="px-4 py-5 space-y-3">
      <h2 className="text-lg font-extrabold text-[#3D3830]">🛡️ 今日巩固任务</h2>
      {tasks.map(t => {
        const l = LESSONS.filter(x => x.group === t.lessonGroup);
        return (
          <button key={`${t.lessonGroup}-${t.stage}`} onClick={() => startReview(t)}
            className="card p-4 w-full text-left flex items-center gap-4">
            <div className="text-2xl">🛡️</div>
            <div className="flex-1">
              <div className="font-extrabold text-sm text-[#3D3830]">
                第{l.map(x => x.lessonNumber).join('-')}课 · 第{t.stage}天巩固
              </div>
              <div className="text-xs text-gray-400">{t.questionCount}题 · {l[0]?.titleCn}</div>
            </div>
            <span className="text-gray-300">→</span>
          </button>
        );
      })}
    </div>
  );
}

function getOlderQuestions(currentGroup: string, count: number): Question[] {
  const idx = LESSON_GROUPS.indexOf(currentGroup);
  if (idx <= 0 || count <= 0) return [];
  const older = LESSON_GROUPS.slice(0, idx).flatMap(g => getQuestionsByGroup(g));
  return [...older].sort(() => Math.random() - 0.5).slice(0, count);
}
