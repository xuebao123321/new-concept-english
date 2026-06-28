import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getQuestionsByGroup } from '../data/questions';
import { LESSON_GROUPS } from '../data/lessons';
import QuestionCard from '../components/questions/QuestionCard';
import Confetti from '../components/common/Confetti';
import { analyzeDiagnosis } from '../utils/diagnosis-analyzer';
import type { Question, BlockType } from '../types';
import type { DiagnosisAnswer, DiagnosisResult } from '../utils/diagnosis-analyzer';

type Phase = 'intro' | 'testing' | 'result';

const BLOCK_LABELS: Record<BlockType, { name: string; emoji: string }> = {
  vocabulary: { name: '词汇', emoji: '📡' },
  grammar: { name: '语法', emoji: '🔧' },
  sentence: { name: '句型', emoji: '🗣️' },
  listening: { name: '听力', emoji: '📻' },
};

const LEVEL_INFO: Record<string, { label: string; color: string; icon: string }> = {
  beginner: { label: '初学者', color: '#94A3B8', icon: '🌱' },
  elementary: { label: '基础级', color: '#5B9ED4', icon: '⚡' },
  intermediate: { label: '进阶级', color: '#FBBF24', icon: '🌟' },
  advanced: { label: '高级', color: '#5B9A5A', icon: '🏛️' },
};

