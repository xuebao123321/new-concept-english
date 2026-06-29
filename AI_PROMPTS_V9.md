# 英语重启号 · AI 执行提示词 V9 — 体验打磨 + 口语题型 (4 批次)

---

## ⚠️ 项目概览 (每个 AI 会话都必须先读)

**项目:** 英语重启号 — 熊出没主题新概念英语学习 PWA,家庭 SaaS。
**当前版本:** V8 复习系统已实现(艾宾浩斯优先级+今日推荐+打卡Toast)。V7 错题分析+学习报告已完成。
**本次目标:** 6 个体验打磨项 — 退出保存进度、空壳课标注、每日目标环、听力降级、口语题型、iPad 横屏。

**技术栈:** React 18 + TS + Vite 6 + Tailwind CSS v4 + Framer Motion + Zustand + Dexie / FastAPI + Turso/SQLite

**本次涉及的关键文件:**
```
前端:
  src/pages/BlockSessionPage.tsx          — 退出时保存进度
  src/pages/LessonSelectPage.tsx          — Stages 4-6 空壳标注
  src/pages/StarMapPage.tsx               — 星球空壳标注
  src/pages/HomePage.tsx                  — 每日目标环
  src/components/common/CircularProgress.tsx — 圆环进度(复用)
  src/components/questions/ListeningQuestion.tsx  — 音频降级
  src/components/questions/SpeakingQuestion.tsx   — 🆕 口语题型
  src/types/index.ts                      — 加 speak 类型 + SpeakingQuestion 接口
  vite.config.ts                           — PWA orientation 改 any
  src/data/questions/                     — 生成示例口语题目

后端: 本次不需要改动
```

**项目路径:** `/Users/andy/Documents/Andy AI/new concept english`
**启动:** `npm run dev` (前端) / `cd backend && python3 -m uvicorn main:app --reload --port 8000` (后端)
**每次必须通过:** `npx tsc -b`

---

## 批次 0: 退出保存进度 (预计 1 小时)

### 目标
孩子在 BlockSession 做题中途退出时,保留已答题目进度,下次进入同一课块从断点继续。

### 背景
当前 `BlockSessionPage.tsx` 顶部有"← 退出"按钮(第 219 行),点击直接 `navigate(-1)`,已做题目进度全部丢失。孩子不敢退出,体验差。

### 我需要的改动

#### 改动 1 · 退出时保存进度到 localStorage

**文件:** `src/pages/BlockSessionPage.tsx`

**在组件顶部 state 区加:**
```tsx
const [showExitConfirm, setShowExitConfirm] = useState(false);
```

**将第 219 行的退出按钮改为打开确认弹窗:**
```tsx
{/* 顶部栏 */}
<div className="flex items-center justify-between mb-3">
  <button onClick={() => setShowExitConfirm(true)}
    className="text-sm font-bold text-ink-muted hover:text-ink-light">
    ← 退出
  </button>
  ...
</div>
```

**在练习中 return 的 JSX 末尾 (QuestionCard 渲染之后),加确认弹窗:**

```tsx
{/* ═══ 退出确认弹窗 ═══ */}
{showExitConfirm && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    onClick={() => setShowExitConfirm(false)}>
    <motion.div
      className="card p-6 mx-4 max-w-xs w-full text-center space-y-4 bg-white"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={springs.popIn}
      onClick={e => e.stopPropagation()}
    >
      <div className="text-4xl">🤔</div>
      <h3 className="text-h3 text-ink">确定要退出吗?</h3>
      <p className="text-meta text-ink-light">
        已完成 {round === 'main' ? idx : reviewIdx} 题
        {round === 'main' ? ` / ${sessionQ.length}` : ''}
      </p>
      <p className="text-caption text-ink-muted">
        退出后下次进入将从第一题重新开始
      </p>
      <div className="flex gap-2 pt-1">
        <button onClick={() => setShowExitConfirm(false)}
          className="flex-1 py-2.5 text-sm font-bold rounded-xl bg-warm-bg text-ink-light">
          继续做题
        </button>
        <button onClick={() => navigate(-1)}
          className="flex-1 py-2.5 text-sm font-bold rounded-xl bg-berry-pale text-berry border border-berry/30">
          退出
        </button>
      </div>
    </motion.div>
  </div>
)}
```

