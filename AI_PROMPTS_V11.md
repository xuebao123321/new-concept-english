# 英语重启号 · AI 执行提示词 V11 — 全面体验升级 (6 批次)

---

## ⚠️ 项目概览 (每个 AI 会话都必须先读)

**项目:** 英语重启号 — 熊出没主题新概念英语学习 PWA，家庭 SaaS。
**当前版本:** V10 解锁奖励系统已完成。
**本次目标:** 修复家长端/学生端共 11 个体验问题，涉及复习重构、课程体系可见性、积分排行统一、首次引导、错题订正等。

**技术栈:** React 18 + TS + Vite 6 + Tailwind CSS v4 + Framer Motion + Zustand + Dexie(IndexedDB) / FastAPI + Turso/SQLite

**关键文件:**
```
后端:
  backend/main.py       — FastAPI 路由
  backend/db.py         — 数据库层 (建表/迁移/CRUD)
  backend/models.py     — Pydantic 模型
  backend/auth.py       — JWT 认证

前端:
  src/pages/ParentDashboardPage.tsx   — 家长面板
  src/pages/HomePage.tsx              — 学生首页
  src/pages/ReviewPage.tsx            — 复习中心
  src/pages/StarMapPage.tsx           — 星图
  src/pages/LessonSelectPage.tsx      — 课程选择
  src/pages/ProfilePage.tsx           — 我的
  src/pages/LeaderboardPage.tsx       — 排行榜
  src/pages/BlockSessionPage.tsx      — 块练习
  src/stores/useLessonProgressStore.ts — 课程进度
  src/stores/useAuthStore.ts          — 认证状态
  src/stores/useUserStore.ts          — 用户数据
  src/data/lessons.ts                 — 课文元数据 (144课)
  src/data/stages.ts                  — 6阶段定义
  src/db/api.ts                       — 后端 API 封装
  src/db/database.ts                  — Dexie 本地数据库
  src/types/index.ts                  — TypeScript 类型定义
  src/utils/review-priority.ts        — 复习优先级算法
  src/utils/xp-calculator.ts          — XP/段位计算
```

**项目路径:** `/Users/andy/Documents/Andy AI/new concept english`
**启动:** `npm run dev` (前端 :5173) / `cd backend && python3 -m uvicorn main:app --reload --port 8000` (后端)
**每次批次完成后必须执行:** `npx tsc -b` 确保零 TypeScript 错误，然后 `npm run dev` 确认前端可启动。

---

## 批次 0: 家长端锁定规则修正 + isUnlocked 逻辑修复 (预计 45 分钟)

### 目标
修复两个问题：
1. 家长「锁定课程」(`resetLesson`) 会覆盖 `completed=0`，摧毁学生已完成的进度数据
2. 锁定后学生仍能通过顺序解锁进入该课（`isUnlocked` 不尊重 `status='locked'`）
3. 家长锁定的课后，需要能再次解锁

### 背景
当前 `resetLesson` API 的 SQL 是：
```sql
ON CONFLICT(user_id, lesson_group) DO UPDATE SET status='locked', unlocked_by='', completed=0
```
这会把 `completed` 强制置 0，且 `unlocked_by` 清空后家长无法追溯。

`isUnlocked` 在前端虽然检查了 `self.status !== 'locked'`，但如果前一课已完成，`prevProgress?.completed === true` 依然返回 true，导致锁定形同虚设。

### 我需要的改动

#### 改动 1 · 后端 resetLesson 不摧毁数据

**文件:** `backend/main.py` — `reset_lesson` 函数 (约 L262-278)

将当前的：
```python
conn.execute(
    "INSERT INTO user_progress (user_id, lesson_group, status, unlocked_by, completed, best_accuracy, attempts) "
    "VALUES (?, ?, 'locked', '', 0, 0, 0) "
    "ON CONFLICT(user_id, lesson_group) DO UPDATE SET "
    "status='locked', unlocked_by='', completed=0",
    (child_id, data.lesson_group))
```

改为仅修改 `status` 和 `unlocked_by`，**不动** `completed`、`best_accuracy`、`attempts`、`blockProgress` 等学习数据：
```python
# 仅锁定状态，不摧毁已完成的进度数据
existing = conn.execute(
    "SELECT completed, best_accuracy, attempts, blockProgress FROM user_progress "
    "WHERE user_id=? AND lesson_group=?", (child_id, data.lesson_group)).fetchone()

if existing:
    ed = existing.to_dict() if hasattr(existing, 'to_dict') else dict(existing)
    conn.execute(
        "UPDATE user_progress SET status='locked', unlocked_by='parent_locked' WHERE user_id=? AND lesson_group=?",
        (child_id, data.lesson_group))
else:
    conn.execute(
        "INSERT INTO user_progress (user_id, lesson_group, status, unlocked_by, completed, best_accuracy, attempts) "
        "VALUES (?, ?, 'locked', 'parent_locked', 0, 0, 0)",
        (child_id, data.lesson_group))
```

> ⚠️ 注意：`unlocked_by='parent_locked'` 用于标记"被家长手动锁定"，与从未解锁过的 `unlocked_by=''` 区分。

#### 改动 2 · 后端 unlockLesson 支持重新解锁

**文件:** `backend/main.py` — `unlock_lesson` 函数 (约 L243-259)

当前 `DO UPDATE SET` 只设 `status='unlocked', unlocked_by='parent'`，不动已完成数据。这个逻辑是正确的，**不需要改动**。但需要确认它能覆盖 `status='locked'` 的情况（已验证：ON CONFLICT DO UPDATE 会覆盖）。

只需在注释中说明：**家长解锁不会覆盖学生的 completed/blockProgress/attempts 数据**。

#### 改动 3 · 前端 isUnlocked 尊重 status='locked'

**文件:** `src/stores/useLessonProgressStore.ts` — `isUnlocked` 函数 (约 L51-64)

当前逻辑：
```ts
if (self?.status && self.status !== 'locked') return true;
// ...
return prevProgress?.completed === true || prevProgress?.status === 'completed';
```

问题：如果 `self.status === 'locked'`，代码跳过第一个判断，走到 `prevProgress?.completed === true`，如果前一课已完成，返回 true。

**修改为：如果自身 status 明确为 'locked'，直接返回 false，不再进行顺序解锁判断：**
```ts
isUnlocked: (lessonGroup: string) => {
  const { progressMap } = get();
  const idx = LESSON_GROUPS.indexOf(lessonGroup);
  if (idx === 0) {
    // 第一课：除非被显式锁定，否则解锁
    const self0 = progressMap.get(lessonGroup);
    if (self0?.status === 'locked') return false;
    return true;
  }
  if (idx === -1) return false;

  const self = progressMap.get(lessonGroup);

  // 自身有明确状态时，以 status 为准
  if (self?.status) {
    if (self.status === 'locked') return false;          // 被锁定 → 不可访问
    if (self.status === 'unlocked' || self.status === 'in_progress' || self.status === 'completed') return true;
  }

  // 自身无记录或 status 为空 → 检查前一课是否完成（顺序解锁）
  const prevGroup = LESSON_GROUPS[idx - 1];
  const prevProgress = progressMap.get(prevGroup);
  return prevProgress?.completed === true || prevProgress?.status === 'completed';
},
```

#### 改动 4 · 家长面板 UI: 锁定按钮改为可逆操作

**文件:** `src/pages/ParentDashboardPage.tsx`

当前的"🔒 重置全部"按钮用 `handleResetAll` 遍历所有课组调用 `resetLesson`。问题：
- 锁定后无法批量重新解锁
- "重置"一词暗示数据清空（实际 V11 不再清空数据）

**修改:**
1. 将"🔒 重置全部"改名"🔒 锁定全部"
2. 在批量解锁下拉中加一个"🔓 解锁全部"选项
3. 新增 API 函数 `relockLesson`（后端其实就用 `resetLesson`，但改名为语义清晰）

在 `src/db/api.ts` 中，确认 `resetLesson` 即为"锁定课程"（保持函数名不变，因为已有家长面板调用）。加注释：
```ts
// 锁定课程（仅改 status='locked'，不动已完成数据）
resetLesson: (childId: number, lessonGroup: string) =>
  request(`/api/parent/child/${childId}/reset-lesson`, ...),
```