export default function DiagnosisPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('intro');
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<DiagnosisAnswer[]>([]);
  const [result, setResult] = useState<DiagnosisResult | null>(null);

  // 生成诊断题目：每课组 1-2 题，总计约 20 题
  const diagQuestions = useMemo(() => {
    const selected: Question[] = [];
    for (const group of LESSON_GROUPS) {
      const qs = getQuestionsByGroup(group);
      // 优先 medium 难度
      const mediums = qs.filter(q => q.difficulty === 'medium');
      const others = qs.filter(q => q.difficulty !== 'medium');
      const pool = [...mediums, ...others];
      // 每课组取 1-2 题
      const count = Math.min(2, pool.length);
      const picked = [...pool].sort(() => Math.random() - 0.5).slice(0, count);
      selected.push(...picked);
    }
    // 确保题型多样性：每种题型至少 2 题
    return selected.sort(() => Math.random() - 0.5);
  }, []);

  const totalQuestions = diagQuestions.length;
  const cur = diagQuestions[idx];

  const handleAnswer = useCallback(
    (_answer: string, correct: boolean, _timeSpent: number) => {
      if (!cur) return;

      const ans: DiagnosisAnswer = {
        questionId: cur.id,
        lessonGroup: cur.lessonGroup,
        questionType: cur.type,
        block: (cur as any).block || 'vocabulary',
        correct,
      };

      const newAnswers = [...answers, ans];
      setAnswers(newAnswers);

      setTimeout(() => {
        if (idx < diagQuestions.length - 1) {
          setIdx(prev => prev + 1);
        } else {
          // 分析结果
          const diagnosisResult = analyzeDiagnosis(newAnswers);
          setResult(diagnosisResult);
          setPhase('result');
        }
      }, 600);
    },
    [idx, diagQuestions.length, cur, answers]
  );

  // ── Phase 1：介绍 ──
  if (phase === 'intro') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 bg-cream">
        <motion.div
          className="text-center space-y-5 max-w-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div
            className="text-6xl"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            🔬
          </motion.div>
          <div className="glass-panel p-6 space-y-4">
            <div className="flex items-center gap-2 justify-center">
              <span className="text-2xl">🔬</span>
              <span className="text-sm font-bold text-ink">光头强：让我来检测一下你的英语水平！</span>
            </div>
            <div className="text-sm text-ink-light leading-relaxed text-left space-y-2">
              <p>📋 将从 <strong className="text-forest">12 个课组</strong> 中抽取约 <strong className="text-forest">20 题</strong></p>
              <p>🎯 覆盖 <strong className="text-forest">4 个维度</strong>：词汇 · 语法 · 句型 · 听力</p>
              <p>⏱️ 预计用时：<strong className="text-honey">3-5 分钟</strong></p>
              <p className="text-xs text-ink-muted">诊断结果不会保存到正式学习记录，可随时重新测试</p>
            </div>
          </div>
          <button
            onClick={() => setPhase('testing')}
            className="w-full py-3 btn-primary text-base"
          >
            🚀 开始诊断
          </button>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-ink-muted hover:text-ink-light"
          >
            返回首页
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Phase 2：答题 ──
  if (phase === 'testing' && cur) {
    return (
      <div className="min-h-screen px-4 py-4 bg-cream">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setPhase('intro')}
            className="text-sm font-bold text-ink-muted hover:text-ink-light"
          >
            ← 退出
          </button>
          <div className="flex items-center gap-1.5">
            <span className="text-sm">🔬</span>
            <span className="text-xs font-bold text-ink">快速诊断</span>
          </div>
          <span className="text-xs font-bold text-ink-muted">
            第 {idx + 1}/{totalQuestions} 题
          </span>
        </div>

        <div className="h-1.5 bg-warm-bg rounded-full mb-4 overflow-hidden">
          <div
            className="h-full rounded-full progress-shimmer transition-all duration-500"
            style={{ width: `${(idx / totalQuestions) * 100}%` }}
          />
        </div>

        <QuestionCard
          question={cur}
          questionNumber={idx + 1}
          totalQuestions={totalQuestions}
          onAnswer={handleAnswer}
        />
      </div>
    );
  }

  // ── Phase 3：结果 ──
  if (phase === 'result' && result) {
    const level = LEVEL_INFO[result.overallLevel];

    return (
      <div className="px-4 py-5 space-y-5 bg-cream min-h-screen">
        <Confetti active={result.overallLevel === 'advanced'} />

        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-5xl mb-2">{level.icon}</div>
          <h2 className="text-xl font-extrabold text-ink">诊断完成</h2>
          <p className="text-sm font-bold mt-1" style={{ color: level.color }}>
            {level.label} · 整体正确率 {Math.round(answers.filter(a => a.correct).length / answers.length * 100)}%
          </p>
        </motion.div>

        {/* 四维能力条 */}
        <motion.div
          className="glass-panel p-4 space-y-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-sm font-bold text-ink mb-2">📊 四维能力</h3>
          {([
            { key: 'vocabularyAccuracy' as const, ...BLOCK_LABELS.vocabulary, color: '#5B9ED4' },
            { key: 'grammarAccuracy' as const, ...BLOCK_LABELS.grammar, color: '#7E57C2' },
            { key: 'sentenceAccuracy' as const, ...BLOCK_LABELS.sentence, color: '#5B9A5A' },
            { key: 'listeningAccuracy' as const, ...BLOCK_LABELS.listening, color: '#FF8C42' },
          ]).map(item => {
            const pct = result[item.key];
            return (
              <div key={item.key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold text-ink-light">{item.emoji} {item.name}</span>
                  <span className="font-bold" style={{ color: item.color }}>{pct}%</span>
                </div>
                <div className="h-2 bg-warm-bg rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: item.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                  />
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* 薄弱课组 */}
        {result.weakGroups.length > 0 && (
          <motion.div
            className="glass-panel p-4 border-berry/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-sm font-bold text-berry mb-2">⚠️ 需要加强的课组</h3>
            <div className="space-y-2">
              {result.weakGroups.map(group => (
                <button
                  key={group}
                  onClick={() => navigate(`/lesson/${group}`)}
                  className="w-full text-left p-2.5 rounded-xl bg-berry/5 border border-berry/15
                             hover:bg-berry/10 transition-colors flex items-center justify-between"
                >
                  <span className="text-xs font-bold text-ink">{group}</span>
                  <span className="text-xs text-berry">
                    {result.lessonGroupAccuracies[group]}% →
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* 光头强建议 */}
        <motion.div
          className="glass-panel p-4 border-forest/20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🔬</span>
            <span className="text-sm font-bold text-ink">光头强建议</span>
          </div>
          <div className="text-xs text-ink-light space-y-1.5">
            {result.weakGroups.length > 0 ? (
              <>
                <p>🎯 优先复习课组：<strong className="text-forest">{result.weakGroups.join('、')}</strong></p>
                {result.weakTypes.length > 0 && (
                  <p>📝 重点题型：<strong className="text-honey">{result.weakTypes.join('、')}</strong></p>
                )}
              </>
            ) : (
              <p>✅ 没有明显薄弱课组，继续保持！</p>
            )}
            <p>⏱️ 预计需要 <strong className="text-honey">{result.estimatedDaysToMaster}</strong> 天完成巩固</p>
          </div>
        </motion.div>

        {/* 操作按钮 */}
        <div className="space-y-3">
          {result.weakGroups.length > 0 && (
            <button
              onClick={() => navigate(`/lesson/${result.weakGroups[0]}`)}
              className="w-full py-3 btn-primary text-sm"
            >
              🎯 开始针对性学习
            </button>
          )}
          <button
            onClick={() => { setPhase('intro'); setIdx(0); setAnswers([]); setResult(null); }}
            className="w-full py-3 bg-warm-bg text-ink-light font-bold rounded-xl border border-warm-border"
          >
            🔄 重新诊断
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 bg-white text-ink-muted text-sm rounded-xl"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return null;
}