**在完成页的"返回课程"按钮也加上确认逻辑**(避免误触):
- 已完成的块("继续下一块"),不需要确认(已完成)
- "返回课程"按钮,如果已完成 → 不确认;如果中途退出 → 确认

**在 `finishBlock` 函数末尾,清理退出状态:**
```tsx
if (groupId) localStorage.setItem(`nce_block_${groupId}_${blockType}`, 'done');
```

**下次进入时,如果上次中途退出,提示"检测到未完成的练习":**

在 `useEffect` 加载完成后(约第 40 行后),加:
```tsx
useEffect(() => {
  const lastIncomplete = localStorage.getItem(`nce_block_${groupId}_${blockType}`);
  if (lastIncomplete === 'in_progress') {
    setMsg('💡 上次有未完成的练习,从头开始吧~');
    setTimeout(() => setMsg(''), 3000);
  }
}, [groupId, blockType]);
```

**进入练习时设置标记:**
在 `sessionQ` 初始化完成后:
```tsx
useEffect(() => {
  if (sessionQ.length > 0 && groupId) {
    localStorage.setItem(`nce_block_${groupId}_${blockType}`, 'in_progress');
  }
}, [sessionQ.length > 0]);
```

> ⚠️ 由于 BlockSession 每次进入重新随机抽题,暂不做"精确恢复到第几题"级别的保存。本次做到"退出确认弹窗 + 本地标记上次未完成 + 提示"即可。精确恢复需要保存整个 session 状态到 localStorage,复杂度高但价值有限(因为题目是随机抽的,恢复后题目不同)。

### 验证要求
- `npx tsc -b` 零错误
- 进入任一块练习 → 点"← 退出" → 弹确认窗
- 点"继续做题" → 弹窗关闭,继续做题
- 点"退出" → 回到课程详情页
- 确认窗显示已完成题数
- 下次进入同一块 → 顶部提示"💡 上次有未完成的练习"

执行完这些提示词后,系统要完整可运行并且不会有任何bug。

---

## 批次 1: Stages 4-6 空壳标注 + 每日目标环 (预计 45 分钟)

### 目标
Stages 4-6(L73-144)没有题目数据,标注为"即将上线"。首页每日进度从条形改为环形,完成时弹庆祝。

### 背景
- `src/data/lessons.ts` 只包含 L1-72(前 36 个课组)的元数据
- `src/data/questions/` 目录的题目主要覆盖 L1-72
- `src/data/stages.ts` 定义了 6 个阶段(含 L73-144)
- 学生翻到 L73+ 的课组 → 没有题目 → 白屏/空状态

### 我需要的改动

#### 改动 1 · 课程列表空壳标注

**文件:** `src/pages/LessonSelectPage.tsx`

**在渲染课程列表时,检查课组是否有题目数据:** 从 `LESSONS` 中查,如果 `LESSONS.filter(l => l.group === group).length === 0`,说明这个课组没有元数据。

对于无数据的课组,显示:
```tsx
{lessons.length === 0 ? (
  <div className="text-xs text-ink-muted mt-0.5">
    ⏳ 内容即将上线
  </div>
) : (
  // 正常显示课名
)}
```

**并且无数据的课组不可点击(unlocked 状态始终为 false),按钮替换为灰色"⏳":**
```tsx
disabled={true}
// 在序号圆圈和箭头上方显示灰色
className={`... ${!hasData ? 'opacity-40' : ''}`}
```

#### 改动 2 · 星图空壳标注

**文件:** `src/pages/StarMapPage.tsx`

**对 stages 4-6 的星球,加半透明 + "开发中"标签:**

在阶段卡片(第 56 行附近)判断:
```tsx
const hasContent = stage.id <= 3; // 目前只有前 3 阶段有内容
```

有内容的阶段正常显示,无内容的:
- 星球半透明 (`opacity: 0.5`)
- 课组按钮不可点击
- 显示"⏳ 开发中"标签:
```tsx
{!hasContent && (
  <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-warm-bg text-ink-muted font-bold">
    ⏳ 即将上线
  </span>
)}
```