在 `ParentDashboardPage.tsx` 中：
```tsx
const handleLockAll = async (childId: number) => {
  if (!window.confirm('确定要锁定全部课程吗？学生将暂时无法访问，但已完成的学习数据不会丢失。')) return;
  for (const g of ALL_GROUPS) { await api.resetLesson(childId, g); }
  setMsg('✅ 已锁定全部课程');
  await loadReport(childId); await loadChildren();
};

const handleUnlockAll = async (childId: number) => {
  if (!window.confirm('确定要解锁全部课程吗？')) return;
  for (const g of ALL_GROUPS) { await api.unlockLesson(childId, g); }
  setMsg('✅ 已解锁全部课程');
  await loadReport(childId); await loadChildren();
};
```

按钮区改为三个按钮：
```tsx
<div className="flex gap-1.5">
  <button onClick={() => handleUnlockAll(c.id)}
    className="flex-1 py-2 text-xs font-bold rounded-xl bg-forest-pale text-forest border border-forest/30">
    🔓 全部解锁
  </button>
  <button onClick={() => handleLockAll(c.id)}
    className="flex-1 py-2 text-xs font-bold rounded-xl bg-honey-pale text-honey border border-honey/30">
    🔒 全部锁定
  </button>
  {/* 批量解锁下拉保持不变 */}
</div>
```

### 验证要求
- `npx tsc -b` 零错误
- 家长锁定某课后，该课 `completed` 值不变（数据安全）
- 被锁定的课，学生端 `LessonSelectPage` 显示为 🔒，不可点击进入
- 家长可重新解锁，解锁后学生恢复访问
- 第一课被锁定后学生也无法进入（之前不检查第一课）
- 后端重启无报错，`GET /api/parent/children` 返回正确

执行完这些提示词后，系统要完整可运行并且不会有任何bug。

---

## 批次 1: 复习中心重构 — 展示原题 + 重新作答 (预计 2 小时)

### 目标
将复习中心从"自己判断是否掌握"改为"展示原题 → 重新作答 → 自动判分 → 更新间隔复习阶段"。

### 背景
当前 `ReviewPage.tsx` 点击「▶ 开始复习」只弹出一个确认框：
```
🤔 这道题你复习得怎么样?
[❌ 没答对]  [✅ 答对了]
```
用户无法看到原题，无法实际作答，完全依赖主观判断。这是复习系统最大的缺陷。

### 关键设计决策
- 复习时从两个来源查找题目：① `src/data/questions/` 中的题目数据（优先），② `answer_records` 表中的 `question_text` + `correct_answer`（降级）
- 对于找到完整题目数据的，渲染完整交互（选项/填空/翻译等）
- 对于只有文本记录的，渲染为简化填空题
- 复习支持两种模式：逐题复习 + 批量复习

### 我需要的改动

#### 改动 1 · 创建题目查找工具函数

**新建文件:** `src/utils/find-question.ts`

```ts
import type { Question } from '../types';
import { getQuestionsByGroup } from '../data/questions';
import { db } from '../db/database';

/**
 * 根据 questionId 查找完整题目数据
 * 优先从题目数据中查找，降级到 answer_records
 */
export async function findQuestion(questionId: string): Promise<{
  found: boolean;
  question?: Question;
  fallback?: { question_text: string; correct_answer: string; question_type: string };
} | null> {
  // 1. 尝试从题目数据中查找
  // questionId 格式如: "L01-choice-001" 或 "lesson-01-02-vocab-001"
  // 遍历已加载的课组题目缓存
  const allGroups = (await db.lessonProgress.toArray()).map(p => p.lessonGroup);
  for (const group of allGroups) {
    try {
      const questions = await getQuestionsByGroup(group);
      const found = questions.find(q => q.id === questionId);
      if (found) return { found: true, question: found };
    } catch { continue; }
  }

  // 2. 降级: 从 answer_records 查找
  const records = await db.answerRecords
    .where('questionId').equals(questionId)
    .toArray();
  
  if (records.length > 0) {
    const latest = records[records.length - 1];
    return {
      found: true,
      fallback: {
        question_text: (latest as any).question_text || '',
        correct_answer: (latest as any).correct_answer || '',
        question_type: latest.questionType || 'choice',
      }
    };
  }

  return null;
}

/**
 * 预加载一批题目的数据
 */
export async function preloadQuestions(questionIds: string[]): Promise<Map<string, Question | null>> {
  const results = new Map<string, Question | null>();
  // 收集所有涉及的课组
  const groups = new Set<string>();
  for (const qid of questionIds) {
    const match = qid.match(/lesson-(\d+-\d+)/);
    if (match) groups.add(`lesson-${match[1]}`);
  }
  // 并行加载
  await Promise.all(
    Array.from(groups).map(async (group) => {
      try {
        const qs = await getQuestionsByGroup(group);
        for (const q of qs) {
          if (questionIds.includes(q.id)) results.set(q.id, q);
        }
      } catch {}
    })
  );
  return results;
}
```

> ⚠️ 如果 `getQuestionsByGroup` 是同步函数（题目静态 import），则 `findQuestion` 中的查找逻辑改为同步：
> ```ts
> import { getAllQuestions } from '../data/questions';
> const allQuestions = getAllQuestions();
> const found = allQuestions.find(q => q.id === questionId);
> ```

**确认方式:** 先检查 `src/data/questions/index.ts` 中 `getQuestionsByGroup` 的实际导出，确保 `findQuestion` 能正确调用。

#### 改动 2 · 创建复习题目组件

**新建文件:** `src/components/questions/ReviewQuestionCard.tsx`

这是一个简化版的 `QuestionCard`，专门用于复习场景：

```tsx
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

  const handleSubmit = () => {
    if (submitted) return;

    let correct = false;
    let answer = '';

    if (question) {
      if (question.type === 'choice' || question.type === 'listening') {
        correct = selectedIndex === question.correctIndex;
        answer = question.options?.[selectedIndex ?? -1] || '';
      } else if (question.type === 'fill') {
        answer = userInput.trim();
        correct = question.acceptableAnswers.some(
          a => a.toLowerCase() === answer.toLowerCase()
        );
      } else if (question.type === 'translate') {
        answer = userInput.trim();
        const keywords = question.keywords || [];
        correct = keywords.every(k => answer.toLowerCase().includes(k.toLowerCase()));
      } else if (question.type === 'reorder') {
        answer = userInput.trim();
        correct = answer.toLowerCase() === question.correctSentence.toLowerCase();
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

  // ── 渲染 ──
  return (
    <div className="card p-4 bg-white space-y-3">
      {/* 题目内容 */}
      {question ? (
        <>
          <p className="text-sm font-bold text-ink">{question.prompt}</p>
          {'question' in question && question.question && (
            <p className="text-xs text-ink-light">{question.question}</p>
          )}
          {'sentence' in question && question.sentence && (
            <p className="text-base font-mono text-ink bg-warm-bg p-2 rounded-lg">
              {question.sentence}
            </p>
          )}
          {'sourceText' in question && (
            <p className="text-base text-ink bg-warm-bg p-2 rounded-lg">
              {question.sourceText}
            </p>
          )}

          {/* 选择题 */}
          {(question.type === 'choice' || question.type === 'listening') && 'options' in question && (
            <div className="space-y-2">
              {question.options.map((opt: string, i: number) => (
                <button
                  key={i}
                  onClick={() => !submitted && setSelectedIndex(i)}
                  disabled={submitted}
                  className={`w-full p-3 rounded-xl text-left text-sm font-bold border transition-all ${
                    submitted && i === question.correctIndex
                      ? 'bg-forest-pale border-forest text-forest'
                      : submitted && i === selectedIndex && i !== question.correctIndex
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

          {/* 填空/翻译/连词 */}
          {(question.type === 'fill' || question.type === 'translate' || question.type === 'reorder') && (
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
          <p className="text-sm font-bold text-ink">{fallback.question_text || '(题目内容未保存)'}</p>
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
          disabled={(question?.type === 'choice' || question?.type === 'listening') ? selectedIndex === null : !userInput.trim()}
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
          {!isCorrect && fallback && (
            <span className="block text-xs mt-0.5">正确答案: {fallback.correct_answer}</span>
          )}
          {!isCorrect && question && 'correctAnswer' in question && (
            <span className="block text-xs mt-0.5">正确答案: {question.correctAnswer || question.options?.[question.correctIndex]}</span>
          )}
          {'explanation' in (question || {}) && (question as any)?.explanation && (
            <span className="block text-xs mt-1 text-ink-light">{(question as any).explanation}</span>
          )}
        </motion.div>
      )}
    </div>
  );
}
```

#### 改动 3 · 重构 ReviewPage 主流程

**文件:** `src/pages/ReviewPage.tsx`

核心改动：
1. 点击「▶ 开始复习」→ 不再弹确认框，而是展开题目 + 进入作答模式
2. 新增一个 `activeReview` state 追踪当前正在复习的题目
3. 答完后自动判分并调用 `handleReview`

**修改 `QuestionCard` 组件（ReviewPage 内部的那个）：**

将 `onClick={() => setShowConfirm(true)}` 改为：
```tsx
onClick={() => onStartReview(pw)}
```

新增 state 和处理函数：
```tsx
// 在主组件中新增
const [reviewingId, setReviewingId] = useState<string | null>(null);
const [reviewQuestion, setReviewQuestion] = useState<Question | null>(null);
const [reviewFallback, setReviewFallback] = useState<{
  question_text: string; correct_answer: string; question_type: string;
} | null>(null);

