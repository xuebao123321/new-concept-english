# 英语重启号 · AI 执行提示词 (4 批次)

---

## 项目概览 (每个 AI 会话都需要先读这段)

**项目:** 英语重启号 — 熊出没主题新概念英语学习 PWA,面向 6-12 岁小学生。
**技术栈:** React 18 + TypeScript + Vite 6 + Tailwind CSS v4 + Framer Motion + Zustand + Dexie (IndexedDB) + howler (音效)。
**后端:** FastAPI + Turso/SQLite,部署在 Railway。
**前端:** Vercel 一键部署。
**架构:** 前后端双数据库 — 前端 IndexedDB (Dexie) 存本地进度/XP/错题,后端 Turso 存用户 auth + 排行榜查询 + 服务端进度。目前两个库**不同步**。
**关键文件:**
- `src/index.css` — 设计系统 (@theme token + 7 级字号 + 动效 class)
- `src/utils/motion-tokens.ts` — 全局 spring/duration 动效 token
- `src/stores/useUserStore.ts` — 用户状态 (XP/段位/心/升级)
- `src/stores/useAuthStore.ts` — 登录/注册/token 管理
- `src/stores/useLessonProgressStore.ts` — 课程解锁/块进度/综合测试
- `src/stores/usePracticeStore.ts` — 答题会话状态
- `src/db/database.ts` — 本地 IndexedDB (Dexie)
- `src/db/api.ts` — 后端 API client
- `src/App.tsx` — 路由定义
- `src/components/layout/AppShell.tsx` — 全局壳 (TopBar + 底部Tab + 升级弹窗)
- `src/pages/LoginPage.tsx` — 登录/注册/忘记密码
- `src/pages/HomePage.tsx` — 首页
- `src/components/questions/QuestionCard.tsx` — 题目卡片 (每个类型入口)
- `src/components/questions/AnswerFeedback.tsx` — 答对/答错弹层
- `backend/main.py` — 后端所有路由
- `backend/models.py` — Pydantic model
- `backend/auth.py` — PBKDF2 密码 + JWT
- `backend/db.py` — Turso/SQLite 双模式
- `public/assets/characters/` — 角色图片 (6 张 WebP)
- `src/utils/motion-tokens.ts` — 全局 spring token
- `src/utils/xp-calculator.ts` — 20 级段位 + icon + 颜色定义

**启动命令:**
```bash
# 前端: npm run dev (端口 5173)
# 后端: cd backend && uvicorn main:app --reload --port 8000
# TypeScript 检查: npx tsc -b (任何修改后必须通过)
```

**项目路径:** `/Users/andy/Documents/Andy AI/new concept english`

---

## 批次 0: 紧急修復 (预计 30 分钟)

### 目标
修 3 个 P0/P1 级别的产品 bug:注册流程文案混乱、密码重置不可用、课程解锁门槛太硬。

### 背景
当前 `LoginPage.tsx` 的注册分支逻辑自相矛盾:`useAuthStore.register()` 写入 token 并设 `isLoggedIn=true`,但 `LoginPage` 在注册成功后显示"注册成功!请登录"又把 mode 切回 login。用户困惑。

`backend/main.py` 忘记密码接口 `/api/auth/forgot-password` 通过 `print()` 输出验证码到服务端日志,前端没有短信/邮箱集成,用户实际无法使用。前端 `LoginPage.tsx` 的 forgot 模式只是一个空表单,填了用户名也没法真的校验验证码。

`src/db/database.ts` 第 65 行: `const passed = accuracy >= 1.0; // 100%正确率才能过关解锁下一课`。儿童产品中,100% 门槛导致卡关率高,应降到 80%。

`src/utils/xp-calculator.ts` 中 RANKS 里仍有 `text-gray-500/600` 等旧颜色。`src/components/gamification/XpBar.tsx` 的 RANK_SYSTEM 与 xp-calculator.ts 的 RANKS 不一致（两套段位定义并存）。

### 我需要的改动

#### 修复 1 · LoginPage 注册成功直接跳转,移除 forgot 模式

