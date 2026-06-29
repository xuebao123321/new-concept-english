import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { SpeakingQuestion } from '../../types';

interface Props {
  question: SpeakingQuestion;
  onAnswer: (answer: string, correct: boolean, timeSpent: number) => void;
  startTime: number;
}

export default function SpeakingQuestionComp({ question, onAnswer, startTime }: Props) {
  const [status, setStatus] = useState<'idle' | 'listening' | 'result'>('idle');
  const [transcript, setTranscript] = useState('');
  const [passed, setPassed] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
    } else {
      const rec = new SpeechRecognition();
      rec.lang = 'en-US';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      recognitionRef.current = rec;
    }
  }, []);

  const startListening = () => {
    if (!recognitionRef.current) return;
    setStatus('listening');
    setTranscript('');

    const rec = recognitionRef.current;
    rec.start();

    rec.onresult = (event: any) => {
      const text = event.results[0][0].transcript.toLowerCase().trim();
      setTranscript(text);
      const matchCount = question.keywords.filter(kw =>
        text.includes(kw.toLowerCase())
      ).length;
      const isPassed = matchCount >= Math.min(2, question.keywords.length);
      setPassed(isPassed);
      setStatus('result');
      const timeSpent = (Date.now() - startTime) / 1000;
      setTimeout(() => onAnswer(text, isPassed, timeSpent), 2000);
    };

    rec.onerror = () => {
      setStatus('idle');
      setTranscript('(识别失败,请重试)');
    };
  };

  if (!speechSupported) {
    return <ManualMode question={question} onAnswer={onAnswer} startTime={startTime} />;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-light">{question.prompt}</p>

      <div className="p-4 rounded-xl bg-sky-pale border border-sky/30 text-center space-y-3">
        <p className="text-h2 font-extrabold text-ink">{question.sentence}</p>
        <p className="text-sm text-ink-muted">💡 {question.chineseHint}</p>

        {status === 'idle' && (
          <button onClick={startListening}
            className="w-full py-3 rounded-xl bg-forest text-cream font-bold text-sm
                       hover:bg-forest/90 active:scale-[0.98] transition-all shadow-sm">
            🎤 开始朗读
          </button>
        )}

        {status === 'listening' && (
          <motion.div className="py-3"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <span className="text-2xl">🎤</span>
            <p className="text-sm text-ink-light mt-1 animate-pulse">正在聆听...</p>
          </motion.div>
        )}

        {status === 'result' && (
          <div>
            <p className="text-sm text-ink-light">识别结果:</p>
            <p className="text-base font-bold text-ink mt-0.5">{transcript || '(未识别到语音)'}</p>
            <p className={`text-sm font-bold mt-1.5 ${passed ? 'text-forest' : 'text-berry'}`}>
              {passed ? '✅ 发音不错!' : '❌ 再试试?'}
            </p>
          </div>
        )}
      </div>

      {question.keywords.length > 0 && (
        <p className="text-[10px] text-ink-muted text-center">
          检测关键词: {question.keywords.join(', ')}
        </p>
      )}
    </div>
  );
}

/** 手动模式: 显示句子 → 学生自己读 → 自评 */
function ManualMode({ question, onAnswer, startTime }: Props) {
  const [step, setStep] = useState<'idle' | 'done'>('idle');

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-light">{question.prompt}</p>

      <div className="p-4 rounded-xl bg-sky-pale border border-sky/30 text-center space-y-3">
        <p className="text-h2 font-extrabold text-ink">{question.sentence}</p>
        <p className="text-sm text-ink-muted">💡 {question.chineseHint}</p>
        <p className="text-xs text-ink-muted">⚠️ 你的浏览器不支持语音识别,请自己朗读后判断</p>

        {step === 'idle' ? (
          <button onClick={() => setStep('done')}
            className="w-full py-3 rounded-xl bg-forest text-cream font-bold text-sm
                       hover:bg-forest/90 active:scale-[0.98] transition-all shadow-sm">
            ✅ 我读完了
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-ink-light">你觉得读得怎么样?</p>
            <div className="flex gap-2">
              <button
                onClick={() => onAnswer('self-correct', true, (Date.now() - startTime) / 1000)}
                className="flex-1 py-2.5 rounded-xl bg-forest-pale text-forest border border-forest/30 font-bold text-sm">
                👍 读对了
              </button>
              <button
                onClick={() => onAnswer('self-wrong', false, (Date.now() - startTime) / 1000)}
                className="flex-1 py-2.5 rounded-xl bg-berry-pale text-berry border border-berry/30 font-bold text-sm">
                👎 还需练习
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
