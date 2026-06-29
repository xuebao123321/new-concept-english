# 英语重启号 · AI 执行提示词 V6 — 家长面板深度升级 (3 批次)

---

## ⚠️ 项目概览 (每个 AI 会话都必须先读)

**项目:** 英语重启号 — 熊出没主题新概念英语学习 PWA,面向 6-12 岁小学生。
**当前版本:** 家庭 SaaS 已完成 (V5 全 5 批次 + 后续修复),家长面板基础可用但粗糙。
**本次目标:** 家长面板深度升级——逐课解锁、错题本、活跃度分析。

**技术栈:**
- 前端: React 18 + TypeScript + Vite 6 + Tailwind CSS v4 + Framer Motion + Zustand + Dexie
- 后端: FastAPI + Turso/SQLite, Python 3
- 部署: 前端 Vercel, 后端 Railway

**关键文件 (本次改动涉及):**
```
前端:
  src/pages/ParentDashboardPage.tsx    — 家长面板 (当前 ~220 行,需大幅重构)
  src/db/api.ts                        — API client (加新方法)
  src/data/lessons.ts                  — 课程元数据 (课号/标题/词汇)

后端:
  backend/main.py                      — /api/parent/child/:id/report 需扩展
                                        — 新增 GET /api/parent/child/:id/wrong-questions
                                        — 新增 GET /api/parent/child/:id/recent-activity
```

**项目路径:** `/Users/andy/Documents/Andy AI/new concept english`

**启动命令:** `npm run dev` (前端) / `cd backend && python3 -m uvicorn main:app --reload --port 8000` (后端)
**每次修改后必须通过:** `npx tsc -b`

---

## 批次 0: 后端 API 升级 (预计 45 分钟)

### 目标
为家长面板提供更丰富的数据:近期活跃度、错题明细。同时提供单个课程解锁/重置 API(已有,无需新增)。

### 背景
当前 `GET /api/parent/child/:id/report` 只返回: completed_lessons / total_lessons / type_stats(5 题型正确率)。缺少:
- 孩子最近有没有学 (活跃度)
- 孩子错了哪些具体题目 (错题本)
- 每个课程组的完成状态 (逐课列表)

### 我需要的改动

#### 改动 1 · 扩展 childReport API

**文件:** `backend/main.py`

**找到 `child_report` 函数 (路径 `/api/parent/child/{child_id}/report`),** 在返回字典中加 3 个新字段:

1. **`lesson_list`** — 所有 36 个课组的完成状态列表:

```python
# 在 child_report 函数内,获取 progress_rows 之后:
from db import get_db  # 已在文件顶部

lesson_list = []
for lg in ["lesson-01-02", "lesson-03-04", ...]:  # 全部 36 个课组
    # 从 progress_rows 中查找该课组的进度
    found = [r for r in progress_rows if r.get("lesson_group") == lg]
    if found:
        f = found[0]
        lesson_list.append({
            "lesson_group": lg,
            "completed": bool(f.get("completed")),
            "best_accuracy": float(f.get("best_accuracy") or 0),
            "attempts": int(f.get("attempts") or 0),
        })
    else:
        lesson_list.append({
            "lesson_group": lg,
            "completed": False,
            "best_accuracy": 0,
            "attempts": 0,
        })
```

> ⚠️ `LESSON_GROUPS` 列表可以从 `lessons.ts` 硬编码,或者从 `data/lessons.ts` 文件中查找。建议在 `main.py` 顶部定义:
> ```python
> ALL_LESSON_GROUPS = [
>     "lesson-01-02","lesson-03-04","lesson-05-06","lesson-07-08",
>     "lesson-09-10","lesson-11-12","lesson-13-14","lesson-15-16",
>     "lesson-17-18","lesson-19-20","lesson-21-22","lesson-23-24",
>     "lesson-25-26","lesson-27-28","lesson-29-30","lesson-31-32",
>     "lesson-33-34","lesson-35-36","lesson-37-38","lesson-39-40",
>     "lesson-41-42","lesson-43-44","lesson-45-46","lesson-47-48",
>     "lesson-49-50","lesson-51-52","lesson-53-54","lesson-55-56",
>     "lesson-57-58","lesson-59-60","lesson-61-62","lesson-63-64",
>     "lesson-65-66","lesson-67-68","lesson-69-70","lesson-71-72"
> ]
> ```