const handleStartReview = async (pw: PrioritizedWrong) => {
  const result = await findQuestion(pw.question.questionId);
  if (result) {
    setReviewQuestion(result.question || null);
    setReviewFallback(result.fallback || null);
  }
  setReviewingId(pw.question.questionId);
};

const handleReviewAnswer = async (questionId: string, correct: boolean) => {
  // 调用现有的 handleReview 逻辑
  await handleReview(questionId, correct);
  // 清除复习状态
  setReviewingId(null);
  setReviewQuestion(null);
  setReviewFallback(null);
};
```

在 QuestionCard 渲染中，如果 `wq.questionId === reviewingId`，则在卡片下方展开 `ReviewQuestionCard`：
```tsx
{reviewingId === wq.questionId && (
  <div className="mt-3 pt-3 border-t border-warm-border">
    <ReviewQuestionCard
      question={reviewQuestion}
      fallback={reviewFallback || undefined}
      onAnswer={(correct) => handleReviewAnswer(wq.questionId, correct)}
    />
  </div>
)}
```

#### 改动 4 · 批量复习也改为真实作答

批量复习按钮（"🚀 复习所有到期题目"）当前直接标记全部通过。改为逐个展示题目：

```tsx
const [batchReviewMode, setBatchReviewMode] = useState(false);
const [batchIndex, setBatchIndex] = useState(0);
const [batchItems, setBatchItems] = useState<PrioritizedWrong[]>([]);

const startBatchReview = (items: PrioritizedWrong[]) => {
  setBatchItems(items);
  setBatchIndex(0);
  setBatchReviewMode(true);
  // 自动加载第一题
  handleStartReview(items[0]);
};
```

当用户答完一题后，自动加载下一题：
```tsx
const handleReviewAnswer = async (questionId: string, correct: boolean) => {
  await handleReview(questionId, correct);
  
  if (batchReviewMode && batchIndex < batchItems.length - 1) {
    const next = batchItems[batchIndex + 1];
    setBatchIndex(prev => prev + 1);
    // 加载下一题
    const result = await findQuestion(next.question.questionId);
    if (result) {
      setReviewQuestion(result.question || null);
      setReviewFallback(result.fallback || null);
    }
    setReviewingId(next.question.questionId);
  } else {
    // 全部完成
    setBatchReviewMode(false);
    setReviewingId(null);
    setReviewQuestion(null);
    setReviewFallback(null);
    setToast(`✅ 完成 ${batchItems.length} 题复习!`);
    await loadData();
  }
};
```

批量复习按钮的 onClick 改为 `() => startBatchReview(groups.urgent)`。

### 验证要求
- `npx tsc -b` 零错误
- 复习列表正常加载
- 点击单题「▶ 开始复习」→ 展开题目卡片 → 可以作答
- 选择题显示选项可点击，填空/翻译题显示输入框
- 提交后显示对/错反馈 + 正确答案 + 解析（如有）
- 答对 → 阶段提升；答错 → 重置阶段
- 批量复习：点击后自动逐题展示，答完一题自动跳到下一题
- 全部完成后列表自动刷新

执行完这些提示词后，系统要完整可运行并且不会有任何bug。

---

## 批次 2: 课程元数据补全 — 144 课标题 + 星图可见 + 课程体系 (预计 1.5 小时)

### 目标
1. 补全 LESSONS 数组：从当前 12 条（L1-L23 奇数课）扩展到 72 条（L1-L143 所有奇数课）
2. 星图所有 6 个阶段都可见课程内容
3. 课程选择页展示完整体系感

### 背景
NCE 第一册共 144 课（奇数课为课文，偶数课为练习），按两课一组组成 72 个课组。当前 `lessons.ts` 只有阶段 1（L1-L24）的 12 条元数据，其他阶段只有课组 ID（如 `lesson-73-74`）但没有任何标题、词汇、语法点。

`StarMapPage.tsx` 中 `hasContent = stage.id <= 3` 导致阶段 4-6 显示"⏳ 即将上线"，但实际上课组已在 `stages.ts` 中定义。

`LessonSelectPage.tsx` 虽然列出了 72 个课组，但阶段 2-6 的课组没有 `titleCn` 和 `title`，显示不友好。

### 我需要的改动

#### 改动 1 · 补全 LESSONS 数组

**文件:** `src/data/lessons.ts`

当前文件有 12 条记录（L1, L3, L5 ... L23）。需要扩展到 72 条（L1 到 L143 所有奇数课）。

**新增数据规范:** 每条 LessonMeta 记录提供以下字段：

```ts
{
  lessonNumber: number,        // 奇数: 1, 3, 5, ... 143
  title: string,               // 英文标题（新概念原课文标题）
  titleCn: string,             // 中文标题（自译或社区译名）
  group: string,               // 课组ID，格式 'lesson-XX-YY'（XX=奇数课, YY=偶数课）
  groupId: string,             // 同 group
  stage: number,               // 1-6
  grammarTopics: string[],     // 该课语法点 2-4 个
  vocabularyCount: number,     // 重点词汇数（估一个合理值）
  vocabulary: string[],        // 核心词汇 10-20 个
  sentencePatterns: string[],  // 核心句型 2-4 个
  audioSrc: string,            // 音频路径模板
}
```

**L25-L48 (阶段 2: 行动先锋) — 12 条：**

| 课号 | 英文标题 | 中文标题 | 课组 | 语法点 |
|------|---------|---------|------|--------|
| 25 | Mrs. Smith's kitchen | 史密斯太太的厨房 | lesson-25-26 | 现在进行时, There be 句型, 方位介词 |
| 27 | Mrs. Smith's living room | 史密斯太太的客厅 | lesson-27-28 | There be 复数, some/any, 方位介词 near |
| 29 | Come in, Amy | 进来，艾米 | lesson-29-30 | 情态动词 must, 祈使句, 现在进行时巩固 |
| 31 | Where's Sally? | 萨莉在哪里？ | lesson-31-32 | 现在进行时, 介词短语作表语, What about |
| 33 | A fine day | 晴天 | lesson-33-34 | 现在进行时(全部人称), 介词 over/across |
| 35 | Our village | 我们的村庄 | lesson-35-36 | 现在进行时复习, 方位描述, between |
| 37 | Making a bookcase | 做书架 | lesson-37-38 | be going to, 一般将来时, 情态动词can |
| 39 | Don't drop it! | 别摔了！ | lesson-39-40 | 祈使句否定, be going to, 抽象动词 |
| 41 | Penny's bag | 彭妮的包 | lesson-41-42 | 不可数名词, some/any, 量词 |
| 43 | Hurry up! | 快点！ | lesson-43-44 | can/can't, There be 复习, 情态动词 |
| 45 | The boss's letter | 老板的信 | lesson-45-46 | can/can't 能力, 现在进行时 vs 一般现在时 |
| 47 | A cup of coffee | 一杯咖啡 | lesson-47-48 | 一般现在时(喜好), do/does 助动词 |

**L49-L72 (阶段 3: 过去回溯者) — 12 条：**

| 49 | At the butcher's | 在肉店 | 一般现在时, 第三人称单数, either/too |
| 51 | A pleasant climate | 宜人的气候 | 季节月份, 天气表达, 一般现在时 |
| 53 | An interesting climate | 有趣的气候 | 一般现在时(方向), 频率副词 |
| 55 | The Sawyer family | 索耶一家 | 一般现在时日常, 频率副词巩固 |
| 57 | An unusual day | 不寻常的一天 | 一般现在时 vs 现在进行时 |
| 59 | Is that all? | 就这些吗？ | have got, 购物用语, some/any |
| 61 | A bad cold | 重感冒 | must/can't 推测, have 用法 |
| 63 | Thank you, doctor | 谢谢你，医生 | must 推测, 身体部位, for + 时间段 |
| 65 | Not a baby | 不是小孩子了 | must/mustn't, 反身代词, 年龄表达 |
| 67 | The weekend | 周末 | 一般过去时 be 动词, 时间介词 at/on |
| 69 | The car race | 汽车比赛 | 一般过去时, There was/were, hundreds of |
| 71 | He's awful! | 他真讨厌！ | 一般过去时(规则动词), 时间状语 yesterday |

**L73-L96 (阶段 4: 时间编织者) — 12 条：**

| 73 | The way to King Street | 去国王街的路 | 一般过去时(不规则动词), 问路用语 |
| 75 | Uncomfortable shoes | 不舒服的鞋 | 一般过去时(ago), have + 过去分词萌芽 |
| 77 | Terrible toothache | 可怕的牙痛 | 现在完成时(have + 过去分词), 情态动词 can/must |
| 79 | Carol's shopping list | 卡罗尔的购物单 | have got vs have, must 必要性, need |
| 81 | Roast beef and potatoes | 烤牛肉和土豆 | have 表示"吃/喝", 现在完成时 |
| 83 | Going on holiday | 去度假 | 现在完成时, already/yet |
| 85 | Paris in the spring | 春天的巴黎 | 现在完成时, ever/never, be to |
| 87 | A car crash | 车祸 | 现在完成时, just, 过去分词不规则 |
| 89 | For sale | 待售 | 现在完成时, for/since, 时间段 |
| 91 | Poor Ian! | 可怜的伊恩！ | 一般将来时(will), 现在完成时对比 |
| 93 | Our new neighbour | 我们的新邻居 | 一般将来时, will/shall, 过去进行时萌芽 |
| 95 | Tickets, please | 请出示车票 | 一般将来时, had better, 时间表达 |

**L97-L120 (阶段 5: 逻辑大师) — 12 条：**

| 97 | A small blue case | 一个蓝色的小箱子 | 物主代词, belong to, 定语从句萌芽 |
| 99 | Ow! | 哎哟！ | 宾语从句, I think/believe, 间接引语 |
| 101 | A card from Jimmy | 吉米的明信片 | 宾语从句, 反意疑问句, 过去进行时(引入) |
| 103 | The French test | 法语考试 | too/enough, 过去进行时, 宾语从句 |
| 105 | Full of mistakes | 错误百出 | 过去进行时, 宾语从句 want/tell, 不定式 |
| 107 | It's too small | 太小了 | 比较级, too/enough, 间接引语 |
| 109 | A good idea | 好主意 | 比较级, less/fewer, 条件句(第一类)萌芽 |
| 111 | The most expensive model | 最贵的型号 | 最高级, 条件句(第一类), as...as |
| 113 | Small change | 零钱 | 条件句(第一类), 宾语从句, neither...nor |
| 115 | Knock, knock! | 敲敲门！ | 不定代词, 条件句(第一类)巩固 |
| 117 | Tommy's breakfast | 汤米的早餐 | 过去进行时, 宾语从句(间接引语) |
| 119 | A true story | 真实故事 | 过去完成时(引入), 宾语从句, 时间状语从句 |

**L121-L144 (阶段 6: 文明守护者) — 12 条：**

| 121 | The man in a hat | 戴帽子的男士 | 定语从句(关系代词), 过去完成时 |
| 123 | A trip to Australia | 澳大利亚之旅 | 定语从句(关系副词), 过去完成时 |
| 125 | Tea for two | 两人喝茶 | 被动语态(一般现在时), 情态动词被动 |
| 127 | A famous actress | 著名女演员 | 被动语态(一般过去时), must be/can't be |
| 129 | Seventy miles an hour | 时速70英里 | 被动语态(情态动词), 条件句(第二类) |
| 131 | Don't be so sure! | 别太肯定！ | 条件句(第二类), may/might, 被动复习 |
| 133 | Sensational news! | 爆炸性新闻！ | 间接引语(过去时转述), 宾语从句 |
| 135 | The latest report | 最新报道 | 间接引语, 条件句(第二类) |
| 137 | A pleasant dream | 美梦 | 条件句(第二类), 虚拟语气(if I were) |
| 139 | Is that you, John? | 是你吗，约翰？ | 条件句(第二类)复习, 间接引语 |
| 141 | Sally's first train ride | 萨莉第一次坐火车 | 被动语态复习, 条件句(第二类) |
| 143 | A walk through the woods | 林中漫步 | 被动语态综合, 定语从句, NCE1总复习 |

**每条记录的 vocabulary 字段至少提供 8 个核心词汇，sentencePatterns 至少 2 条。**

文件格式保持与现存记录一致。LESSON_GROUPS 自动从 LESSONS 推导（已有逻辑不变）。

#### 改动 2 · 星图所有阶段可见

**文件:** `src/pages/StarMapPage.tsx`

删除 `hasContent = stage.id <= 3` 的限制，改为所有阶段均可交互：

```tsx
// 改前:
const hasContent = stage.id <= 3;