**文件:** `src/pages/LoginPage.tsx`

**具体操作:**
1. 把 `useState<'login' | 'register' | 'forgot'>('register')` 中的 `'forgot'` 删掉,改为 `useState<'login' | 'register'>('register')`
2. 删除 `submit` 函数中关于 forgot 的处理分支 (目前 submit 函数只处理 login/register,forgot 模式走同一分支会出问题)
3. 把注册成功的逻辑从 "注册成功!请登录" + 切 mode → 改为直接跳转首页:
   - 改写 `if (mode === 'register')` 分支: `setMsg('✅ 注册成功！跳转中...'); setTimeout(() => { window.location.href = '/'; }, 500);`
4. 删掉 forgot 相关的 UI 分支: 第 54 行 `mode === 'forgot' ? '重置密码'` 三元、第 72 行 `{mode !== 'forgot' && (` 密码框条件、第 88-92 行 forgot 入口按钮
5. 把"忘记密码?"按钮改为弹 alert: `<button onClick={() => { alert('如需重置密码,请联系管理员'); }} ...>忘记密码？</button>`
6. 删除第 83 行模式切换按钮中关于 forgot 的分支,简化为 `{mode === 'login' ? '→ 创建新账号' : '→ 已有账号？登录'}`

#### 修复 2 · 课程解锁门槛从 100% 降到 80%

**文件 1:** `src/db/database.ts`

**第 65 行,**把 `const passed = accuracy >= 1.0;` 改为 `const passed = accuracy >= 0.8;`

**文件 2:** `src/stores/useLessonProgressStore.ts`

**第 168 行,**把注释 `// 标记课程为已完成（综合测试 100% 通过后调用）` 改为 `// 标记课程为已完成（综合测试 80% 正确率即可通过）`

#### 修复 3 · 消除两套段位系统冗余

**文件:** `src/utils/xp-calculator.ts`

**整个 RANKS 数组改用主题色板 hex:**
- `'text-gray-500'` → `'#A8A29E'` (ink-ghost)
- `'text-gray-600'` → `'#8B8580'` (ink-light)
- `'text-green-600'` → `'#5B9A5A'` (forest)
- `'text-blue-600'` → `'#5B9ED4'` (sky)
- `'text-purple-600'` → `'#7E57C2'` (plum)
- `'text-orange-500'` → `'#FF8C42'` (honey)
- `'text-red-500'` → `'#E57373'` (berry)

同时给每个段位补 `icon` 字段 (emoji),参照 XpBar 中的 RANK_SYSTEM 让 icon 有意义。

**文件:** `src/components/gamification/XpBar.tsx`

**让 XpBar 使用 xp-calculator.ts 的 RANKS 而非重复定义 RANK_SYSTEM。** 把:
```ts
import { motion } from 'framer-motion';
import { useUserStore } from '../../stores/useUserStore';
import { springs } from '../../utils/motion-tokens';

const RANK_SYSTEM = [...]; // 删掉这整块 6 元素数组
function getRank(xp: number) { ... }
```

改为:
```ts
import { motion } from 'framer-motion';
import { useUserStore } from '../../stores/useUserStore';
import { springs } from '../../utils/motion-tokens';
import { getLevelByXp, RANKS } from '../../utils/xp-calculator';

function getRank(xp: number) {
  return getLevelByXp(xp);
}
```

然后更新 getRank 中 nextRank 的计算逻辑,用 RANKS 的 `find` 替代 RANK_SYSTEM 的 indexOf。

### 验证要求
- 运行 `npx tsc -b` 确保零错误
- `npm run dev` 启动后:
  1. 打开 `http://localhost:5173/login` → 选"创建新账号" → 注册新用户 → 注册成功后自动跳转首页
  2. 做完一节课到 80% 正确率 → 下一课已解锁
  3. 点击"忘记密码"→ 弹 alert 提示联系管理员
  4. 首页 XP 条显示的段位名和 icon 来自 xp-calculator 的 RANKS