2. **`recent_activity`** — 最近 7 天的答题记录:

```python
# 在 child_report 函数内:
from datetime import datetime, timedelta
recent_activity = []
for i in range(6, -1, -1):
    d = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
    row = conn.execute(
        "SELECT COUNT(*) as total, SUM(correct) as correct FROM answer_records "
        "WHERE user_id=? AND date(created_at)=?", (child_id, d)).fetchone()
    rd = row.to_dict() if hasattr(row, 'to_dict') else dict(row)
    recent_activity.append({
        "date": d,
        "total": rd.get("total") or 0,
        "correct": rd.get("correct") or 0,
    })
```

然后在返回 dict 中加: `"lesson_list": lesson_list, "recent_activity": recent_activity`

#### 改动 2 · 新增 GET /api/parent/child/:id/wrong-questions

**文件:** `backend/main.py`

在 `reset_lesson` 函数之后,`child_report` 之前,新增:

```python
@app.get("/api/parent/child/{child_id}/wrong-questions")
def child_wrong_questions(child_id: int, user: dict = Depends(get_current_user)):
    """家长查看学生最近答错的题目"""
    if user.get("role") != "parent":
        raise HTTPException(403, "仅家长可访问")
    conn = get_db()
    child = conn.execute("SELECT id FROM users WHERE id=? AND parent_id=?",
                         (child_id, user["id"])).fetchone()
    if not child:
        raise HTTPException(404, "学生未找到")

    # 查最近 50 条答错记录,按时间倒序,去重(同一 question_id 只显示最新一条)
    rows = conn.execute(
        "SELECT question_id, lesson_group, question_type, user_answer, created_at "
        "FROM answer_records WHERE user_id=? AND correct=0 "
        "ORDER BY created_at DESC LIMIT 100",
        (child_id,)).fetchall()

    # 去重: 同一 question_id 只保留最新
    seen = set()
    wrong_list = []
    for r in rows:
        d = r.to_dict() if hasattr(r, 'to_dict') else dict(r)
        qid = d["question_id"]
        if qid not in seen:
            seen.add(qid)
            wrong_list.append({
                "question_id": qid,
                "lesson_group": d.get("lesson_group", ""),
                "question_type": d.get("question_type", "choice"),
                "user_answer": d.get("user_answer", ""),
                "created_at": d.get("created_at", ""),
            })
        if len(wrong_list) >= 30:
            break

    return {"wrong_questions": wrong_list}
```

#### 改动 3 · 前端 api.ts 加新方法

**文件:** `src/db/api.ts`

在现有 `childReport` 方法之后,加:

```ts
wrongQuestions: (childId: number) =>
  request(`/api/parent/child/${childId}/wrong-questions`),
```

### 验证要求
- 启动后端: `python3 -m uvicorn main:app --reload --port 8000`
- 确保已有一个家长账号 + 一个绑定的学生账号(用批次 2 测试用的 `zhangbaba` / `xiaoming`)
- 让学生账号登录后做几道题,故意答错几道
- `GET /api/parent/child/{childId}/report` → 返回 `lesson_list`(36 项) + `recent_activity`(7 天)
- `GET /api/parent/child/{childId}/wrong-questions` → 返回答错题目列表
- 所有返回 JSON 结构正确,无 500

执行完这些提示词后,系统要完整可运行并且不会有任何bug。

---

## 批次 1: 家长面板重构 — 逐课解锁列表 (预计 1.5 小时)

### 目标
将家长面板从"解锁全部/重置全部"升级为"36 课逐课清单,每课独立解锁/锁定"。

### 背景
当前 ParentDashboardPage 展开学生详情后只有 2 个按钮(解锁全部/重置全部)。家长需要能精确控制每一课。

### 我需要的改动

#### 操作逻辑

**逐课解锁/锁定:**

当前 `POST /api/parent/child/:id/unlock-lesson` 已将课组标记为 completed=1。
`POST /api/parent/child/:id/reset-lesson` 已删除课组进度。

前端只需:
- 获取 `lesson_list`(批次 0 已加)
- 每个课组旁边显示解锁/锁定按钮
- 点击 → 调对应 API → 刷新列表