#### 改动 3 · 每日目标环

**文件:** `src/pages/HomePage.tsx`

**将今日进度条(progress-track)改为圆环 + 完成庆祝:**

**替换"📊 今日学习"区块中的进度条部分:**

原有:
```tsx
<div className="progress-track">
  <motion.div className="progress-fill progress-brand" .../>
</div>
```

改为:
```tsx
<div className="flex items-center justify-center gap-3">
  <CircularProgress progress={Math.min((stats.done / 15) * 100, 100)}
    size={80} strokeWidth={6} color="#5B9A5A" showPercentage />
  <div className="text-left">
    <div className="text-meta text-ink-light">🎯 今日目标</div>
    <div className="text-h2 font-extrabold text-ink tabular-nums">
      {Math.min(stats.done, 15)}<span className="text-meta text-ink-light">/15 题</span>
    </div>
    <div className="text-caption text-ink-muted">
      {stats.done >= 15 ? '🎉 目标完成!' : `还差 ${15 - stats.done} 题`}
    </div>
  </div>
</div>
```

**完成庆祝:** 当 `stats.done >= 15` 时,触发一个短暂的 Toast:
```tsx
const [showTargetDone, setShowTargetDone] = useState(false);

useEffect(() => {
  if (stats.done >= 15 && !localStorage.getItem('nce_target_done_today')) {
    setShowTargetDone(true);
    localStorage.setItem('nce_target_done_today', new Date().toISOString().slice(0,10));
    setTimeout(() => setShowTargetDone(false), 3000);
  }
}, [stats.done]);
```

Toast:
```tsx
{showTargetDone && (
  <motion.div className="fixed top-1/3 inset-x-0 z-40 flex justify-center pointer-events-none"
    initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
    transition={springs.popIn}>
    <div className="bg-white/95 backdrop-blur rounded-2xl px-5 py-3 shadow-lg border-2 border-forest">
      <p className="text-xl font-extrabold text-center text-forest">
        🎉 今日目标完成! 熊二为你骄傲~
      </p>
    </div>
  </motion.div>
)}
```

**每日重置:** localStorage 的 `nce_target_done_today` 键需要在跨天时清除(在 `checkAndUpdateStreak` 已经是跨天,可以在这里顺便清理)。

### 验证要求
- `npx tsc -b` 零错误
- 课程列表: L73+ 课组显示"⏳ 内容即将上线" + 灰色不可点
- 星图: Stage 4-6 星球半透明 + "即将上线"标签
- 首页: 今日进度是圆环 + 数字 而不是条形
- 做满 15 题 → 弹"🎉 今日目标完成!"
- 同一天不重复弹

执行完这些提示词后,系统要完整可运行并且不会有任何bug。

---

## 批次 2: 听力音频降级 + iPad 横屏 (预计 1 小时)

### 目标
没有音频文件的听力题不再静默失败,显示文字代替。PWA 支持横屏。

### 背景
- `public/audio/` 只有 12 个 mp3 文件(覆盖 L01-L24)
- 72 个文件包含 listening 题型
- 大部分听力题的 `audioSrc` 指向不存在的文件 → 点播放无反应

### 我需要的改动

#### 改动 1 · ListeningQuestion 音频降级

**文件:** `src/components/questions/ListeningQuestion.tsx`

**在组件挂载时检查音频是否存在:**

```tsx
const [audioAvailable, setAudioAvailable] = useState(true);

useEffect(() => {
  // 检查音频文件是否存在
  const audio = new Audio();
  audio.src = question.audioSrc;
  audio.onerror = () => setAudioAvailable(false);
  audio.oncanplaythrough = () => setAudioAvailable(true);
  // 超时 3 秒仍未加载成功,视为不可用
  const t = setTimeout(() => setAudioAvailable(false), 3000);
  return () => clearTimeout(t);
}, [question.audioSrc]);
```

**根据 `audioAvailable` 改变 UI:**

