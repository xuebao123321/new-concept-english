# 英语重启号 · AI 执行提示词 V8 — 复习系统 + 用户留存 (4 批次)

---

## ⚠️ 项目概览 (每个 AI 会话都必须先读)

**项目:** 英语重启号 — 熊出没主题新概念英语学习 PWA,家庭 SaaS。
**当前版本:** V7 错题分析大部分已落地(后端 answer_records 已加 question_text/correct_answer/difficulty,V7 批次 1-3 待做)。基础复习页有 WrongBook + SpacedReview 两个 Tab。
**本次目标:** 复习系统全面升级(艾宾浩斯遗忘曲线优先级排序+分层UI+复习反馈闭环) + 首页"今日推荐"(进行中课程记忆+复习提醒) + 每日打卡仪式感。

**技术栈:** React 18 + TS + Vite 6 + Tailwind CSS v4 + Framer Motion + Zustand + Dexie / FastAPI + Turso/SQLite

**关键文件:**
```
前端:
  src/pages/ReviewPage.tsx                  — 复习页主入口 (需重构)
  src/components/review/WrongBook.tsx       — 错题本书架 (需改造为优先级分层)
  src/components/review/SpacedReview.tsx    — 间隔复习列表 (需整合)
  src/pages/HomePage.tsx                    — 首页 (加今日推荐+复习提醒)
  src/pages/LessonSelectPage.tsx            — 课程列表 (加未解锁预告)
  src/utils/spaced-repetition.ts            — SM-2 算法 (已有,本次扩展)
  src/db/database.ts                        — 本地 Dexie (WrongQuestion 表已有)
  src/stores/useUserStore.ts                — 用户状态 (streak/checkAndUpdateStreak)

后端: 本次不需要改动
```

**项目路径:** `/Users/andy/Documents/Andy AI/new concept english`
**启动:** `npm run dev` (前端) / `cd backend && python3 -m uvicorn main:app --reload --port 8000` (后端)
**每次必须通过:** `npx tsc -b`

---

## 批次 0: 复习页重构 — 艾宾浩斯优先级 + 分层 UI (预计 1.5 小时)

### 目标
将复习页从"错题本 + 间隔复习"两个平级 Tab,改为一个按艾宾浩斯遗忘曲线分 4 个优先级的统一页面。

### 背景
当前复习页有两个 Tab:
- **错题本** (`WrongBook.tsx`): 列出所有错题,按时间倒序,可筛选题型,标注"错X次"。但**不区分优先级**,所有错题一个列表。
- **间隔复习** (`SpacedReview.tsx`): 显示按 phase 分组的复习任务。

存在问题:
1. 两个 Tab 割裂——学生不知道应该先看错题本还是间隔复习
2. 错题列表没有"哪道最该现在做"的排序
3. `getDueReviews()` 能算出到期题目,但页面没用来排序
4. 做完复习题没有反馈——不知道"过了"还是"没过",stage 是否更新了

### 艾宾浩斯遗忘曲线映射

当前 `spaced-repetition.ts` 已有:

```ts
SPACED_STAGES = [
  { stage: 0, intervalDays: 0 },   // 立即复习(刚刚错的)
  { stage: 1, intervalDays: 1 },   // 1 天后
  { stage: 2, intervalDays: 3 },   // 3 天后
  { stage: 3, intervalDays: 7 },   // 7 天后
  { stage: 4, intervalDays: 30 },  // 30 天后
  { stage: 5, intervalDays: ∞ },  // 永久掌握
]
```

本次需要基于此构建**复习优先级算法**。

### 我需要的改动

#### 改动 1 · 新建复习优先级排序工具

**新建文件:** `src/utils/review-priority.ts`