- 无任何 TypeScript 错误或 HMR 报错

执行完这些提示词后,系统要完整可运行并且不会有任何bug。

---

## 批次 1: 进度云同步 + 登录路由守卫 (预计 2 小时)

### 目标
让登录变得"有意义"——前后端进度互相同步,用户换设备后进度不丢失。同时加上路由守卫,未登录用户只能看到登录页。

### 背景
当前架构有 2 个致命缺口:
1. 登录后,前端的 IndexedDB 进度不会上传到后端,后端已有的进度也不会拉下来合并。排行榜读的是后端数据库,所以你做的题不会在排行榜显示,换设备所有数据也全丢。
2. App.tsx 没有路由守卫——LoginPage 是独立路由但不强制,任何人都可以跳过登录直接访问首页。

### 我需要的改动

#### 改动 1 · App.tsx 加登录路由守卫

**创建新文件:** `src/components/common/RequireAuth.tsx`

```tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';

/** 路由守卫:未登录 → 跳转 /login,已登录 → 正常渲染子路由 */
export default function RequireAuth() {
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <Outlet />;
}
```

**修改文件:** `src/App.tsx`

把路由结构从:
```tsx
<Route path="/login" element={<LoginPage />} />
<Route element={<AppShell />}>
  <Route path="/" element={<HomePage />} />
  ...所有子路由
</Route>
```

改为:
```tsx
import RequireAuth from './components/common/RequireAuth';

<Route path="/login" element={<LoginPage />} />

<Route element={<RequireAuth />}>
  <Route element={<AppShell />}>
    <Route path="/" element={<HomePage />} />
    <Route path="/star-map" element={<StarMapPage />} />
    <Route path="/lesson" element={<LessonSelectPage />} />
    <Route path="/lesson/:groupId" element={<LessonDetailPage />} />
    <Route path="/lesson/:groupId/block/:block" element={<BlockSessionPage />} />
    <Route path="/lesson/:groupId/test" element={<MasteryTestPage />} />
    <Route path="/practice" element={<PracticePage />} />
    <Route path="/review" element={<ReviewPage />} />
    <Route path="/review/scheduled" element={<ScheduledReviewPage />} />
    <Route path="/achievements" element={<AchievementsPage />} />
    <Route path="/profile" element={<ProfilePage />} />
    <Route path="/diagnosis" element={<DiagnosisPage />} />
    <Route path="/leaderboard" element={<LeaderboardPage />} />
    <Route path="*" element={<NotFoundPage />} />
  </Route>
</Route>
```

**登录页跳转:** LoginPage 中登录成功后的 `location.href = '/'` 改为 `window.location.href = '/'`,确保 React Router 重新识别路由。

#### 改动 2 · 登录后从后端拉进度并合并到本地

**文件:** `src/stores/useAuthStore.ts`

**在文件顶部 (imports 之后) 加:**
```ts
import { useLessonProgressStore } from './useLessonProgressStore';
import { db } from '../db/database';
```

**在 store 接口和 create 中加入新方法 `syncProgressFromServer` (放在 logout 之后):**

```ts
syncProgressFromServer: async () => {
  try {
    const res = await api.getProgress();
    const serverProgress = res.progress || [];
    for (const p of serverProgress) {
      const existing = await db.lessonProgress.get(p.lesson_group);
      if (!existing || (p.completed && !existing.completed)) {
        // 服务端进度"更好" → 覆盖本地
        await db.lessonProgress.put({
          lessonGroup: p.lesson_group,
          completed: p.completed,
          bestAccuracy: Math.max(existing?.bestAccuracy || 0, p.best_accuracy || 0),
          attempts: Math.max(existing?.attempts || 0, p.attempts || 0),
          lastAttemptAt: Date.now(),
          completedAt: p.completed
            ? (existing?.completedAt || Date.now())
            : (existing?.completedAt || 0),
        });
      }
    }
    // 刷新 lessonProgressStore
    await useLessonProgressStore.getState().refresh();
  } catch (e) {
    console.warn('进度同步失败,继续使用本地数据', e);
  }
},
```