// 改后: 所有阶段都有内容
const hasContent = true;
```

未上线标记（⏳ 即将上线）改为仅在没有 groups 定义时显示（但所有 stages 都有 groups，所以这个标记不再出现）。

阶段 4-6 的 `opacity-50` 和灰色样式移除。

#### 改动 3 · 课程选择页展示课程体系感

**文件:** `src/pages/LessonSelectPage.tsx`

在课程列表顶部增加「阶段筛选」tab bar，让用户可以看到整体结构：

```tsx
// 新增 state
const [activeStage, setActiveStage] = useState<number | null>(null);

// 在进度概览卡片和课组列表之间插入阶段筛选
<div className="flex gap-1.5 overflow-x-auto py-2">
  <button
    onClick={() => setActiveStage(null)}
    className={`px-3 py-1.5 text-xs font-bold rounded-full whitespace-nowrap transition-all ${
      activeStage === null ? 'bg-forest text-cream' : 'bg-warm-bg text-ink-light'
    }`}
  >
    📚 全部
  </button>
  {STAGES.map(stage => (
    <button
      key={stage.id}
      onClick={() => setActiveStage(prev => prev === stage.id ? null : stage.id)}
      className={`px-3 py-1.5 text-xs font-bold rounded-full whitespace-nowrap transition-all ${
        activeStage === stage.id ? 'bg-forest text-cream' : 'bg-warm-bg text-ink-light'
      }`}
    >
      {stage.icon} {stage.name}
    </button>
  ))}
</div>
```

课组列表根据 `activeStage` 筛选：
```tsx
const filteredGroups = activeStage
  ? LESSON_GROUPS.filter(g => {
      const stage = STAGES.find(s => s.groups.includes(g));
      return stage?.id === activeStage;
    })
  : LESSON_GROUPS;
```

每个课组渲染时加上一个小巧的阶段标签（如 `🧱 基础建设者`）。

### 验证要求
- `npx tsc -b` 零错误
- LESSONS 数组有 72 条记录（每个奇数课一条）
- LESSON_GROUPS 仍为 72 个课组
- 星图 6 个阶段全部可见，不再有"⏳ 即将上线"
- 课程选择页顶部有阶段筛选 tab
- 点击某个阶段 tab → 只显示该阶段的 12 个课组
- 每个课组有中文标题和英文标题
- 后端 `ALL_LESSON_GROUPS` 与前端 `LESSON_GROUPS` 一致（72 组）

执行完这些提示词后，系统要完整可运行并且不会有任何bug。

---

## 批次 3: 首次登录引导 + 昵称/年级 + 权限控制 (预计 1.5 小时)

### 目标
1. 首次登录（新用户）弹出引导浮层：填写中文昵称 + 选择年级
2. `users` 表新增 `grade` 字段
3. 权限：学生只能查看昵称/年级，家长端可以修改
4. 昵称从 localStorage 迁移到服务端，统一管理

### 背景
当前问题：
- 注册时昵称可选，很多学生不会填；ProfilePage 虽然有编辑昵称功能，但存 localStorage 不同步服务端
- 没有年级信息，无法做内容难度适配和统计
- 学生可以自由修改昵称（应该只有家长能改）

### 我需要的改动

#### 改动 1 · 数据库加 grade 字段

**文件:** `backend/db.py`

在 `init_db()` 的迁移代码块中新增：
```python
# V11: 年级字段
_migrations_v11 = [
    "ALTER TABLE users ADD COLUMN grade TEXT DEFAULT ''",
]
for _m in _migrations_v11:
    try: conn.execute(_m)
    except: pass