```ts
import { db } from '../db/database';
import { getDueReviews, SPACED_STAGES } from './spaced-repetition';
import type { WrongQuestion } from '../types';

/** 复习优先级等级 */
export type ReviewPriority = 'urgent' | 'due' | 'weak' | 'mastered';

/** 带优先级标签的错题 */
export interface PrioritizedWrong {
  question: WrongQuestion;
  priority: ReviewPriority;
  label: string;         // "已过期 2 小时" / "明天到期" / "错了 5 次" / "已掌握"
  stage: number;         // 当前艾宾浩斯阶段
  nextReviewLabel: string; // "现在" / "1天后" / "3天后" / "7天后" / "30天后" / "已掌握"
}

/** 根据遗忘曲线 + 错误频率,对所有错题排序并标优先级 */
export async function getPrioritizedWrongs(): Promise<{
  urgent: PrioritizedWrong[];
  due: PrioritizedWrong[];
  weak: PrioritizedWrong[];
  mastered: PrioritizedWrong[];
}> {
  const all = await db.wrongQuestions.toArray();
  const now = Date.now();

  const result = {
    urgent: [] as PrioritizedWrong[],
    due: [] as PrioritizedWrong[],
    weak: [] as PrioritizedWrong[],
    mastered: [] as PrioritizedWrong[],
  };

  for (const wq of all) {
    // 计算当前 stage
    const stage = wq.wrongCount >= 5 ? 4 : Math.max(0, wq.wrongCount - 1);
    const stageInfo = SPACED_STAGES[stage] || SPACED_STAGES[0];

    const nextLabel = stage >= 5 ? '已掌握'
      : stage === 4 ? '30天后'
      : stage === 3 ? '7天后'
      : stage === 2 ? '3天后'
      : stage === 1 ? '1天后'
      : '现在';

    const overdue = wq.nextReviewTime > 0 && now > wq.nextReviewTime;
    const dueSoon = wq.nextReviewTime > 0 && now < wq.nextReviewTime
      && wq.nextReviewTime - now < 24 * 60 * 60 * 1000;

    let priority: ReviewPriority;
    let label: string;

    if (wq.mastered) {
      priority = 'mastered';
      label = '已掌握';
    } else if (overdue && now - wq.nextReviewTime > 24 * 60 * 60 * 1000) {
      priority = 'urgent';
      label = `已过期 ${Math.floor((now - wq.nextReviewTime) / 3600000)} 小时`;
    } else if (overdue || dueSoon) {
      priority = 'due';
      label = overdue ? '今天该复习了' : '明天到期';
    } else if (wq.wrongCount >= 3) {
      priority = 'weak';
      label = `错了 ${wq.wrongCount} 次`;
    } else {
      priority = 'due';
      label = `下次: ${new Date(wq.nextReviewTime).toLocaleDateString('zh-CN')}`;
    }

    const pw: PrioritizedWrong = {
      question: wq,
      priority,
      label,
      stage,
      nextReviewLabel: nextLabel,
    };

    result[priority].push(pw);
  }

  // 组内排序: 错误次数多的排前面
  for (const key of ['urgent', 'due', 'weak'] as const) {
    result[key].sort((a, b) => b.question.wrongCount - a.question.wrongCount);
  }

  return result;
}

/** 获取首页复习提醒 (到期且未掌握的题目数) */
export async function getReviewReminder(): Promise<number> {
  const all = await db.wrongQuestions.toArray();
  const now = Date.now();
  return all.filter(wq =>
    !wq.mastered && wq.nextReviewTime > 0 && wq.nextReviewTime <= now
  ).length;
}
```

> ⚠️ 注意: `db.wrongQuestions` 在 Dexie 中。确保 `db` 已正确导入。`SPACED_STAGES` 从 `spaced-repetition.ts` 导入。

#### 改动 2 · 重构 ReviewPage 为统一分层视图

**文件:** `src/pages/ReviewPage.tsx`

**废弃当前两个 Tab,改为统一页:**

