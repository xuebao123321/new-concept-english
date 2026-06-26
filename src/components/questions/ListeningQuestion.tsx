import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ListeningQuestion } from '../../types';

interface ListeningQuestionProps {
  question: ListeningQuestion;
  onAnswer: (answer: string, correct: boolean, timeSpent: number) => void;
  startTime: number;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export default function ListeningQuestionComp({ question, onAnswer, startTime }: ListeningQuestionProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handlePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio.currentTime = question.audioStartTime || 0;
      audio.play().catch(() => {});
      setIsPlaying(true);
      setPlayCount(c => c + 1);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [question.audioStartTime]);

  const handleAudioEnded = () => {
    setIsPlaying(false);
    if (audioRef.current && question.audioEndTime) {
      audioRef.current.currentTime = question.audioStartTime || 0;
    }
  };

  const handleSelect = (index: number) => {
    if (showResult) return;
    setSelected(index);
    setShowResult(true);

    const timeSpent = (Date.now() - startTime) / 1000;
    const correct = index === question.correctIndex;

    setTimeout(() => {
      onAnswer(question.options[index], correct, timeSpent);
    }, 1000);
  };

  const getOptionStyle = (index: number) => {
    if (!showResult) {
      return index === selected
        ? 'border-forest/60 bg-forest/10'
        : 'border-warm-border bg-warm-bg hover:border-forest/30';
    }
    if (index === question.correctIndex) {
      return 'border-forest/60 bg-forest/10';
    }
    if (index === selected && index !== question.correctIndex) {
      return 'border-berry/60 bg-berry/10';
    }
    return 'border-warm-border bg-white opacity-40';
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-light">{question.prompt}</p>

      {/* 播放按钮 */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-forest/5 border border-forest/20">
        <motion.button
          onClick={handlePlay}
          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl
                     bg-warm-bg border-2 border-forest/40 text-forest
                     shadow-[0_0_20px_rgba(91,158,212,0.15)]"
          whileTap={{ scale: 0.9 }}
          animate={isPlaying ? { scale: [1, 1.06, 1], borderColor: ['rgba(91,158,212,0.4)', 'rgba(91,158,212,0.8)', 'rgba(91,158,212,0.4)'] } : {}}
          transition={{ repeat: isPlaying ? Infinity : 0, duration: 1.5 }}
        >
          {isPlaying ? '⏸' : '▶'}
        </motion.button>

        <div className="flex-1">
          <div className="text-sm font-medium text-ink">
            {isPlaying ? '正在播放...' : `已播放 ${playCount} 遍`}
          </div>
          {isPlaying && (
            <div className="flex gap-1 mt-2">
              {[0, 1, 2, 3].map(i => (
                <motion.div
                  key={i}
                  className="w-1.5 bg-forest rounded-full"
                  animate={{ height: [8, 16 + Math.random() * 12, 8] }}
                  transition={{ repeat: Infinity, duration: 0.6 + i * 0.15, delay: i * 0.1 }}
                />
              ))}
            </div>
          )}
          {!isPlaying && (
            <div className="text-xs text-ink-muted mt-1">点击播放按钮听音频（可重复播放）</div>
          )}
        </div>
      </div>

      {/* hidden audio */}
      <audio
        ref={audioRef}
        src={question.audioSrc}
        onEnded={handleAudioEnded}
        onPause={() => setIsPlaying(false)}
        className="hidden"
      />

      {/* 问题 */}
      <p className="text-base font-semibold text-ink">{question.question}</p>

      {/* 选项 */}
      <div className="space-y-2.5">
        {question.options.map((option, index) => (
          <motion.button
            key={index}
            onClick={() => handleSelect(index)}
            className={`w-full text-left p-3.5 rounded-xl border transition-all ${getOptionStyle(index)}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.08 }}
            whileTap={{ scale: 0.98 }}
            disabled={showResult}
          >
            <div className="flex items-center gap-3">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  !showResult && selected === index
                    ? 'bg-forest text-[#0F172A]'
                    : showResult && index === question.correctIndex
                    ? 'bg-forest text-white'
                    : showResult && index === selected && index !== question.correctIndex
                    ? 'bg-berry text-white'
                    : 'bg-warm-bg text-ink-light'
                }`}
              >
                {OPTION_LABELS[index]}
              </span>
              <span className="font-medium text-ink">{option}</span>
              {showResult && index === question.correctIndex && (
                <span className="ml-auto text-lg">✅</span>
              )}
              {showResult && index === selected && index !== question.correctIndex && (
                <span className="ml-auto text-lg">❌</span>
              )}
            </div>
          </motion.button>
        ))}
      </div>

      {/* 听力原文 + 解析 */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            className="space-y-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="p-3 rounded-xl bg-forest/5 border border-forest/20">
              <div className="text-xs text-forest mb-1">📝 听力原文：</div>
              <div className="text-sm text-ink">{question.transcript}</div>
            </div>
            <div className="text-xs text-ink-light leading-relaxed whitespace-pre-line">
              {question.explanation}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