**保留"全部解锁/全部重置":**
- 作为顶部快捷按钮,放在课组列表上方
- 执行后刷新整个 `lesson_list`

#### 改动 1 · 重构 ParentDashboardPage

**文件:** `src/pages/ParentDashboardPage.tsx`

**整个文件需要重构。** 保留现有结构,但把学生详情展开区改为以下结构:

```
┌─ 学生卡片 (点击展开) ─────────────────────┐
│  [头像] 小明  已完成 5/36 课        ▼     │
│                                            │
│  ┌─ 统计摘要 ──────────────────────────┐   │
│  │  已完成 5 课 | 总课程 36 | 完成率 14%  │   │
│  └──────────────────────────────────────┘   │
│                                            │
│  ┌─ 各题型正确率 ───────────────────────┐   │
│  │  选择 85% 填空 60% 翻译 40% ...        │   │
│  └──────────────────────────────────────┘   │
│                                            │
│  [🔓 解锁全部] [🔒 重置全部]               │
│                                            │
│  ┌─ 课程清单 (可滚动, max-h-64) ────────┐  │
│  │  L01-02  第一课·A Private Conversation │  │
│  │  状态: ✅ 已完成                      │  │
│  │           [🔒 重新锁定]                │  │
│  │  ─────────────────────────────────    │  │
│  │  L03-04  Please Send Me a Card       │  │
│  │  状态: 🔒 已解锁(家长)  尝试: 2 次    │  │
│  │           [🔒 锁定]                   │  │
│  │  ─────────────────────────────────    │  │
│  │  L05-06  未解锁                       │  │
│  │           [🔓 解锁本课]               │  │
│  └──────────────────────────────────────┘   │
│                                            │
│  [📕 错题本]  (跳转到批次 2 的 tab)         │
└────────────────────────────────────────────┘
```

**具体实现要点:**

1. **从 `lesson_list` 渲染课程清单:**
```tsx
// 在展开区域,report 加载完成后:
{report?.lesson_list?.map((lesson, idx) => {
  // 从 LESSONS 数据中查找课名
  const lessonData = LESSONS.filter(l => l.group === lesson.lesson_group);
  const title = lessonData[0]?.titleCn || `第${idx+1}课`;
  const engTitle = lessonData[0]?.title || '';

  return (
    <div key={lesson.lesson_group} className="py-2 border-b border-warm-border last:border-b-0">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-ink truncate">
            L{lessonData.map(l => l.lessonNumber).join('-')} {title}
          </div>
          {engTitle && <div className="text-xs text-ink-muted truncate">{engTitle}</div>}
          <div className="text-xs text-ink-light mt-0.5">
            {lesson.completed ? '✅ 已完成' : lesson.attempts > 0 ? `🔄 尝试过 ${lesson.attempts} 次` : '🔒 未解锁'}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            lesson.completed
              ? handleResetLesson(childId, lesson.lesson_group)
              : handleUnlockLesson(childId, lesson.lesson_group);
          }}
          disabled={lessonLoading === lesson.lesson_group}
          className={`ml-2 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
            lesson.completed
              ? 'bg-berry-pale text-berry border border-berry/30'
              : 'bg-forest-pale text-forest border border-forest/30'
          }`}
        >
          {lessonLoading === lesson.lesson_group ? '...' : lesson.completed ? '🔒 锁定' : '🔓 解锁'}
        </button>
      </div>
    </div>
  );
})}
```

2. **逐课操作函数:**
```tsx
const [lessonLoading, setLessonLoading] = useState<string | null>(null);

const handleUnlockLesson = async (childId: number, lessonGroup: string) => {
  setLessonLoading(lessonGroup);
  try {
    await api.unlockLesson(childId, lessonGroup);
    setMsg(`✅ ${lessonGroup} 已解锁`);
    // 重新加载报告
    const r = await api.childReport(childId);
    setReport(r);
  } catch (e: any) {
    setMsg('❌ ' + (e.message || '操作失败'));
  } finally {
    setLessonLoading(null);
  }
};

const handleResetLesson = async (childId: number, lessonGroup: string) => {
  setLessonLoading(lessonGroup);
  try {
    await api.resetLesson(childId, lessonGroup);
    setMsg(`✅ ${lessonGroup} 已重置`);
    const r = await api.childReport(childId);
    setReport(r);
  } catch (e: any) {
    setMsg('❌ ' + (e.message || '操作失败'));
  } finally {
    setLessonLoading(null);
  }
};
```