页面结构:
```
┌─ 📝 复习中心 ──────────────────────────┐
│                                        │
│  📊 共 10 道错题 · 3 道今天该复习       │
│                                        │
│  ┌─ 🔴 今天必须复习 (3 题) ─────────┐  │
│  │  [题目卡片 × 3]                   │  │
│  │  [🚀 开始这组复习]                │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌─ 🟠 近期该复习 (4 题) ──────────┐  │
│  │  [题目卡片 × 4]                   │  │
│  │  [🔄 提前复习]                    │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌─ 🟡 高频错题 (错 ≥3 次) (2 题) ─┐  │
│  │  [题目卡片 × 2]                   │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌─ 🟢 已掌握 (2 题) ───────────────┐  │
│  │  [折叠,点击展开]                  │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

**具体实现:**

1. **页面 top:** 概览统计行 — "共 X 道错题 · Y 道今天该复习 · Z 道已掌握"

2. **urgent / due 组:** 最上面,红色/橙色标题,每个错题卡片显示:
   - 课组号 + 题型号 (从 questionId 推断)
   - 错误次数 (🔥N)
   - 艾宾浩斯阶段条: `Stage 1 → 2 → 3 → 4 → ✅`

   简化为单行:
   ```
   ┌──────────────────────────────────────────────┐
   │ L03-04 · 选择  🔥3 次  复习阶段: ①→②→③       │
   │ 下次: 1天后  (已过期 2 小时)                  │
   │                              [▶ 开始复习]     │
   └──────────────────────────────────────────────┘
   ```

3. **urgent 组下方** 有 `[🚀 复习所有到期题目 (N 题)]` 按钮

4. **due 组下方** 有 `[🔄 提前复习这些 (N 题)]` 按钮

5. **weak 组:** 黄色标题,显示错了很多次但还没到复习时间的题。无批量按钮,每道题独立操作。

6. **mastered 组:** 绿色标题,**默认折叠**。点击展开后才显示已掌握的错题。每道题旁边有"取消掌握"按钮。

7. **空状态:** 如果 `urgent + due + weak` 全部为空 → 显示:
   ```
   🎉 暂无待复习题目!
   继续保持,你是最棒的!
   ```

8. **三个按钮的行为:**
   - `🚀 复习所有到期` → 同 `urgent` 组,但仅触发到期的题
   - `🔄 提前复习` → 同 `due` 组
   - 每道题的 `▶ 开始复习` → 当前仅跳转到自由练习并筛选题目? **本次只做标记完成**,实际做题流程后续批次实现。点击后:
     - 调用 `calculateNextReview(stage, true)` 更新 `nextReviewTime` + `wrongCount`
     - 该题从列表移入 mastered 组
     - 显示 2 秒 toast "✅ 1 题复习完成"

> ⚠️ 由于完整复习做题流程涉及 QuestionCard 复用等较大改动,本期复习操作用**手动标记完成**方式:
> - 学生点"开始复习"→ 弹出确认 → 学生在纸上/脑中做 → 回来点"我答对了"/"没答对"
> - 答对: `calculateNextReview(stage, true)` → 更新 stage
> - 答错: `calculateNextReview(stage, false)` → 回 stage 0, wrongCount+1
> 这是一个**轻量过渡方案**,后续版本可换成真实做题流程。

#### 改动 3 · 清理

- `WrongBook.tsx` 和 `SpacedReview.tsx` **可以保留但不作为路由主入口**
- `ReviewPage.tsx` 作为唯一复习入口
- 保持 `WrongBook` 和 `SpacedReview` 的导出(其他地方可能引用,不要删文件)

### 验证要求
- `npx tsc -b` 零错误
- 本地 Dexie 中有错题数据 (手动添加或做题产生)
- 打开 `/review` → 看到 4 个优先级分组
- 到期题目在 🔴 urgent 区,带"已过期 X 小时"标签
- 明天到期的在 🟠 due 区
- 错 ≥3 次的在 🟡 weak 区
- 点击题目上的"开始复习"→ 弹确认 → 选"答对"→ 题移入 mastered
- 选"答错"→ stage 回 0,仍留在列表中
- master 区默认折叠
- 全部已掌握 → 显示 🎉 庆祝页

执行完这些提示词后,系统要完整可运行并且不会有任何bug。

---

## 批次 1: 复习反馈闭环 + 首页复习提醒 (预计 45 分钟)

### 目标
做完复习后更新 stage,首页 Hero 区显示"X 道题该复习了"。

### 我需要的改动

#### 改动 1 · 复习反馈弹窗

**文件:** `src/pages/ReviewPage.tsx`

当用户点击某道题的"开始复习"后,弹一个小 modal:

```tsx
const [reviewing, setReviewing] = useState<PrioritizedWrong | null>(null);

// 点击"开始复习":
setReviewing(pw);

// Modal:
{reviewing && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setReviewing(null)}>
    <div className="card p-6 mx-4 max-w-xs w-full text-center space-y-3" onClick={e => e.stopPropagation()}>
      <div className="text-3xl">🤔</div>
      <p className="text-sm text-ink font-medium">
        这道题你复习得怎么样?
      </p>
      <p className="text-xs text-ink-muted">
        {reviewing.label} · 🔥{reviewing.question.wrongCount}次 · {reviewing.nextReviewLabel}
      </p>
      <div className="flex gap-2">
        <button onClick={() => handleReviewResult(reviewing, false)}
          className="flex-1 py-2.5 text-sm font-bold rounded-xl bg-berry-pale text-berry border border-berry/30">
          ❌ 没答对
        </button>
        <button onClick={() => handleReviewResult(reviewing, true)}
          className="flex-1 py-2.5 text-sm font-bold rounded-xl bg-forest-pale text-forest border border-forest/30">
          ✅ 答对了
        </button>
      </div>
    </div>
  </div>
)}
```

**`handleReviewResult` 函数:**

```tsx
const handleReviewResult = async (pw: PrioritizedWrong, passed: boolean) => {
  const wq = pw.question;
  const stage = pw.stage;
  const { nextStage, nextReviewTime } = calculateNextReview(stage, passed, wq.wrongCount);

  await db.wrongQuestions.update(wq.questionId, {
    wrongCount: passed ? wq.wrongCount : wq.wrongCount + 1,
    nextReviewTime,
    mastered: nextStage >= 5,
  });

  setReviewing(null);
  setMsg(passed ? '✅ 复习通过! 阶段提升' : '💪 没关系,再来一次');
  setTimeout(() => setMsg(''), 2000);

  // 刷新列表
  refreshList();
};
```

> ⚠️ `calculateNextReview` 当前接口是 `(stage, passed)`,需要调整以接受 `wrongCount` 参数来正确计算 stage。修改 `spaced-repetition.ts` 中 `calculateNextReview`:
> - 参数改为 `(stage: number, passed: boolean, wrongCount: number)`
> - 如果 passed,nextStage = min(stage + 1, 5)
> - 如果 !passed,nextStage = 0 (回炉)

#### 改动 2 · 首页 Hero 加复习提醒

**文件:** `src/pages/HomePage.tsx`

**在 Hero 卡片下方,加一行复习提醒(条件渲染):**

```tsx
const [reviewCount, setReviewCount] = useState(0);