**在 `login` 和 `register` 实现方法中,** 各自的 `set({...})` 之后加:
```ts
// 异步拉取服务端进度 (不阻塞登录流程)
get().syncProgressFromServer().catch(() => {});
```

#### 改动 3 · 课程完成后向后端推送进度

**文件 1:** `src/db/database.ts`

**在文件顶部 (imports 之后) 加:**
```ts
import { api } from './api';
```

**在 `updateLessonProgress` 方法末尾 (return 之前),** 加:
```ts
// 异步推送到后端 (fire-and-forget)
api.updateProgress(lessonGroup, correctCount, totalCount).catch(() => {});
```

**文件 2:** `src/pages/BlockSessionPage.tsx`

**顶部加 `import { api } from '../db/api';`**

**在 `finishBlock` 函数中** (`completeBlock(groupId, blockType)` 之后, `addXp(...)` 之前或之后),加:
```ts
const correctInBlock = correctCount; // 从 finishBlock(true) 的 perfect 逻辑推算
// 注意: finishBlock 在 done 状态回调中处理,需确保 total 可拿 sessionQ.length
await api.updateProgress(groupId, correctCount, sessionQ.length).catch(() => {});
```

**文件 3:** `src/pages/MasteryTestPage.tsx`

**在 `markLessonComplete` 调用之后,**加:
```ts
api.updateProgress(groupId, passed ? totalQ : 0, totalQ).catch(() => {});
```
(需要从 masterytest 的逻辑中提取 `totalQ` 和 `passed` 变量)

**文件 4:** `src/pages/PracticePage.tsx`

**在 `handleComplete` 中** `await useLessonProgressStore.getState().refresh();` 之后加:
```ts
for (const group of session.config.lessonGroups) {
  const groupAnswers = session.answers.filter(a => {
    const q = session.questions.find(q => q.id === a.questionId);
    return q?.lessonGroup === group;
  });
  const correct = groupAnswers.filter(a => a.correct).length;
  api.updateProgress(group, correct, groupAnswers.length).catch(() => {});
}
```

### 验证要求
- `npx tsc -b` 零错误
- 启动后端 (`uvicorn main:app --port 8000`) 和前端 (`npm run dev`)
- 未登录时访问 `http://localhost:5173/` → 自动跳转 `/login`
- 登录后 → 回到首页,数据正常加载
- 做一节课 → 刷新页面 → 进度保留 (本地 Dexie)
- 登录后做一节课 → 访问 `http://localhost:8000/api/user/progress` (带 Bearer token) → 有对应 completed 记录
- Leaderboard 页 (`http://localhost:5173/leaderboard`) → 自己的 completed 数反映出刚做的课程

执行完这些提示词后,系统要完整可运行并且不会有任何bug。

---

## 批次 2: 排行榜"我在哪" + 答题连击激励 (预计 1.5 小时)

### 目标
排行榜加"我的位置"高亮 + 快速滚动。答题过程中加 3/5/10 连击弹层 + 连续答错 3 次提示看解析。

### 背景
当前的 `LeaderboardPage.tsx` 展示全体排名但用户找不到自己,缺少参与感。`QuestionCard.tsx` 的答题反馈只有双态(对/错),没有激励层次。儿童产品需要连击等"哇"的瞬间。

### 我需要的改动

#### 改动 1 · 排行榜加"我的排名"高亮 + 快速定位

**文件:** `src/pages/LeaderboardPage.tsx`

1. **顶部加 `import { useAuthStore } from '../stores/useAuthStore';`**

2. **在组件内取当前用户 id:**
```ts
const { user } = useAuthStore();
const myId = user?.id;
const myRankIndex = data.findIndex(e => e.id === myId);
```

3. **修改前 3 名的 `MedalCard` prop 接口,**加 `isMe?: boolean` 字段。在渲染 MedalCard 时传 `isMe={myId === top3[rank].id}`。如果 isMe,额外加 `ring-2 ring-forest ring-offset-2` 样式到卡片上。