```

同时在 Turso 的 `_turso_request` 建表调用中加该列，并在 `CREATE TABLE IF NOT EXISTS users` 语句中加 `grade TEXT DEFAULT ''`。

#### 改动 2 · 后端 API: 更新昵称和年级

**文件:** `backend/main.py`

新增 API：
```python
@app.put("/api/user/update-profile")
def update_profile(data: dict, user: dict = Depends(get_current_user)):
    """更新用户昵称和年级。学生只能读，家长可通过 parent API 修改学生。"""
    nickname = data.get("nickname")
    grade = data.get("grade")
    
    conn = get_db()
    updates = []
    params = []
    
    if nickname is not None:
        updates.append("nickname=?")
        params.append(nickname)
    if grade is not None:
        updates.append("grade=?")
        params.append(grade)
    
    if not updates:
        return {"ok": True, "message": "无变更"}
    
    params.append(user["id"])
    conn.execute(
        f"UPDATE users SET {', '.join(updates)} WHERE id=?",
        tuple(params))
    if hasattr(conn, 'commit'): conn.commit()
    return {"ok": True, "message": "已更新"}
```

家长端修改学生 profile：
```python
@app.put("/api/parent/child/{child_id}/update-profile")
def parent_update_child_profile(child_id: int, data: dict, user: dict = Depends(get_current_user)):
    """家长修改学生的昵称和年级"""
    if user.get("role") != "parent":
        raise HTTPException(403, "仅家长可操作")
    
    conn = get_db()
    child = conn.execute(
        "SELECT id FROM users WHERE id=? AND parent_id=?",
        (child_id, user["id"])).fetchone()
    if not child:
        raise HTTPException(404, "学生未找到")
    
    nickname = data.get("nickname")
    grade = data.get("grade")
    updates = []
    params = []
    
    if nickname is not None:
        updates.append("nickname=?")
        params.append(nickname)
    if grade is not None:
        updates.append("grade=?")
        params.append(grade)
    
    if not updates:
        return {"ok": True}
    
    params.append(child_id)
    conn.execute(
        f"UPDATE users SET {', '.join(updates)} WHERE id=?",
        tuple(params))
    if hasattr(conn, 'commit'): conn.commit()
    return {"ok": True, "message": "已更新"}
```

同时在 `get_profile` 返回值中加入 `grade` 字段：
```python
@app.get("/api/user/profile")
def profile(user: dict = Depends(get_current_user)):
    return {
        "id": user["id"], "username": user["username"],
        "nickname": user.get("nickname", ""),
        "grade": user.get("grade", ""),  # 新增
        "role": user.get("role", "student"),
        # ... 其他字段
    }
```

#### 改动 3 · 前端 API 封装

**文件:** `src/db/api.ts`

加两个新方法：
```ts
// 更新自己的资料
updateProfile: (data: { nickname?: string; grade?: string }) =>
  request('/api/user/update-profile', { method: 'PUT', body: JSON.stringify(data) }),

// 家长修改学生资料
updateChildProfile: (childId: number, data: { nickname?: string; grade?: string }) =>
  request(`/api/parent/child/${childId}/update-profile`, { method: 'PUT', body: JSON.stringify(data) }),
```

#### 改动 4 · 首次登录引导弹窗

**文件:** `src/pages/HomePage.tsx`

在现有 `showOnboarding` 引导的基础上，增加一个「完善信息」引导：

```tsx
const [showProfileSetup, setShowProfileSetup] = useState(false);
const { user } = useAuthStore();

// 检测是否需要完善信息
useEffect(() => {
  if (!isLoading && user && user.role === 'student') {
    const hasNickname = (user.nickname && user.nickname !== '' && user.nickname !== user.username);
    const hasGrade = (user as any).grade && (user as any).grade !== '';
    const profileDone = localStorage.getItem('nce_profile_setup_done');
    if ((!hasNickname || !hasGrade) && !profileDone) {
      setShowProfileSetup(true);
    }
  }
}, [isLoading, user]);
```

引导弹窗渲染（在现有 showOnboarding 弹窗后面）：
```tsx
{showProfileSetup && (
  <ProfileSetupModal
    onDone={(nickname, grade) => {
      api.updateProfile({ nickname, grade }).then(() => {
        localStorage.setItem('nce_profile_setup_done', '1');
        setShowProfileSetup(false);
        // 刷新用户信息
        useAuthStore.getState().loadFromStorage();
      }).catch(() => {});
    }}
    onSkip={() => {
      localStorage.setItem('nce_profile_setup_done', '1');
      setShowProfileSetup(false);
    }}
  />
)}
```

**新建组件:** `src/components/onboarding/ProfileSetupModal.tsx`

```tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { springs } from '../../utils/motion-tokens';

const GRADES = [
  { value: 'grade-1', label: '一年级' },
  { value: 'grade-2', label: '二年级' },
  { value: 'grade-3', label: '三年级' },
  { value: 'grade-4', label: '四年级' },
  { value: 'grade-5', label: '五年级' },
  { value: 'grade-6', label: '六年级' },
  { value: 'grade-7', label: '初一' },
  { value: 'grade-8', label: '初二' },
  { value: 'grade-9', label: '初三' },
];

interface Props {
  onDone: (nickname: string, grade: string) => void;
  onSkip: () => void;
}