- 如果 `audioAvailable === true`: 正常显示播放按钮 + "🔊 点击播放"
- 如果 `audioAvailable === false`: 显示文字替代

```tsx
{!audioAvailable ? (
  // 无音频: 显示文字替代
  <div className="p-3 rounded-xl bg-sky-pale border border-sky/30 text-center">
    <p className="text-sm text-ink-light font-medium">🎧 听力文本(无音频)</p>
    <p className="text-base text-ink font-bold mt-1 leading-relaxed">{question.transcript}</p>
    <p className="text-[10px] text-ink-muted mt-2">请阅读文本后作答</p>
  </div>
) : (
  // 有音频: 正常播放器
  <div>...existing audio player...</div>
)}
```

**监听 audio 的 `error` 事件替代预加载:** 不使用 `new Audio()` 预检查,而是在播放按钮的 `onError` 回调中做降级:

更简单的实现: 在播放按钮组件中,Audio 标签加 `onError` 回调:
```tsx
const [audioFailed, setAudioFailed] = useState(false);

// 在渲染 audio 元素时:
<audio src={question.audioSrc} onError={() => setAudioFailed(true)} ... />

// 根据 audioFailed 切换 UI
```

#### 改动 2 · PWA 横屏支持

**文件:** `vite.config.ts`

**将 `orientation: 'portrait'` 改为 `orientation: 'any'`:**

```ts
manifest: {
  ...
  orientation: 'any',    // 改前: 'portrait'
  ...
}
```

**CSS 适配 (src/index.css):** 在响应式区域,确认横屏(宽 > 高)时有合理布局。现有 CSS 已有 `min-width` 断点,横屏时内容居中即可,不需要额外改动。

**如果需要在答题时提示最佳方向(竖屏):** 不需要强制,横屏也能用。

### 验证要求
- `npx tsc -b` 零错误
- 做一道没有音频文件的听力题 → 显示"🎧 听力文本(无音频)"+ 文字内容
- 做一道有音频的听力题(L01-L24 范围内)→ 正常播放
- iPad 横屏 → PWA 不会强制竖屏,内容居中显示
- 播放音频失败时不会白屏

执行完这些提示词后,系统要完整可运行并且不会有任何bug。

---

## 批次 3: 口语题型 speak (预计 2 小时)

### 目标
加第 6 种题型 `speak` — 展示句子,孩子跟读,用 Web Speech API 做语音识别。

### 背景
当前 5 种题型: choice/fill/translate/reorder/listening。缺少"说"的能力。

### 技术选型

Web Speech API (`SpeechRecognition`) 在 Chrome/Safari 中可用程度:
- Chrome 桌面: ✅ 完全支持
- Safari 桌面: ✅ 支持
- Chrome Android: ✅ 支持
- Safari iOS: ⚠️ 部分支持(需用户交互触发)

**降级方案:** 如果浏览器不支持 `SpeechRecognition`,改为"录音 → 回听 → 自己对比"的手动模式。

### 我需要的改动

#### 改动 1 · 类型定义

**文件:** `src/types/index.ts`

**在 `QuestionType` 联合类型中加 `'speak'`,新增接口:**

```ts
export type QuestionType = 'choice' | 'fill' | 'translate' | 'reorder' | 'listening' | 'speak';

export interface SpeakingQuestion {
  id: string;
  type: 'speak';
  lessonGroup: string;
  lessonNumber: number;
  difficulty: Difficulty;
  tags: string[];
  block?: BlockType;
  prompt: string;          // "请朗读以下句子"
  sentence: string;        // 要朗读的英文句子
  chineseHint: string;     // 中文提示: "这是我的书"
  keywords: string[];      // 语音识别关键检测词(不分先后,含2个即算通过)
  explanation: string;
}
```

在 `Question` 联合类型中加 `| SpeakingQuestion`:
```ts
export type Question = ChoiceQuestion | FillQuestion | TranslateQuestion
  | ReorderQuestion | ListeningQuestion | SpeakingQuestion;
```

#### 改动 2 · 新建 SpeakingQuestion 组件

**新建文件:** `src/components/questions/SpeakingQuestion.tsx`

