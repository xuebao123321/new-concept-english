import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Question } from '../../types';

interface Props {
  question: Question | null;
  fallback?: { question_text: string; correct_answer: string; question_type: string };
  onAnswer: (correct: boolean, userAnswer: string) => void;
}

export default function ReviewQuestionCard({ question, fallback, onAnswer }: Props) {
  const [userInput, setUserInput] = useState('');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const isChoiceLike = question
    ? (question.type === 'choice' || question.type === 'listening')
    : (fallback?.question_type === 'choice' || fallback?.question_type === 'listening');

  const handleSubmit = () => {
    if (submitted) return;

    let correct = false;
    let answer = '';

    if (question) {
      if (question.type === 'choice' || question.type === 'listening') {
        correct = selectedIndex === question.correctIndex;
        answer = 'options' in question ? (question.options[selectedIndex ?? -1] ?? '') : '';
      } else if (question.type === 'fill') {
        answer = userInput.trim();
        correct = question.acceptableAnswers.some(
          a => a.toLowerCase() === answer.toLowerCase(),
        );
      } else if (question.type === 'translate') {
        answer = userInput.trim();
        const keywords = question.keywords || [];
        correct = keywords.length > 0 && keywords.every(
          k => answer.toLowerCase().includes(k.toLowerCase()),
        );
      } else if (question.type === 'reorder') {
        answer = userInput.trim();
        correct = answer.toLowerCase() === question.correctSentence.toLowerCase();
      } else if (question.type === 'speak') {
        answer = userInput.trim();
        const keywords = question.keywords || [];
        correct = keywords.length > 0 && keywords.every(
          k => answer.toLowerCase().includes(k.toLowerCase()),
        );
      } else {
        answer = userInput.trim();
      }
    } else if (fallback) {
      answer = userInput.trim();
      correct = answer.toLowerCase() === fallback.correct_answer.toLowerCase();
    }

    setIsCorrect(correct);
    setSubmitted(true);
    setTimeout(() => onAnswer(correct, answer), 1200);
  };

  // ── 获取正确答案展示文本 ──
  const getCorrectAnswerText = (): string => {
    if (!question) return fallback?.correct_answer || '';
    if (question.type === 'choice' || question.type === 'listening') {
      return 'options' in question ? (question.options[question.correctIndex] ?? '') : '';
    }
    if (question.type === 'fill') return question.answer;
    if (question.type === 'translate') return question.acceptableAnswers?.[0] || '';
    if (question.type === 'reorder') return question.correctSentence;
    return '';
  };

  const getExplanation = (): string => {
    if (!question) return '';
    return (question as any).explanation || '';
  };

  // ── 渲染 ──
  return (
    <div className="card p-4 bg-white space-y-3 border border-warm-border">
      {/* 题目内容 */}
      {question ? (
        <>
          <p className="text-sm font-bold text-ink">{question.prompt}</p>

          {'question' in question && (question as any).question && (
            <p className="text-xs text-ink-light">{(question as any).question}</p>
          )}

          {'sentence' in question && (question as any).sentence && (
            <p className="text-base font-mono text-ink bg-warm-bg p-2 rounded-lg">
              {(question as any).sentence}
            </p>
          )}

          {'sourceText' in question && (
            <p className="text-base text-ink bg-warm-bg p-2 rounded-lg">
              {(question as any).sourceText}
            </p>
          )}

          {'chineseHint' in question && (question as any).chineseHint && (
            <p className="text-xs text-ink-muted">💡 {(question as any).chineseHint}</p>
          )}

          {/* 选择题 / 听力题 */}
          {isChoiceLike && 'options' in question && (
            <div className="space-y-2">
              {(question as any).options.map((opt: string, i: number) => (
                <button
                  key={i}
                  onClick={() => !submitted && setSelectedIndex(i)}
                  disabled={submitted}
                  className={`w-full p-3 rounded-xl text-left text-sm font-bold border transition-all ${
                    submitted && i === (question as any).correctIndex
                      ? 'bg-forest-pale border-forest text-forest'
                      : submitted && i === selectedIndex && i !== (question as any).correctIndex
                        ? 'bg-berry-pale border-berry text-berry'
                        : selectedIndex === i
                          ? 'bg-sky-pale border-sky'
                          : 'bg-warm-bg border-warm-border hover:border-forest/30'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* 填空 / 翻译 / 连词成句 / 口语 */}
          {!isChoiceLike && (
            <input
              type="text"
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
              disabled={submitted}
              placeholder="输入你的答案..."
              className="w-full p-3 rounded-xl border-2 border-warm-border text-sm font-bold
                         focus:border-forest outline-none disabled:opacity-50"
              autoFocus
            />
          )}
        </>
      ) : fallback ? (
        <>
          <p className="text-xs text-ink-muted font-bold">📝 原题记录</p>
          <p className="text-sm font-bold text-ink">
            {fallback.question_text || '(题目内容未保存)'}
          </p>
          <input
            type="text"
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
            disabled={submitted}
            placeholder="输入你的答案..."
            className="w-full p-3 rounded-xl border-2 border-warm-border text-sm font-bold
                       focus:border-forest outline-none disabled:opacity-50"
            autoFocus
          />
        </>
      ) : (
        <p className="text-sm text-ink-muted text-center py-4">题目数据不可用</p>
      )}

      {/* 提交按钮 */}
      {!submitted && (question || fallback) && (
        <button
          onClick={handleSubmit}
          disabled={isChoiceLike ? selectedIndex === null : !userInput.trim()}
          className="w-full py-2.5 text-sm font-bold rounded-xl bg-forest text-cream
                     hover:bg-forest/90 disabled:opacity-40 active:scale-[0.98] transition-all"
        >
          ✅ 提交答案
        </button>
      )}

      {/* 结果反馈 */}
      {submitted && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3 rounded-xl text-center text-sm font-bold ${
            isCorrect ? 'bg-forest-pale text-forest' : 'bg-berry-pale text-berry'
          }`}
        >
          {isCorrect ? '✅ 答对了！' : '❌ 答错了'}
          {!isCorrect && (
            <span className="block text-xs mt-0.5">
              正确答案: {getCorrectAnswerText()}
            </span>
          )}
          {getExplanation() && (
            <span className="block text-xs mt-1 text-ink-light">
              {getExplanation()}
            </span>
          )}
        </motion.div>
      )}
    </div>
  );
}