export default function ProfileSetupModal({ onDone, onSkip }: Props) {
  const [nickname, setNickname] = useState('');
  const [grade, setGrade] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    // 中文昵称验证：至少包含一个中文字符
    const hasChinese = /[一-鿿]/.test(nickname);
    if (!hasChinese && nickname.trim().length < 2) {
      setError('请输入至少2个字符的昵称，建议使用中文~');
      return;
    }
    if (!grade) {
      setError('请选择你的年级~');
      return;
    }
    onDone(nickname.trim(), grade);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <motion.div
        className="card p-6 mx-4 mb-8 sm:mb-0 max-w-sm w-full space-y-4"
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }} transition={springs.popIn}
      >
        <div className="text-center">
          <div className="text-4xl mb-2">🐻</div>
          <h2 className="text-h2 text-ink font-extrabold">完善你的信息</h2>
          <p className="text-xs text-ink-muted mt-1">让熊二更好地认识你~</p>
        </div>

        {/* 昵称输入 */}
        <div>
          <label className="text-xs font-bold text-ink-light mb-1 block">
            🏷️ 你的昵称（建议中文）
          </label>
          <input
            type="text"
            value={nickname}
            onChange={e => { setNickname(e.target.value); setError(''); }}
            placeholder="如：小明、乐乐..."
            maxLength={12}
            className="w-full p-3 rounded-xl border-2 border-warm-border text-sm font-bold
                       focus:border-forest outline-none"
          />
        </div>

        {/* 年级选择 */}
        <div>
          <label className="text-xs font-bold text-ink-light mb-1 block">
            📚 你的年级
          </label>
          <div className="grid grid-cols-3 gap-2">
            {GRADES.map(g => (
              <button
                key={g.value}
                onClick={() => { setGrade(g.value); setError(''); }}
                className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                  grade === g.value
                    ? 'bg-forest-pale border-forest text-forest'
                    : 'bg-warm-bg border-warm-border text-ink-light hover:border-forest/30'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <p className="text-xs text-berry font-bold text-center">{error}</p>
        )}

        {/* 按钮 */}
        <div className="flex gap-2">
          <button onClick={onSkip}
            className="flex-1 py-2.5 text-sm font-bold rounded-xl bg-warm-bg text-ink-light">
            跳过
          </button>
          <button onClick={handleSubmit}
            className="flex-1 py-2.5 text-sm font-bold rounded-xl bg-forest text-cream
                       hover:bg-forest/90 active:scale-[0.98] transition-all">
            🚀 完成
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
```

#### 改动 5 · ProfilePage 权限控制

**文件:** `src/pages/ProfilePage.tsx`

**学生视图:**
- 昵称和年级**只读展示**，不可点击编辑
- 显示引导提示"如需修改昵称或年级，请联系家长"
- 移除 localStorage 存昵称的逻辑，改为从 `user` 对象读取

```tsx
// 学生: 只读展示
{user?.role === 'student' && (
  <>
    <h2 className="text-h2 font-bold text-ink">{user.nickname || user.username}</h2>
    {(user as any)?.grade && (
      <p className="text-sm text-ink-light mt-1">
        📚 {GRADE_LABELS[(user as any).grade] || (user as any).grade}
      </p>
    )}
    <p className="text-caption text-ink-muted mt-1">
      如需修改，请联系家长 👨‍👩‍👧
    </p>
  </>
)}
```

**家长视图:**
- 家长可以编辑自己的昵称（保持 `editingName` 逻辑）
- 在家长面板中可以编辑每个学生的昵称和年级

**家长面板:** `src/pages/ParentDashboardPage.tsx`

在每个学生卡片中加一个小编辑按钮：
```tsx
<button
  onClick={() => setEditingChild(prev => prev === c.id ? null : c.id)}
  className="text-xs text-ink-muted hover:text-forest"
>
  ✏️ 编辑资料
</button>

{editingChild === c.id && (
  <ChildProfileEditor
    childId={c.id}
    currentNickname={c.nickname}
    currentGrade={(c as any).grade || ''}
    onSave={async (nickname, grade) => {
      await api.updateChildProfile(c.id, { nickname, grade });
      setEditingChild(null);
      await loadChildren();
    }}
    onCancel={() => setEditingChild(null)}
  />
)}
```

> `ChildProfileEditor` 是一个简单的内联表单组件（与 ProfileSetupModal 类似但更紧凑），直接在 `ParentDashboardPage.tsx` 文件内定义即可。

### 验证要求
- `npx tsc -b` 零错误
- 新用户首次登录 → 弹出信息完善弹窗（昵称 + 年级）
- 填写中文昵称 + 选择年级 → 提交成功 → 后端数据库更新
- 再次登录不再弹出（localStorage 标记已设）
- ProfilePage 学生视图：昵称只读，年级只读
- 家长面板：可以编辑学生的昵称和年级
- 后端 `GET /api/user/profile` 返回 `grade` 字段
- 跳过引导后也可正常使用

执行完这些提示词后，系统要完整可运行并且不会有任何bug。

---

## 批次 4: 错题分析升级 — 查看原题 + 订正流程 (预计 1.5 小时)

### 目标
1. 家长端首页：展示学生错题列表，点击可查看原题详情
2. 每道错题显示：原题内容、学生答案、正确答案、错误次数、最近错误时间
3. 家长可以标记某道错题"需要订正"并推送给学生
4. 学生端 ProfilePage 新增「我的错题」入口

### 背景
后端已提供：
- `GET /api/parent/child/{id}/wrong-questions` → 返回 `{ wrong_questions: [...], summary: {...} }`
- `GET /api/user/wrong-questions` → 学生端同样的数据结构

但前端：
- 家长面板完全没有调用这些 API
- 学生端的错题数据只用于复习系统的间隔重复，没有可视化分析

### 我需要的改动

#### 改动 1 · 家长面板: 错题分析卡片

**文件:** `src/pages/ParentDashboardPage.tsx`

在每个学生卡片中，LearningReport 下方新增一个「错题分析」区域：

```tsx
// 新增 state
const [wrongData, setWrongData] = useState<Record<number, {
  wrong_questions: WrongQuestionItem[];
  summary: WrongQuestionSummary;
}>>({});
const [wrongLoading, setWrongLoading] = useState<Record<number, boolean>>({});

// 加载错题数据
const loadWrongQuestions = async (childId: number) => {
  setWrongLoading(prev => ({ ...prev, [childId]: true }));
  try {
    const data = await api.wrongQuestions(childId);
    setWrongData(prev => ({ ...prev, [childId]: data }));
  } catch { /* 静默失败 */ }
  finally { setWrongLoading(prev => ({ ...prev, [childId]: false })); }
};
```

在学生卡片中渲染：
```tsx
{/* 错题分析 */}
<div className="border-t border-warm-border pt-3">
  <div className="flex items-center justify-between mb-2">
    <h4 className="text-sm font-bold text-ink">📝 错题分析</h4>
    <button
      onClick={() => {
        if (!wrongData[c.id]) loadWrongQuestions(c.id);
      }}
      className="text-xs font-bold text-forest hover:underline"
    >
      {wrongData[c.id] ? '🔄 刷新' : '📊 查看'}
    </button>
  </div>

  {wrongData[c.id] && (
    <div className="space-y-2">
      {/* 摘要 */}
      <div className="flex gap-2 text-xs">
        <span className="px-2 py-1 rounded-full bg-berry-pale text-berry font-bold">
          {wrongData[c.id].summary.total_wrong} 道错题
        </span>
        {wrongData[c.id].summary.most_missed_type && (
          <span className="px-2 py-1 rounded-full bg-honey-pale text-honey font-bold">
            弱项: {TYPE_CN_MAP[wrongData[c.id].summary.most_missed_type] || wrongData[c.id].summary.most_missed_type}
          </span>
        )}
      </div>

      {/* 错题列表 (最多显示5道，超出折叠) */}
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {wrongData[c.id].wrong_questions.slice(0, showAllWrong[c.id] ? 999 : 5).map((item, i) => (
          <WrongQuestionItemCard key={i} item={item} />
        ))}
      </div>
      {wrongData[c.id].wrong_questions.length > 5 && (
        <button
          onClick={() => setShowAllWrong(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
          className="text-xs text-forest font-bold hover:underline"
        >
          {showAllWrong[c.id] ? '收起' : `查看全部 ${wrongData[c.id].wrong_questions.length} 道`}
        </button>
      )}
    </div>
  )}

  {wrongLoading[c.id] && (
    <p className="text-xs text-ink-muted text-center py-2">加载中...</p>
  )}
</div>
```

**新建组件:** 在 `ParentDashboardPage.tsx` 文件底部定义 `WrongQuestionItemCard`：

```tsx
function WrongQuestionItemCard({ item }: { item: WrongQuestionItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-warm-bg rounded-lg p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-ink truncate">
            {item.question_text || '(原题未记录)'}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-berry-pale text-berry font-bold">
              ❌ {item.wrong_count}次
            </span>
            <span className="text-[10px] text-ink-muted">
              {TYPE_CN_MAP[item.question_type] || item.question_type}
            </span>
            <span className="text-[10px] text-ink-muted">
              {item.created_at?.slice(0, 10) || ''}
            </span>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-ink-muted hover:text-ink flex-shrink-0"
        >
          {expanded ? '收起 ▲' : '详情 ▼'}
        </button>
      </div>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="mt-2 pt-2 border-t border-warm-border space-y-1.5"
        >
          <div className="text-xs">
            <span className="text-ink-muted">学生答案: </span>
            <span className="text-berry font-bold">{item.user_answer || '(空)'}</span>
          </div>
          <div className="text-xs">
            <span className="text-ink-muted">正确答案: </span>
            <span className="text-forest font-bold">{item.correct_answer}</span>
          </div>
          <div className="text-xs">
            <span className="text-ink-muted">难度: </span>
            <span>{item.difficulty}</span>
          </div>
          <div className="text-xs">
            <span className="text-ink-muted">所属课组: </span>
            <span>{item.lesson_group}</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

const TYPE_CN_MAP: Record<string, string> = {
  choice: '选择题', fill: '填空题', translate: '翻译题',
  reorder: '连词成句', listening: '听力题', speak: '口语题',
};
```

#### 改动 2 · 学生端: ProfilePage 错题入口

**文件:** `src/pages/ProfilePage.tsx`

在学生视图中，学习报告下方新增：

```tsx
{/* 错题分析入口 */}
<SectionTitle emoji="📝" label="错题分析" />
<div className="glass-panel p-4">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-meta font-bold text-ink">
        待复习错题: <span className="text-berry">{totalWrong} 道</span>
      </p>
      <p className="text-caption text-ink-muted mt-0.5">
        点击查看详情，针对性查漏补缺
      </p>
    </div>
    <a href="/review"
      className="px-4 py-2 text-sm font-bold rounded-xl bg-forest-pale text-forest
                 hover:bg-forest/20 active:scale-95 transition-all">
      进入复习 →
    </a>
  </div>

  {/* 错题类型分布 */}
  {totalWrong > 0 && (
    <button
      onClick={async () => {
        try {
          const data = await api.myWrongQuestions();
          setWrongDetail(data);
          setShowWrongDetail(true);
        } catch { /* 静默失败 */ }
      }}
      className="mt-3 w-full py-2 text-xs font-bold rounded-xl
                 bg-warm-bg text-ink-light hover:bg-honey-pale hover:text-honey
                 active:scale-[0.98] transition-all"
    >
      📊 查看错题详情
    </button>
  )}
</div>
```

点击"查看错题详情"后，显示一个浮动面板（与家长端类似的错题列表）。

> 错题详情面板可以直接复用 `ParentDashboardPage.tsx` 中的 `WrongQuestionItemCard` 组件，提取到独立文件 `src/components/report/WrongQuestionCard.tsx`。

#### 改动 3 · 提取共享错题卡片组件

**新建文件:** `src/components/report/WrongQuestionCard.tsx`

将 `WrongQuestionItemCard` 从 `ParentDashboardPage.tsx` 提取出来，供家长端和学生端共用：

```tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import type { WrongQuestionItem } from '../../types';

const TYPE_CN_MAP: Record<string, string> = {
  choice: '选择题', fill: '填空题', translate: '翻译题',
  reorder: '连词成句', listening: '听力题', speak: '口语题',
};

export default function WrongQuestionCard({ item }: { item: WrongQuestionItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-warm-bg rounded-lg p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-ink truncate">
            {item.question_text || '(原题内容未记录)'}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-berry-pale text-berry font-bold">
              ❌ {item.wrong_count}次
            </span>
            <span className="text-[10px] text-ink-muted">
              {TYPE_CN_MAP[item.question_type] || item.question_type}
            </span>
            <span className="text-[10px] text-ink-muted">
              {item.created_at?.slice(0, 10) || ''}
            </span>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-ink-muted hover:text-ink flex-shrink-0"
        >
          {expanded ? '收起 ▲' : '详情 ▼'}
        </button>
      </div>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="mt-2 pt-2 border-t border-warm-border space-y-1.5"
        >
          <div className="text-xs">
            <span className="text-ink-muted">你的答案: </span>
            <span className="text-berry font-bold">{item.user_answer || '(空)'}</span>
          </div>
          <div className="text-xs">
            <span className="text-ink-muted">正确答案: </span>
            <span className="text-forest font-bold">{item.correct_answer}</span>
          </div>
          <div className="text-xs">
            <span className="text-ink-muted">难度: </span>
            <span className="capitalize">{item.difficulty || 'medium'}</span>
          </div>
          <div className="text-xs">
            <span className="text-ink-muted">课组: </span>
            <span>{item.lesson_group}</span>
          </div>
          <div className="text-xs">
            <span className="text-ink-muted">时间: </span>
            <span>{item.created_at || ''}</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export { TYPE_CN_MAP };
```

**修改 `ParentDashboardPage.tsx`:** 导入 `WrongQuestionCard` 替代内联的 `WrongQuestionItemCard`。

### 验证要求
- `npx tsc -b` 零错误
- 家长面板：点「📊 查看」→ 加载错题列表 → 显示每道错题的摘要
- 点击错题的「详情 ▼」→ 展开显示学生答案、正确答案、时间、课组
- 错题超过 5 道时显示「查看全部 N 道」按钮
- 学生端 ProfilePage：显示「待复习错题 N 道」+ 「进入复习」按钮
- 学生点「📊 查看错题详情」→ 弹出错题详情面板

执行完这些提示词后，系统要完整可运行并且不会有任何bug。

---

## 批次 5: 积分排行体系统一 + 学生数据面板 + 复习解锁奖励 (预计 2 小时)

### 目标
1. 排行榜从按「完成课数」排序改为按 XP 排序
2. 统一积分体系说明（XP 获取途径文档化）
3. 学生 ProfilePage 和首页能看到的自己的完整学习数据
4. 新增复习解锁规则：复习 N 题 / 水平测试通过 → 随机解锁 1 课
5. 首页嵌入迷你排行榜

### 背景
当前排行榜 (`LeaderboardPage.tsx`) 按 `COUNT(completed=1)` 排序，但 XP/段位系统完全独立运作。学生问"为什么我的排名是这样"时无法解释。需要统一为 XP 排序 + 辅助展示完成课数。

### 我需要的改动

#### 改动 1 · 后端排行榜按 XP 排序

**文件:** `backend/main.py` — `leaderboard` 函数 (约 L604-615)

当前 SQL：
```sql
SELECT u.id, u.username, u.nickname, COUNT(CASE WHEN up.completed=1 THEN 1 END) as completed
FROM users u LEFT JOIN user_progress up ON u.id = up.user_id
GROUP BY u.id ORDER BY completed DESC
```

改为增加 XP 字段，按 XP 排序：
```python
@app.get("/api/leaderboard")
def leaderboard(sort: str = "xp", limit: int = 50):
    conn = get_db()
    if sort == "completed":
        order_by = "completed DESC"
    else:
        order_by = "xp DESC"
    
    cur = conn.execute(
        "SELECT u.id, u.username, u.nickname, u.grade, "
        "COUNT(CASE WHEN up.completed=1 THEN 1 END) as completed, "
        "COALESCE(SUM(ar.xp_earned), 0) as xp "
        "FROM users u "
        "LEFT JOIN user_progress up ON u.id = up.user_id "
        "LEFT JOIN (SELECT user_id, SUM(xp_earned) as xp_earned FROM daily_stats GROUP BY user_id) ar ON u.id = ar.user_id "
        "GROUP BY u.id "
        f"ORDER BY {order_by} "
        "LIMIT ?", (limit,))
    
    results = []
    for r in cur.fetchall():
        d = r.to_dict() if hasattr(r, 'to_dict') else dict(r)
        results.append({
            "id": d["id"],
            "username": d["username"][:1] + "***",
            "nickname": d.get("nickname", ""),
            "grade": d.get("grade", ""),
            "completed": d.get("completed", 0) or 0,
            "xp": d.get("xp", 0) or 0,
        })
    return {"leaderboard": results}
```

> ⚠️ 如果 `daily_stats` 表中没有 `xp_earned` 字段的汇总数据，简化方案：用 `completed * 50` 作为基准 XP（每完成一课 ≈ 50XP），或用本地 `userState.totalXp`。由于排行榜是服务端查询，可以通过 `user_progress` 推算：`completed * 50 + attempts * 10`。选择简单可行的方案即可。

**简化方案（推荐）:**
```sql
SELECT u.id, u.username, u.nickname, u.grade,
  COUNT(CASE WHEN up.completed=1 THEN 1 END) as completed,
  COUNT(CASE WHEN up.completed=1 THEN 1 END) * 50 + COUNT(CASE WHEN up.attempts > 0 THEN 1 END) * 5 as xp
FROM users u
LEFT JOIN user_progress up ON u.id = up.user_id
GROUP BY u.id
ORDER BY xp DESC
LIMIT ?
```

#### 改动 2 · 前端排行榜展示 XP + 排序说明

**文件:** `src/pages/LeaderboardPage.tsx`

1. 更新 `Entry` 接口加 `xp` 字段
2. 每个排行项显示 XP + 完成课数
3. 顶部增加排序说明

```tsx
interface Entry {
  id: number; username: string; nickname: string;
  completed: number; xp: number; grade?: string;
}
```

排行榜卡片展示：
```tsx
<div className="text-right tabular-nums">
  <div className="text-h3 font-extrabold text-forest">{e.xp}</div>
  <div className="text-caption text-ink-light">XP</div>
  <div className="text-[10px] text-ink-muted">{e.completed} 课完成</div>
</div>
```

页面顶部加说明文字：
```tsx
<p className="text-caption text-ink-muted mt-1 max-w-xs mx-auto leading-relaxed">
  💡 排名根据 <b>XP（经验值）</b> 计算。<br/>
  答题 +10XP、完成学习块 +30XP、通过综合测试 +50XP、获得成就 +15XP
</p>
```

#### 改动 3 · 首页嵌入迷你排行榜

**文件:** `src/pages/HomePage.tsx`

在「今日进度」卡片下方，增加「🏆 闯关排行」迷你卡片（仅显示 Top 3 + 自己）：

```tsx
{/* 迷你排行榜 */}
<motion.div
  className="card p-4"
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: staggerDelay(4), ...springs.enter }}
>
  <div className="flex items-center justify-between mb-3">
    <h3 className="text-sm font-extrabold text-ink">🏆 闯关排行</h3>
    <button onClick={() => nav('/leaderboard')}
      className="text-xs font-bold text-forest hover:underline">
      查看全部 →
    </button>
  </div>

  {miniLeaderboard.length > 0 ? (
    <div className="space-y-2">
      {miniLeaderboard.slice(0, 3).map((entry, i) => (
        <div key={entry.id}
          className={`flex items-center gap-2 p-2 rounded-lg ${
            entry.id === myId ? 'bg-forest-pale border border-forest/20' : 'bg-warm-bg'
          }`}
        >
          <span className="text-sm font-bold w-6 text-center">
            {['🥇','🥈','🥉'][i]}
          </span>
          <span className="text-xs font-bold text-ink flex-1 truncate">
            {entry.nickname || entry.username}
            {entry.id === myId && <span className="text-forest ml-1 text-[10px]">(你)</span>}
          </span>
          <span className="text-xs font-bold text-forest tabular-nums">{entry.xp} XP</span>
        </div>
      ))}
    </div>
  ) : (
    <p className="text-xs text-ink-muted text-center py-2">暂无排行数据</p>
  )}
</motion.div>
```

获取迷你排行数据：
```tsx
const [miniLeaderboard, setMiniLeaderboard] = useState<Entry[]>([]);

useEffect(() => {
  fetch(`${API_BASE}/api/leaderboard?limit=10`)
    .then(r => r.json())
    .then(d => setMiniLeaderboard(d.leaderboard || []))
    .catch(() => {});
}, []);
```

#### 改动 4 · 复习/测试解锁奖励规则

**文件:** `src/pages/ReviewPage.tsx` + `src/pages/DiagnosisPage.tsx`

**规则:**
- 累计复习 ≥ 20 题（当天或总计）→ 触发 `checkRewards({ check_type: 'review_20' })`
- 水平测试通过 → 触发 `checkRewards({ check_type: 'diagnosis_pass' })`

**ReviewPage 改动:**
复习完成后检查累计复习题数：
```tsx
// 在 handleReview 或批量复习完成后
const reviewCount = Number(localStorage.getItem('nce_review_count') || '0') + 1;
localStorage.setItem('nce_review_count', String(reviewCount));

if (reviewCount >= 20 && !localStorage.getItem('nce_review_reward_done')) {
  api.checkRewards({ check_type: 'review_20' }).then(res => {
    if (res?.rewards?.length > 0) {
      localStorage.setItem('nce_review_reward_done', '1');
      setReviewRewards(res.rewards);
      setShowReviewRewards(true);
    }
  }).catch(() => {});
}
```

**后端 `check_rewards` 增加 `review_20` 和 `diagnosis_pass` 支持:**

```python
# 在 check_rewards 函数中新增:
check_type = data.get("check_type", "")

if check_type == "review_20":
    # 复习 20 题: 从待解锁课组中随机选 1 个
    # (逻辑与 review_master 类似,但触发条件不同)
    candidates = []
    max_completed = 0
    all_progress = conn.execute(
        "SELECT lesson_group FROM user_progress WHERE user_id=? AND (status='completed' OR completed=1)",
        (uid,)).fetchall()
    for r in all_progress:
        rd = r.to_dict() if hasattr(r, 'to_dict') else dict(r)
        try: max_completed = max(max_completed, ALL_LESSON_GROUPS.index(rd["lesson_group"]))
        except: pass
    
    for i in range(max_completed + 1, min(max_completed + 4, len(ALL_LESSON_GROUPS))):
        lg = ALL_LESSON_GROUPS[i]
        row = conn.execute("SELECT status FROM user_progress WHERE user_id=? AND lesson_group=?",
            (uid, lg)).fetchone()
        st = 'locked'
        if row:
            rd = row.to_dict() if hasattr(row, 'to_dict') else dict(row)
            st = rd.get('status', 'locked')
        if st == 'locked':
            candidates.append(lg)
    
    if candidates:
        pick = _random.choice(candidates)
        conn.execute(
            "INSERT INTO user_progress (user_id, lesson_group, status, unlocked_by, unlocked_at, completed, best_accuracy, attempts) "
            "VALUES (?, ?, 'unlocked', 'reward', datetime('now'), 0, 0, 0) "
            "ON CONFLICT(user_id, lesson_group) DO UPDATE SET "
            "status='unlocked', unlocked_by='reward', unlocked_at=datetime('now')",
            (uid, pick))
        rewards.append({"type": "review_20", "lesson_group": pick,
            "message": f"📚 复习 20 题达成! 奖励解锁 {pick}"})

elif check_type == "diagnosis_pass":
    # 水平测试通过: 同上逻辑,从后面 4 个锁定的课组中随机选 1 个
    # (同上 candidate 选择逻辑)
    ...
```

#### 改动 5 · 前端引导提示

**文件:** `src/pages/HomePage.tsx`

在快捷入口区，给「复习」和「水平测试」卡片加上吸引力标签：

```tsx
<QuickCard
  emoji={dueReview > 0 ? '📝' : '🌟'}
  title={dueReview > 0 ? `${dueReview}题待复习` : '学习星图'}
  subtitle={dueReview > 0
    ? `已复习 ${reviewCount}/20 题`
    : `${doneCount}/${LESSON_GROUPS.length}课`
  }
  badge={reviewCount < 20 ? `复习${20 - reviewCount}题解锁新课` : undefined}
  ...
/>

<QuickCard
  emoji="🔍" title="水平测试"
  subtitle="通过可解锁新课"
  badge="🎁 有奖励"
  ...
/>
```

QuickCard 组件加 `badge` prop：
```tsx
{badge && (
  <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full bg-honey-pale text-honey font-bold">
    {badge}
  </span>
)}
```

### 验证要求
- `npx tsc -b` 零错误
- 排行榜按 XP 降序排列，每项显示 XP + 完成课数
- 排行榜页面顶部有 XP 规则说明
- 首页底部有迷你排行榜（Top 3 + 自己高亮）
- 复习完成后累计计数增加
- 累计 20 题复习 → 触发奖励 → 弹窗展示解锁的课程
- 水平测试通过 → 触发奖励（如果实现了 diagnosis_pass）
- 快捷入口有引导文字提示

执行完这些提示词后，系统要完整可运行并且不会有任何bug。

---

## 附录: 执行顺序 & 依赖

```
批次 0 (家长锁定规则修正)         ← 无依赖,先做 (45min)
    ↓
批次 1 (复习中心重构)            ← 依赖批次 1 的 ReviewPage 改动 (2h)
    ↓
批次 2 (课程元数据补全)           ← 无硬依赖 (1.5h)
    ↓
批次 3 (首次引导+昵称/年级)       ← 依赖批次 0 的家长 API + 批次 2 的 LESSONS (1.5h)
    ↓
批次 4 (错题分析升级)            ← 依赖批次 1 的复习系统 + 批次 3 的 user grade (1.5h)
    ↓
批次 5 (积分排行+迷你排行+复习奖励) ← 依赖批次 1/2/3/4 (2h)
```

**每批次完成后必须:**
1. `npx tsc -b` 零 TypeScript 错误
2. `npm run dev` 前端可正常启动
3. `cd backend && python3 -m uvicorn main:app --reload --port 8000` 后端可正常启动
4. 在浏览器中验证核心功能可用

**全部完成后系统状态:**
- 家长锁定/解锁不影响学生学习数据
- 复习中心展示原题并支持重新作答
- 144 课完整标题+元数据，星图 6 阶段全可见
- 首次登录引导填写中文昵称+年级
- 错题分析可查看原题+答案+时间，支持展开查看
- 排行按 XP 排序，规则清晰，首页有迷你排行
- 复习 20 题/水平测试通过 → 随机解锁新课