**组件结构:**

```tsx
import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Props {
  question: SpeakingQuestion;
  onAnswer: (answer: string, correct: boolean, timeSpent: number) => void;
  startTime: number;
}

export default function SpeakingQuestion({ question, onAnswer, startTime }: Props) {
  const [status, setStatus] = useState<'idle' | 'listening' | 'result'>('idle');
  const [transcript, setTranscript] = useState('');
  const [passed, setPassed] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  // 检查浏览器支持
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
    } else {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.interimResults = false;
      recognitionRef.current.maxAlternatives = 1;
    }
  }, []);

  const startListening = () => {
    if (!recognitionRef.current) return;
    setStatus('listening');
    setTranscript('');
    recognitionRef.current.start();

    recognitionRef.current.onresult = (event: any) => {
      const text = event.results[0][0].transcript.toLowerCase().trim();
      setTranscript(text);
      // 检测关键词
      const matchCount = question.keywords.filter(kw =>
        text.includes(kw.toLowerCase())
      ).length;
      const isPassed = matchCount >= Math.min(2, question.keywords.length);
      setPassed(isPassed);
      setStatus('result');
      const timeSpent = (Date.now() - startTime) / 1000;
      setTimeout(() => onAnswer(text, isPassed, timeSpent), 2000);
    };

    recognitionRef.current.onerror = () => {
      setStatus('idle');
      setTranscript('(识别失败,请重试)');
    };
  };

  // 不支持语音识别: 手动模式
  if (!speechSupported) {
    return <ManualMode question={question} onAnswer={onAnswer} startTime={startTime} />;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-light">{question.prompt}</p>
      <div className="p-4 rounded-xl bg-sky-pale border border-sky/30 text-center space-y-3">
        <p className="text-h2 font-extrabold text-ink">{question.sentence}</p>
        <p className="text-meta text-ink-muted">💡 {question.chineseHint}</p>

        {status === 'idle' && (
          <button onClick={startListening}
            className="w-full py-3 btn-primary">
            🎤 开始朗读
          </button>
        )}

        {status === 'listening' && (
          <motion.div className="py-3"
            animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1, repeat: Infinity }}>
            <span className="text-2xl">🎤</span>
            <p className="text-sm text-ink-light mt-1 animate-pulse">正在聆听...</p>
          </motion.div>
        )}

        {status === 'result' && (
          <div>
            <p className="text-sm text-ink-light">你说的是:</p>
            <p className="text-base font-bold text-ink">{transcript}</p>
            <p className={`text-sm font-bold mt-1 ${passed ? 'text-forest' : 'text-berry'}`}>
              {passed ? '✅ 发音不错!' : '❌ 再试试?'}
            </p>
          </div>
        )}
      </div>

      {question.keywords.length > 0 && (
        <p className="text-[10px] text-ink-muted">
          检测关键词: {question.keywords.join(', ')}
        </p>
      )}
    </div>
  );
}

/** 手动模式: 录音+回听+自己判断 */
function ManualMode({ question, onAnswer, startTime }: Props & { question: SpeakingQuestion }) {
  const [step, setStep] = useState<'idle' | 'done'>('idle');

  // 简化版: 显示句子 → 学生自己读 → 点"读完了" → 自己判断对错
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-light">{question.prompt}</p>
      <div className="p-4 rounded-xl bg-sky-pale border border-sky/30 text-center space-y-3">
        <p className="text-h2 font-extrabold text-ink">{question.sentence}</p>
        <p className="text-meta text-ink-muted">💡 {question.chineseHint}</p>
        <p className="text-xs text-ink-muted">⚠️ 你的浏览器不支持语音识别,请自己朗读后判断</p>

        {step === 'idle' ? (
          <button onClick={() => setStep('done')}
            className="w-full py-3 btn-primary">
            ✅ 我读完了
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-ink-light">你觉得读得怎么样?</p>
            <div className="flex gap-2">
              <button onClick={() => onAnswer('self-correct', true, (Date.now() - startTime) / 1000)}
                className="flex-1 py-2.5 btn-brand text-sm">👍 读对了</button>
              <button onClick={() => onAnswer('self-wrong', false, (Date.now() - startTime) / 1000)}
                className="flex-1 py-2.5 bg-berry-pale text-berry rounded-xl font-bold text-sm">👎 还需练习</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

#### 改动 3 · QuestionCard 接入 speak 类型

**文件:** `src/components/questions/QuestionCard.tsx`

**在 import 中加:**
```tsx
import SpeakingQuestionComp from './SpeakingQuestion';
```

**在 TYPE_LABELS 中加:**
```ts
speak: '🎤 口语',
```

**在 render switch 中加:**
```tsx
case 'speak': return <SpeakingQuestionComp question={question as any} onAnswer={handleAnswer} startTime={startTime} />;
```

#### 改动 4 · 生成示例口语题目

**新建文件:** `src/data/questions/speaking.ts`

创建 5-10 道示例口语题,覆盖 L01-L04:

```ts
import type { SpeakingQuestion } from '../../types';