useEffect(() => {
  getReviewReminder().then(setReviewCount);
}, [userState]);
```

Hero 区 `{greeting.text}` 下方:
```tsx
{reviewCount > 0 && (
  <motion.div className="flex items-center gap-2 mt-2 bg-berry-pale rounded-xl px-3 py-1.5"
    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
    <span className="text-sm">🔴</span>
    <span className="text-xs font-bold text-berry">
      {reviewCount} 道错题该复习了
    </span>
    <a href="/review" className="text-xs font-bold text-forest ml-auto hover:underline">
      去复习 →
    </a>
  </motion.div>
)}
```

### 验证要求
- `npx tsc -b` 零错误
- 有到期错题 → 首页 Hero 区显示"🔴 X 道错题该复习了"
- 没有到期错题 → 不显示
- 点"去复习 →"→ 跳 `/review`
- 复习弹窗: 点"答对"→ 题从列表中消失 → 进入 mastered
- 点"没答对"→ 题留在列表 → 下次打开仍在 urgent

执行完这些提示词后,系统要完整可运行并且不会有任何bug。

---

## 批次 2: 首页"今日推荐"Hero (预计 30 分钟)

### 目标
首页 Hero 区从"角色问候 + 随机格言"升级为"进行中课程记忆 + 快捷继续",学生打开 App 3 秒内知道该干什么。

### 背景
当前首页 Hero 是 `card-accent` 卡片,显示角色头像 + 角色名 + 随机格言。很快捷入口有"开始学习"但藏在小卡片里。

### 我需要的改动

#### 改动 1 · Hero 卡片升级

**文件:** `src/pages/HomePage.tsx`

将现有 Hero 卡片改写为:

```
┌──────────────────────────────────┐
│  [角色图]  下午好,小明!           │
│            连续 7 天 · 时空学徒    │
│                                  │
│  ┌────────────────────────────┐  │
│  │ 📖 {根据状态动态显示}       │  │
│  │                            │  │
│  │ 有进行中课程:               │  │
│  │   继续: 第 5 课 · 句子城堡   │  │
│  │   已完成 2/4 块 ██░░ 50%    │  │
│  │   [🚀 继续学习]             │  │
│  │                            │  │
│  │ 无进行中但有待学:            │  │
│  │   新课: 第 6 关 · 新课文    │  │
│  │   [🚀 开始学习]             │  │
│  │                            │  │
│  │ 全部学完:                   │  │
│  │   🎉 全部课程已完成!         │  │
│  │   [🔄 自由练习]             │  │
│  └────────────────────────────┘  │
│                                  │
│  {复习提醒行}                     │
└──────────────────────────────────┘
```

**实现逻辑:**

```tsx
// 查找"进行中的课程" - 有块完成但未全部完成
const inProgressGroup = LESSON_GROUPS.find(g => {
  const bp = progressMap.get(g)?.blockProgress;
  if (!bp) return false;
  const done = [bp.vocabulary, bp.grammar, bp.sentence, bp.listening].filter(Boolean).length;
  return done > 0 && done < 4;
});

const displayGroup = inProgressGroup || getNextUnlocked();
const isInProgress = !!inProgressGroup;

const groupLessons = LESSONS.filter(l => l.group === displayGroup);
const totalTitle = groupLessons[0]?.titleCn || '';
const bp = progressMap.get(displayGroup)?.blockProgress;
const blocksDone = bp
  ? [bp.vocabulary, bp.grammar, bp.sentence, bp.listening].filter(Boolean).length
  : 0;