4. **在"📋 其他"列表渲染中:** 每条记录判断 `isMe`:
```tsx
{data.slice(3).map((e, i) => {
  const isMe = e.id === myId;
  return (
    <motion.div
      key={e.id}
      id={isMe ? 'lb-me' : undefined}
      className={`card p-3 flex items-center gap-3 ${
        isMe ? 'border-forest bg-forest-pale ring-2 ring-forest/30' : ''
      }`}
    >
      {/* 排名号 */}
      <div className="w-8 h-8 rounded-full bg-warm-bg text-ink-light flex items-center justify-center text-meta font-extrabold tabular-nums">
        {i + 4}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-meta font-bold text-ink truncate">
          {e.nickname || e.username}
          {isMe && (
            <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-forest text-white font-bold">你</span>
          )}
        </div>
      </div>
      {/* 分数不变 */}
    </motion.div>
  );
})}
```

5. **在"📋 其他"分隔线上方加定位按钮:**
```tsx
{myRankIndex >= 3 && (
  <button
    onClick={() => document.getElementById('lb-me')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
    className="text-meta text-forest font-bold text-center w-full py-1 hover:underline"
  >
    👇 向下找到我的位置 (第 {myRankIndex + 1} 名)
  </button>
)}
```

#### 改动 2 · 连击激励弹层

**创建新文件:** `src/components/questions/ComboToast.tsx`

```tsx
import { motion, AnimatePresence } from 'framer-motion';
import { springs } from '../../utils/motion-tokens';

interface Props { combo: number; show: boolean; }

/** 连击激励弹层: 3 / 5 / 10 连击时触发 */
export default function ComboToast({ combo, show }: Props) {
  if (!show || combo < 3) return null;

  const emoji = combo >= 10 ? '🔥🔥🔥' : combo >= 5 ? '🔥🔥' : '🔥';
  const text = combo >= 10 ? `${combo}连击!无敌了!`
    : combo >= 5 ? `${combo}连击!太棒了!`
    : `${combo}连击!`;
  const colorClass = combo >= 10 ? 'text-honey' : combo >= 5 ? 'text-forest' : 'text-sky';

  return (
    <AnimatePresence>
      <motion.div
        key={combo}
        className="fixed top-1/4 inset-x-0 z-50 pointer-events-none flex justify-center"
        initial={{ opacity: 0, scale: 0.6, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.6, y: -20 }}
        transition={springs.popIn}
      >
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-5 py-3 shadow-lg border-2 border-sun">
          <div className={`text-2xl font-extrabold text-center ${colorClass}`}>
            {emoji} {text}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
```

**修改文件:** `src/components/questions/QuestionCard.tsx`

1. 顶部 import:
```tsx
import ComboToast from './ComboToast';
```

2. 在组件内加 state:
```tsx
const [combo, setCombo] = useState(0);
const [showCombo, setShowCombo] = useState(false);
```

3. 在 `handleAnswer` 中:
```tsx
// 在 setLastCorrect(correct); 之后加:
if (correct) {
  const newCombo = combo + 1;
  setCombo(newCombo);
  if (newCombo === 3 || newCombo === 5 || newCombo === 10) {
    setShowCombo(true);
    setTimeout(() => setShowCombo(false), 2000);
  }
} else {
  setCombo(0);
  setShowCombo(false);
}
```

4. 在组件的 return JSX 中, `<AnswerFeedback ... />` 旁边加:
```tsx
<ComboToast combo={combo} show={showCombo} />
```

#### 改动 3 · 连续答错 3 次提示

**同一文件:** `src/components/questions/QuestionCard.tsx`

1. 加 state:
```tsx
const [wrongStreak, setWrongStreak] = useState(0);
const [showHint, setShowHint] = useState(false);
```

2. 在 `handleAnswer` 的答错分支 (else 块) 中:
```tsx
const newWrongStreak = wrongStreak + 1;
setWrongStreak(newWrongStreak);
if (newWrongStreak >= 3) {
  setShowHint(true);
  setWrongStreak(0);
}
```