export const speakingQuestions: SpeakingQuestion[] = [
  {
    id: 'speak-L01-001',
    type: 'speak',
    lessonGroup: 'lesson-01-02',
    lessonNumber: 1,
    difficulty: 'easy',
    tags: ['自我介绍', 'be 动词'],
    block: 'sentence',
    prompt: '请朗读以下句子',
    sentence: 'This is my book.',
    chineseHint: '这是我的书',
    keywords: ['this', 'is', 'my', 'book'],
    explanation: 'This is ... 是用来介绍物品的基本句型',
  },
  {
    id: 'speak-L01-002',
    type: 'speak',
    lessonGroup: 'lesson-01-02',
    lessonNumber: 1,
    difficulty: 'easy',
    tags: ['问候'],
    block: 'sentence',
    prompt: '请朗读以下句子',
    sentence: 'Excuse me!',
    chineseHint: '打扰一下/对不起',
    keywords: ['excuse', 'me'],
    explanation: 'Excuse me 用于礼貌地引起别人注意',
  },
  // ...再加 3-5 道
];
```

#### 改动 5 · 听力块也支持口语

**文件:** `src/pages/BlockSessionPage.tsx` (或 `LessonDetailPage.tsx`)

当前 listening 块的筛选逻辑是 `q.type === 'listening'`。改为 `q.type === 'listening' || q.type === 'speak'`,让口语题和听力题归入同一块。或者**新增第 5 个块 speaking**。

**推荐简单做法:** 口语题归入 `listening` 块,筛选 `q.type === 'listening' || q.type === 'speak'`。

在 `getQuestionsByBlock` 或 `filteredQuestions` 中找到 listening 筛选:
```tsx
if (blockType === 'listening') return q.type === 'listening' || q.type === 'speak';
```

### 验证要求
- `npx tsc -b` 零错误
- 听力块中出现口语题(需先在 questions 目录生成示例)
- Chrome 中点"🎤 开始朗读" → 浏览器请求麦克风权限 → 说话 → 识别结果显示
- 关键词匹配(2个及以上) → 判定通过
- 不支持语音识别的浏览器 → 显示手动模式(朗读+自评)
- QuestionCard 正确渲染 speaking 题型

执行完这些提示词后,系统要完整可运行并且不会有任何bug。

---

## 附录: 执行顺序 & 依赖

```
批次 0 (退出保存进度)       ← 无依赖,先做 (1h)
    ↓
批次 1 (空壳标注+目标环)    ← 无依赖 (45min)
    ↓
批次 2 (听力降级+横屏)     ← 无依赖 (1h)
    ↓
批次 3 (口语题型)          ← 依赖批次 2 的 QuestionCard 类型扩展 (2h)
```

每批独立执行,做完一批再开始下一批。

**每批次完成后必须:** `npx tsc -b` 零错误 + 浏览器验证核心功能。

**全部完成后:**
- 孩子退出做题有确认保护
- L73-144 的课清楚标注"即将上线"
- 每日进度是环形图表,完成有庆祝
- 没音频的听力题显示文字降级,不白屏
- iPad 能横屏使用
- 新增口语题型(语音识别 + 手动兜底)