3. **LESSONS 数据引用:**
```tsx
import { LESSONS, LESSON_GROUPS } from '../data/lessons';
```

4. **课组列表放可滚动容器:**
```tsx
<div className="max-h-80 overflow-y-auto space-y-0">
  {report?.lesson_list?.map(...)}
</div>
```

5. **Interaction 类型定义扩展 (文件内):**
```tsx
interface ChildReport {
  // ... 现有字段 ...
  lesson_list?: Array<{
    lesson_group: string;
    completed: boolean;
    best_accuracy: number;
    attempts: number;
  }>;
  recent_activity?: Array<{
    date: string;
    total: number;
    correct: number;
  }>;
}
```

### 验证要求
- `npx tsc -b` 零错误
- 家长登录 → `/parent` → 点击学生 → 展开后看到 36 课清单
- 每课显示课号 + 中文标题 + 完成状态
- 已完成课的按钮: `🔒 锁定` (红色)
- 未完成课的按钮: `🔓 解锁` (绿色)
- 点击解锁 → 按钮变 `...` → API 调用 → 刷新显示 `✅ 已完成`
- 点击锁定 → API 调用 → 刷新显示 `🔒 未解锁`
- "解锁全部"和"重置全部"仍可用,放在课程清单上方

执行完这些提示词后,系统要完整可运行并且不会有任何bug。

---

## 批次 2: 错题本 + 活跃度图表 (预计 1 小时)

### 目标
在学生详情页加两个新区域: 📕 错题本 (答案回顾)、📅 7 天活跃度(迷你柱状图)。

### 背景
批次 0 后端已返回 `wrong_questions` 和 `recent_activity` 数据,前端只需消费和展示。

### 我需要的改动

#### 改动 1 · 错题本区域

**文件:** `src/pages/ParentDashboardPage.tsx`

在学生详情展开区,课程清单下方,加"📕 错题本"可折叠区域:

```tsx
const [showWrongQs, setShowWrongQs] = useState(false);
const [wrongQuestions, setWrongQuestions] = useState<Array<{
  question_id: string; lesson_group: string; question_type: string;
  user_answer: string; created_at: string;
}>>([]);
const [wrongQsLoading, setWrongQsLoading] = useState(false);

const loadWrongQuestions = async (childId: number) => {
  if (showWrongQs) { setShowWrongQs(false); return; }
  setShowWrongQs(true);
  if (wrongQuestions.length > 0) return; // 已加载
  setWrongQsLoading(true);
  try {
    const res = await api.wrongQuestions(childId);
    setWrongQuestions(res.wrong_questions || []);
  } catch (e: any) {
    setMsg('❌ ' + (e.message || '加载失败'));
  } finally {
    setWrongQsLoading(false);
  }
};
```

UI 部分 (在学生详情展开区内,课程清单后面):

```tsx
{/* ── 📕 错题本 (可折叠) ── */}
<button onClick={(e) => { e.stopPropagation(); loadWrongQuestions(c.id); }}
  className="w-full text-left text-sm font-bold text-ink-light hover:text-ink pt-2">
  {showWrongQs ? '📕 收起错题本' : '📕 查看错题本'}
</button>

{showWrongQs && (
  <div className="max-h-48 overflow-y-auto space-y-1.5">
    {wrongQsLoading ? (
      <p className="text-xs text-ink-muted text-center py-2">加载中...</p>
    ) : wrongQuestions.length === 0 ? (
      <p className="text-xs text-ink-muted text-center py-2">暂无错题 🎉</p>
    ) : (
      wrongQuestions.map((wq, i) => (
        <div key={wq.question_id + i} className="bg-warm-bg rounded-lg p-2 text-xs">
          <div className="flex items-center justify-between mb-0.5">
            <span className="font-bold text-ink-light">
              {wq.lesson_group} · {{choice:'选择',fill:'填空',translate:'翻译',reorder:'连词',listening:'听力'}[wq.question_type] || wq.question_type}
            </span>
            <span className="text-ink-muted">{wq.created_at?.slice(0,10)}</span>
          </div>
          <div className="text-berry">
            学生答案: <span className="font-bold">{wq.user_answer || '(未填写)'}</span>
          </div>
        </div>
      ))
    )}
  </div>
)}
```