3. 在答对分支中:
```tsx
setWrongStreak(0);
setShowHint(false);
```

4. 在渲染的 JSX 中,`</motion.div>` 闭合前 (即 answer feedback 上方),加:
```tsx
{showHint && (
  <motion.div
    className="mt-3 p-3 rounded-xl bg-sky-pale border border-sky/30 text-sm text-ink font-medium text-center"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={springs.enter}
  >
    💡 连续答错了,建议看看下面的解析,或者休息一下再试~
  </motion.div>
)}
```

### 验证要求
- `npx tsc -b` 零错误
- Leaderboard 页: 登录用户能看到自己的行高亮(绿色 ring + "你"标签),前三名奖牌区对应高亮
- 点击"向下找到我的位置"按钮 → 平滑滚动到自己的行
- 做题答对 3 次 → 弹出 🔥 3连击! Toast; 5 次 → 🔥🔥 5连击!; 10 次 → 🔥🔥🔥 10连击!
- 答错后 combo 归零,Toast 不正确触发
- 连续答错 3 次 → 出现蓝色提示条,答对后消失

执行完这些提示词后,系统要完整可运行并且不会有任何bug。

---

## 批次 3: 心(Hearts)系统激活 (预计 1 小时)

### 目标
让"心"不再是僵尸系统——答错扣心、心用完禁止答题、随时间自然恢复。

### 背景
当前 `Hearts` (5 颗) 的定义存在 (`useUserStore.consumeHeart` / `grantBonusHeart` / `checkAndRefillHearts`),但从未在真实答题过程中被消耗。`checkAndRefillHearts()` 只在 `PracticePage` 挂载时调用一次,而 `BlockSessionPage` 和 `MasteryTestPage` 完全不涉及心。

`useUserStore.consumeHeart` 的实现调用了 `loseHeart()` from `utils/streak.ts`。需要验证这个工具函数是否正常工作,以及 `checkAndRefillHearts` 的恢复逻辑。

### 我需要的改动

#### 改动 1 · QuestionCard 答错时扣心

**文件:** `src/components/questions/QuestionCard.tsx`

1. 顶部加 import: `import { useUserStore } from '../../stores/useUserStore';`
2. 在组件内取 store: `const { consumeHeart } = useUserStore();`
3. 在 `handleAnswer` 中的答错分支 (`if (!correct)`) 中:
```tsx
consumeHeart().catch(() => {});
```
(这是一个 fire-and-forget async 调用,不阻塞答题流程)

#### 改动 2 · BlockSessionPage 心不足禁止进入

**文件:** `src/pages/BlockSessionPage.tsx`

1. 顶部加 `import { useUserStore } from '../stores/useUserStore';`
2. 组件内取 hearts: `const { userState } = useUserStore(); const hearts = userState?.hearts ?? 5;`
3. 在 loading 完成判断之后、题目渲染之前 (当前代码约第 139 行,即 `if (loading || sessionQ.length === 0)` 和 `if (!cur)` 之后),加:

```tsx
if (hearts === 0) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-cream gap-4">
      <img
        src="/assets/characters/bears-cabin.webp"
        alt="心已用完"
        className="w-32 h-32 rounded-2xl object-cover border-2 border-warm-border shadow-sm"
        style={{ objectPosition: 'center 30%' }}
      />
      <h2 className="text-h2 text-ink">❤️ 心已用完</h2>
      <p className="text-meta text-ink-light text-center max-w-xs">
        答错会消耗一颗心,每 30 分钟自动恢复一颗~
        <br />休息一会儿再来吧!
      </p>
      <button onClick={() => navigate(-1)} className="btn-ghost text-base w-40">
        ← 返回
      </button>
    </div>
  );
}
```

#### 改动 3 · 首页 Status Bar 的心数视觉升级

**文件:** `src/pages/HomePage.tsx`

**替换 status bar 中当前的心数展示 `❤️ {userState?.hearts ?? 5}`,** 改为 5 颗心的可视化行:

```tsx
<span className="flex items-center gap-0.5">
  {Array.from({ length: 5 }, (_, i) => (
    <span key={i} className={i < (userState?.hearts ?? 5) ? '' : 'grayscale opacity-25'}>
      ❤️
    </span>
  ))}
</span>
```

#### 改动 4 · PracticePage 和 MasteryTestPage 也接入心检查

**文件 1:** `src/pages/PracticePage.tsx`

参照 BlockSessionPage 的改法:
1. import `useUserStore`
2. 取 `hearts`
3. 在 `handleStart` 函数开头加:
```tsx
if (hearts === 0) {
  alert('❤️ 心已用完,休息一会儿再来吧!');
  return;
}
```

**文件 2:** `src/pages/MasteryTestPage.tsx`

参照 BlockSessionPage:
1. import `useUserStore`
2. 取 `hearts`
3. 在渲染时,如果 `hearts === 0`,显示和 BlockSessionPage 同样的"心已用完"页面 (可以复用同一个 UI,或者直接 return 提示 JSX)

综合测试是"考试"性质,**答错一次扣 2 颗心**:
在 `MasteryTestPage` 或 `QuestionCard` 中,通过 prop 标记 `isTestMode`,如果是测试模式则:
```tsx
if (isTestMode) {
  consumeHeart().catch(() => {});
  consumeHeart().catch(() => {}); // 两次扣心
} else {
  consumeHeart().catch(() => {});
}
```

但更简单的方式:**在 MasteryTestPage 的 handleAnswer 中直接调两次 consumeHeart()**,不在 QuestionCard 改额外逻辑,避免影响其他使用 QuestionCard 的页面。在 MasteryTestPage 找到题目答错的处理点 (通常在调用 onAnswer 或 handleAnswer 之前做判断),加 `if (!correct) { consumeHeart().catch(() => {}); consumeHeart().catch(() => {}); }`。

### 验证要求
- `npx tsc -b` 零错误
- 首页 Status Bar 能看到 5 颗 ❤️ 的水平排列
- 做一道题故意答错 → 首页心数变成 4 颗 (有一颗灰度)
- 连续答错 5 道题 → BlockSessionPage 显示"心已用完"页面 + 返回按钮工作
- 心用完时,自由练习弹出 alert,综合测试显示提示页
- 等 30 分钟后刷新 → 心自动恢复到 1 颗 (checkAndRefillHearts 逻辑)
- 综合测试答错扣 2 颗心
- 任何环节都不会因 hearts=undefined 而 crash

执行完这些提示词后，系统要完整可运行并且不会有任何bug。

---

## 附录: 执行顺序 & 每批后的检查清单

```
批次 0 (紧急修復)     ← 无依赖,最先做,30 分钟
    ↓
批次 1 (进度同步)     ← 依赖批次 0 的 80% 解锁门槛 + 段位统一
    ↓
批次 2 (排行榜+激励) ← 依赖批次 1 的进度同步(排行榜数据来自后端)
    ↓
批次 3 (心系统)      ← 无硬依赖,但建议最后做(涉及多处改动)
```

**每批次执行完毕后,强制检查:**

1. `npx tsc -b` → **必须零错误**
2. `npm run dev` → 浏览器打开核心页面 (首页/登录/做题/排行榜/Profile) → 所有交互正常
3. Vite dev server 终端无 HMR 红色报错
4. 不做完不开始下一批
5. 如果 `tsc -b` 报错,优先修类型错误再继续

**最终状态:** 全部 4 批次执行完毕后,系统应具备:
- 流畅的注册/登录体验 (注册直接进首页)
- 前后端进度自动同步 (换设备不丢数据)
- 登录路由守卫 (未登录不能访问功能页)
- 排行榜"我的位置"高亮 + 快速定位
- 答题连击激励 Toast
- 连续答错 3 次提示
- 心系统完整闭环: 答错扣心 / 用完禁答 / 自然恢复
- 80% 解锁门槛 (儿童友好,不卡关)
- 单一来源的段位系统 (消除 XpBar 和 xp-calculator 重复)