```

**课程记忆:** 用 `localStorage` 存 `nce_last_lesson`,首页加载时读取并设置 `displayGroup`。

```tsx
const lastLesson = localStorage.getItem('nce_last_lesson');
// 如果 lastLesson 存在且与 inProgressGroup 不同,优先用 inProgressGroup
```

**快捷入口 2x2** 保留,"开始学习"按钮改为导航到 `displayGroup`。

#### 改动 2 · 课程列表"未解锁预告"

**文件:** `src/pages/LessonSelectPage.tsx`

**在 `isUnlocked` 返回 false 的已解锁条件中,** 对于"紧挨着已完成课的下一课",修改显示:

```tsx
{!unlocked && (
  <div className="text-[10px] text-ink-muted mt-0.5">
    {index > 0 && LESSON_GROUPS[index - 1] === prevCompletedGroup
      ? `先完成 ${completedGroupTitle} 即可解锁`
      : '完成前面课程后解锁'}
  </div>
)}
```

逻辑: 如果前一课已完成(`isCompleted(LESSON_GROUPS[index-1]) === true`),显示"先完成 XXX 即可解锁"。否则显示通用 🔒。

#### 改动 3 · 每日打卡 Toast

**文件:** `src/pages/HomePage.tsx`

**在 `useEffect` 中调用 `checkAndUpdateStreak()`,如果 `isNewDay === true`:**

```tsx
useEffect(() => {
  checkAndUpdateStreak().then(result => {
    if (result.isNewDay && result.streakDays >= 1) {
      setShowStreakToast(true);
      setTimeout(() => setShowStreakToast(false), 2500);
    }
  });
}, []);
```

顶部 Toast:

```tsx
{showStreakToast && (
  <motion.div
    className="fixed top-20 inset-x-0 z-40 flex justify-center pointer-events-none"
    initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
    transition={springs.popIn}>
    <div className="bg-white/95 backdrop-blur rounded-2xl px-5 py-3 shadow-lg border-2 border-sun">
      <p className="text-lg font-extrabold text-center">
        🔥 连续第 {userState?.streakDays} 天打卡! 今天也要加油哦~
      </p>
    </div>
  </motion.div>
)}
```

### 验证要求
- `npx tsc -b` 零错误
- 有进行中课程 → 首页 Hero 显示"继续: 第X课 · XXX" + 进度条 + "继续学习"按钮
- 无进行中 → 显示"新课: 第X关"
- 点击"继续学习" → 跳转对应课程详情页
- 课程列表: 紧挨已完成课的下一个未解锁课 → 显示"先完成 XXX 即可解锁"
- 首次打开 App → 顶部弹出"🔥 连续第 X 天打卡!"
- localStorage 记住上次访问的课程

执行完这些提示词后,系统要完整可运行并且不会有任何bug。

---

## 批次 3: 收尾推送 (预计 10 分钟)

### 目标
最终检查 + 提交 + 推送。

### 验证清单
1. `npx tsc -b` → 零错误
2. 后端 `/api/health` 正常
3. 浏览器回归:
   - 首页: Hero 今日推荐 + 复习提醒 + 打卡 Toast
   - 复习页: 4 层优先级 + 复习弹窗 + 答对/答错反馈
   - 课程列表: 未解锁预告文字
   - 复习数据与 `spaced-repetition` 的 stage 联动正确
4. `git add -A && git commit -m "feat: V8 复习系统+今日推荐+打卡仪式感"`
5. `git push origin main`

执行完这些提示词后,系统要完整可运行并且不会有任何bug。

---

## 附录: 执行顺序

```
批次 0 (复习页重构)          ← 核心改造,先做 (1.5h)
    ↓
批次 1 (复习反馈+首页提醒)   ← 依赖批次 0 的优先级分组 (45min)
    ↓
批次 2 (今日推荐+预告+打卡)  ← 无硬依赖,可在 0+1 之后做 (30min)
    ↓
批次 3 (收尾推送)           ← 全部依赖 (10min)
```

**每批次完成后必须:** `npx tsc -b` 零错误 + 浏览器验证核心功能。

**全部完成后:**
- 学生打开 App → 3 秒知道"今天该学什么"+"有没有该复习的"
- 复习页不再是死列表,按遗忘曲线智能排序
- 完成复习有反馈(答对→阶段提升,答错→回炉)
- 每日首次打开有打卡 Toast
- 课程列表显示"完成XX即可解锁"预告