#### 改动 2 · 7 天活跃度迷你图

**文件:** `src/pages/ParentDashboardPage.tsx`

在学生详情展开区,题型正确率下方,加"📅 7 天活跃度"柱状图:

```tsx
{/* ── 📅 7 天活跃度 ── */}
{report?.recent_activity && report.recent_activity.length > 0 && (
  <div>
    <div className="text-caption text-ink-light font-bold mt-1">📅 7 天活跃度</div>
    <div className="flex items-end gap-1 h-16 mt-1">
      {report.recent_activity.map((day) => {
        const maxTotal = Math.max(...report.recent_activity!.map(d => d.total), 1);
        const height = day.total > 0 ? Math.max((day.total / maxTotal) * 100, 8) : 3;
        const isToday = day.date === new Date().toISOString().slice(0, 10);
        return (
          <div key={day.date} className="flex-1 flex flex-col items-center gap-0.5">
            <span className="text-[10px] font-bold text-ink-light tabular-nums">
              {day.total || ''}
            </span>
            <div
              className={`w-full rounded-t-sm ${isToday ? 'bg-forest' : day.total > 0 ? 'bg-forest/40' : 'bg-warm-bg'}`}
              style={{ height: `${height}%` }}
            />
            <span className={`text-[10px] ${isToday ? 'font-bold text-forest' : 'text-ink-muted'}`}>
              {['日','一','二','三','四','五','六'][new Date(day.date).getDay()]}
            </span>
          </div>
        );
      })}
    </div>
  </div>
)}
```

#### 改动 3 · 汇总统计卡片加"本周趋势"

在题型正确率区域旁边,或统计卡片下方,加一个趋势对比行:

```tsx
{/* 本周 vs 上周趋势 */}
{report?.recent_activity && (() => {
  const thisWeek = report.recent_activity.slice(-7);
  const thisWeekTotal = thisWeek.reduce((s, d) => s + d.total, 0);
  const thisWeekCorrect = thisWeek.reduce((s, d) => s + d.correct, 0);
  const accuracy = thisWeekTotal > 0 ? Math.round(thisWeekCorrect / thisWeekTotal * 100) : 0;
  return (
    <div className="flex items-center justify-center gap-4 text-xs pt-1">
      <span className="text-ink-light">本周答题 <b className="text-ink">{thisWeekTotal}</b> 题</span>
      <span className="text-ink-light">正确率 <b className={accuracy >= 70 ? 'text-forest' : accuracy >= 50 ? 'text-honey' : 'text-berry'}>{accuracy}%</b></span>
    </div>
  );
})()}
```

### 验证要求
- `npx tsc -b` 零错误
- 学生有过答题记录 → 家长展开学生详情 → 底部显示"📕 查看错题本"按钮
- 点击"查看错题本" → 加载并展示答错题目列表(含题型/日期/学生答案)
- 无错题 → 显示"暂无错题 🎉"
- 题型正确率下方显示"📅 7 天活跃度"柱状图
- 有答题的天数柱状高,无答题的天数矮
- 今天用绿色,其他天用浅绿
- "本周答题 X 题 · 正确率 Y%" 趋势行显示

执行完这些提示词后,系统要完整可运行并且不会有任何bug。

---

## 附录: 执行顺序

```
批次 0 (后端 API 升级)     ← 无依赖,先做 (45min)
    ↓
批次 1 (逐课解锁列表)      ← 依赖批次 0 的 lesson_list (1.5h)
    ↓
批次 2 (错题本+活跃度)     ← 依赖批次 0 的 wrong_questions + recent_activity (1h)
```

**每批次完成后检查:**
1. 后端启动 `python3 -m uvicorn main:app --reload --port 8000`
2. `npx tsc -b` → 零错误
3. 浏览器验证核心功能
4. 不做完不开始下一批

**全部 3 批次完成后,家长面板将具备:**
- 36 课逐课解锁/锁定 (粒度精确到每一课)
- 错题本 (看孩子最近答错了什么,学生答案回顾)
- 7 天活跃度柱状图 (一眼看出孩子哪天学了)
- 本周答题统计趋势
- 原有"全部解锁/全部重置"快捷按钮保留
